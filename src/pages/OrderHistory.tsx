import { useEffect } from 'react';
import { Clock3, ReceiptText, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatMoney } from '../lib/currency';

export function OrderHistoryPage() {
  const {
    tradlyUser,
    orders,
    ordersLoading,
    ordersError,
    ordersHasMore,
    fetchOrderHistory,
    setCurrentOrderId,
    setPage,
  } = useStore();

  useEffect(() => {
    if (!tradlyUser) return;
    fetchOrderHistory(true);
  }, [tradlyUser, fetchOrderHistory]);

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-900">Order History</h1>
          <button
            onClick={() => fetchOrderHistory(true)}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 pb-28 space-y-3">
        {!tradlyUser && (
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100 text-sm text-slate-600">
            Login is required to view Tradly order history.
          </div>
        )}

        {ordersError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
            {ordersError}
          </div>
        )}

        {orders.length === 0 && !ordersLoading && tradlyUser && (
          <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 text-center">
            <ReceiptText className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-700 font-semibold">No orders yet</p>
            <p className="text-sm text-slate-500 mt-1">Place your first order from checkout.</p>
          </div>
        )}

        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => {
              setCurrentOrderId(order.id);
              setPage('tracking');
            }}
            className="w-full bg-white rounded-2xl p-4 shadow-card border border-slate-100 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Ref: {order.reference}</p>
                <p className="text-xs text-slate-500 mt-0.5">Order #{order.tradlyId}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Clock3 size={12} />
                  {new Date(order.placedAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{formatMoney(order.total)}</p>
                <p className="text-xs mt-1 text-primary-600 font-semibold">{order.statusLabel}</p>
              </div>
            </div>
          </button>
        ))}

        {ordersLoading && (
          <div className="text-sm text-slate-500 text-center py-3">Loading orders…</div>
        )}

        {!ordersLoading && ordersHasMore && tradlyUser && orders.length > 0 && (
          <button
            onClick={() => fetchOrderHistory(false)}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
