import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { QrisMode } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    const publicQrisExists =
      fs.existsSync(path.join(process.cwd(), 'public', 'qris-store.jpg')) ||
      fs.existsSync(path.join(process.cwd(), 'public', 'qris-full.jpg')) ||
      fs.existsSync(path.join(process.cwd(), 'public', 'qris-store.png'));
    const defaultQris = publicQrisExists ? '/api/qris/image?view=full' : null;

    let currentImage = settings?.qrisStaticImage;
    if (currentImage === '/qris-store.jpg' || currentImage === '/api/qris/image') {
      currentImage = '/api/qris/image?view=full';
    }

    const payloadFile = path.join(process.cwd(), 'public', 'qris-payload.txt');
    const qrisPayload = fs.existsSync(payloadFile)
      ? fs.readFileSync(payloadFile, 'utf-8').trim()
      : '00020101021126610014COM.GO-JEK.WWW01189360091434872473310210G4872473310303UMI51440014ID.CO.QRIS.WWW0215ID10264693049540303UMI5204899953033605802ID5916Jimpitan Digital6008BANYUMAS61055313362070703A0163041C04';

    const data = settings
      ? {
          ...settings,
          qrisStaticImage: currentImage || defaultQris,
          qrisMode: currentImage || defaultQris ? settings.qrisMode || 'STATIC' : settings.qrisMode,
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
          qrisMode: defaultQris ? 'STATIC' : 'DYNAMIC',
          qrisStaticImage: defaultQris,
          qrisPayload,
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
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang berwenang mengubah pengaturan.' }, { status: 403 });
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
      },
    });

    await logAudit({
      userId: user.id,
      action: 'SETTINGS_UPDATE',
      entityType: 'STORE_SETTING',
      entityId: 'default',
      details: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan toko berhasil diperbarui.',
      data: updated,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memperbarui pengaturan toko.' }, { status: 500 });
  }
}
