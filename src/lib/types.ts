import { Role, PaymentMethod, PaymentStatus, MovementType, ShiftStatus, QrisMode } from '@prisma/client';

export type UserSession = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: Role;
};

export type CartItem = {
  productId: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryName: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  stockQty: number;
  lineTotal: number;
};

export type SaleSummary = {
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  totalItems: number;
};

export type ReceiptData = {
  receiptNumber: string;
  storeName: string;
  schoolName: string;
  address?: string | null;
  phone?: string | null;
  cashierName: string;
  date: string;
  time: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'QRIS';
  cashReceived?: number | null;
  changeAmount?: number | null;
  qrisReference?: string | null;
  footerNotes?: string | null;
  paperSize?: '58mm' | '80mm';
};
