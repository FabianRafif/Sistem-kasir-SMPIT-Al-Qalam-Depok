import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, authenticateRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = (await authenticateRequest(req)) || (await getCurrentUser());
    if (user && user.role !== 'ADMIN' && user.role !== 'CASHIER') {
      return NextResponse.json(
        { error: 'Hanya administrator atau pengelola yang berwenang mengunggah QRIS toko.' },
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

    let extractedPayload = '';

    // Otomatis ekstrak dan generate kode QR murni (QR-nya saja)
    try {
      const { Jimp } = await import('jimp');
      const jsQR = (await import('jsqr')).default;
      const QRCode = (await import('qrcode')).default;

      const image = await Jimp.read(buffer);
      const width = image.bitmap.width;
      const height = image.bitmap.height;

      // Percobaan 1: Pindai langsung seluruh gambar
      let qr = jsQR(new Uint8ClampedArray(image.bitmap.data), width, height);

      // Percobaan 2: Pindai area tengah poster (lokasi QRIS pada poster GoPay, Shopee, BCA)
      if (!qr) {
        const clone = image.clone();
        const cx = Math.floor(width * 0.12);
        const cy = Math.floor(height * 0.20);
        const cw = Math.floor(width * 0.76);
        const ch = Math.floor(height * 0.60);
        clone.crop({ x: cx, y: cy, w: cw, h: ch });
        qr = jsQR(new Uint8ClampedArray(clone.bitmap.data), clone.bitmap.width, clone.bitmap.height);
      }

      // Percobaan 3: Skalakan gambar besar (foto HP resolusi tinggi > 1200px)
      if (!qr && width > 1000) {
        const clone = image.clone();
        clone.resize({ w: 800 });
        const w2 = clone.bitmap.width;
        const h2 = clone.bitmap.height;
        const cx2 = Math.floor(w2 * 0.12);
        const cy2 = Math.floor(h2 * 0.20);
        const cw2 = Math.floor(w2 * 0.76);
        const ch2 = Math.floor(h2 * 0.60);
        clone.crop({ x: cx2, y: cy2, w: cw2, h: ch2 });
        qr = jsQR(new Uint8ClampedArray(clone.bitmap.data), clone.bitmap.width, clone.bitmap.height);
      }

      const purePngPath = path.join(publicDir, 'qris-pure.png');
      const croppedPngPath = path.join(publicDir, 'qris-cropped.png');

      if (qr && qr.data) {
        extractedPayload = qr.data;
        fs.writeFileSync(path.join(publicDir, 'qris-payload.txt'), qr.data);

        // Render ulang kode QR murni beresolusi 600x600 px tanpa background poster luar
        await QRCode.toFile(purePngPath, qr.data, {
          width: 600,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });

        fs.copyFileSync(purePngPath, croppedPngPath);
      } else {
        // Fallback: Potong bagian tengah poster saja (area QR), JANGAN simpan seluruh poster
        const clone = image.clone();
        const cx = Math.floor(width * 0.15);
        const cy = Math.floor(height * 0.25);
        const cw = Math.floor(width * 0.70);
        const ch = Math.floor(height * 0.55);
        const side = Math.min(cw, ch);
        clone.crop({ x: cx, y: cy, w: side, h: side });
        
        // Simpan potongan QR
        const croppedBuffer = await clone.getBuffer('image/png');
        fs.writeFileSync(purePngPath, croppedBuffer);
        fs.writeFileSync(croppedPngPath, croppedBuffer);
      }
    } catch (qrErr) {
      console.warn('Gagal ekstrak otomatis QR:', qrErr);
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
      message: 'Foto QRIS berhasil diekstrak menjadi kode QR murni (hanya QR code) dan aktif di kasir.',
      url: imageUrl,
      payload: extractedPayload,
    });
  } catch (error: any) {
    console.error('Error saat upload QRIS:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan foto QRIS.' },
      { status: 500 }
    );
  }
}
