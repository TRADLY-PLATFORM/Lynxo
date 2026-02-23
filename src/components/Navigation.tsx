import { Home, ShoppingCart, CheckCircle, MapPin } from 'lucide-react';
import { useStore, type AppPage } from '../store/useStore';

const NAV_ITEMS: { page: AppPage; icon: typeof Home; label: string }[] = [
  { page: 'home',     icon: Home,          label: 'Home'     },
  { page: 'cart',     icon: ShoppingCart,  label: 'Cart'     },
  { page: 'checkout', icon: CheckCircle,   label: 'Checkout' },
  { page: 'tracking', icon: MapPin,        label: 'Track'    },
];

export function Navigation() {
  const { page, setPage, cartCount } = useStore();
  const count = cartCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100"
      style={{
        maxWidth: '430px',
        margin: '0 auto',
        left: '50%',
        transform: 'translateX(-50%)',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ page: p, icon: Icon, label }) => {
          const active = page === p;
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active ? 'text-primary-600' : 'text-slate-400 active:bg-slate-50'
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? 'text-primary-500' : 'text-slate-400'}
                />
                {/* Cart badge */}
                {p === 'cart' && count > 0 && (
                  <span className="badge-animate absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-primary-600' : 'text-slate-400'}`}>
                {label}
              </span>
              {active && (
                <div className="w-1 h-1 rounded-full bg-primary-500 -mb-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
