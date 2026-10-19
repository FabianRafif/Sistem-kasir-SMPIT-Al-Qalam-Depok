import prisma from '@/lib/prisma';
import { MovementType, PaymentStatus } from '@prisma/client';
import { formatDateOnly, formatTimeOnly } from '@/lib/format';

export async function markQrisSalePaid(
  saleId: string,
  options?: { provider?: string; reference?: string; eventId?: string }
) {
  const sale = await prisma.sale.findFirst({
    where: {
      OR: [{ id: saleId }, { receiptNumber: saleId }],
    },
    include: {
      items: true,
      payments: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!sale) {
    throw new Error(`Transaksi dengan ID / No Struk "${saleId}" tidak ditemukan.`);
  }

  const storeSetting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });

  // Jika sudah lunas, langsung kembalikan receiptData
  if (sale.paymentStatus === PaymentStatus.PAID) {
    const payment = sale.payments[0];
    return {
      success: true,
      alreadyPaid: true,
      receiptNumber: sale.receiptNumber,
      saleId: sale.id,
      receiptData: {
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
      },
    };
  }

  const reference = options?.reference || `QRIS-${Date.now().toString().slice(-8)}`;
  const provider = options?.provider || 'QRIS_MERCHANT';

  // Eksekusi atomik pembaruan transaksi & pengurangan stok
  await prisma.$transaction(async (tx) => {
    // 1. Update status Penjualan menjadi PAID
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    // 2. Update status Payment Record menjadi PAID
    await tx.payment.updateMany({
      where: { saleId: sale.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        providerReference: reference,
      },
    });

    // 3. Kurangi stok produk secara fisik dan catat mutasi stok
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

    // 4. Catat Log Konfirmasi Webhook
    const eventId = options?.eventId || `CONFIRM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await tx.paymentWebhookEvent.create({
      data: {
        provider,
        eventId,
        payloadHash: 'INTERNAL_CONFIRMATION',
        payload: JSON.stringify({ saleId: sale.id, reference, confirmedAt: new Date() }),
        processingStatus: 'SUCCESS',
        processedAt: new Date(),
      },
    });
  });

  return {
    success: true,
    message: `Pembayaran QRIS untuk struk ${sale.receiptNumber} berhasil dikonfirmasi.`,
    receiptNumber: sale.receiptNumber,
    saleId: sale.id,
    receiptData: {
      receiptNumber: sale.receiptNumber,
      storeName: storeSetting?.storeName || 'Kantin & Minimarket SMPIT Al Qalam',
      schoolName: storeSetting?.schoolName || 'SMPIT Al Qalam',
      address: storeSetting?.address || '',
      phone: storeSetting?.phone || '',
      cashierName: sale.user.name,
      date: formatDateOnly(new Date()),
      time: formatTimeOnly(new Date()),
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
      qrisReference: reference,
      footerNotes: storeSetting?.receiptFooter || '',
      paperSize: storeSetting?.printerPaperSize || '58mm',
    },
  };
}
