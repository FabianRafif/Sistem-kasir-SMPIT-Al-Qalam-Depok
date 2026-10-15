import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit, generateReceiptNumber } from '@/lib/security';
import { PaymentMethod, PaymentStatus, MovementType, Prisma } from '@prisma/client';
import { formatDateTime, formatDateOnly, formatTimeOnly } from '@/lib/format';
import { z } from 'zod';

const createTransactionSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1, 'Jumlah produk minimal 1'),
      unitPrice: z.number().min(0),
    })
  ).min(1, 'Keranjang belanja tidak boleh kosong'),
  discountAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'QRIS']),
  cashReceived: z.number().min(0).optional(),
  idempotencyKey: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir. Silakan login kembali.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Data transaksi tidak valid.' },
        { status: 400 }
      );
    }

    const { items, discountAmount, paymentMethod, cashReceived, idempotencyKey, notes } = parsed.data;

    // Cek idempotensi jika key dikirimkan (mencegah double-click pembayaran)
    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey },
        include: {
          sale: {
            include: {
              items: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      if (existingPayment) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: 'Transaksi ini telah diproses sebelumnya (Idempotent).',
          sale: existingPayment.sale,
        });
      }
    }

    // Ambil pengaturan toko untuk struk & mode QRIS
    const storeSetting = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    const schoolName = storeSetting?.schoolName || 'SMPIT Al Qalam';
    const storeName = storeSetting?.storeName || 'Kantin & Minimarket SMPIT Al Qalam';
    const paperSize = (storeSetting?.printerPaperSize as '58mm' | '80mm') || '58mm';

    // Eksekusi transaksi database secara atomik dengan tingkat isolasi kuat
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Validasi produk dan ketersediaan stok
        const productIds = items.map((i) => i.productId);
        const productsInDb = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        const productMap = new Map(productsInDb.map((p) => [p.id, p]));

        let serverSubtotal = 0;
        const processedItems: {
          productId: string;
          name: string;
          sku: string;
          barcode: string | null;
          quantity: number;
          unitPrice: number;
          unitCost: number;
          lineTotal: number;
        }[] = [];

        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
          }
          if (!product.isActive) {
            throw new Error(`Produk "${product.name}" sedang nonaktif.`);
          }

          // Cek stok
          if (product.stockQty < item.quantity) {
            throw new Error(
              `Stok untuk "${product.name}" tidak mencukupi (Tersedia: ${product.stockQty}, Diminta: ${item.quantity}).`
            );
          }

          // Gunakan harga jual resmi dari database (jangan percaya unitPrice dari client secara buta)
          const officialPrice = Number(product.sellingPrice);
          const lineTotal = officialPrice * item.quantity;
          serverSubtotal += lineTotal;

          processedItems.push({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            quantity: item.quantity,
            unitPrice: officialPrice,
            unitCost: Number(product.costPrice),
            lineTotal,
          });
        }

        const validDiscount = Math.min(discountAmount, serverSubtotal);
        const grandTotal = Math.max(0, serverSubtotal - validDiscount);

        // Validasi Pembayaran Tunai
        let change = 0;
        if (paymentMethod === 'CASH') {
          if (cashReceived === undefined || cashReceived < grandTotal) {
            throw new Error(
              `Uang tunai yang diterima (Rp ${cashReceived || 0}) kurang dari total belanja (Rp ${grandTotal}).`
            );
          }
          change = cashReceived - grandTotal;
        }

        const receiptNumber = generateReceiptNumber();
        const isPaidImmediately = paymentMethod === 'CASH';

        // 2. Buat Record Penjualan (Sale)
        const sale = await tx.sale.create({
          data: {
            receiptNumber,
            userId: user.id,
            subtotal: serverSubtotal,
            discountAmount: validDiscount,
            grandTotal,
            paymentMethod,
            paymentStatus: isPaidImmediately ? PaymentStatus.PAID : PaymentStatus.PENDING,
            cashReceived: paymentMethod === 'CASH' ? cashReceived : null,
            changeAmount: paymentMethod === 'CASH' ? change : null,
            notes: notes || null,
            paidAt: isPaidImmediately ? new Date() : null,
          },
        });

        // 3. Buat Item Penjualan dengan Snapshot Lengkap
        for (const pItem of processedItems) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: pItem.productId,
              productName: pItem.name,
              skuSnapshot: pItem.sku,
              barcodeSnapshot: pItem.barcode,
              quantity: pItem.quantity,
              unitPrice: pItem.unitPrice,
              unitCost: pItem.unitCost,
              lineTotal: pItem.lineTotal,
            },
          });

          // 4. Pengurangan stok dan pencatatan mutasi stok
          // Jika tunai: langsung kurangi stok secara definitif
          if (isPaidImmediately) {
            await tx.product.update({
              where: { id: pItem.productId },
              data: {
                stockQty: { decrement: pItem.quantity },
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: pItem.productId,
                userId: user.id,
                movementType: MovementType.SALE,
                quantityChange: -pItem.quantity,
                referenceType: 'SALE',
                referenceId: sale.id,
                reason: `Penjualan kasir No Struk ${receiptNumber}`,
              },
            });
          }
        }

        // 5. Buat Record Payment
        const paymentRecord = await tx.payment.create({
          data: {
            saleId: sale.id,
            provider: paymentMethod === 'CASH' ? 'CASH' : 'QRIS_GATEWAY',
            providerReference: paymentMethod === 'QRIS' ? `QR-${Date.now()}` : null,
            paymentMethod,
            amount: grandTotal,
            status: isPaidImmediately ? PaymentStatus.PAID : PaymentStatus.PENDING,
            idempotencyKey: idempotencyKey || null,
            paidAt: isPaidImmediately ? new Date() : null,
            qrCodeData:
              paymentMethod === 'QRIS'
                ? `00020101021226600016ID.CO.QRIS.WWW011893600000000000000052045499530336054${grandTotal.toFixed(2).replace('.', '')}5802ID5914SMPIT AL QALAM6007JAKARTA62190715${receiptNumber}6304ABCD`
                : null,
          },
        });

        return {
          sale,
          items: processedItems,
          payment: paymentRecord,
          grandTotal,
          change,
          receiptNumber,
          isPaidImmediately,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 10000,
      }
    );

    // Catat Audit Log
    await logAudit({
      userId: user.id,
      action: 'TRANSACTION_CREATE',
      entityType: 'SALE',
      entityId: result.sale.id,
      details: {
        receiptNumber: result.receiptNumber,
        grandTotal: result.grandTotal,
        paymentMethod,
        isPaid: result.isPaidImmediately,
      },
    });

    const now = new Date();
    const receiptData = {
      receiptNumber: result.receiptNumber,
      storeName,
      schoolName,
      address: storeSetting?.address || '',
      phone: storeSetting?.phone || '',
      cashierName: user.name,
      date: formatDateOnly(now),
      time: formatTimeOnly(now),
      items: result.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      subtotal: Number(result.sale.subtotal),
      discountAmount: Number(result.sale.discountAmount),
      grandTotal: result.grandTotal,
      paymentMethod,
      cashReceived: paymentMethod === 'CASH' ? cashReceived : null,
      changeAmount: paymentMethod === 'CASH' ? result.change : null,
      qrisReference: result.payment.providerReference,
      footerNotes: storeSetting?.receiptFooter || '',
      paperSize,
    };

    return NextResponse.json({
      success: true,
      saleId: result.sale.id,
      receiptNumber: result.receiptNumber,
      paymentStatus: result.sale.paymentStatus,
      payment: result.payment,
      receiptData,
      message:
        paymentMethod === 'CASH'
          ? 'Transaksi tunai berhasil diselesaikan.'
          : 'Menunggu pembayaran QRIS.',
    });
  } catch (error: any) {
    console.error('Error saat proses transaksi:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses transaksi.' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const receiptNumber = searchParams.get('receiptNumber')?.trim();
    const paymentMethod = searchParams.get('paymentMethod') as PaymentMethod | null;
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (receiptNumber) {
      where.receiptNumber = { contains: receiptNumber };
    }
    if (paymentMethod && ['CASH', 'QRIS'].includes(paymentMethod)) {
      where.paymentMethod = paymentMethod;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00+07:00`);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59+07:00`);
      }
    }

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true } },
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedSales = sales.map((s) => ({
      ...s,
      subtotal: Number(s.subtotal),
      discountAmount: Number(s.discountAmount),
      grandTotal: Number(s.grandTotal),
      cashReceived: s.cashReceived ? Number(s.cashReceived) : null,
      changeAmount: s.changeAmount ? Number(s.changeAmount) : null,
      items: s.items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        unitCost: Number(it.unitCost),
        lineTotal: Number(it.lineTotal),
      })),
      payments: s.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formattedSales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat transaksi.' }, { status: 500 });
  }
}
