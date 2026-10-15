import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await logAudit({
        userId: user.id,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: user.id,
        details: { username: user.username },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    }

    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Logout berhasil.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout.' },
      { status: 500 }
    );
  }
}
