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
      message: 'Foto QRIS toko berhasil diunggah dan aktif untuk seluruh shift kasir.',
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
