import { PrismaClient, Role, MovementType, QrisMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Memulai Seeding Database POS SMPIT Al Qalam ---');

  // 1. Seed Store Setting
  const setting = await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'Kantin & Minimarket SMPIT Al Qalam',
      schoolName: 'SMPIT Al Qalam',
      address: 'Kompleks Pendidikan Islam Terpadu Al Qalam',
      phone: '0812-3456-7890',
      receiptFooter: 'Terima kasih telah berbelanja di Minimarket SMPIT Al Qalam.\nSemoga berkah & bermanfaat.',
      logoPath: '/logo-alqalam.png',
      timezone: 'Asia/Jakarta',
      printerPaperSize: '58mm',
      qrisMode: QrisMode.DYNAMIC,
    },
  });
  console.log('✓ Store settings siap:', setting.storeName);

  // 2. Seed Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('AdminAlQalam2026!', salt);
  const cashierPasswordHash = await bcrypt.hash('KasirAlQalam2026!', salt);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator Al Qalam',
      username: 'admin',
      email: 'admin@alqalam.sch.id',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { username: 'kasir1' },
    update: {},
    create: {
      name: 'Fatimah Az-Zahra (Kasir 1)',
      username: 'kasir1',
      email: 'kasir1@alqalam.sch.id',
      passwordHash: cashierPasswordHash,
      role: Role.CASHIER,
      isActive: true,
    },
  });
  console.log('✓ Akun Pengguna terdaftar: admin & kasir1');

  // 3. Seed Categories
  const categoriesData = [
    { name: 'Makanan Ringan', description: 'Snack, biskuit, dan keripik' },
    { name: 'Minuman', description: 'Air mineral, jus kemasan, dan teh' },
    { name: 'Makanan Instan', description: 'Mi instan, bubur, dan sereal' },
    { name: 'Roti dan Makanan Kemasan', description: 'Roti tawar, roti manis, donat' },
    { name: 'Alat Tulis', description: 'Buku, pulpen, pensil, penghapus, penggaris' },
    { name: 'Perlengkapan Sekolah', description: 'Sampul buku, map, name tag, kaos kaki' },
    { name: 'Produk Lainnya', description: 'Barang serbaguna kantin' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const createdCat = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.name, createdCat.id);
  }
  console.log('✓ 7 Kategori standar minimarket tersimpan');

  // 4. Seed Products (Demo Products clearly tagged)
  const initialProducts = [
    {
      sku: 'PRD-MIN-001',
      barcode: '8992761011119',
      name: 'Air Mineral Le Minerale 600ml',
      category: 'Minuman',
      unit: 'botol',
      costPrice: 2800,
      sellingPrice: 3500,
      stockQty: 48,
      minimumStock: 12,
    },
    {
      sku: 'PRD-MIN-002',
      barcode: '8999999002047',
      name: 'Teh Botol Sosro Kotak 250ml',
      category: 'Minuman',
      unit: 'kotak',
      costPrice: 3200,
      sellingPrice: 4000,
      stockQty: 36,
      minimumStock: 10,
    },
    {
      sku: 'PRD-MIN-003',
      barcode: '8996001301115',
      name: 'Ultra Milk Coklat 200ml',
      category: 'Minuman',
      unit: 'kotak',
      costPrice: 5200,
      sellingPrice: 6500,
      stockQty: 30,
      minimumStock: 8,
    },
    {
      sku: 'PRD-SNK-001',
      barcode: '8992753112228',
      name: 'Chitato Sapi Panggang 68g',
      category: 'Makanan Ringan',
      unit: 'bungkus',
      costPrice: 8500,
      sellingPrice: 10500,
      stockQty: 24,
      minimumStock: 6,
    },
    {
      sku: 'PRD-SNK-002',
      barcode: '8992775210012',
      name: 'Beng Beng Chocolate Wafer 25g',
      category: 'Makanan Ringan',
      unit: 'bungkus',
      costPrice: 2000,
      sellingPrice: 2500,
      stockQty: 50,
      minimumStock: 15,
    },
    {
      sku: 'PRD-ROT-001',
      barcode: '8993077110055',
      name: 'Sari Roti Sobek Cokelat',
      category: 'Roti dan Makanan Kemasan',
      unit: 'bungkus',
      costPrice: 14000,
      sellingPrice: 17000,
      stockQty: 15,
      minimumStock: 5,
    },
    {
      sku: 'PRD-INS-001',
      barcode: '089686010383',
      name: 'Indomie Goreng Spesial 85g',
      category: 'Makanan Instan',
      unit: 'bungkus',
      costPrice: 3100,
      sellingPrice: 3800,
      stockQty: 60,
      minimumStock: 20,
    },
    {
      sku: 'PRD-ATK-001',
      barcode: '8998838380011',
      name: 'Buku Tulis Sinar Dunia 38 Lembar',
      category: 'Alat Tulis',
      unit: 'buku',
      costPrice: 3500,
      sellingPrice: 4500,
      stockQty: 80,
      minimumStock: 25,
    },
    {
      sku: 'PRD-ATK-002',
      barcode: '4902778100018',
      name: 'Pulpen Standard AE7 0.5mm Hitam',
      category: 'Alat Tulis',
      unit: 'buah',
      costPrice: 2200,
      sellingPrice: 3000,
      stockQty: 100,
      minimumStock: 20,
    },
    {
      sku: 'PRD-ATK-003',
      barcode: '8992751020037',
      name: 'Penghapus Joyko B-40 Hitam',
      category: 'Alat Tulis',
      unit: 'buah',
      costPrice: 1500,
      sellingPrice: 2000,
      stockQty: 40,
      minimumStock: 10,
    },
    {
      sku: 'PRD-SEK-001',
      barcode: '8997015420019',
      name: 'Kaos Kaki Putih SMPIT Al Qalam',
      category: 'Perlengkapan Sekolah',
      unit: 'pasang',
      costPrice: 12000,
      sellingPrice: 16000,
      stockQty: 25,
      minimumStock: 8,
    },
    {
      sku: 'PRD-KNT-001',
      barcode: null, // Contoh produk tanpa barcode fisik (label dibuat sistem)
      name: 'Kue Donat Gula Kantin (Produksi Harian)',
      category: 'Roti dan Makanan Kemasan',
      unit: 'buah',
      costPrice: 2000,
      sellingPrice: 3000,
      stockQty: 30,
      minimumStock: 10,
    },
  ];

  for (const p of initialProducts) {
    const categoryId = categoryMap.get(p.category) || Array.from(categoryMap.values())[0];
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });

    if (!existing) {
      const product = await prisma.product.create({
        data: {
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          categoryId,
          unit: p.unit,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          stockQty: p.stockQty,
          minimumStock: p.minimumStock,
          isActive: true,
        },
      });

      // Catat mutasi stok awal
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          userId: admin.id,
          movementType: MovementType.INITIAL,
          quantityChange: p.stockQty,
          referenceType: 'INITIAL_SEED',
          referenceId: 'SEED-INIT',
          reason: 'Stok awal setup sistem minimarket sekolah',
        },
      });
    }
  }

  // 5. Catat audit log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      entityId: 'SEED',
      details: JSON.stringify({ message: 'Inisialisasi sistem, pengguna awal, dan produk demo berhasil' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✓ 12 Produk awal demo & mutasi stok awal berhasil dibuat');
  console.log('--- Seeding Selesai Sukses ---');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
