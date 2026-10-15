import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';
import { checkRateLimit, resetRateLimit, generateReceiptNumber, generateInternalBarcode } from '../src/lib/security';
import { sanitizeForCSV, formatRupiah, formatNumber } from '../src/lib/format';
import { Role } from '@prisma/client';

describe('1. Keamanan & Autentikasi', () => {
  it('harus melakukan hashing dan verifikasi password dengan bcrypt', async () => {
    const rawPass = 'AlQalamP@ss2026';
    const hashed = await hashPassword(rawPass);

    assert.notEqual(hashed, rawPass);
    assert.equal(hashed.startsWith('$2'), true);

    const valid = await verifyPassword(rawPass, hashed);
    assert.equal(valid, true);

    const wrong = await verifyPassword('WrongPassword!', hashed);
    assert.equal(wrong, false);
  });

  it('harus membuat dan memverifikasi JWT session token dengan benar', async () => {
    const userPayload = {
      id: 'test-user-id-123',
      name: 'Kasir Uji Coba',
      username: 'kasir_test',
      email: 'kasir@alqalam.sch.id',
      role: Role.CASHIER,
    };

    const token = await createSessionToken(userPayload);
    assert.equal(typeof token, 'string');
    assert.equal(token.split('.').length, 3);

    const verified = await verifySessionToken(token);
    assert.notEqual(verified, null);
    assert.equal(verified?.id, userPayload.id);
    assert.equal(verified?.username, userPayload.username);
    assert.equal(verified?.role, 'CASHIER');
  });

  it('harus membatasi percobaan brute force dengan rate limiter', () => {
    const testKey = 'test_ip_127.0.0.1';
    resetRateLimit(testKey);

    // 5 percobaan pertama diizinkan
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(testKey, 5, 60000);
      assert.equal(res.allowed, true);
    }

    // Percobaan ke-6 ditolak
    const blockedRes = checkRateLimit(testKey, 5, 60000);
    assert.equal(blockedRes.allowed, false);
    assert.equal(blockedRes.remaining, 0);

    // Reset rate limiter
    resetRateLimit(testKey);
    const resetRes = checkRateLimit(testKey, 5, 60000);
    assert.equal(resetRes.allowed, true);
  });

  it('harus menghasilkan nomor struk unik format KM-YYYYMMDD-XXXXXX', () => {
    const r1 = generateReceiptNumber();
    const r2 = generateReceiptNumber();

    assert.match(r1, /^KM-\d{8}-\d{6}$/);
    assert.match(r2, /^KM-\d{8}-\d{6}$/);
    assert.notEqual(r1, r2);
  });

  it('harus menghasilkan barcode internal diawali 200 untuk barang tanpa barcode', () => {
    const bc = generateInternalBarcode();
    assert.equal(bc.startsWith('200'), true);
    assert.equal(bc.length, 12);
  });
});

describe('2. Sanitasi Formula CSV Injection & Formatter', () => {
  it('harus mencegah eksekusi rumus berbahaya pada ekspor CSV', () => {
    assert.equal(sanitizeForCSV('=1+2'), "'=1+2");
    assert.equal(sanitizeForCSV('+cmd|/C calc'), "'+cmd|/C calc");
    assert.equal(sanitizeForCSV('-5*3'), "'-5*3");
    assert.equal(sanitizeForCSV('@SUM(A1:A10)'), "'@SUM(A1:A10)");
    assert.equal(sanitizeForCSV('Teh Botol Sosro'), 'Teh Botol Sosro');
  });

  it('harus memformat nominal mata uang rupiah dan angka dengan tepat', () => {
    assert.match(formatRupiah(15000), /15\.000/);
    assert.match(formatRupiah(0), /0/);
    assert.equal(formatNumber(15000), '15.000');
  });
});
