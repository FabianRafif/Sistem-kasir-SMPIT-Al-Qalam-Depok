import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang dapat mengubah kategori.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 });
    }

    // Cek duplikasi nama kategori lain
    const existing = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Nama kategori ini sudah digunakan oleh kategori lain.' }, { status: 409 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    await logAudit({
      userId: user.id,
      action: 'CATEGORY_UPDATE',
      entityType: 'CATEGORY',
      entityId: id,
      details: { name: updated.name },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui kategori.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang dapat menghapus kategori.' }, { status: 403 });
    }

    const { id } = await params;

    // Cek apakah masih ada produk yang menggunakan kategori ini
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Kategori ini tidak dapat dihapus karena masih digunakan oleh ${productCount} produk. Pindahkan atau hapus produk terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    const deleted = await prisma.category.delete({
      where: { id },
    });

    await logAudit({
      userId: user.id,
      action: 'CATEGORY_DELETE',
      entityType: 'CATEGORY',
      entityId: id,
      details: { name: deleted.name },
    });

    return NextResponse.json({
      success: true,
      message: `Kategori "${deleted.name}" berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus kategori.' }, { status: 500 });
  }
}
