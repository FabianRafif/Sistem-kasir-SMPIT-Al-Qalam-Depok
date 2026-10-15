import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * Endpoint Khusus Barcode Scanner USB
 * Mengutamakan latensi ultra rendah dan penanganan kode yang presisi (termasuk nol di awal)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir.' }, { status: 401 });
    }

    const body = await req.json();
    let { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { found: false, reason: 'INVALID_INPUT', message: 'Kode barcode tidak valid.' },
        { status: 400 }
      );
    }

    // Bersihkan terminator scanner (Enter \r, \n, Tab \t) tetapi pertahankan string asli & nol di awal!
    code = code.replace(/[\r\n\t]/g, '').trim();

    if (!code) {
      return NextResponse.json(
        { found: false, reason: 'EMPTY_CODE', message: 'Kode barcode kosong.' },
        { status: 400 }
      );
    }

    // Cari produk berdasarkan exact barcode ATAU exact SKU
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ barcode: code }, { sku: code }],
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          found: false,
          code,
          reason: 'NOT_FOUND',
          message: `Barcode "${code}" belum terdaftar di database.`,
        },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        {
          found: false,
          code,
          reason: 'INACTIVE',
          productName: product.name,
          message: `Produk "${product.name}" sedang berstatus nonaktif.`,
        },
        { status: 400 }
      );
    }

    if (product.stockQty <= 0) {
      return NextResponse.json(
        {
          found: true,
          product: {
            ...product,
            costPrice: Number(product.costPrice),
            sellingPrice: Number(product.sellingPrice),
          },
          reason: 'OUT_OF_STOCK',
          message: `Stok produk "${product.name}" saat ini habis (0 ${product.unit}).`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      found: true,
      reason: 'AVAILABLE',
      product: {
        ...product,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
      },
      message: `Produk "${product.name}" berhasil dipindai.`,
    });
  } catch (error) {
    console.error('Error saat scan barcode:', error);
    return NextResponse.json(
      { found: false, reason: 'SERVER_ERROR', message: 'Terjadi kesalahan sistem saat memproses scan.' },
      { status: 500 }
    );
  }
}
