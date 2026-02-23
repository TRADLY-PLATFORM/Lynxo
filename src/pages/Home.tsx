import { useState, useMemo } from 'react';
import { Search, Bell } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';

export function HomePage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const { orders } = useStore();

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [activeCategory, query]);

  const activeOrder = orders.find((o) => o.status !== 'delivered');

  return (
    <div className="page-enter pb-safe overflow-y-auto scrollbar-hide h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 safe-top">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-500 text-xs font-medium">Good day 👋</p>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Lynxo<span className="text-primary-500">.</span>
              </h1>
            </div>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 relative">
              <Bell size={18} className="text-slate-600" />
              {activeOrder && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, services…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === c.id
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active order banner */}
      {activeOrder && (
        <ActiveOrderBanner orderId={activeOrder.id} status={activeOrder.status} />
      )}

      {/* Product grid */}
      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-3">🔍</span>
            <p className="font-semibold">No results found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveOrderBanner({ orderId, status }: { orderId: string; status: string }) {
  const { setPage } = useStore();
  const statusLabel: Record<string, string> = {
    placed:           '📋 Order placed',
    confirmed:        '✅ Confirmed',
    preparing:        '📦 Preparing your order',
    out_for_delivery: '🚴 Out for delivery',
    delivered:        '🎉 Delivered!',
  };

  return (
    <button
      onClick={() => setPage('tracking')}
      className="mx-4 mt-3 w-[calc(100%-2rem)] bg-primary-500 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg shadow-primary-200"
    >
      <div className="text-left">
        <p className="text-xs font-medium opacity-80">Active Order · {orderId}</p>
        <p className="text-sm font-bold">{statusLabel[status] ?? status}</p>
      </div>
      <span className="text-lg">→</span>
    </button>
  );
}
