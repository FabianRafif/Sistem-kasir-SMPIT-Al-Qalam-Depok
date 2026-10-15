import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { QrisMode } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      success: true,
      data: settings || {
        storeName: 'Kantin & Minimarket SMPIT Al Qalam',
        schoolName: 'SMPIT Al Qalam',
        address: 'Kompleks Pendidikan Islam Terpadu Al Qalam',
        phone: '(021) 7755912',
        receiptFooter: 'Terima kasih telah berbelanja di Minimarket SMPIT Al Qalam.',
        logoPath: '/logo-alqalam.png',
        timezone: 'Asia/Jakarta',
        printerPaperSize: '58mm',
        qrisMode: 'DYNAMIC',
      },
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
