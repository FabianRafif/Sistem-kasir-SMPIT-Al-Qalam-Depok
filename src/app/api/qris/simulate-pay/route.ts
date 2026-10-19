import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { markQrisSalePaid } from '@/lib/qris';

/**
 * Endpoint Konfirmasi Pembayaran Masuk QRIS
 * Digunakan oleh kasir saat verifikasi bayar berhasil (statis / demo / live)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir. Silakan login kembali.' }, { status: 401 });
    }

    const body = await req.json();
    const { saleId } = body;

    if (!saleId) {
      return NextResponse.json({ error: 'saleId wajib disertakan.' }, { status: 400 });
    }

    const result = await markQrisSalePaid(saleId, {
      provider: 'QRIS_CONFIRMED',
      reference: `QRIS-OK-${Date.now().toString().slice(-8)}`,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saat konfirmasi QRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengonfirmasi pembayaran QRIS.' },
      { status: 500 }
    );
  }
}
