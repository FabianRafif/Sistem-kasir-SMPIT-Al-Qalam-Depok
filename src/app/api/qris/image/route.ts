import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Route untuk melayani gambar QRIS:
 * - ?view=full  => Menyajikan foto poster QRIS lengkap (sesuai yang diunggah admin di Pengaturan)
 * - ?view=pure (default) => Menyajikan HANYA kode QR murni (untuk kasir saat pembayaran)
 */
export async function GET(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const searchParams = req.nextUrl.searchParams;
    const view = searchParams.get('view') || searchParams.get('type') || 'pure';

    let filePath = '';
    let contentType = 'image/png';

    if (view === 'full') {
      // 1. Tampilkan Foto Poster Lengkap (GoPay / Meja Toko) untuk pratinjau di Pengaturan
      const fullJpg = path.join(publicDir, 'qris-full.jpg');
      const storeJpg = path.join(publicDir, 'qris-store.jpg');
      const storePng = path.join(publicDir, 'qris-store.png');

      if (fs.existsSync(fullJpg)) {
        filePath = fullJpg;
        contentType = 'image/jpeg';
      } else if (fs.existsSync(storeJpg)) {
        filePath = storeJpg;
        contentType = 'image/jpeg';
      } else if (fs.existsSync(storePng)) {
        filePath = storePng;
        contentType = 'image/png';
      } else {
        filePath = path.join(publicDir, 'qris-pure.png');
        contentType = 'image/png';
      }
    } else {
      // 2. Tampilkan HANYA Kode QR Murni saat transaksi pembayaran di Kasir
      const purePng = path.join(publicDir, 'qris-pure.png');
      const croppedPng = path.join(publicDir, 'qris-cropped.png');

      if (fs.existsSync(purePng)) {
        filePath = purePng;
        contentType = 'image/png';
      } else if (fs.existsSync(croppedPng)) {
        filePath = croppedPng;
        contentType = 'image/png';
      } else if (fs.existsSync(path.join(publicDir, 'qris-store.jpg'))) {
        filePath = path.join(publicDir, 'qris-store.jpg');
        contentType = 'image/jpeg';
      } else {
        return NextResponse.json({ error: 'Foto QRIS belum diunggah.' }, { status: 404 });
      }
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File QRIS tidak ditemukan.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat gambar QRIS.' }, { status: 500 });
  }
}
