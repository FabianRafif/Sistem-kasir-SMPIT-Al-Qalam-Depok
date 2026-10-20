import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true, name: true } });
  const categories = await prisma.category.findMany();
  const products = await prisma.product.findMany();
  const stockMovements = await prisma.stockMovement.findMany({ take: 20 });
  const stockMovementCount = await prisma.stockMovement.count();
  const shifts = await prisma.cashierShift.count();
  const sales = await prisma.sale.count();
  const saleItems = await prisma.saleItem.count();
  const payments = await prisma.payment.count();
  const webhookEvents = await prisma.paymentWebhookEvent.count();
  const auditLogs = await prisma.auditLog.count();
  const settings = await prisma.storeSetting.findMany();

  console.log('=== USERS (' + users.length + ') ===');
  console.log(users);

  console.log('\n=== CATEGORIES (' + categories.length + ') ===');
  console.log(categories.map(c => ({ id: c.id, name: c.name })));

  console.log('\n=== PRODUCTS (' + products.length + ') ===');
  console.log(products.map(p => ({
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    stockQty: p.stockQty,
    costPrice: p.costPrice.toString(),
    sellingPrice: p.sellingPrice.toString(),
    createdAt: p.createdAt
  })));

  console.log('\n=== COUNTS ===');
  console.log({
    stockMovementCount,
    shifts,
    sales,
    saleItems,
    payments,
    webhookEvents,
    auditLogs,
    settingsCount: settings.length
  });

  if (stockMovements.length > 0) {
    console.log('\n=== SAMPLE STOCK MOVEMENTS ===');
    console.log(stockMovements);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
