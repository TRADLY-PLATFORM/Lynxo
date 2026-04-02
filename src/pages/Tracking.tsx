import { useEffect, useMemo, useRef } from 'react';
import { MapPin, Package, Phone, RefreshCw, UserRound } from 'lucide-react';
import {
  useStore,
  ORDER_STATUS_STEPS,
  isTerminalOrderStatus,
} from '../store/useStore';
import { formatMoney } from '../lib/currency';

function stepIndexForStatus(code: number): number {
  if (code === 6 || code === 7) return 1;
  const idx = ORDER_STATUS_STEPS.findIndex((step) => step.code === code);
  return idx >= 0 ? idx : 0;
}

export function TrackingPage() {
  const {
    orders,
    currentOrderId,
    refreshCurrentOrder,
    setPage,
    setCurrentOrderId,
    tradlyUser,
    fetchOrderHistory,
    ordersLoading,
  } = useStore();

  const order = useMemo(
    () => orders.find((item) => item.id === currentOrderId) ?? orders[0],
    [orders, currentOrderId],
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderId = order?.id;
  const orderStatusCode = order?.statusCode;
  const authKey = tradlyUser?.authKey;

  useEffect(() => {
    if (!tradlyUser) return;
    if (orders.length > 0) return;
    fetchOrderHistory(true);
  }, [tradlyUser, orders.length, fetchOrderHistory]);

  useEffect(() => {
    if (!orderId || !tradlyUser) return;
    setCurrentOrderId(orderId);
  }, [orderId, tradlyUser, setCurrentOrderId]);

  useEffect(() => {
    if (!orderId || !authKey || orderStatusCode === undefined) return;
    // Always fetch latest details at least once for detail/map/courier data.
    refreshCurrentOrder();
    if (isTerminalOrderStatus(orderStatusCode)) return;

    pollRef.current = setInterval(() => {
      refreshCurrentOrder();
    }, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId, orderStatusCode, authKey, refreshCurrentOrder]);

  if (!order) {
    return (
      <div className="page-enter flex flex-col items-center justify-center h-dvh pb-24 px-8 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5">
          <Package size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No active orders</h2>
        <p className="text-slate-500 text-sm mb-8">
          {ordersLoading ? 'Loading order history…' : 'Place an order to track its delivery here.'}
        </p>
        <button
          onClick={() => setPage('home')}
          className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-primary-200"
        >
          Order Now
        </button>
      </div>
    );
  }

  const idx = stepIndexForStatus(order.statusCode);
  const eta = new Date(order.estimatedDelivery);
  const isDelivered = order.statusCode === 5 || order.statusCode === 8;
  const isCanceled = order.statusCode === 6 || order.statusCode === 7;
  const liveLocation = order.liveTracking?.liveLocation ?? order.customerCoordinates ?? null;
  const mapUrl = order.liveTracking?.mapUrl
    ?? (liveLocation
      ? `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${liveLocation.latitude},${liveLocation.longitude}`
      : null);
  const trackingEvents = order.liveTracking?.events ?? [];
  const trackingUpdatedAt = order.liveTracking?.updatedAt
    ? new Date(order.liveTracking.updatedAt).toLocaleString()
    : null;

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Track Order</h1>
            <p className="text-slate-500 text-xs mt-0.5">#{order.tradlyId}</p>
            <p className="text-primary-500 text-xs font-medium mt-0.5">Ref: {order.reference}</p>
          </div>
          {!isTerminalOrderStatus(order.statusCode) && (
            <button
              onClick={() => refreshCurrentOrder()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              title="Refresh status"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4 space-y-4">
          <div className={`rounded-2xl p-4 ${isCanceled ? 'bg-red-500' : isDelivered ? 'bg-green-500' : 'bg-primary-500'} text-white`}>
            <p className="text-xs font-medium opacity-80 mb-1">
              {isCanceled ? 'Order Cancelled' : isDelivered ? 'Delivered!' : 'Estimated Delivery'}
            </p>
            {isCanceled ? (
              <p className="text-2xl font-black">❌ {order.statusLabel}</p>
            ) : isDelivered ? (
              <p className="text-2xl font-black">🎉 All done!</p>
            ) : (
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black">
                  {eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm font-medium opacity-80 mb-0.5">approx.</p>
              </div>
            )}
            <p className="text-xs opacity-70 mt-1">
              Slot: {order.deliverySlot} · {order.address}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Order Progress</h3>
            <div className="space-y-1">
              {ORDER_STATUS_STEPS.map((step, stepIdx) => {
                const isDone = stepIdx < idx;
                const isCurrent = stepIdx === idx;
                const isPending = stepIdx > idx;
                return (
                  <div key={step.code} className="flex items-start gap-3">
                    <div className="flex flex-col items-center w-8 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-primary-500 text-white pulse-dot'
                          : 'bg-slate-100 text-slate-300'
                      }`}
                      >
                        {isDone ? '✓' : step.icon}
                      </div>
                      {stepIdx < ORDER_STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${isDone ? 'bg-green-300' : 'bg-slate-100'}`} />
                      )}
                    </div>

                    <div className="pb-1 pt-1">
                      <p className={`text-sm font-semibold leading-tight ${
                        isPending ? 'text-slate-300' : isCurrent ? 'text-primary-700' : 'text-slate-700'
                      }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && !isTerminalOrderStatus(order.statusCode) && (
                        <p className="text-xs text-primary-400 mt-0.5">In progress…</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Live Tracking</h3>
            {mapUrl ? (
              <div className="space-y-3">
                <div className="h-52 w-full rounded-xl overflow-hidden border border-slate-200">
                  <iframe
                    title="Live order tracking map"
                    src={mapUrl}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 flex items-center gap-2">
                    <MapPin size={14} className="text-primary-500" />
                    <span className="text-slate-700">
                      {liveLocation
                        ? `${liveLocation.latitude.toFixed(5)}, ${liveLocation.longitude.toFixed(5)}`
                        : 'Location unavailable'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 flex items-center gap-2">
                    <UserRound size={14} className="text-primary-500" />
                    <span className="text-slate-700">
                      {order.liveTracking?.courierName || 'Courier assignment pending'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 flex items-center gap-2">
                    <Phone size={14} className="text-primary-500" />
                    <span className="text-slate-700">
                      {order.liveTracking?.courierPhone || 'Phone unavailable'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-slate-700 text-xs">
                      Last updated: {trackingUpdatedAt || 'Not provided by Lynxo API'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Live map is not available yet for this order.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Status Timeline</h3>
            {trackingEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No Lynxo tracking events yet.</p>
            ) : (
              <div className="space-y-2">
                {trackingEvents.map((event) => (
                  <div key={event.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">{event.label}</p>
                    {event.note && <p className="text-xs text-slate-600 mt-0.5">{event.note}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(event.at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3">
              Items ({order.items.length})
            </h3>
            {order.items.length === 0 ? (
              <p className="text-sm text-slate-500">
                Item details are available in the Tradly dashboard for this order.
              </p>
            ) : (
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.product.emoji} {item.product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.variant.label} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-800 flex-shrink-0">
                      {formatMoney(item.variant.price * item.quantity)}
                    </p>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total paid</span>
                  <span>{formatMoney(order.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
