import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Memulai Pembersihan Total Sisa Data Uji Coba Admin, Inventaris & Stok ---');

  // 1. Hapus semua riwayat transaksi & pembayaran (jika ada)
  const deletedSaleItems = await prisma.saleItem.deleteMany({});
  const deletedPayments = await prisma.payment.deleteMany({});
  const deletedSales = await prisma.sale.deleteMany({});
  const deletedShifts = await prisma.cashierShift.deleteMany({});
  const deletedWebhooks = await prisma.paymentWebhookEvent.deleteMany({});

  // 2. Hapus semua riwayat mutasi stok (inventaris)
  const deletedStockMovements = await prisma.stockMovement.deleteMany({});
  console.log(`✓ Riwayat mutasi stok dibersihkan: ${deletedStockMovements.count} data dihapus`);

  // 3. Hapus semua produk dummy pengujian (permen, dll)
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`✓ Data produk dummy pengujian dibersihkan: ${deletedProducts.count} produk dihapus`);

  // 4. Hapus semua log audit pengujian
  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`✓ Log audit pengujian dibersihkan: ${deletedAuditLogs.count} log dihapus`);

  // 5. Cek status akhir database
  const finalProducts = await prisma.product.count();
  const finalStockMovements = await prisma.stockMovement.count();
  const finalSales = await prisma.sale.count();
  const finalAuditLogs = await prisma.auditLog.count();
  const finalCategories = await prisma.category.count();
  const finalUsers = await prisma.user.count();

  console.log('\n=== STATUS DATABASE SETELAH PEMBERSIHAN TOTAL ===');
  console.log({
    produk: finalProducts,
    mutasiStok: finalStockMovements,
    transaksi: finalSales,
    auditLogs: finalAuditLogs,
    kategoriStandar: finalCategories,
    pengguna: finalUsers
  });
}

main()
  .catch((e) => {
    console.error('Error saat pembersihan:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
