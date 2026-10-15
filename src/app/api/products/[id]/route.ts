import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter').trim().optional(),
  barcode: z.string().trim().nullable().optional(),
  sku: z.string().trim().optional(),
  categoryId: z.string().min(1).optional(),
  unit: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, username: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat produk.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input pembaruan tidak valid' },
        { status: 400 }
      );
    }

    const currentProduct = await prisma.product.findUnique({ where: { id } });
    if (!currentProduct) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    const updateData = parsed.data;

    // Cek duplikasi Barcode jika diubah
    if (updateData.barcode !== undefined && updateData.barcode !== currentProduct.barcode) {
      if (updateData.barcode) {
        const duplicate = await prisma.product.findFirst({
          where: {
            barcode: updateData.barcode,
            id: { not: id },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: `Barcode "${updateData.barcode}" sudah digunakan oleh "${duplicate.name}".` },
            { status: 409 }
          );
        }
      }
    }

    // Cek duplikasi SKU jika diubah
    if (updateData.sku && updateData.sku !== currentProduct.sku) {
      const duplicateSku = await prisma.product.findFirst({
        where: {
          sku: updateData.sku,
          id: { not: id },
        },
      });
      if (duplicateSku) {
        return NextResponse.json(
          { error: `SKU "${updateData.sku}" sudah digunakan oleh "${duplicateSku.name}".` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.barcode !== undefined && { barcode: updateData.barcode }),
        ...(updateData.sku && { sku: updateData.sku }),
        ...(updateData.categoryId && { categoryId: updateData.categoryId }),
        ...(updateData.unit && { unit: updateData.unit }),
        ...(updateData.costPrice !== undefined && { costPrice: updateData.costPrice }),
        ...(updateData.sellingPrice !== undefined && { sellingPrice: updateData.sellingPrice }),
        ...(updateData.minimumStock !== undefined && { minimumStock: updateData.minimumStock }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // Catat audit log perbandingan perubahan
    await logAudit({
      userId: user.id,
      action: 'PRODUCT_UPDATE',
      entityType: 'PRODUCT',
      entityId: id,
      details: {
        old: {
          name: currentProduct.name,
          costPrice: Number(currentProduct.costPrice),
          sellingPrice: Number(currentProduct.sellingPrice),
          isActive: currentProduct.isActive,
        },
        new: {
          name: updated.name,
          costPrice: Number(updated.costPrice),
          sellingPrice: Number(updated.sellingPrice),
          isActive: updated.isActive,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        costPrice: Number(updated.costPrice),
        sellingPrice: Number(updated.sellingPrice),
      },
      message: 'Data produk berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('Error update product:', error);
    return NextResponse.json({ error: 'Gagal memperbarui produk.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang berwenang menonaktifkan produk.' }, { status: 403 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { saleItems: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    // Jika produk sudah memiliki riwayat penjualan, nonaktifkan saja untuk menjaga integritas transaksi masa lalu
    if (product._count.saleItems > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit({
        userId: user.id,
        action: 'PRODUCT_DEACTIVATE',
        entityType: 'PRODUCT',
        entityId: id,
        details: { reason: 'Produk memiliki riwayat penjualan, dinonaktifkan secara aman.' },
      });

      return NextResponse.json({
        success: true,
        message: `Produk "${product.name}" telah dinonaktifkan untuk menjaga riwayat transaksi.`,
      });
    }

    // Jika belum pernah dijual, boleh dihapus
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    await logAudit({
      userId: user.id,
      action: 'PRODUCT_DELETE',
      entityType: 'PRODUCT',
      entityId: id,
      details: { name: product.name },
    });

    return NextResponse.json({
      success: true,
      message: `Produk "${product.name}" berhasil dihapus.`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus produk.' }, { status: 500 });
  }
}
