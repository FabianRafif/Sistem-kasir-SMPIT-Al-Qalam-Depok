import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Route untuk melayani file gambar QRIS toko secara handal dari folder public/
 * Menghindari kendala cache runtime Next.js dan menjamin tampil di semua shift kasir.
 */
export async function GET(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const jpgPath = path.join(publicDir, 'qris-store.jpg');
    const pngPath = path.join(publicDir, 'qris-store.png');

    let filePath = '';
    let contentType = 'image/jpeg';

    if (fs.existsSync(jpgPath)) {
      filePath = jpgPath;
      contentType = 'image/jpeg';
    } else if (fs.existsSync(pngPath)) {
      filePath = pngPath;
      contentType = 'image/png';
    } else {
      return NextResponse.json({ error: 'Foto QRIS belum diunggah.' }, { status: 404 });
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
