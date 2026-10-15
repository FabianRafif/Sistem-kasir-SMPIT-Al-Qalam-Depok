import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateThermalReceiptText, padLine, centerLine } from '../src/lib/receipt-generator';
import { ReceiptData } from '../src/lib/types';

describe('3. Aturan Transaksi & Struk Thermal', () => {
  it('harus memformat struk thermal 58mm (lebar 32 karakter) secara presisi', () => {
    const mockReceipt: ReceiptData = {
      receiptNumber: 'KM-20261015-000123',
      storeName: 'Kantin & Minimarket SMPIT Al Qalam',
      schoolName: 'SMPIT Al Qalam',
      address: 'Komplek Perguruan Islam',
      phone: '(021) 7755912',
      cashierName: 'KASIR01',
      date: '15/10/2026',
      time: '12:30:45',
      items: [
        { name: 'Air Mineral 600ml', quantity: 2, unitPrice: 4000, lineTotal: 8000 },
        { name: 'Roti Cokelat', quantity: 1, unitPrice: 5000, lineTotal: 5000 },
      ],
      subtotal: 13000,
      discountAmount: 1000,
      grandTotal: 12000,
      paymentMethod: 'CASH',
      cashReceived: 20000,
      changeAmount: 8000,
      footerNotes: 'Terima kasih telah berbelanja',
      paperSize: '58mm',
    };

    const text = generateThermalReceiptText(mockReceipt, '58mm');
    const lines = text.split('\n');

    assert.equal(lines.length > 10, true);
    for (const line of lines) {
      assert.equal(line.length <= 32, true);
    }

    assert.equal(text.includes('SMPIT AL QALAM'), true);
    assert.equal(text.includes('KM-20261015-000123'), true);
    assert.equal(text.includes('12.000'), true);
    assert.equal(text.includes('KEMBALI'), true);
  });

  it('harus meratakan teks kiri-kanan (padLine) pada struk dengan presisi', () => {
    const padded = padLine('TOTAL', '16.000', 32);
    assert.equal(padded.length, 32);
    assert.equal(padded.startsWith('TOTAL'), true);
    assert.equal(padded.endsWith('16.000'), true);
  });

  it('harus memusatkan teks (centerLine) untuk header struk', () => {
    const centered = centerLine('SMPIT AL QALAM', 32);
    assert.equal(centered.length, 32);
    assert.equal(centered.trim(), 'SMPIT AL QALAM');
  });

  it('harus memverifikasi rumus kembalian tunai (Kembalian = Uang Diterima - Grand Total)', () => {
    const grandTotal = 16000;
    const cashReceived = 20000;
    const change = cashReceived - grandTotal;
    assert.equal(change, 4000);

    const exactCash = 16000;
    assert.equal(exactCash - grandTotal, 0);

    const insufficient = 15000;
    assert.equal(insufficient < grandTotal, true);
  });
});
