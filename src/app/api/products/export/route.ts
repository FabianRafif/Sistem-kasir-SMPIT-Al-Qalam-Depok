import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sanitizeForCSV } from '@/lib/format';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'SKU',
      'Barcode',
      'Nama Produk',
      'Kategori',
      'Satuan',
      'Harga Modal',
      'Harga Jual',
      'Stok Saat Ini',
      'Stok Minimum',
      'Status Aktif',
    ];

    const rows = products.map((p) => [
      sanitizeForCSV(p.sku),
      sanitizeForCSV(p.barcode || ''),
      sanitizeForCSV(p.name),
      sanitizeForCSV(p.category.name),
      sanitizeForCSV(p.unit),
      sanitizeForCSV(Number(p.costPrice)),
      sanitizeForCSV(Number(p.sellingPrice)),
      sanitizeForCSV(p.stockQty),
      sanitizeForCSV(p.minimumStock),
      sanitizeForCSV(p.isActive ? 'Aktif' : 'Nonaktif'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="produk-pos-alqalam-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengekspor data produk.' }, { status: 500 });
  }
}
