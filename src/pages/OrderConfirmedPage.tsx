import React, { useEffect, useState } from 'react';
import { CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Order } from '../types/ecommerce.ts';
import { MediaImage } from '../components/MediaImage.tsx';

export function OrderConfirmedPage({ orderNumber }: { orderNumber: string }) {
  useDocumentMeta(`Order ${orderNumber} Confirmed — KOVA`);

  const { navigate } = useRouter();
  const { paymentSettings } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ order: Order }>(`/api/orders/track/${encodeURIComponent(orderNumber)}`)
      .then((res) => setOrder(res.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-zinc-500">
        Loading order confirmation...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Order Not Found</h1>
        <button
          onClick={() => navigate('/shop')}
          className="mt-4 px-5 py-2.5 text-sm bg-zinc-900 text-white rounded-md"
        >
          Back to Store
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="border border-zinc-200 rounded-xl p-8 bg-white space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Order Confirmed
              </p>
              <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">
                Order {order.orderNumber} — Preparing Shipment
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                Receipt sent to <span className="font-medium text-zinc-900">{order.customerEmail}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/track?order=${encodeURIComponent(order.orderNumber)}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 whitespace-nowrap shrink-0"
          >
            <Truck className="w-4 h-4" />
            Track Order
          </button>
        </div>

        {order.paymentMethod === 'bank_transfer' && (
          <div className="p-5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-950 space-y-1.5">
            <p className="font-semibold">Bank Transfer Instructions</p>
            <p className="text-xs">
              Please wire <span className="font-mono font-bold">${order.total.toFixed(2)}</span> and include reference{' '}
              <span className="font-mono font-bold">{order.orderNumber}</span>:
            </p>
            <p className="text-xs font-mono">
              {paymentSettings.bankName} · {paymentSettings.bankAccountName} · IBAN: {paymentSettings.bankIban} · SWIFT:{' '}
              {paymentSettings.bankSwift}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Shipping Address
            </p>
            <p className="font-medium text-zinc-900">{order.customerName}</p>
            <p className="text-zinc-600">{order.shippingAddress.line1}</p>
            <p className="text-zinc-600">
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            </p>
            <p className="text-zinc-600">{order.shippingAddress.country}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Payment & Method
            </p>
            <p className="font-medium text-zinc-900">{order.paymentProvider}</p>
            <p className="text-zinc-600 capitalize">Status: {order.paymentStatus.replace('_', ' ')}</p>
            <p className="text-zinc-600 mt-1 font-mono text-xs">
              Carrier: {order.trackingCarrier} ({order.trackingCode})
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Total Breakdown
            </p>
            <div className="space-y-1 font-mono tabular-nums text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Shipping</span>
                <span>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`}</span>
              </div>
              {order.codFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">COD Fee</span>
                  <span>${order.codFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <PackageCheck className="w-4 h-4" /> Items Ordered
          </h2>
          <div className="divide-y divide-zinc-100">
            {order.items.map((item, i) => (
              <div key={`${item.productId}-${i}`} className="py-3 flex items-center gap-4">
                <div className="w-16 h-12 rounded bg-zinc-100 overflow-hidden shrink-0">
                  <MediaImage imageKey={item.imageKey} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    Qty {item.quantity} · {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-sm font-mono tabular-nums font-semibold text-zinc-900">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
          >
            Continue Shopping
          </button>
          <button
            type="button"
            onClick={() => navigate('/account?tab=orders')}
            className="px-5 py-2.5 text-sm font-medium border border-zinc-300 text-zinc-900 rounded-md hover:bg-zinc-50"
          >
            View Order History
          </button>
        </div>
      </div>
    </div>
  );
}
