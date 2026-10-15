import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PaymentStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    // Hitung awal hari ini di zona waktu Asia/Jakarta (UTC+7)
    const now = new Date();
    // Gunakan tanggal lokal Jakarta
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Ambil transaksi hari ini yang berstatus PAID
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        paymentStatus: PaymentStatus.PAID,
      },
      include: { items: true },
    });

    let todayGrossSales = 0;
    let todayCashTotal = 0;
    let todayQrisTotal = 0;
    let todayDiscountTotal = 0;

    for (const s of todaySales) {
      const grandTotal = Number(s.grandTotal);
      todayGrossSales += Number(s.subtotal);
      todayDiscountTotal += Number(s.discountAmount);
      if (s.paymentMethod === 'CASH') {
        todayCashTotal += grandTotal;
      } else if (s.paymentMethod === 'QRIS') {
        todayQrisTotal += grandTotal;
      }
    }

    const todayNetSales = todayGrossSales - todayDiscountTotal;

    // 2. Data Stok & Produk
    const [totalProducts, activeProducts, outOfStockProducts, lowStockProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { stockQty: 0, isActive: true } }),
      prisma.product.findMany({
        where: {
          isActive: true,
          stockQty: { gt: 0 },
        },
        select: { id: true, name: true, stockQty: true, minimumStock: true, unit: true },
      }),
    ]);

    const lowStockCount = lowStockProducts.filter((p) => p.stockQty <= p.minimumStock).length;

    // 3. Top 5 Produk Terlaris
    const topSaleItems = await prisma.saleItem.groupBy({
      by: ['productId', 'productName'],
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      where: {
        sale: { paymentStatus: PaymentStatus.PAID },
      },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 5,
    });

    const topSellingProducts = topSaleItems.map((item) => ({
      productId: item.productId,
      name: item.productName,
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: Number(item._sum.lineTotal || 0),
    }));

    // 4. 10 Transaksi Terakhir
    const recentTransactions = await prisma.sale.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
      },
    });

    const formattedRecent = recentTransactions.map((t) => ({
      id: t.id,
      receiptNumber: t.receiptNumber,
      cashierName: t.user.name,
      grandTotal: Number(t.grandTotal),
      paymentMethod: t.paymentMethod,
      paymentStatus: t.paymentStatus,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        todayGrossSales,
        todayNetSales,
        todayDiscountTotal,
        todayCashTotal,
        todayQrisTotal,
        todayPaidTransactionsCount: todaySales.length,
        totalProducts,
        activeProducts,
        outOfStockCount: outOfStockProducts,
        lowStockCount,
      },
      topSellingProducts,
      recentTransactions: formattedRecent,
      lowStockList: lowStockProducts.filter((p) => p.stockQty <= p.minimumStock).slice(0, 5),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Gagal memuat ringkasan dashboard.' }, { status: 500 });
  }
}
