import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { Role } from '@prisma/client';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').trim(),
  username: z.string().min(3, 'Username minimal 3 karakter').trim(),
  email: z.string().email('Format email tidak valid').optional().nullable(),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'CASHIER']),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang berwenang mengakses data pengguna.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat pengguna.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang berwenang menambah pengguna.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input pengguna tidak valid.' },
        { status: 400 }
      );
    }

    const { name, username, email, password, role } = parsed.data;

    // Cek username unik
    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      return NextResponse.json({ error: `Username "${username}" sudah terdaftar.` }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        email: email || null,
        passwordHash,
        role: role as Role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: newUser.id,
      details: { username: newUser.username, role: newUser.role },
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna "${newUser.name}" berhasil didaftarkan.`,
      data: newUser,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat pengguna baru.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang berwenang mengubah pengguna.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, isActive, role, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Pengguna wajib diisi.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (role && ['ADMIN', 'CASHIER'].includes(role)) updateData.role = role;
    if (newPassword && newPassword.length >= 6) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await logAudit({
      userId: user.id,
      action: 'USER_UPDATE',
      entityType: 'USER',
      entityId: id,
      details: { username: targetUser.username, changes: updateData },
    });

    return NextResponse.json({
      success: true,
      message: `Data pengguna "${updated.name}" berhasil diperbarui.`,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui pengguna.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya administrator yang berwenang menghapus pengguna.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID Pengguna wajib disertakan.' }, { status: 400 });
    }

    // Tidak boleh menghapus akun sendiri yang sedang login
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang login.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true, shifts: true, stockMovements: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Proteksi jika akun memiliki riwayat transaksi penjualan riil
    if (targetUser._count.sales > 0) {
      return NextResponse.json(
        {
          error: `Akun "${targetUser.name}" tidak dapat dihapus permanen karena memiliki riwayat ${targetUser._count.sales} transaksi penjualan. Anda dapat tetap menonaktifkannya.`,
        },
        { status: 400 }
      );
    }

    // Putuskan relasi audit log sebelum menghapus
    await prisma.auditLog.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    await prisma.user.delete({
      where: { id },
    });

    await logAudit({
      userId: user.id,
      action: 'USER_DELETE',
      entityType: 'USER',
      entityId: id,
      details: { username: targetUser.username, name: targetUser.name },
    });

    return NextResponse.json({
      success: true,
      message: `Akun pengguna "${targetUser.name}" berhasil dihapus permanen.`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus pengguna.' },
      { status: 500 }
    );
  }
}

