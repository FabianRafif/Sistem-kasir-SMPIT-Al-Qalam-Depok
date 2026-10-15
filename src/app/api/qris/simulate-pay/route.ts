import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * Endpoint Simulasi Pembayaran QRIS (Sandbox / Lingkungan Demo Sekolah)
 * Memungkinkan kasir dan penguji mengonfirmasi pelunasan QRIS secara aman saat demo
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sesi kasir berakhir.' }, { status: 401 });
    }

    const body = await req.json();
    const { saleId } = body;

    if (!saleId) {
      return NextResponse.json({ error: 'saleId wajib disertakan.' }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    // Panggil webhook internal secara terverifikasi
    const mockWebhookPayload = {
      eventId: `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      provider: 'SIMULATOR',
      saleId: sale.id,
      amount: Number(sale.grandTotal),
      status: 'PAID',
      status_code: '200',
      reference: `QRIS-SIM-${Date.now().toString().slice(-8)}`,
    };

    const webhookUrl = new URL('/api/qris/webhook', req.url).toString();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookPayload),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saat simulasi QRIS:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimulasikan pembayaran QRIS.' }, { status: 500 });
  }
}
