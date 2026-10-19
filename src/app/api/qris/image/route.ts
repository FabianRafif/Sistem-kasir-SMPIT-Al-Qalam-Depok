import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Route untuk melayani file QRIS toko (murni QR code saja)
 * Menampilkan kode QR bersih tanpa background poster luar
 */
export async function GET(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const purePngPath = path.join(publicDir, 'qris-pure.png');
    const croppedPngPath = path.join(publicDir, 'qris-cropped.png');
    const pngPath = path.join(publicDir, 'qris-store.png');
    const jpgPath = path.join(publicDir, 'qris-store.jpg');

    let filePath = '';
    let contentType = 'image/png';

    // Prioritaskan file QR murni jika sudah diekstrak
    if (fs.existsSync(purePngPath)) {
      filePath = purePngPath;
      contentType = 'image/png';
    } else if (fs.existsSync(croppedPngPath)) {
      filePath = croppedPngPath;
      contentType = 'image/png';
    } else if (fs.existsSync(pngPath)) {
      filePath = pngPath;
      contentType = 'image/png';
    } else if (fs.existsSync(jpgPath)) {
      filePath = jpgPath;
      contentType = 'image/jpeg';
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
