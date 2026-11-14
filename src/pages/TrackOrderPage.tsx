import React, { useEffect, useState } from 'react';
import { Check, Package, Search, Truck } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import type { Order, OrderStatus } from '../types/ecommerce.ts';

const STAGES: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Packed' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

export function TrackOrderPage() {
  useDocumentMeta('Track Order — KOVA', 'Track real-time shipping status and carrier updates for your KOVA order.');

  const { search } = useRouter();
  const initialOrder = new URLSearchParams(search).get('order') || 'KOVA-1042';

  const [orderInput, setOrderInput] = useState(initialOrder);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookupOrder = async (num: string) => {
    const clean = num.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ order: Order }>(`/api/orders/track/${encodeURIComponent(clean)}`);
      setOrder(res.order);
    } catch (err: any) {
      setOrder(null);
      setError(err?.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder) {
      lookupOrder(initialOrder);
    }
  }, [initialOrder]);

  const currentStageIdx = order ? STAGES.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Logistics</p>
        <h1 className="text-3xl font-bold text-zinc-900 mt-1">Track Your Order</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Enter your KOVA order number (for example <span className="font-mono">KOVA-1042</span> or{' '}
          <span className="font-mono">KOVA-1043</span>) to view live carrier milestones.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookupOrder(orderInput);
        }}
        className="flex flex-col sm:flex-row gap-3 mb-8"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value.toUpperCase())}
            placeholder="KOVA-1042"
            className="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Track Shipment'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 mb-6">
          {error}
        </div>
      )}

      {order && (
        <div className="border border-zinc-200 rounded-xl bg-white p-6 sm:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <p className="text-xs text-zinc-500 font-mono">
                {order.orderNumber} · {order.trackingCarrier} ({order.trackingCode})
              </p>
              <h2 className="text-xl font-bold text-zinc-900 mt-1 capitalize">
                Status: {order.status}
              </h2>
            </div>
            <div className="text-sm text-right">
              <p className="text-zinc-500 text-xs">Destination</p>
              <p className="font-medium text-zinc-900">
                {order.shippingAddress.city}, {order.shippingAddress.country}
              </p>
            </div>
          </div>

          {order.status !== 'cancelled' && (
            <div className="grid grid-cols-5 gap-2">
              {STAGES.map((stage, idx) => {
                const completed = currentStageIdx >= idx;
                return (
                  <div key={stage.key} className="flex flex-col items-center text-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-semibold ${
                        completed
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-white border-zinc-300 text-zinc-400'
                      }`}
                    >
                      {completed ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        completed ? 'text-zinc-900' : 'text-zinc-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-6 border-t border-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Shipment Timeline
            </h3>
            <div className="space-y-4">
              {[...order.timeline].reverse().map((ev, i) => (
                <div key={i} className="flex items-start justify-between gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-900">{ev.label}</p>
                      <p className="text-xs text-zinc-500">{ev.note}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-zinc-500 whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
