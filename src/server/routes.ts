import crypto from 'crypto';
import { Router } from 'express';
import {
  attachOptionalAuth,
  hashPassword,
  requireAdmin,
  requireAuth,
  signAuthToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import { store } from './store.ts';
import type {
  AdminAnalytics,
  Banner,
  Category,
  Coupon,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  Review,
  ShippingMethod,
} from '../types/ecommerce.ts';

const router = Router();

function setAuthCookie(res: any, token: string) {
  res.cookie('nova_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 72 * 60 * 60 * 1000,
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Health check
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'nova-commerce-api' });
});

// ========================
// PUBLIC STOREFRONT & CATALOG
// ========================
router.get('/storefront', (_req, res) => {
  const s = store.getState();
  const activeBanners = s.banners.filter((b) => b.active);
  const categories = s.categories.map((cat) => ({
    ...cat,
    productCount: s.products.filter((p) => p.categorySlug === cat.slug).length,
  }));
  const brands = Array.from(new Set(s.products.map((p) => p.brand))).sort();
  const approvedReviews = s.reviews.filter((r) => r.approved).slice(0, 6);

  res.json({
    banners: activeBanners,
    categories,
    brands,
    trending: s.products.filter((p) => p.isTrending),
    bestSellers: s.products.filter((p) => p.isBestSeller),
    newArrivals: s.products.filter((p) => p.isNewArrival),
    specialOffers: s.products.filter((p) => p.isSpecialOffer || p.salePrice !== null),
    reviews: approvedReviews,
    paymentSettings: s.paymentSettings,
  });
});

router.get('/products', (req, res) => {
  const s = store.getState();
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  const brand = String(req.query.brand || '').trim();
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : Number.MAX_SAFE_INTEGER;
  const minRating = req.query.minRating ? Number(req.query.minRating) : 0;
  const offer = req.query.offer === 'true';
  const tag = String(req.query.tag || '').trim().toLowerCase();
  const sort = String(req.query.sort || 'featured');
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(48, Math.max(1, Number(req.query.limit || 9)));

  const brandList = brand ? brand.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean) : [];

  let filtered = s.products.filter((p) => {
    const effectivePrice = p.salePrice ?? p.price;
    if (q) {
      const hay = `${p.name} ${p.brand} ${p.categoryName} ${p.shortDescription} ${p.sku}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (category && category !== 'all' && p.categorySlug.toLowerCase() !== category) {
      return false;
    }
    if (brandList.length > 0 && !brandList.includes(p.brand.toLowerCase())) {
      return false;
    }
    if (effectivePrice < minPrice || effectivePrice > maxPrice) {
      return false;
    }
    if (p.rating < minRating) {
      return false;
    }
    if (offer && p.salePrice === null && !p.isSpecialOffer) {
      return false;
    }
    if (tag === 'trending' && !p.isTrending) return false;
    if (tag === 'bestseller' && !p.isBestSeller) return false;
    if (tag === 'new' && !p.isNewArrival) return false;
    return true;
  });

  if (sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
  } else if (sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
  } else if (sort === 'rating') {
    filtered = [...filtered].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  } else if (sort === 'newest') {
    filtered = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    filtered = [...filtered].sort(
      (a, b) =>
        Number(b.isBestSeller) + Number(b.isTrending) - (Number(a.isBestSeller) + Number(a.isTrending))
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  res.json({
    items,
    total,
    page,
    limit,
    totalPages,
    availableBrands: Array.from(new Set(s.products.map((p) => p.brand))).sort(),
    categories: s.categories,
  });
});

router.get('/products/:slug', (req, res) => {
  const s = store.getState();
  const product = s.products.find(
    (p) => p.slug === req.params.slug || p.id === req.params.slug
  );
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const reviews = s.reviews
    .filter((r) => r.productId === product.id && r.approved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const related = s.products
    .filter((p) => p.id !== product.id && (p.categorySlug === product.categorySlug || p.isTrending))
    .slice(0, 4);

  res.json({ product, reviews, related });
});

router.post('/products/:id/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const product = s.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  const rating = Number(req.body.rating);
  const title = String(req.body.title || '').trim();
  const comment = String(req.body.comment || '').trim();
  const authorLocation = String(req.body.authorLocation || 'Verified Customer').trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }
  if (title.length < 3 || comment.length < 10) {
    return res.status(400).json({ error: 'Please include a review title and at least 10 characters of feedback.' });
  }

  const hasPurchased = s.orders.some(
    (o) =>
      (o.userId === user.id || o.customerEmail.toLowerCase() === user.email.toLowerCase()) &&
      o.items.some((item) => item.productId === product.id)
  );

  const review: Review = {
    id: `rev-${crypto.randomUUID().slice(0, 8)}`,
    productId: product.id,
    productName: product.name,
    userId: user.id,
    authorName: user.name,
    authorLocation,
    rating: Math.round(rating),
    title,
    comment,
    verifiedPurchase: hasPurchased,
    approved: true,
    createdAt: new Date().toISOString(),
  };

  s.reviews.unshift(review);

  const productReviews = s.reviews.filter((r) => r.productId === product.id && r.approved);
  const avg =
    productReviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, productReviews.length);
  product.rating = Number(avg.toFixed(1));
  product.reviewCount = productReviews.length;
  store.save();

  res.status(201).json({ review, product });
});

router.post('/newsletter', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const s = store.getState();
  if (!s.newsletterEmails.includes(email)) {
    s.newsletterEmails.push(email);
    store.save();
  }
  res.json({ ok: true, message: 'Subscribed to NOVA studio dispatches and early access.' });
});

// ========================
// AUTHENTICATION & ACCOUNT
// ========================
router.post('/auth/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const phone = String(req.body.phone || '').trim();

  if (name.length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const s = store.getState();
  if (s.users.some((u) => u.email.toLowerCase() === email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    name,
    email,
    role: 'customer' as const,
    phone,
    passwordHash: hashPassword(password),
    addresses: [],
    wishlist: [],
    createdAt: new Date().toISOString(),
  };

  s.users.push(newUser);
  store.save();

  const token = signAuthToken({ uid: newUser.id, email: newUser.email, role: newUser.role });
  setAuthCookie(res, token);
  res.status(201).json({ user: store.sanitizeUser(newUser), token });
});

router.post('/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const s = store.getState();
  const user = s.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signAuthToken({ uid: user.id, email: user.email, role: user.role });
  setAuthCookie(res, token);
  res.json({ user: store.sanitizeUser(user), token });
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('nova_token', { path: '/' });
  res.json({ ok: true });
});

router.post('/auth/forgot-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const s = store.getState();
  const user = s.users.find((u) => u.email.toLowerCase() === email);
  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  if (user) {
    user.resetCode = resetCode;
    user.resetExpiresAt = Date.now() + 15 * 60 * 1000;
    store.save();
  }
  // Return previewCode for sandbox testing when no mail server is configured
  res.json({
    ok: true,
    message: 'If an account matches that email, a 6-digit verification code has been issued.',
    previewCode: user ? resetCode : undefined,
  });
});

router.post('/auth/reset-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const newPassword = String(req.body.newPassword || '');

  if (!isValidEmail(email) || !code || newPassword.length < 8) {
    return res.status(400).json({
      error: 'Valid email, 6-digit code, and new password (8+ characters) are required.',
    });
  }

  const s = store.getState();
  const user = s.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !user.resetCode || user.resetCode !== code || (user.resetExpiresAt ?? 0) < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired password reset code.' });
  }

  user.passwordHash = hashPassword(newPassword);
  user.resetCode = null;
  user.resetExpiresAt = null;
  store.save();

  res.json({ ok: true, message: 'Password updated successfully. You can now sign in.' });
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) {
    return res.status(404).json({ error: 'Account not found.' });
  }
  res.json({ user: store.sanitizeUser(user) });
});

router.patch('/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) {
    return res.status(404).json({ error: 'Account not found.' });
  }
  const name = String(req.body.name || user.name).trim();
  const phone = String(req.body.phone ?? user.phone ?? '').trim();

  if (name.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }
  user.name = name;
  user.phone = phone;
  store.save();

  res.json({ user: store.sanitizeUser(user) });
});

router.post('/auth/addresses', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  const { label, fullName, phone, line1, line2, city, state, postalCode, country, isDefault } = req.body;
  if (!fullName || !phone || !line1 || !city || !postalCode || !country) {
    return res.status(400).json({ error: 'Please complete all required address fields.' });
  }

  const makeDefault = Boolean(isDefault) || user.addresses.length === 0;
  if (makeDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.addresses.push({
    id: `addr-${crypto.randomUUID().slice(0, 8)}`,
    label: String(label || 'Shipping').trim(),
    fullName: String(fullName).trim(),
    phone: String(phone).trim(),
    line1: String(line1).trim(),
    line2: line2 ? String(line2).trim() : undefined,
    city: String(city).trim(),
    state: String(state || '').trim(),
    postalCode: String(postalCode).trim(),
    country: String(country).trim(),
    isDefault: makeDefault,
  });
  store.save();
  res.status(201).json({ user: store.sanitizeUser(user) });
});

router.patch('/auth/addresses/:id/default', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const target = user.addresses.find((a) => a.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Address not found.' });
  user.addresses.forEach((a) => {
    a.isDefault = a.id === target.id;
  });
  store.save();
  res.json({ user: store.sanitizeUser(user) });
});

router.delete('/auth/addresses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.addresses = user.addresses.filter((a) => a.id !== req.params.id);
  if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
    user.addresses[0].isDefault = true;
  }
  store.save();
  res.json({ user: store.sanitizeUser(user) });
});

router.post('/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  const productId = String(req.body.productId || '');
  if (!s.products.some((p) => p.id === productId)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (user.wishlist.includes(productId)) {
    user.wishlist = user.wishlist.filter((id) => id !== productId);
  } else {
    user.wishlist.push(productId);
  }
  store.save();
  res.json({ wishlist: user.wishlist, user: store.sanitizeUser(user) });
});

// ========================
// COUPONS, CHECKOUT & ORDERS
// ========================
router.post('/coupons/validate', (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);

  if (!code) {
    return res.status(400).json({ error: 'Enter a promo code.' });
  }
  const s = store.getState();
  const coupon = s.coupons.find((c) => c.code.toUpperCase() === code && c.active);
  if (!coupon) {
    return res.status(404).json({ error: 'Promo code is invalid or no longer active.' });
  }
  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This promo code has expired.' });
  }
  if (subtotal < coupon.minOrderAmount) {
    return res.status(400).json({
      error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required for code ${coupon.code}.`,
    });
  }

  const discountAmount =
    coupon.type === 'percentage'
      ? Number(((subtotal * coupon.value) / 100).toFixed(2))
      : Math.min(subtotal, coupon.value);

  res.json({ coupon, discountAmount });
});

router.post('/orders', attachOptionalAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    items,
    couponCode,
    shippingMethod,
    paymentMethod,
  } = req.body as {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: Order['shippingAddress'];
    items: { productId: string; quantity: number; selectedColor?: string; selectedSize?: string }[];
    couponCode?: string;
    shippingMethod: ShippingMethod;
    paymentMethod: PaymentMethod;
  };

  if (!customerName?.trim() || !isValidEmail(customerEmail || '') || !customerPhone?.trim()) {
    return res.status(400).json({ error: 'Valid contact name, email, and phone number are required.' });
  }
  if (
    !shippingAddress?.line1?.trim() ||
    !shippingAddress?.city?.trim() ||
    !shippingAddress?.postalCode?.trim() ||
    !shippingAddress?.country?.trim()
  ) {
    return res.status(400).json({ error: 'Complete shipping street, city, postal code, and country are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const orderItems: OrderItem[] = [];
  for (const item of items) {
    const product = s.products.find((p) => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: 'One or more products are no longer available.' });
    }
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}.` });
    }
    if (product.stock < qty) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name} (${product.stock} left).` });
    }
    orderItems.push({
      productId: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      imageKey: product.imageKeys[0] || 'studio-headphones',
      unitPrice: product.salePrice ?? product.price,
      quantity: qty,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
    });
  }

  const subtotal = Number(
    orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  );

  let discountAmount = 0;
  let appliedCoupon: Coupon | undefined;
  if (couponCode && couponCode.trim()) {
    const codeUpper = couponCode.trim().toUpperCase();
    appliedCoupon = s.coupons.find((c) => c.code.toUpperCase() === codeUpper && c.active);
    if (!appliedCoupon) {
      return res.status(400).json({ error: `Promo code "${codeUpper}" is not valid.` });
    }
    if (subtotal < appliedCoupon.minOrderAmount) {
      return res.status(400).json({
        error: `Promo code "${codeUpper}" requires a minimum order of $${appliedCoupon.minOrderAmount}.`,
      });
    }
    discountAmount =
      appliedCoupon.type === 'percentage'
        ? Number(((subtotal * appliedCoupon.value) / 100).toFixed(2))
        : Math.min(subtotal, appliedCoupon.value);
  }

  const settings = s.paymentSettings;
  if (paymentMethod === 'card' && !settings.cardEnabled) {
    return res.status(400).json({ error: 'Card checkout is currently disabled.' });
  }
  if (paymentMethod === 'bank_transfer' && !settings.bankTransferEnabled) {
    return res.status(400).json({ error: 'Bank transfer is currently disabled.' });
  }
  if (paymentMethod === 'cod' && !settings.codEnabled) {
    return res.status(400).json({ error: 'Cash on Delivery is currently disabled.' });
  }

  const shippingCost =
    shippingMethod === 'express'
      ? settings.expressShippingFee
      : subtotal >= settings.freeShippingThreshold
      ? 0
      : settings.standardShippingFee;

  const codFee = paymentMethod === 'cod' ? settings.codFee : 0;
  const total = Number(Math.max(0, subtotal - discountAmount + shippingCost + codFee).toFixed(2));

  // Decrement stock & increment coupon usage
  for (const item of orderItems) {
    const product = s.products.find((p) => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }
  if (appliedCoupon) {
    appliedCoupon.usageCount += 1;
  }

  const nextNum = 1045 + s.orders.length;
  const orderNumber = `NOVA-${nextNum}`;
  const nowIso = new Date().toISOString();

  const providerLabel =
    paymentMethod === 'card'
      ? `${settings.activeCardProvider.toUpperCase()} Gateway`
      : paymentMethod === 'bank_transfer'
      ? 'Direct Bank Transfer'
      : 'Cash on Delivery';

  const paymentStatus: Order['paymentStatus'] =
    paymentMethod === 'card'
      ? 'paid'
      : paymentMethod === 'bank_transfer'
      ? 'awaiting_transfer'
      : 'cod_pending';

  const initialStatus: OrderStatus = paymentMethod === 'card' ? 'confirmed' : 'pending';

  const order: Order = {
    id: `ord-${crypto.randomUUID().slice(0, 8)}`,
    orderNumber,
    userId: req.auth?.uid ?? null,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerPhone: customerPhone.trim(),
    shippingAddress: {
      line1: shippingAddress.line1.trim(),
      line2: shippingAddress.line2?.trim() || undefined,
      city: shippingAddress.city.trim(),
      state: shippingAddress.state?.trim() || '',
      postalCode: shippingAddress.postalCode.trim(),
      country: shippingAddress.country.trim(),
    },
    items: orderItems,
    subtotal,
    discountAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : null,
    shippingMethod: shippingMethod === 'express' ? 'express' : 'standard',
    shippingCost,
    codFee,
    total,
    paymentMethod,
    paymentProvider: providerLabel,
    paymentStatus,
    status: initialStatus,
    trackingCarrier: shippingMethod === 'express' ? 'DHL Express' : 'FedEx Ground',
    trackingCode: `${shippingMethod === 'express' ? 'DHL' : 'FDX'}-${Math.floor(100000000 + Math.random() * 899999999)}`,
    timeline: [
      {
        status: 'pending',
        label: 'Order Placed',
        note: `Submitted via ${providerLabel}`,
        timestamp: nowIso,
      },
      ...(initialStatus === 'confirmed'
        ? [
            {
              status: 'confirmed' as const,
              label: 'Payment Authorized',
              note: `Cleared via ${providerLabel}`,
              timestamp: nowIso,
            },
          ]
        : []),
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  s.orders.unshift(order);
  store.save();

  res.status(201).json({ order });
});

router.get('/orders', requireAuth, (req: AuthenticatedRequest, res) => {
  const s = store.getState();
  const user = s.users.find((u) => u.id === req.auth?.uid);
  if (!user) return res.status(401).json({ error: 'Account not found.' });

  const customerOrders = s.orders.filter(
    (o) => o.userId === user.id || o.customerEmail.toLowerCase() === user.email.toLowerCase()
  );
  res.json({ orders: customerOrders });
});

router.get('/orders/track/:orderNumber', (req, res) => {
  const s = store.getState();
  const target = req.params.orderNumber.trim().toUpperCase();
  const order = s.orders.find((o) => o.orderNumber.toUpperCase() === target);
  if (!order) {
    return res.status(404).json({ error: `No order found matching "${target}".` });
  }
  res.json({ order });
});

// ========================
// ADMIN RBAC ENDPOINTS
// ========================
router.get('/admin/analytics', requireAdmin, (_req, res) => {
  const s = store.getState();
  const validOrders = s.orders.filter((o) => o.status !== 'cancelled');
  const totalSales = Number(validOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2));
  const totalOrders = s.orders.length;
  const totalCustomers = s.users.filter((u) => u.role === 'customer').length;
  const totalProducts = s.products.length;
  const averageOrderValue = validOrders.length ? Number((totalSales / validOrders.length).toFixed(2)) : 0;

  const lowStockProducts = s.products.filter((p) => p.stock <= 10);

  // Build 6-month revenue series combining historical baseline + live orders
  const baseMonths = [
    { label: 'Jun', revenue: 4280, orders: 14 },
    { label: 'Jul', revenue: 5190, orders: 18 },
    { label: 'Aug', revenue: 4860, orders: 16 },
    { label: 'Sep', revenue: 6140, orders: 21 },
    { label: 'Oct', revenue: 6920, orders: 24 },
    { label: 'Nov', revenue: 7450, orders: 26 },
  ];

  // Add live order volume into Sep/Oct/Nov buckets so charts update dynamically when orders are placed
  const liveNovRevenue = validOrders
    .filter((o) => o.createdAt.startsWith('2026-11'))
    .reduce((sum, o) => sum + o.total, 0);
  const liveNovCount = validOrders.filter((o) => o.createdAt.startsWith('2026-11')).length;

  baseMonths[5] = {
    label: 'Nov',
    revenue: Number((5800 + liveNovRevenue).toFixed(2)),
    orders: 19 + liveNovCount,
  };

  const catTotals = new Map<string, number>();
  for (const o of validOrders) {
    for (const item of o.items) {
      const prod = s.products.find((p) => p.id === item.productId);
      const catName = prod?.categoryName || 'General';
      catTotals.set(catName, (catTotals.get(catName) || 0) + item.unitPrice * item.quantity);
    }
  }
  const catSum = Array.from(catTotals.values()).reduce((a, b) => a + b, 0) || 1;
  const categoryBreakdown = Array.from(catTotals.entries())
    .map(([category, revenue]) => ({
      category,
      revenue: Number(revenue.toFixed(2)),
      share: Math.round((revenue / catSum) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const analytics: AdminAnalytics = {
    totalSales,
    totalOrders,
    totalCustomers,
    totalProducts,
    averageOrderValue,
    lowStockProducts,
    revenueSeries: baseMonths,
    categoryBreakdown,
    recentOrders: s.orders.slice(0, 6),
  };

  res.json(analytics);
});

// Admin Products CRUD
router.post('/admin/products', requireAdmin, (req, res) => {
  const s = store.getState();
  const {
    name,
    sku,
    brand,
    categorySlug,
    shortDescription,
    description,
    price,
    salePrice,
    stock,
    imageKey,
    isTrending,
    isBestSeller,
    isNewArrival,
    isSpecialOffer,
  } = req.body;

  if (!name?.trim() || !brand?.trim() || !categorySlug?.trim() || Number(price) <= 0) {
    return res.status(400).json({ error: 'Product name, brand, category, and positive price are required.' });
  }
  const category = s.categories.find((c) => c.slug === categorySlug);
  const baseSlug = slugify(name);
  const slug = s.products.some((p) => p.slug === baseSlug)
    ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`
    : baseSlug;

  const newProduct: Product = {
    id: `prod-${crypto.randomUUID().slice(0, 8)}`,
    sku: String(sku || `KV-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
    slug,
    name: String(name).trim(),
    brand: String(brand).trim(),
    categorySlug: category?.slug || categorySlug,
    categoryName: category?.name || 'General',
    shortDescription: String(shortDescription || '').trim(),
    description: String(description || shortDescription || '').trim(),
    price: Number(price),
    salePrice: salePrice !== null && salePrice !== '' && Number(salePrice) > 0 ? Number(salePrice) : null,
    stock: Math.max(0, Math.floor(Number(stock || 0))),
    rating: 5.0,
    reviewCount: 0,
    imageKeys: [String(imageKey || 'studio-headphones'), 'hero-banner'],
    variants: {
      colors: [
        { name: 'Obsidian', hex: '#18181B' },
        { name: 'Stone', hex: '#D6D3D1' },
      ],
      sizes: ['Standard Edition'],
    },
    specs: [{ label: 'SKU', value: String(sku || 'Standard').toUpperCase() }],
    isTrending: Boolean(isTrending),
    isBestSeller: Boolean(isBestSeller),
    isNewArrival: Boolean(isNewArrival ?? true),
    isSpecialOffer: Boolean(isSpecialOffer),
    createdAt: new Date().toISOString(),
  };

  s.products.unshift(newProduct);
  store.save();
  res.status(201).json({ product: newProduct });
});

router.patch('/admin/products/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  const product = s.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const body = req.body;
  if (body.name !== undefined) product.name = String(body.name).trim();
  if (body.sku !== undefined) product.sku = String(body.sku).trim().toUpperCase();
  if (body.brand !== undefined) product.brand = String(body.brand).trim();
  if (body.categorySlug !== undefined) {
    const cat = s.categories.find((c) => c.slug === body.categorySlug);
    product.categorySlug = body.categorySlug;
    if (cat) product.categoryName = cat.name;
  }
  if (body.shortDescription !== undefined) product.shortDescription = String(body.shortDescription).trim();
  if (body.description !== undefined) product.description = String(body.description).trim();
  if (body.price !== undefined && Number(body.price) > 0) product.price = Number(body.price);
  if (body.salePrice !== undefined) {
    product.salePrice =
      body.salePrice === null || body.salePrice === '' || Number(body.salePrice) <= 0
        ? null
        : Number(body.salePrice);
  }
  if (body.stock !== undefined) product.stock = Math.max(0, Math.floor(Number(body.stock)));
  if (body.imageKey !== undefined && body.imageKey) {
    product.imageKeys = [String(body.imageKey), ...product.imageKeys.slice(1)];
  }
  if (body.isTrending !== undefined) product.isTrending = Boolean(body.isTrending);
  if (body.isBestSeller !== undefined) product.isBestSeller = Boolean(body.isBestSeller);
  if (body.isNewArrival !== undefined) product.isNewArrival = Boolean(body.isNewArrival);
  if (body.isSpecialOffer !== undefined) product.isSpecialOffer = Boolean(body.isSpecialOffer);

  store.save();
  res.json({ product });
});

router.delete('/admin/products/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  const idx = s.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
  s.products.splice(idx, 1);
  store.save();
  res.json({ ok: true });
});

// Admin Categories
router.get('/admin/categories', requireAdmin, (_req, res) => {
  res.json({ categories: store.getState().categories });
});

router.post('/admin/categories', requireAdmin, (req, res) => {
  const s = store.getState();
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const imageKey = String(req.body.imageKey || 'studio-headphones');
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  const slug = slugify(name);
  if (s.categories.some((c) => c.slug === slug)) {
    return res.status(409).json({ error: 'Category already exists.' });
  }
  const cat: Category = {
    id: `cat-${crypto.randomUUID().slice(0, 6)}`,
    name,
    slug,
    description,
    imageKey,
    featured: true,
  };
  s.categories.push(cat);
  store.save();
  res.status(201).json({ category: cat });
});

router.delete('/admin/categories/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  s.categories = s.categories.filter((c) => c.id !== req.params.id);
  store.save();
  res.json({ ok: true });
});

// Admin Orders
router.get('/admin/orders', requireAdmin, (_req, res) => {
  res.json({ orders: store.getState().orders });
});

router.patch('/admin/orders/:id/status', requireAdmin, (req, res) => {
  const s = store.getState();
  const order = s.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const status = req.body.status as OrderStatus;
  const valid: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }

  order.status = status;
  if (status === 'delivered' || status === 'confirmed') {
    order.paymentStatus = 'paid';
  }
  const nowIso = new Date().toISOString();
  order.updatedAt = nowIso;
  const labelMap: Record<OrderStatus, string> = {
    pending: 'Pending Review',
    confirmed: 'Order Confirmed',
    processing: 'Preparing Shipment',
    shipped: 'Dispatched with Carrier',
    delivered: 'Delivered to Customer',
    cancelled: 'Order Cancelled',
  };
  order.timeline.push({
    status,
    label: labelMap[status],
    note: String(req.body.note || `Updated by store administrator`),
    timestamp: nowIso,
  });
  store.save();
  res.json({ order });
});

// Admin Customers
router.get('/admin/customers', requireAdmin, (_req, res) => {
  const s = store.getState();
  const customers = s.users.map((u) => {
    const userOrders = s.orders.filter(
      (o) => o.userId === u.id || o.customerEmail.toLowerCase() === u.email.toLowerCase()
    );
    return {
      ...store.sanitizeUser(u),
      orderCount: userOrders.length,
      totalSpent: Number(userOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)),
    };
  });
  res.json({ customers });
});

// Admin Coupons
router.get('/admin/coupons', requireAdmin, (_req, res) => {
  res.json({ coupons: store.getState().coupons });
});

router.post('/admin/coupons', requireAdmin, (req, res) => {
  const s = store.getState();
  const code = String(req.body.code || '').trim().toUpperCase();
  const description = String(req.body.description || '').trim();
  const type = req.body.type === 'fixed' ? 'fixed' : 'percentage';
  const value = Number(req.body.value);
  const minOrderAmount = Math.max(0, Number(req.body.minOrderAmount || 0));
  const expiresAt = String(req.body.expiresAt || '2027-12-31');

  if (!code || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: 'Valid code and positive discount value are required.' });
  }
  if (s.coupons.some((c) => c.code === code)) {
    return res.status(409).json({ error: 'Coupon code already exists.' });
  }
  const coupon: Coupon = {
    id: `coup-${crypto.randomUUID().slice(0, 6)}`,
    code,
    description: description || `${type === 'percentage' ? `${value}%` : `$${value}`} discount`,
    type,
    value,
    minOrderAmount,
    active: true,
    usageCount: 0,
    expiresAt,
  };
  s.coupons.unshift(coupon);
  store.save();
  res.status(201).json({ coupon });
});

router.patch('/admin/coupons/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  const coupon = s.coupons.find((c) => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
  if (req.body.active !== undefined) coupon.active = Boolean(req.body.active);
  store.save();
  res.json({ coupon });
});

router.delete('/admin/coupons/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  s.coupons = s.coupons.filter((c) => c.id !== req.params.id);
  store.save();
  res.json({ ok: true });
});

// Admin Banners
router.get('/admin/banners', requireAdmin, (_req, res) => {
  res.json({ banners: store.getState().banners });
});

router.patch('/admin/banners/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  const banner = s.banners.find((b) => b.id === req.params.id);
  if (!banner) return res.status(404).json({ error: 'Banner not found.' });
  const { kicker, title, subtitle, ctaText, ctaHref, active } = req.body;
  if (kicker !== undefined) banner.kicker = String(kicker);
  if (title !== undefined) banner.title = String(title);
  if (subtitle !== undefined) banner.subtitle = String(subtitle);
  if (ctaText !== undefined) banner.ctaText = String(ctaText);
  if (ctaHref !== undefined) banner.ctaHref = String(ctaHref);
  if (active !== undefined) banner.active = Boolean(active);
  store.save();
  res.json({ banner });
});

// Admin Reviews
router.get('/admin/reviews', requireAdmin, (_req, res) => {
  res.json({ reviews: store.getState().reviews });
});

router.patch('/admin/reviews/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  const review = s.reviews.find((r) => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found.' });
  if (req.body.approved !== undefined) review.approved = Boolean(req.body.approved);
  store.save();
  res.json({ review });
});

router.delete('/admin/reviews/:id', requireAdmin, (req, res) => {
  const s = store.getState();
  s.reviews = s.reviews.filter((r) => r.id !== req.params.id);
  store.save();
  res.json({ ok: true });
});

// Admin Payment & Shipping Settings
router.get('/admin/payment-settings', requireAdmin, (_req, res) => {
  res.json({ paymentSettings: store.getState().paymentSettings });
});

router.patch('/admin/payment-settings', requireAdmin, (req, res) => {
  const s = store.getState();
  const p = s.paymentSettings;
  const body = req.body;
  if (body.activeCardProvider && ['stripe', 'adyen', 'payfast'].includes(body.activeCardProvider)) {
    p.activeCardProvider = body.activeCardProvider;
  }
  if (body.cardEnabled !== undefined) p.cardEnabled = Boolean(body.cardEnabled);
  if (body.bankTransferEnabled !== undefined) p.bankTransferEnabled = Boolean(body.bankTransferEnabled);
  if (body.bankAccountName !== undefined) p.bankAccountName = String(body.bankAccountName);
  if (body.bankName !== undefined) p.bankName = String(body.bankName);
  if (body.bankIban !== undefined) p.bankIban = String(body.bankIban);
  if (body.bankSwift !== undefined) p.bankSwift = String(body.bankSwift);
  if (body.codEnabled !== undefined) p.codEnabled = Boolean(body.codEnabled);
  if (body.codFee !== undefined) p.codFee = Math.max(0, Number(body.codFee));
  if (body.standardShippingFee !== undefined) p.standardShippingFee = Math.max(0, Number(body.standardShippingFee));
  if (body.expressShippingFee !== undefined) p.expressShippingFee = Math.max(0, Number(body.expressShippingFee));
  if (body.freeShippingThreshold !== undefined) p.freeShippingThreshold = Math.max(0, Number(body.freeShippingThreshold));
  store.save();
  res.json({ paymentSettings: p });
});

export default router;
