import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { useRouter } from '../lib/router.tsx';
import { MediaImage } from './MediaImage.tsx';

export function CartDrawer() {
  const { navigate } = useRouter();
  const {
    cart,
    cartSubtotal,
    isCartOpen,
    setCartOpen,
    updateCartQuantity,
    removeFromCart,
    paymentSettings,
  } = useStore();

  if (!isCartOpen) return null;

  const freeThreshold = paymentSettings.freeShippingThreshold || 150;
  const remainingForFree = Math.max(0, freeThreshold - cartSubtotal);
  const progressPct = Math.min(100, (cartSubtotal / freeThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-[1px]"
        onClick={() => setCartOpen(false)}
      />

      <aside className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 font-display">
            Shopping Bag ({cart.reduce((s, i) => s + i.quantity, 0)})
          </h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close shopping bag"
            className="p-2 text-zinc-500 hover:text-zinc-900 rounded-md hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200">
          <p className="text-xs text-zinc-600 mb-2">
            {remainingForFree === 0
              ? 'You unlocked complimentary standard shipping.'
              : `Add $${remainingForFree.toFixed(2)} more for free standard shipping.`}
          </p>
          <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-zinc-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-zinc-300 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-zinc-900 mb-1">Your bag is currently empty</p>
              <p className="text-xs text-zinc-500 max-w-xs mb-5">
                Explore curated audio, horology, carry, and studio objects to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`}
                className="py-4 flex gap-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    navigate(`/product/${item.slug}`);
                  }}
                  className="w-20 h-20 rounded-md overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200"
                >
                  <MediaImage imageKey={item.imageKey} alt={item.name} className="w-full h-full object-cover" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        navigate(`/product/${item.slug}`);
                      }}
                      className="text-sm font-medium text-zinc-900 text-left line-clamp-1 hover:underline"
                    >
                      {item.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.selectedColor, item.selectedSize)}
                      aria-label={`Remove ${item.name}`}
                      className="text-zinc-400 hover:text-red-600 p-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center border border-zinc-200 rounded-md">
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
                        className="p-1.5 text-zinc-600 hover:text-zinc-900"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-mono tabular-nums font-medium text-zinc-900">
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
                        className="p-1.5 text-zinc-600 hover:text-zinc-900"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 font-mono tabular-nums">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-zinc-200 bg-zinc-50 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">Subtotal</span>
              <span className="text-base font-semibold text-zinc-900 font-mono tabular-nums">
                ${cartSubtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Promo codes, shipping speed, and payment method are selected at checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/cart');
                }}
                className="px-4 py-2.5 text-xs font-medium border border-zinc-300 bg-white text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors"
              >
                View Bag
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="px-4 py-2.5 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
