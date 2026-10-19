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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Simpan foto poster penuh sebagai Data URI Base64 untuk persistensi database yang kebal deployment
    const mimeType = file.type || 'image/jpeg';
    const base64FullImage = `data:${mimeType};base64,${buffer.toString('base64')}`;

    let extractedPayload = '';
    let base64PureImage = '';

    // 2. Ekstrak kode QR murni dari poster
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

      if (qr && qr.data) {
        extractedPayload = qr.data;
        const purePngBuffer = await QRCode.toBuffer(qr.data, {
          width: 600,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        base64PureImage = `data:image/png;base64,${purePngBuffer.toString('base64')}`;
      } else {
        // Fallback: Potong bagian tengah poster saja (area QR)
        const clone = image.clone();
        const cx = Math.floor(width * 0.15);
        const cy = Math.floor(height * 0.25);
        const cw = Math.floor(width * 0.70);
        const ch = Math.floor(height * 0.55);
        const side = Math.min(cw, ch);
        clone.crop({ x: cx, y: cy, w: side, h: side });
        const croppedBuffer = await clone.getBuffer('image/png');
        base64PureImage = `data:image/png;base64,${croppedBuffer.toString('base64')}`;
      }
    } catch (qrErr) {
      console.warn('Gagal ekstrak otomatis QR:', qrErr);
      base64PureImage = base64FullImage;
    }

    // 3. Simpan ke Database MySQL (Langsung persisten, tidak hilang saat deploy ulang)
    await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        qrisStaticImage: base64FullImage,
        qrisPureImage: base64PureImage,
        qrisPayload: extractedPayload || undefined,
        qrisMode: 'STATIC',
      },
      create: {
        id: 'default',
        qrisStaticImage: base64FullImage,
        qrisPureImage: base64PureImage,
        qrisPayload: extractedPayload,
        qrisMode: 'STATIC',
      },
    });

    // 4. Cache ke filesystem jika folder public/ dapat ditulis
    try {
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicDir, 'qris-full.jpg'), buffer);
      fs.writeFileSync(path.join(publicDir, 'qris-store.jpg'), buffer);
      if (extractedPayload) {
        fs.writeFileSync(path.join(publicDir, 'qris-payload.txt'), extractedPayload);
      }
    } catch (fsErr) {
      // Abaikan jika lingkungan serverless/read-only filesystem
    }

    return NextResponse.json({
      success: true,
      message: 'Foto poster QRIS berhasil diunggah dan disimpan ke database.',
      url: base64FullImage,
      pureUrl: base64PureImage,
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
