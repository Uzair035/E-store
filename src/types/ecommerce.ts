export type UserRole = 'customer' | 'admin';

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  addresses: Address[];
  wishlist: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageKey: string;
  featured: boolean;
}

export interface ProductVariant {
  colors: { name: string; hex: string }[];
  sizes: string[];
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  price: number;
  salePrice: number | null;
  stock: number;
  rating: number;
  reviewCount: number;
  imageKeys: string[];
  variants: ProductVariant;
  specs: ProductSpec[];
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSpecialOffer: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId?: string;
  authorName: string;
  authorLocation: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  active: boolean;
  usageCount: number;
  expiresAt: string;
}

export interface Banner {
  id: string;
  slot: 'hero' | 'promo' | 'announcement';
  kicker: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  imageKey: string;
  active: boolean;
}

export type PaymentMethod = 'card' | 'bank_transfer' | 'cod';
export type CardProvider = 'stripe' | 'adyen' | 'payfast';
export type ShippingMethod = 'standard' | 'express';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface PaymentGatewaySettings {
  activeCardProvider: CardProvider;
  cardEnabled: boolean;
  bankTransferEnabled: boolean;
  bankAccountName: string;
  bankName: string;
  bankIban: string;
  bankSwift: string;
  codEnabled: boolean;
  codFee: number;
  standardShippingFee: number;
  expressShippingFee: number;
  freeShippingThreshold: number;
}

export interface OrderItem {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  imageKey: string;
  unitPrice: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  note: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  codFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentProvider: string;
  paymentStatus: 'paid' | 'awaiting_transfer' | 'cod_pending';
  status: OrderStatus;
  trackingCarrier: string;
  trackingCode: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  imageKey: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  maxStock: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface AdminAnalytics {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  lowStockProducts: Product[];
  revenueSeries: { label: string; revenue: number; orders: number }[];
  categoryBreakdown: { category: string; revenue: number; share: number }[];
  recentOrders: Order[];
}
