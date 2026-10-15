import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit, generateInternalBarcode } from '@/lib/security';
import { MovementType } from '@prisma/client';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter').trim(),
  barcode: z.string().trim().nullable().optional(),
  sku: z.string().trim().optional(),
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  unit: z.string().default('pcs'),
  costPrice: z.number().min(0, 'Harga modal tidak boleh negatif'),
  sellingPrice: z.number().min(0, 'Harga jual tidak boleh negatif'),
  stockQty: z.number().int().min(0, 'Stok awal tidak boleh negatif').default(0),
  minimumStock: z.number().int().min(0, 'Stok minimum tidak boleh negatif').default(5),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('category');
    const stockFilter = searchParams.get('stock'); // 'all' | 'low' | 'out' | 'available'
    const statusFilter = searchParams.get('status'); // 'all' | 'active' | 'inactive'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (statusFilter === 'active') {
      where.isActive = true;
    } else if (statusFilter === 'inactive') {
      where.isActive = false;
    }

    if (stockFilter === 'out') {
      where.stockQty = 0;
    } else if (stockFilter === 'available') {
      where.stockQty = { gt: 0 };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    // Format Decimal ke Number untuk serialisasi JSON yang rapi
    const formattedProducts = products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      isLowStock: p.stockQty <= p.minimumStock && p.stockQty > 0,
      isOutOfStock: p.stockQty <= 0,
    }));

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar produk' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validasi formulir produk gagal' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Generate SKU otomatis jika kosong
    let sku = data.sku?.trim();
    if (!sku) {
      sku = `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
    }

    // Cek duplikasi SKU
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });
    if (existingSku) {
      return NextResponse.json({ error: `SKU "${sku}" sudah digunakan oleh produk lain.` }, { status: 409 });
    }

    // Cek duplikasi Barcode jika diisi
    let barcode = data.barcode ? data.barcode.trim() : null;
    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode },
      });
      if (existingBarcode) {
        return NextResponse.json(
          { error: `Barcode "${barcode}" sudah terdaftar untuk produk "${existingBarcode.name}".` },
          { status: 409 }
        );
      }
    }

    // Buat produk dan catat mutasi stok awal secara atomik
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          sku,
          barcode,
          categoryId: data.categoryId,
          unit: data.unit,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          stockQty: data.stockQty,
          minimumStock: data.minimumStock,
          isActive: data.isActive,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      });

      if (data.stockQty > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId: user.id,
            movementType: MovementType.INITIAL,
            quantityChange: data.stockQty,
            referenceType: 'MANUAL_ENTRY',
            referenceId: product.id,
            reason: 'Pendaftaran produk baru dengan stok awal',
          },
        });
      }

      return product;
    });

    // Catat audit log
    await logAudit({
      userId: user.id,
      action: 'PRODUCT_CREATE',
      entityType: 'PRODUCT',
      entityId: newProduct.id,
      details: {
        name: newProduct.name,
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        sellingPrice: Number(newProduct.sellingPrice),
        costPrice: Number(newProduct.costPrice),
        stockQty: newProduct.stockQty,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newProduct,
        costPrice: Number(newProduct.costPrice),
        sellingPrice: Number(newProduct.sellingPrice),
      },
      message: `Produk "${newProduct.name}" berhasil ditambahkan.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saat membuat produk:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan produk.' }, { status: 500 });
  }
}
