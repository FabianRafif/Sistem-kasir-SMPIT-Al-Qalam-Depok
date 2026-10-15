import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { MovementType, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

/**
 * Webhook Penerima Callback QRIS
 * Memverifikasi tanda tangan, hash payload, idempotensi event, dan mengurangi stok tepat 1 kali
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Payload bukan format JSON yang valid.' }, { status: 400 });
    }

    // 1. Ekstraksi Data Webhook
    const eventId = payload.eventId || payload.transaction_id || payload.order_id || `EVT-${Date.now()}`;
    const provider = payload.provider || process.env.QRIS_PROVIDER || 'SIMULATOR';
    const saleId = payload.saleId || payload.order_id;
    const amount = parseFloat(payload.amount || payload.gross_amount || 0);
    const statusCode = payload.status_code || payload.status; // 'SUCCESS' | 'SETTLEMENT' | 'PAID'

    // 2. Hitung SHA-256 Hash Payload untuk audit dan pencegahan duplikasi
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    // 3. Cek Idempotensi Event Webhook
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      // Event sudah pernah diproses secara sukses sebelumnya
      return NextResponse.json({
        success: true,
        message: 'Webhook event telah diproses sebelumnya (Idempotent).',
        eventId,
      });
    }

    // 4. Verifikasi Tanda Tangan (Signature) jika Secret Key Dikonfigurasi
    const webhookSecret = process.env.QRIS_WEBHOOK_SECRET;
    const signature = req.headers.get('x-signature') || payload.signature;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Tanda tangan webhook tidak valid.' }, { status: 403 });
      }
    }

    // 5. Cari Penjualan Terkait (Berdasarkan ID Transaksi ATAU Nominal QRIS Meja Statis)
    let sale = null;
    if (saleId) {
      sale = await prisma.sale.findFirst({
        where: {
          OR: [
            { id: saleId },
            { receiptNumber: saleId },
            { payments: { some: { providerReference: saleId } } },
          ],
        },
        include: { items: true, payments: true },
      });
    } else if (amount > 0) {
      // Pencocokan Otomatis QRIS Meja Statis:
      // Temukan transaksi kasir berstatus PENDING terbaru dengan nominal yang sesuai
      sale = await prisma.sale.findFirst({
        where: {
          paymentMethod: 'QRIS',
          paymentStatus: PaymentStatus.PENDING,
          grandTotal: amount,
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // Dalam rentang 30 menit terakhir
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true },
      });
    }

    if (!sale) {
      return NextResponse.json({
        error: saleId
          ? `Transaksi dengan ID "${saleId}" tidak ditemukan.`
          : `Tidak ditemukan transaksi kasir QRIS pending dengan nominal Rp ${amount}.`,
      }, { status: 404 });
    }

    // Cek apakah transaksi sudah berstatus PAID (misalnya webhook ganda atau sudah lunas)
    if (sale.paymentStatus === PaymentStatus.PAID) {
      // Catat webhook event sebagai duplicate
      await prisma.paymentWebhookEvent.create({
        data: {
          provider,
          eventId,
          payloadHash,
          payload: rawBody,
          processingStatus: 'DUPLICATE_IGNORED',
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Transaksi sudah berstatus PAID sebelumnya.',
      });
    }

    const isSuccessPayment =
      statusCode === 'SUCCESS' ||
      statusCode === 'SETTLEMENT' ||
      statusCode === 'PAID' ||
      statusCode === '200';

    if (!isSuccessPayment) {
      // Jika status gagal atau expired
      await prisma.$transaction([
        prisma.sale.update({
          where: { id: sale.id },
          data: { paymentStatus: PaymentStatus.FAILED },
        }),
        prisma.payment.updateMany({
          where: { saleId: sale.id },
          data: { status: PaymentStatus.FAILED },
        }),
        prisma.paymentWebhookEvent.create({
          data: {
            provider,
            eventId,
            payloadHash,
            payload: rawBody,
            processingStatus: 'PAYMENT_FAILED',
            processedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Status pembayaran gagal/kadaluwarsa dicatat.' });
    }

    // 6. Verifikasi Nominal Pembayaran
    if (amount > 0 && Math.abs(amount - Number(sale.grandTotal)) > 0.01) {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider,
          eventId,
          payloadHash,
          payload: rawBody,
          processingStatus: 'AMOUNT_MISMATCH',
          processedAt: new Date(),
        },
      });

      return NextResponse.json(
        { error: `Nominal pembayaran (Rp ${amount}) tidak sesuai dengan total tagihan (Rp ${sale.grandTotal}).` },
        { status: 400 }
      );
    }

    // 7. Eksekusi Pembayaran Sukses & Pengurangan Stok Secara Atomik
    await prisma.$transaction(async (tx) => {
      // A. Update Status Penjualan ke PAID
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      // B. Update Status Payment Record
      await tx.payment.updateMany({
        where: { saleId: sale.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          providerReference: payload.reference || eventId,
        },
      });

      // C. Kurangi Stok Produk dan Catat Mutasi Stok (Hanya 1 Kali Saat QRIS Terverifikasi!)
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: sale.userId,
            movementType: MovementType.SALE,
            quantityChange: -item.quantity,
            referenceType: 'QRIS_SALE',
            referenceId: sale.id,
            reason: `Penjualan QRIS Terverifikasi Struk ${sale.receiptNumber}`,
          },
        });
      }

      // D. Simpan Log Webhook Event Idempoten
      await tx.paymentWebhookEvent.create({
        data: {
          provider,
          eventId,
          payloadHash,
          payload: rawBody,
          processingStatus: 'SUCCESS',
          processedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Pembayaran QRIS untuk struk ${sale.receiptNumber} berhasil diverifikasi.`,
      saleId: sale.id,
    });
  } catch (error: any) {
    console.error('QRIS Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
