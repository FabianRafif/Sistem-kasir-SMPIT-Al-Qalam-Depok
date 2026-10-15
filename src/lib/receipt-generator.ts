import { ReceiptData } from './types';
import { formatNumber } from './format';

export function centerLine(text: string, width = 32): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  const rightPadding = width - text.length - leftPadding;
  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
}

export function padLine(left: string, right: string, width = 32): string {
  const availableSpace = width - left.length - right.length;
  if (availableSpace <= 0) {
    return left.slice(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(availableSpace) + right;
}

export function generateDivider(width = 32, char = '-'): string {
  return char.repeat(width);
}

export function generateThermalReceiptText(data: ReceiptData, paperSize: '58mm' | '80mm' = '58mm'): string {
  const width = paperSize === '80mm' ? 48 : 32;
  const lines: string[] = [];

  // Header Toko / Sekolah
  lines.push(centerLine(data.schoolName.toUpperCase(), width));
  lines.push(centerLine(data.storeName.toUpperCase(), width));
  if (data.address) {
    // Wrap address if needed
    lines.push(centerLine(data.address.slice(0, width), width));
  }
  if (data.phone) {
    lines.push(centerLine(`Telp: ${data.phone}`, width));
  }
  lines.push(generateDivider(width));

  // Metadata Struk
  lines.push(padLine(`No: ${data.receiptNumber}`, '', width));
  lines.push(padLine(`Kasir: ${data.cashierName}`, '', width));
  lines.push(padLine(`${data.date} ${data.time}`, '', width));
  lines.push(generateDivider(width));

  // Daftar Item
  for (const item of data.items) {
    // Baris 1: Nama item (dipotong jika terlalu panjang)
    const maxItemNameLen = width;
    lines.push(item.name.slice(0, maxItemNameLen));

    // Baris 2: Qty x Harga Satuan         Subtotal
    const qtyPriceStr = `  ${item.quantity} x ${formatNumber(item.unitPrice)}`;
    const lineTotalStr = formatNumber(item.lineTotal);
    lines.push(padLine(qtyPriceStr, lineTotalStr, width));
  }

  lines.push(generateDivider(width));

  // Ringkasan Pembayaran
  lines.push(padLine('SUBTOTAL', formatNumber(data.subtotal), width));
  if (data.discountAmount > 0) {
    lines.push(padLine('DISKON', `-${formatNumber(data.discountAmount)}`, width));
  }
  lines.push(padLine('TOTAL', formatNumber(data.grandTotal), width));
  lines.push(generateDivider(width));

  // Metode Pembayaran
  lines.push(padLine('METODE', data.paymentMethod, width));
  if (data.paymentMethod === 'CASH') {
    lines.push(padLine('TUNAI', formatNumber(data.cashReceived || data.grandTotal), width));
    lines.push(padLine('KEMBALI', formatNumber(data.changeAmount || 0), width));
  } else if (data.paymentMethod === 'QRIS') {
    lines.push(padLine('STATUS', 'LUNAS (QRIS)', width));
    if (data.qrisReference) {
      lines.push(padLine('REF', data.qrisReference.slice(0, width - 5), width));
    }
  }

  lines.push(generateDivider(width));

  // Footer Struk
  if (data.footerNotes) {
    const footerLines = data.footerNotes.split('\n');
    for (const fLine of footerLines) {
      if (fLine.trim()) {
        lines.push(centerLine(fLine.trim(), width));
      }
    }
    lines.push(generateDivider(width));
  }

  // Waktu cetak di bagian bawah
  lines.push(centerLine('Sistem POS SMPIT Al Qalam', width));

  return lines.join('\n');
}
