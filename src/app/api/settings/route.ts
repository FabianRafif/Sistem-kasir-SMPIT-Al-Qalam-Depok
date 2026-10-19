import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, authenticateRequest } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { QrisMode } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    // Jika belum ada gambar QRIS yang diunggah, jangan diisi otomatis (tetap null)
    const currentImage = settings?.qrisStaticImage || null;
    const currentPureImage = settings?.qrisPureImage || null;

    const payloadFile = path.join(process.cwd(), 'public', 'qris-payload.txt');
    const qrisPayload =
      settings?.qrisPayload ||
      (fs.existsSync(payloadFile) ? fs.readFileSync(payloadFile, 'utf-8').trim() : '');

    const data = settings
      ? {
          ...settings,
          qrisStaticImage: currentImage,
          qrisPureImage: currentPureImage,
          qrisMode: currentImage ? settings.qrisMode || 'STATIC' : 'DYNAMIC',
          qrisPayload,
        }
      : {
          storeName: 'Kantin & Minimarket SMPIT Al Qalam',
          schoolName: 'SMPIT Al Qalam',
          address: 'Kompleks Pendidikan Islam Terpadu Al Qalam',
          phone: '(021) 7755912',
          receiptFooter: 'Terima kasih telah berbelanja di Minimarket SMPIT Al Qalam.',
          logoPath: '/logo-alqalam.png',
          timezone: 'Asia/Jakarta',
          printerPaperSize: '58mm',
          qrisMode: 'DYNAMIC',
          qrisStaticImage: null,
          qrisPureImage: null,
          qrisPayload: '',
        };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat pengaturan toko.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = (await authenticateRequest(req)) || (await getCurrentUser());
    if (user && user.role !== 'ADMIN' && user.role !== 'CASHIER') {
      return NextResponse.json({ error: 'Hanya administrator atau pengelola yang berwenang mengubah pengaturan.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      storeName,
      schoolName,
      address,
      phone,
      receiptFooter,
      logoPath,
      printerPaperSize,
      qrisMode,
      qrisStaticImage,
      qrisPureImage,
      qrisPayload,
    } = body;

    const updated = await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        ...(storeName && { storeName }),
        ...(schoolName && { schoolName }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(receiptFooter !== undefined && { receiptFooter }),
        ...(logoPath && { logoPath }),
        ...(printerPaperSize && { printerPaperSize }),
        ...(qrisMode && { qrisMode: qrisMode as QrisMode }),
        ...(qrisStaticImage !== undefined && { qrisStaticImage }),
        ...(qrisPureImage !== undefined && { qrisPureImage }),
        ...(qrisPayload !== undefined && { qrisPayload }),
      },
      create: {
        id: 'default',
        storeName: storeName || 'Kantin & Minimarket SMPIT Al Qalam',
        schoolName: schoolName || 'SMPIT Al Qalam',
        address,
        phone,
        receiptFooter,
        logoPath: logoPath || '/logo-alqalam.png',
        printerPaperSize: printerPaperSize || '58mm',
        qrisMode: (qrisMode as QrisMode) || QrisMode.DYNAMIC,
        qrisStaticImage,
        qrisPureImage,
        qrisPayload,
      },
    });

    if (user) {
      await logAudit({
        userId: user.id,
        action: 'SETTINGS_UPDATE',
        entityType: 'STORE_SETTING',
        entityId: 'default',
        details: body,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan toko berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui pengaturan toko.' }, { status: 500 });
  }
}
