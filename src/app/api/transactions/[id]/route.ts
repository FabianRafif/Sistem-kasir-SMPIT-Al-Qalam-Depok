import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { MovementType, PaymentStatus } from '@prisma/client';
import { formatDateOnly, formatTimeOnly } from '@/lib/format';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir.' }, { status: 401 });
    }

    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true } },
        items: true,
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    const storeSetting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });

    const formattedSale = {
      ...sale,
      subtotal: Number(sale.subtotal),
      discountAmount: Number(sale.discountAmount),
      grandTotal: Number(sale.grandTotal),
      cashReceived: sale.cashReceived ? Number(sale.cashReceived) : null,
      changeAmount: sale.changeAmount ? Number(sale.changeAmount) : null,
      items: sale.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        unitCost: Number(it.unitCost),
        lineTotal: Number(it.lineTotal),
      })),
      receiptData: {
        receiptNumber: sale.receiptNumber,
        storeName: storeSetting?.storeName || 'Kantin & Minimarket SMPIT Al Qalam',
        schoolName: storeSetting?.schoolName || 'SMPIT Al Qalam',
        address: storeSetting?.address || '',
        phone: storeSetting?.phone || '',
        cashierName: sale.user.name,
        date: formatDateOnly(sale.createdAt),
        time: formatTimeOnly(sale.createdAt),
        items: sale.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
        })),
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discountAmount),
        grandTotal: Number(sale.grandTotal),
        paymentMethod: sale.paymentMethod,
        cashReceived: sale.cashReceived ? Number(sale.cashReceived) : null,
        changeAmount: sale.changeAmount ? Number(sale.changeAmount) : null,
        footerNotes: storeSetting?.receiptFooter || '',
        paperSize: storeSetting?.printerPaperSize || '58mm',
      },
    };

    return NextResponse.json({ success: true, data: formattedSale });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat detail transaksi.' }, { status: 500 });
  }
}

/**
 * Refund / Pembatalan Transaksi dengan Pengembalian Stok
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    // Hanya ADMIN atau Kasir berwenang yang dapat melakukan pembatalan transaksi
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya administrator yang memiliki otorisasi untuk membatalkan transaksi.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { reason = 'Pembatalan transaksi oleh kasir/admin' } = body;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    if (sale.paymentStatus === PaymentStatus.CANCELLED || sale.paymentStatus === PaymentStatus.REFUNDED) {
      return NextResponse.json({ error: 'Transaksi ini sudah pernah dibatalkan sebelumnya.' }, { status: 400 });
    }

    // Jalankan pembatalan dan kembalikan stok secara atomik
    await prisma.$transaction(async (tx) => {
      // 1. Update status transaksi
      await tx.sale.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.CANCELLED,
          cancelledAt: new Date(),
          notes: sale.notes ? `${sale.notes} | Dibatalkan: ${reason}` : `Dibatalkan: ${reason}`,
        },
      });

      // 2. Kembalikan stok produk jika transaksi sebelumnya sudah berstatus PAID
      if (sale.paymentStatus === PaymentStatus.PAID) {
        for (const item of sale.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQty: { increment: item.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: user.id,
              movementType: MovementType.RETURN,
              quantityChange: item.quantity,
              referenceType: 'SALE_REFUND',
              referenceId: sale.id,
              reason: `Pengembalian stok pembatalan struk ${sale.receiptNumber}: ${reason}`,
            },
          });
        }
      }

      // 3. Update payment status
      await tx.payment.updateMany({
        where: { saleId: id },
        data: { status: PaymentStatus.CANCELLED },
      });
    });

    await logAudit({
      userId: user.id,
      action: 'TRANSACTION_CANCEL',
      entityType: 'SALE',
      entityId: sale.id,
      details: {
        receiptNumber: sale.receiptNumber,
        reason,
        grandTotal: Number(sale.grandTotal),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Transaksi No ${sale.receiptNumber} berhasil dibatalkan dan stok telah dikembalikan.`,
    });
  } catch (error: any) {
    console.error('Cancel transaction error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membatalkan transaksi.' }, { status: 500 });
  }
}
