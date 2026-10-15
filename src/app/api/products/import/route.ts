import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logAudit } from '@/lib/security';
import { MovementType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya administrator yang dapat mengimpor data produk.' }, { status: 403 });
    }

    const body = await req.json();
    const { rows, dryRun = true } = body; // dryRun: true untuk validasi & preview saja

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Data baris produk kosong atau format tidak sesuai.' }, { status: 400 });
    }

    // Ambil seluruh kategori dan barcode yang sudah ada untuk validasi cepat
    const [existingCategories, existingProducts] = await Promise.all([
      prisma.category.findMany(),
      prisma.product.findMany({ select: { sku: true, barcode: true } }),
    ]);

    const categoryMap = new Map<string, string>();
    for (const c of existingCategories) {
      categoryMap.set(c.name.toLowerCase().trim(), c.id);
    }

    const existingSkus = new Set(existingProducts.map((p) => p.sku.toLowerCase()));
    const existingBarcodes = new Set(
      existingProducts.filter((p) => p.barcode).map((p) => p.barcode!.toLowerCase())
    );

    const validRows: any[] = [];
    const invalidRows: { rowNumber: number; data: any; errors: string[] }[] = [];
    const seenFileSkus = new Set<string>();
    const seenFileBarcodes = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const errors: string[] = [];

      const name = String(row.name || '').trim();
      if (!name) {
        errors.push('Nama produk wajib diisi.');
      }

      let sku = String(row.sku || '').trim();
      if (!sku) {
        sku = `SKU-IMP-${Date.now().toString().slice(-6)}-${i}`;
      } else {
        const skuLower = sku.toLowerCase();
        if (existingSkus.has(skuLower)) {
          errors.push(`SKU "${sku}" sudah ada di database.`);
        }
        if (seenFileSkus.has(skuLower)) {
          errors.push(`SKU "${sku}" duplikat di file import.`);
        }
        seenFileSkus.add(skuLower);
      }

      let barcode = row.barcode ? String(row.barcode).trim() : null;
      if (barcode) {
        const barcodeLower = barcode.toLowerCase();
        if (existingBarcodes.has(barcodeLower)) {
          errors.push(`Barcode "${barcode}" sudah terdaftar di database.`);
        }
        if (seenFileBarcodes.has(barcodeLower)) {
          errors.push(`Barcode "${barcode}" duplikat di file import.`);
        }
        seenFileBarcodes.add(barcodeLower);
      }

      const costPrice = parseFloat(row.costPrice ?? row.cost_price ?? 0);
      const sellingPrice = parseFloat(row.sellingPrice ?? row.selling_price ?? 0);
      const stockQty = parseInt(row.stockQty ?? row.stock_qty ?? 0, 10);
      const minimumStock = parseInt(row.minimumStock ?? row.minimum_stock ?? 5, 10);

      if (isNaN(costPrice) || costPrice < 0) {
        errors.push('Harga modal harus angka positif.');
      }
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        errors.push('Harga jual harus angka positif.');
      }
      if (isNaN(stockQty) || stockQty < 0) {
        errors.push('Stok awal harus angka bulat positif.');
      }

      // Kategori
      const categoryName = String(row.category || row.categoryName || 'Produk Lainnya').trim();
      let categoryId = categoryMap.get(categoryName.toLowerCase());

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: rowNum, data: row, errors });
      } else {
        validRows.push({
          name,
          sku,
          barcode,
          categoryName,
          categoryId,
          unit: String(row.unit || 'pcs').trim(),
          costPrice,
          sellingPrice,
          stockQty,
          minimumStock,
        });
      }
    }

    // Jika dryRun = true, kembalikan hasil preview
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary: {
          totalRows: rows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
        },
        previewValid: validRows.slice(0, 10),
        invalidRows,
      });
    }

    // Eksekusi Import
    if (validRows.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada baris valid yang dapat diimpor.', invalidRows },
        { status: 400 }
      );
    }

    let insertedCount = 0;
    await prisma.$transaction(async (tx) => {
      // Pastikan kategori yang belum ada dibuat otomatis
      for (const item of validRows) {
        if (!item.categoryId) {
          const cat = await tx.category.upsert({
            where: { name: item.categoryName },
            update: {},
            create: { name: item.categoryName },
          });
          item.categoryId = cat.id;
          categoryMap.set(item.categoryName.toLowerCase(), cat.id);
        }

        const product = await tx.product.create({
          data: {
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            categoryId: item.categoryId,
            unit: item.unit,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            stockQty: item.stockQty,
            minimumStock: item.minimumStock,
            isActive: true,
          },
        });

        if (item.stockQty > 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              userId: user.id,
              movementType: MovementType.INITIAL,
              quantityChange: item.stockQty,
              referenceType: 'BULK_IMPORT',
              referenceId: 'IMPORT',
              reason: 'Import massal produk awal',
            },
          });
        }
        insertedCount++;
      }
    });

    await logAudit({
      userId: user.id,
      action: 'PRODUCT_BULK_IMPORT',
      entityType: 'PRODUCT',
      entityId: 'BULK',
      details: {
        totalRows: rows.length,
        importedCount: insertedCount,
        failedCount: invalidRows.length,
      },
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `Berhasil mengimpor ${insertedCount} produk ke database.`,
      summary: {
        totalRows: rows.length,
        importedCount: insertedCount,
        failedCount: invalidRows.length,
      },
      invalidRows,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Gagal memproses import data produk.' }, { status: 500 });
  }
}
