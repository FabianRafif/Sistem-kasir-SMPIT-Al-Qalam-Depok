import prisma from './prisma';

/**
 * Audit Logging Helper
 * Mencatat riwayat perubahan stok, harga, pembayaran, dan aksi administratif
 */
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress = '127.0.0.1',
}: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string | null;
}) {
  try {
    const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        details: detailsString || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Gagal mencatat audit log:', error);
  }
}

/**
 * Generate Format Nomor Struk Unik Toko
 * Format: KM-YYYYMMDD-XXXXXX
 * Contoh: KM-20261015-000123
 */
export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `KM-${year}${month}${day}-${randomPart}`;
}

/**
 * Generate Barcode Internal jika produk fisik tidak memiliki barcode pabrik
 * Format: 200 + 9 digit angka unik (EAN-13 compatible prefix internal 200)
 */
export function generateInternalBarcode(): string {
  const timestamp = Date.now().toString().slice(-9);
  return `200${timestamp}`;
}

/**
 * Simple in-memory rate limiter untuk proteksi brute force login
 */
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export function resetRateLimit(key: string) {
  rateLimitMap.delete(key);
}
