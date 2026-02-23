import { useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { useStore, ORDER_STATUS_STEPS } from '../store/useStore';

export function TrackingPage() {
  const { orders, currentOrderId, advanceOrderStatus, setPage } = useStore();

  const order = orders.find((o) => o.id === currentOrderId) ?? orders[0];

  /* Auto-advance demo: every 5 s move to next status if not yet delivered */
  useEffect(() => {
    if (!order || order.status === 'delivered') return;
    const t = setTimeout(() => advanceOrderStatus(order.id), 5000);
    return () => clearTimeout(t);
  }, [order?.status, order?.id, advanceOrderStatus]);

  if (!order) {
    return (
      <div className="page-enter flex flex-col items-center justify-center h-dvh pb-24 px-8 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5">
          <Package size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No active orders</h2>
        <p className="text-slate-500 text-sm mb-8">Place an order to track its delivery here.</p>
        <button
          onClick={() => setPage('home')}
          className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-primary-200"
        >
          Order Now
        </button>
      </div>
    );
  }

  const currentIdx = ORDER_STATUS_STEPS.findIndex((s) => s.key === order.status);
  const eta = new Date(order.estimatedDelivery);
  const isDelivered = order.status === 'delivered';

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Track Order</h1>
            <p className="text-slate-500 text-xs mt-0.5">{order.id}</p>
          </div>
          {!isDelivered && (
            <button
              onClick={() => advanceOrderStatus(order.id)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500"
              title="Simulate next status"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4 space-y-4">

          {/* ETA card */}
          <div className={`rounded-2xl p-4 ${
            isDelivered
              ? 'bg-green-500 text-white'
              : 'bg-primary-500 text-white'
          }`}>
            <p className="text-xs font-medium opacity-80 mb-1">
              {isDelivered ? 'Delivered!' : 'Estimated Delivery'}
            </p>
            {isDelivered ? (
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

          {/* Status timeline */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Order Progress</h3>
            <div className="space-y-1">
              {ORDER_STATUS_STEPS.map((step, idx) => {
                const isDone    = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isPending = idx > currentIdx;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center w-8 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-primary-500 text-white pulse-dot'
                          : 'bg-slate-100 text-slate-300'
                      }`}>
                        {isDone ? '✓' : step.icon}
                      </div>
                      {idx < ORDER_STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${
                          isDone ? 'bg-green-300' : 'bg-slate-100'
                        }`} />
                      )}
                    </div>

                    {/* Label */}
                    <div className="pb-1 pt-1">
                      <p className={`text-sm font-semibold leading-tight ${
                        isPending ? 'text-slate-300' : isCurrent ? 'text-primary-700' : 'text-slate-700'
                      }`}>
                        {step.label}
                      </p>
                      {isCurrent && !isDelivered && (
                        <p className="text-xs text-primary-400 mt-0.5">In progress…</p>
                      )}
                      {isDone && (
                        <p className="text-xs text-green-500 mt-0.5">Done</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order items */}
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3">
              Items ({order.items.length})
            </h3>
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
                    ₹{item.variant.price * item.quantity}
                  </p>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total paid</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Re-order */}
          {isDelivered && (
            <button
              onClick={() => setPage('home')}
              className="w-full bg-primary-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-200"
            >
              🔄 Order Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
