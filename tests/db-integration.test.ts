import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/lib/prisma';
import { MovementType, PaymentMethod, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

describe('4. Integrasi Database MySQL & Alur POS', () => {
  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('harus membaca pengguna admin dan kasir yang telah di-seed', async () => {
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    assert.notEqual(admin, null);
    assert.equal(admin?.role, 'ADMIN');

    const cashier = await prisma.user.findUnique({ where: { username: 'kasir1' } });
    assert.notEqual(cashier, null);
    assert.equal(cashier?.role, 'CASHIER');
  });

  it('harus memuat 7 kategori standar minimarket sekolah', async () => {
    const categories = await prisma.category.findMany();
    assert.equal(categories.length >= 7, true);

    const names = categories.map((c) => c.name);
    assert.equal(names.includes('Makanan Ringan'), true);
    assert.equal(names.includes('Minuman'), true);
    assert.equal(names.includes('Alat Tulis'), true);
  });

  it('harus menemukan barcode yang diawali angka nol (089686010383)', async () => {
    const product = await prisma.product.findFirst({
      where: { barcode: '089686010383' },
    });

    assert.notEqual(product, null);
    assert.equal(product?.name.includes('Indomie'), true);
    assert.equal(product?.barcode, '089686010383');
  });

  it('harus menolak duplikasi barcode pada level database constraint', async () => {
    const existing = await prisma.product.findFirst({ where: { barcode: { not: null } } });
    assert.notEqual(existing, null);

    if (existing && existing.barcode) {
      let threw = false;
      try {
        await prisma.product.create({
          data: {
            name: 'Produk Duplikat',
            sku: `SKU-DUP-${Date.now()}`,
            barcode: existing.barcode,
            categoryId: existing.categoryId,
            costPrice: 1000,
            sellingPrice: 2000,
          },
        });
      } catch (err) {
        threw = true;
      }
      assert.equal(threw, true);
    }
  });

  it('harus mengeksekusi mutasi stok secara atomik', async () => {
    const product = await prisma.product.findFirst({ where: { isActive: true } });
    assert.notEqual(product, null);

    if (product) {
      const initialStock = product.stockQty;
      const user = await prisma.user.findFirst();

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: { increment: 5 } },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId: user!.id,
            movementType: MovementType.IN,
            quantityChange: 5,
            reason: 'Uji coba penambahan stok otomatis node test',
          },
        });
      });

      const updated = await prisma.product.findUnique({ where: { id: product.id } });
      assert.equal(updated?.stockQty, initialStock + 5);

      // Kembalikan ke stok awal
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQty: initialStock },
      });
    }
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
