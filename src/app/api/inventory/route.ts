import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { MovementType } from '@prisma/client';
import { z } from 'zod';

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  movementType: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().min(1, 'Jumlah perubahan minimal 1'),
  reason: z.string().min(3, 'Alasan perubahan stok wajib diisi minimal 3 karakter').trim(),
  referenceId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const movementType = searchParams.get('movementType') as MovementType | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (movementType) where.movementType = movementType;

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true, stockQty: true, costPrice: true },
          },
          user: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Hitung total nilai persediaan berdasarkan harga modal
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { stockQty: true, costPrice: true },
    });

    let totalInventoryValue = 0;
    for (const p of products) {
      totalInventoryValue += p.stockQty * Number(p.costPrice);
    }

    return NextResponse.json({
      success: true,
      data: movements.map((m) => ({
        ...m,
        product: {
          ...m.product,
          costPrice: Number(m.product.costPrice),
        },
      })),
      totalInventoryValue,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat mutasi inventaris.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = stockAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input penyesuaian stok tidak valid.' },
        { status: 400 }
      );
    }

    const { productId, movementType, quantity, reason, referenceId } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    // Tentukan delta stok
    let delta = 0;
    if (movementType === 'IN') {
      delta = quantity;
    } else if (movementType === 'OUT') {
      if (product.stockQty < quantity) {
        return NextResponse.json(
          { error: `Stok saat ini (${product.stockQty}) tidak mencukupi untuk pengurangan ${quantity}.` },
          { status: 400 }
        );
      }
      delta = -quantity;
    } else if (movementType === 'ADJUSTMENT') {
      // Penyesuaian stok langsung ke angka baru (atau selisih)
      delta = quantity - product.stockQty;
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          stockQty: { increment: delta },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          userId: user.id,
          movementType: movementType as MovementType,
          quantityChange: delta,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: referenceId || `ADJ-${Date.now()}`,
          reason,
        },
      });

      return updated;
    });

    await logAudit({
      userId: user.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'PRODUCT',
      entityId: productId,
      details: {
        productName: product.name,
        previousStock: product.stockQty,
        newStock: updatedProduct.stockQty,
        delta,
        movementType,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Stok produk "${product.name}" berhasil disesuaikan menjadi ${updatedProduct.stockQty} ${product.unit}.`,
      product: updatedProduct,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyesuaikan stok.' }, { status: 500 });
  }
}
