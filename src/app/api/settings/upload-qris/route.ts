import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya administrator yang berwenang mengunggah QRIS toko.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File gambar QRIS tidak ditemukan.' }, { status: 400 });
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus berupa gambar (JPG/PNG/WebP).' }, { status: 400 });
    }

    // Simpan file ke folder public/
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePathJpg = path.join(publicDir, 'qris-store.jpg');
    const filePathPng = path.join(publicDir, 'qris-store.png');

    fs.writeFileSync(filePathJpg, buffer);
    fs.writeFileSync(filePathPng, buffer);

    // Otomatis ekstrak dan generate kode QR murni (QR-nya saja)
    try {
      const { Jimp } = await import('jimp');
      const jsQR = (await import('jsqr')).default;
      const QRCode = (await import('qrcode')).default;

      const image = await Jimp.read(buffer);
      const width = image.bitmap.width;
      const height = image.bitmap.height;

      let qr = jsQR(new Uint8ClampedArray(image.bitmap.data), width, height);
      if (!qr) {
        // Coba deteksi di area tengah (70%)
        const cx = Math.floor(width * 0.15);
        const cy = Math.floor(height * 0.25);
        const cw = Math.floor(width * 0.7);
        const ch = Math.floor(height * 0.55);
        image.crop({ x: cx, y: cy, w: cw, h: ch });
        qr = jsQR(new Uint8ClampedArray(image.bitmap.data), image.bitmap.width, image.bitmap.height);
      }

      if (qr && qr.data) {
        fs.writeFileSync(path.join(publicDir, 'qris-payload.txt'), qr.data);
        const purePngPath = path.join(publicDir, 'qris-pure.png');
        await QRCode.toFile(purePngPath, qr.data, {
          width: 600,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } else {
        // Jika tidak dapat didecode, jadikan gambar unggahan sebagai qris-pure.png
        fs.writeFileSync(path.join(publicDir, 'qris-pure.png'), buffer);
      }
    } catch (qrErr) {
      console.warn('Gagal ekstrak otomatis QR:', qrErr);
      fs.writeFileSync(path.join(publicDir, 'qris-pure.png'), buffer);
    }

    const imageUrl = `/api/qris/image?t=${Date.now()}`;

    // Update ke database store settings
    await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        qrisStaticImage: '/api/qris/image',
        qrisMode: 'STATIC',
      },
      create: {
        id: 'default',
        qrisStaticImage: '/api/qris/image',
        qrisMode: 'STATIC',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Foto QRIS toko berhasil diekstrak menjadi kode QR murni dan aktif untuk seluruh shift kasir.',
      url: imageUrl,
    });
  } catch (error: any) {
    console.error('Error saat upload QRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan foto QRIS.' },
      { status: 500 }
    );
  }
}
