import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PaymentStatus } from '@prisma/client';
import { sanitizeForCSV, formatDateTime } from '@/lib/format';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today'; // today | week | month | year | custom
    const customFrom = searchParams.get('dateFrom');
    const customTo = searchParams.get('dateTo');
    const format = searchParams.get('format'); // 'json' | 'csv'

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      // 7 hari terakhir
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      // Awal bulan ini
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      // Awal tahun ini
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'custom' && customFrom && customTo) {
      startDate = new Date(`${customFrom}T00:00:00+07:00`);
      endDate = new Date(`${customTo}T23:59:59+07:00`);
    }

    // Ambil seluruh penjualan dalam rentang tanggal
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
        user: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let omzetKotor = 0;
    let totalDiskon = 0;
    let totalRefund = 0;
    let totalTunai = 0;
    let totalQris = 0;
    let jumlahTransaksiLunas = 0;
    let jumlahTransaksiBatal = 0;
    let totalItemTerjual = 0;
    let totalHPP = 0; // Cost of Goods Sold

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number; cogs: number }>();

    for (const s of sales) {
      const grandTotal = Number(s.grandTotal);
      const subtotal = Number(s.subtotal);
      const discount = Number(s.discountAmount);

      if (s.paymentStatus === PaymentStatus.PAID) {
        jumlahTransaksiLunas++;
        omzetKotor += subtotal;
        totalDiskon += discount;

        if (s.paymentMethod === 'CASH') {
          totalTunai += grandTotal;
        } else if (s.paymentMethod === 'QRIS') {
          totalQris += grandTotal;
        }

        for (const item of s.items) {
          totalItemTerjual += item.quantity;
          const itemRevenue = Number(item.lineTotal);
          const itemCost = Number(item.unitCost) * item.quantity;
          totalHPP += itemCost;

          const existing = productSalesMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += itemRevenue;
            existing.cogs += itemCost;
          } else {
            productSalesMap.set(item.productId, {
              name: item.productName,
              quantity: item.quantity,
              revenue: itemRevenue,
              cogs: itemCost,
            });
          }
        }
      } else if (s.paymentStatus === PaymentStatus.CANCELLED || s.paymentStatus === PaymentStatus.REFUNDED) {
        jumlahTransaksiBatal++;
        totalRefund += grandTotal;
      }
    }

    const omzetBersih = omzetKotor - totalDiskon;
    const estimasiLabaKotor = omzetBersih - totalHPP;

    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 15);

    // Export CSV jika diminta
    if (format === 'csv') {
      const headers = [
        'No Struk',
        'Waktu (WIB)',
        'Kasir',
        'Metode Pembayaran',
        'Status',
        'Subtotal (Rp)',
        'Diskon (Rp)',
        'Total Akhir (Rp)',
      ];

      const rows = sales.map((s) => [
        sanitizeForCSV(s.receiptNumber),
        sanitizeForCSV(formatDateTime(s.createdAt)),
        sanitizeForCSV(s.user.name),
        sanitizeForCSV(s.paymentMethod),
        sanitizeForCSV(s.paymentStatus),
        sanitizeForCSV(Number(s.subtotal)),
        sanitizeForCSV(Number(s.discountAmount)),
        sanitizeForCSV(Number(s.grandTotal)),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="laporan-penjualan-alqalam-${period}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      period,
      range: {
        startDate,
        endDate,
      },
      summary: {
        omzetKotor,
        totalDiskon,
        omzetBersih,
        totalRefund,
        totalTunai,
        totalQris,
        jumlahTransaksiLunas,
        jumlahTransaksiBatal,
        totalItemTerjual,
        totalHPP,
        estimasiLabaKotor,
      },
      topSellingProducts,
      salesCount: sales.length,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Gagal menyusun laporan penjualan.' }, { status: 500 });
  }
}
