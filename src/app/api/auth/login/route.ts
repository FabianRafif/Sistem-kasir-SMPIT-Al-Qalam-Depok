import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, resetRateLimit, logAudit } from '@/lib/security';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi').trim(),
  password: z.string().min(1, 'Password wajib diisi'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`login_${ip}`, 5, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login yang gagal. Silakan tunggu 1 menit.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input tidak valid' },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Cari user berdasarkan username atau email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: username }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Akun Anda dinonaktifkan. Silakan hubungi administrator.' },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      );
    }

    // Reset rate limiter setelah login berhasil
    resetRateLimit(`login_${ip}`);

    const sessionPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Catat audit login
    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      user: sessionPayload,
      message: 'Login berhasil.',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses login.' },
      { status: 500 }
    );
  }
}
