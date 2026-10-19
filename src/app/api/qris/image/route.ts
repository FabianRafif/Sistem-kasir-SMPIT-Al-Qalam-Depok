import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Route untuk melayani gambar QRIS:
 * - ?view=full  => Menyajikan foto poster QRIS lengkap (dari database atau public/)
 * - ?view=pure (default) => Menyajikan HANYA kode QR murni (untuk kasir saat checkout)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const view = searchParams.get('view') || searchParams.get('type') || 'pure';

    // 1. Coba ambil dari Database MySQL (Sumber Utama yang Kebal Deployment)
    const setting = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    const targetDataUri = view === 'full' ? setting?.qrisStaticImage : setting?.qrisPureImage;

    if (targetDataUri && targetDataUri.startsWith('data:image/')) {
      const match = targetDataUri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Length': buffer.length.toString(),
          },
        });
      }
    }

    // 2. Fallback ke Filesystem di public/
    const publicDir = path.join(process.cwd(), 'public');
    let filePath = '';
    let contentType = 'image/png';

    if (view === 'full') {
      const fullJpg = path.join(publicDir, 'qris-full.jpg');
      const storeJpg = path.join(publicDir, 'qris-store.jpg');
      if (fs.existsSync(fullJpg)) {
        filePath = fullJpg;
        contentType = 'image/jpeg';
      } else if (fs.existsSync(storeJpg)) {
        filePath = storeJpg;
        contentType = 'image/jpeg';
      }
    } else {
      const purePng = path.join(publicDir, 'qris-pure.png');
      const croppedPng = path.join(publicDir, 'qris-cropped.png');
      if (fs.existsSync(purePng)) {
        filePath = purePng;
        contentType = 'image/png';
      } else if (fs.existsSync(croppedPng)) {
        filePath = croppedPng;
        contentType = 'image/png';
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: 'Foto QRIS belum diunggah.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat gambar QRIS.' }, { status: 500 });
  }
}
