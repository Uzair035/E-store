import React, { useEffect, useState } from 'react';
import { Banknote, Building2, CreditCard, Lock, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import { apiRequest } from '../lib/api.ts';
import type { Coupon, Order, PaymentMethod, ShippingMethod } from '../types/ecommerce.ts';
import { MediaImage } from '../components/MediaImage.tsx';

export function CheckoutPage() {
  useDocumentMeta('Checkout — KOVA', 'Complete your order securely with Card, Bank Transfer, or Cash on Delivery.');

  const { search, navigate } = useRouter();
  const { user, cart, cartSubtotal, clearCart, paymentSettings, notify } = useStore();

  const initialCoupon = new URLSearchParams(search).get('coupon') || '';

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentSettings.cardEnabled
      ? 'card'
      : paymentSettings.bankTransferEnabled
      ? 'bank_transfer'
      : 'cod'
  );

  // Card inputs (simulated tokenised gateway entry)
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('842');

  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discountAmount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill default saved address when user logs in
  useEffect(() => {
    if (!user) return;
    if (!customerName) setCustomerName(user.name);
    if (!customerEmail) setCustomerEmail(user.email);
    if (!customerPhone && user.phone) setCustomerPhone(user.phone);
    const defAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    if (defAddr && !line1) {
      setLine1(defAddr.line1);
      setLine2(defAddr.line2 || '');
      setCity(defAddr.city);
      setState(defAddr.state);
      setPostalCode(defAddr.postalCode);
      setCountry(defAddr.country);
      if (!customerPhone) setCustomerPhone(defAddr.phone);
    }
  }, [user, customerName, customerEmail, customerPhone, line1]);

  // Auto-validate coupon passed via URL
  useEffect(() => {
    if (initialCoupon && cartSubtotal > 0) {
      apiRequest<{ coupon: Coupon; discountAmount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: initialCoupon, subtotal: cartSubtotal }),
      })
        .then((res) => setAppliedCoupon(res))
        .catch(() => {});
    }
  }, [initialCoupon, cartSubtotal]);

  const handleValidateCoupon = async () => {
    setCouponMessage('');
    if (!couponCode.trim()) return;
    try {
      const res = await apiRequest<{ coupon: Coupon; discountAmount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode.trim(), subtotal: cartSubtotal }),
      });
      setAppliedCoupon(res);
      setCouponMessage(`Applied ${res.coupon.code} (-$${res.discountAmount.toFixed(2)})`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponMessage(err?.message || 'Invalid coupon');
    }
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const shippingCost =
    shippingMethod === 'express'
      ? paymentSettings.expressShippingFee
      : cartSubtotal >= paymentSettings.freeShippingThreshold
      ? 0
      : paymentSettings.standardShippingFee;
  const codFee = paymentMethod === 'cod' ? paymentSettings.codFee : 0;
  const finalTotal = Number(Math.max(0, cartSubtotal - discountAmount + shippingCost + codFee).toFixed(2));

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cart.length === 0) {
      setError('Your bag is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress: { line1, line2, city, state, postalCode, country },
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            selectedColor: i.selectedColor,
            selectedSize: i.selectedSize,
          })),
          couponCode: appliedCoupon?.coupon.code || undefined,
          shippingMethod,
          paymentMethod,
        }),
      });
      clearCart();
      notify(`Order ${res.order.orderNumber} placed successfully`, 'success');
      navigate(`/order-confirmed/${res.order.orderNumber}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to place order. Please review your details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Your Checkout Bag is Empty</h1>
        <p className="text-sm text-zinc-500 mb-6">Add products before proceeding to checkout.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-md"
        >
          Browse Store
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Checkout</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Encrypted checkout · Supports Card Gateway, Bank Transfer, and Cash on Delivery
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
          <Lock className="w-4 h-4 text-zinc-700" />
          <span>256-Bit TLS Protected</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Saved Address Quick Selector */}
          {user && user.addresses.length > 0 && (
            <section className="p-5 border border-zinc-200 rounded-lg bg-zinc-50">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Saved Shipping Addresses
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setCustomerName(addr.fullName);
                      setCustomerPhone(addr.phone);
                      setLine1(addr.line1);
                      setLine2(addr.line2 || '');
                      setCity(addr.city);
                      setState(addr.state);
                      setPostalCode(addr.postalCode);
                      setCountry(addr.country);
                    }}
                    className="text-left p-3 rounded-md border border-zinc-300 bg-white hover:border-zinc-900 transition-colors text-xs"
                  >
                    <p className="font-semibold text-zinc-900">{addr.label}</p>
                    <p className="text-zinc-600 mt-0.5 truncate">{addr.line1}</p>
                    <p className="text-zinc-500">
                      {addr.city}, {addr.postalCode}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 1. Customer & Shipping Information */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-900">1. Contact & Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Phone Number (for courier & COD confirmation) *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="120 Market Street"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Apartment, Suite, Unit (optional)
                </label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Postal Code *</label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>
          </section>

          {/* 2. Shipping Method */}
          <section className="space-y-3 pt-6 border-t border-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900">2. Shipping Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-lg border cursor-pointer flex items-start justify-between gap-3 ${
                  shippingMethod === 'standard'
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Standard Tracked</p>
                    <p className="text-xs text-zinc-500">3–5 business days</p>
                  </div>
                </div>
                <span className="text-sm font-mono tabular-nums font-semibold text-zinc-900">
                  {cartSubtotal >= paymentSettings.freeShippingThreshold
                    ? 'Free'
                    : `$${paymentSettings.standardShippingFee.toFixed(2)}`}
                </span>
              </label>

              <label
                className={`p-4 rounded-lg border cursor-pointer flex items-start justify-between gap-3 ${
                  shippingMethod === 'express'
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">DHL / FedEx Express</p>
                    <p className="text-xs text-zinc-500">1–2 business days</p>
                  </div>
                </div>
                <span className="text-sm font-mono tabular-nums font-semibold text-zinc-900">
                  ${paymentSettings.expressShippingFee.toFixed(2)}
                </span>
              </label>
            </div>
          </section>

          {/* 3. Payment Method (Configurable) */}
          <section className="space-y-4 pt-6 border-t border-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900">3. Payment Method</h2>
            <div className="space-y-3">
              {paymentSettings.cardEnabled && (
                <div
                  className={`rounded-lg border p-4 ${
                    paymentMethod === 'card' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white'
                  }`}
                >
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                      />
                      <CreditCard className="w-4 h-4 text-zinc-700" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Credit / Debit Card ({paymentSettings.activeCardProvider.toUpperCase()} Gateway)
                        </p>
                        <p className="text-xs text-zinc-500">Instant authorization via configured card processor</p>
                      </div>
                    </div>
                  </label>
                  {paymentMethod === 'card' && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-xs text-zinc-600 mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-md"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-600 mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600 mb-1">CVC</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-zinc-300 rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentSettings.bankTransferEnabled && (
                <div
                  className={`rounded-lg border p-4 ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-zinc-900 bg-zinc-50'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                    />
                    <Building2 className="w-4 h-4 text-zinc-700" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Direct Bank Transfer / Wire</p>
                      <p className="text-xs text-zinc-500">Order ships immediately after settlement verification</p>
                    </div>
                  </label>
                  {paymentMethod === 'bank_transfer' && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 text-xs space-y-1.5 text-zinc-700 font-mono">
                      <p>Beneficiary: {paymentSettings.bankAccountName}</p>
                      <p>Bank: {paymentSettings.bankName}</p>
                      <p>IBAN / Account: {paymentSettings.bankIban}</p>
                      <p>SWIFT / BIC: {paymentSettings.bankSwift}</p>
                    </div>
                  )}
                </div>
              )}

              {paymentSettings.codEnabled && (
                <div
                  className={`rounded-lg border p-4 ${
                    paymentMethod === 'cod' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white'
                  }`}
                >
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                      />
                      <Banknote className="w-4 h-4 text-zinc-700" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">Cash on Delivery (COD)</p>
                        <p className="text-xs text-zinc-500">
                          Pay ${finalTotal.toFixed(2)} in cash or mobile terminal upon courier arrival
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-zinc-600">
                      {paymentSettings.codFee > 0 ? `+$${paymentSettings.codFee.toFixed(2)} fee` : 'No fee'}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="lg:col-span-5 bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-zinc-900">Order Summary</h2>

          <div className="divide-y divide-zinc-200 max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`}
                className="py-3 flex items-center gap-3"
              >
                <div className="w-14 h-12 rounded bg-zinc-200 overflow-hidden shrink-0">
                  <MediaImage imageKey={item.imageKey} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    Qty {item.quantity} · {[item.selectedColor, item.selectedSize].filter(Boolean).join(', ')}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-zinc-900">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-200 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Promo code (KOVA15)"
                className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white border border-zinc-300 rounded-md"
              />
              <button
                type="button"
                onClick={handleValidateCoupon}
                className="px-4 py-2 text-xs font-medium border border-zinc-300 bg-white rounded-md hover:bg-zinc-100"
              >
                Apply
              </button>
            </div>
            {couponMessage && <p className="text-xs text-zinc-600">{couponMessage}</p>}
          </div>

          <dl className="space-y-2 text-sm pt-3 border-t border-zinc-200">
            <div className="flex justify-between">
              <dt className="text-zinc-600">Subtotal</dt>
              <dd className="font-mono tabular-nums text-zinc-900">${cartSubtotal.toFixed(2)}</dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Promo Discount</dt>
                <dd className="font-mono tabular-nums">-${discountAmount.toFixed(2)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-600">Shipping ({shippingMethod})</dt>
              <dd className="font-mono tabular-nums text-zinc-900">
                {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
              </dd>
            </div>
            {codFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-zinc-600">Cash on Delivery Handling</dt>
                <dd className="font-mono tabular-nums text-zinc-900">${codFee.toFixed(2)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-zinc-200 text-base font-bold text-zinc-900">
              <dt>Total Due</dt>
              <dd className="font-mono tabular-nums">${finalTotal.toFixed(2)}</dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Processing Order...'
              : paymentMethod === 'cod'
              ? `Confirm COD Order ($${finalTotal.toFixed(2)})`
              : `Place Order ($${finalTotal.toFixed(2)})`}
          </button>

          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 pt-1">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Buyer Protection
            </span>
            <span className="inline-flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Tracked Dispatch
            </span>
          </div>
        </aside>
      </form>
    </div>
  );
}
