import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import { apiRequest } from '../lib/api.ts';
import type { Coupon } from '../types/ecommerce.ts';
import { MediaImage } from '../components/MediaImage.tsx';

export function CartPage() {
  useDocumentMeta('Shopping Bag — NOVA', 'Review items in your shopping bag, apply promo codes, and proceed to checkout.');

  const { navigate } = useRouter();
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    paymentSettings,
    notify,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await apiRequest<{ coupon: Coupon; discountAmount: number }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput.trim(), subtotal: cartSubtotal }),
      });
      setAppliedCoupon(res);
      notify(`Applied code ${res.coupon.code}`, 'success');
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message || 'Invalid coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const qualifiesFreeShipping = cartSubtotal >= paymentSettings.freeShippingThreshold;
  const estimatedShipping = cartSubtotal === 0 ? 0 : qualifiesFreeShipping ? 0 : paymentSettings.standardShippingFee;
  const estimatedTotal = Math.max(0, cartSubtotal - discount + estimatedShipping);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Shopping Bag</h1>

      {cart.length === 0 ? (
        <div className="border border-zinc-200 rounded-xl p-12 text-center bg-zinc-50">
          <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" strokeWidth={1.4} />
          <h2 className="text-lg font-semibold text-zinc-900">Your shopping bag is empty</h2>
          <p className="text-sm text-zinc-500 mt-1 mb-6 max-w-md mx-auto">
            Browse our curated electronics, timepieces, leather carry, and workspace objects to add items to your bag.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 divide-y divide-zinc-200 border-t border-b border-zinc-200">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`}
                className="py-6 flex flex-col sm:flex-row gap-5"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/product/${item.slug}`)}
                  className="w-28 h-24 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0"
                >
                  <MediaImage imageKey={item.imageKey} alt={item.name} className="w-full h-full object-cover" />
                </button>

                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                        {item.brand}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/product/${item.slug}`)}
                        className="text-base font-semibold text-zinc-900 hover:underline text-left mt-0.5"
                      >
                        {item.name}
                      </button>
                      <p className="text-xs text-zinc-500 mt-1">
                        {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <p className="text-base font-semibold text-zinc-900 font-mono tabular-nums">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="inline-flex items-center border border-zinc-300 rounded-md bg-white">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          updateCartQuantity(
                            item.productId,
                            item.selectedColor,
                            item.selectedSize,
                            item.quantity - 1
                          )
                        }
                        className="p-2 text-zinc-600 hover:text-zinc-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-mono tabular-nums font-medium text-zinc-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateCartQuantity(
                            item.productId,
                            item.selectedColor,
                            item.selectedSize,
                            item.quantity + 1
                          )
                        }
                        className="p-2 text-zinc-600 hover:text-zinc-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.selectedColor, item.selectedSize)}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:col-span-4 bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-zinc-900">Order Summary</h2>

            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="block text-xs font-medium text-zinc-700">
                Promo Code (try <span className="font-mono font-semibold">NOVA15</span>)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono uppercase bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={applyingCoupon}
                  className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-red-700">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-xs text-emerald-700 font-medium">
                  Code {appliedCoupon.coupon.code} applied (-${appliedCoupon.discountAmount.toFixed(2)})
                </p>
              )}
            </form>

            <dl className="space-y-2.5 text-sm pt-3 border-t border-zinc-200">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Subtotal</dt>
                <dd className="font-mono tabular-nums font-medium text-zinc-900">
                  ${cartSubtotal.toFixed(2)}
                </dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount ({appliedCoupon?.coupon.code})</dt>
                  <dd className="font-mono tabular-nums font-medium">-${discount.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-600">Estimated Shipping</dt>
                <dd className="font-mono tabular-nums text-zinc-900">
                  {estimatedShipping === 0 ? 'Free' : `$${estimatedShipping.toFixed(2)}`}
                </dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-zinc-200 text-base font-bold text-zinc-900">
                <dt>Estimated Total</dt>
                <dd className="font-mono tabular-nums">${estimatedTotal.toFixed(2)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() =>
                navigate(
                  appliedCoupon
                    ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.coupon.code)}`
                    : '/checkout'
                )
              }
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
