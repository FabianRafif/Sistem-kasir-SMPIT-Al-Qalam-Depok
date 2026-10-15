import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/lib/prisma';
import { MovementType } from '@prisma/client';
import crypto from 'crypto';

describe('4. Integrasi Database MySQL & Alur POS', () => {
  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('harus membaca pengguna admin dan kasir resmi', async () => {
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    assert.notEqual(admin, null);
    assert.equal(admin?.role, 'ADMIN');

    const cashier = await prisma.user.findUnique({ where: { username: 'kasir1' } });
    assert.notEqual(cashier, null);
    assert.equal(cashier?.role, 'CASHIER');
  });

  it('harus memuat kategori standar minimarket sekolah', async () => {
    const categories = await prisma.category.findMany();
    assert.equal(categories.length >= 7, true);

    const names = categories.map((c) => c.name);
    assert.equal(names.includes('Makanan Ringan'), true);
    assert.equal(names.includes('Minuman'), true);
    assert.equal(names.includes('Alat Tulis'), true);
  });

  it('harus mendukung produk dengan barcode angka nol terdepan dan menolak duplikasi', async () => {
    const category = await prisma.category.findFirst();
    assert.notEqual(category, null);

    const testBarcode = '089686010383';
    const testSku = `TEST-SKU-${Date.now()}`;

    // Buat produk uji coba
    const testProduct = await prisma.product.create({
      data: {
        name: 'Produk Uji Coba Integrasi',
        barcode: testBarcode,
        sku: testSku,
        categoryId: category!.id,
        costPrice: 2000,
        sellingPrice: 3500,
        stockQty: 10,
        minimumStock: 2,
        isActive: true,
      },
    });

    try {
      assert.equal(testProduct.barcode, testBarcode);

      // Verifikasi penolakan duplikasi barcode
      let duplicateRejected = false;
      try {
        await prisma.product.create({
          data: {
            name: 'Produk Duplikat',
            sku: `TEST-SKU-DUP-${Date.now()}`,
            barcode: testBarcode,
            categoryId: category!.id,
            costPrice: 1000,
            sellingPrice: 2000,
          },
        });
      } catch {
        duplicateRejected = true;
      }
      assert.equal(duplicateRejected, true);

      // Verifikasi mutasi stok secara atomik
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const movement = await prisma.stockMovement.create({
        data: {
          productId: testProduct.id,
          userId: admin!.id,
          movementType: MovementType.IN,
          quantityChange: 5,
          reason: 'Uji coba penambahan stok otomatis',
        },
      });

      const updated = await prisma.product.update({
        where: { id: testProduct.id },
        data: { stockQty: { increment: 5 } },
      });
      assert.equal(updated.stockQty, 15);

      // Bersihkan mutasi uji coba
      await prisma.stockMovement.delete({ where: { id: movement.id } });
    } finally {
      // Selalu hapus produk uji coba agar database tetap bersih untuk client
      await prisma.product.delete({ where: { id: testProduct.id } });
    }

    // Pastikan tabel produk tetap bersih
    const remainingCount = await prisma.product.count({ where: { sku: testSku } });
    assert.equal(remainingCount, 0);
  });

  it('harus mencatat hash webhook QRIS untuk memastikan proses idempoten', async () => {
    const eventId = `TEST-EVT-${Date.now()}`;
    const payload = JSON.stringify({ eventId, amount: 25000, status: 'PAID' });
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    const event = await prisma.paymentWebhookEvent.create({
      data: {
        provider: 'SIMULATOR',
        eventId,
        payloadHash,
        payload,
        processingStatus: 'SUCCESS',
        processedAt: new Date(),
      },
    });

    assert.equal(event.eventId, eventId);

    // Verifikasi penolakan duplikat eventId
    let duplicateRejected = false;
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: 'SIMULATOR',
          eventId,
          payloadHash,
          payload,
        },
      });
    } catch {
      duplicateRejected = true;
    }
    assert.equal(duplicateRejected, true);

    // Cleanup event pengujian
    await prisma.paymentWebhookEvent.delete({ where: { id: event.id } });
  });
});
