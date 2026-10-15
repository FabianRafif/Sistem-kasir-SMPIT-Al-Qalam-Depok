import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDateOnly, formatTimeOnly } from '@/lib/format';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir.' }, { status: 401 });
    }

    const { id } = await params; // id adalah saleId atau paymentId
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { payments: { some: { id } } }],
      },
      include: {
        payments: true,
        user: { select: { name: true } },
        items: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    const payment = sale.payments[0];
    const storeSetting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });

    const isPaid = sale.paymentStatus === 'PAID';

    return NextResponse.json({
      success: true,
      saleId: sale.id,
      receiptNumber: sale.receiptNumber,
      status: sale.paymentStatus,
      isPaid,
      amount: Number(sale.grandTotal),
      paidAt: sale.paidAt,
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            providerReference: payment.providerReference,
            qrCodeData: payment.qrCodeData,
          }
        : null,
      receiptData: isPaid
        ? {
            receiptNumber: sale.receiptNumber,
            storeName: storeSetting?.storeName || 'Kantin & Minimarket SMPIT Al Qalam',
            schoolName: storeSetting?.schoolName || 'SMPIT Al Qalam',
            address: storeSetting?.address || '',
            phone: storeSetting?.phone || '',
            cashierName: sale.user.name,
            date: formatDateOnly(sale.paidAt || sale.createdAt),
            time: formatTimeOnly(sale.paidAt || sale.createdAt),
            items: sale.items.map((i) => ({
              name: i.productName,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
              lineTotal: Number(i.lineTotal),
            })),
            subtotal: Number(sale.subtotal),
            discountAmount: Number(sale.discountAmount),
            grandTotal: Number(sale.grandTotal),
            paymentMethod: 'QRIS',
            qrisReference: payment?.providerReference || 'QRIS-VERIFIED',
            footerNotes: storeSetting?.receiptFooter || '',
            paperSize: storeSetting?.printerPaperSize || '58mm',
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengecek status QRIS.' }, { status: 500 });
  }
}
