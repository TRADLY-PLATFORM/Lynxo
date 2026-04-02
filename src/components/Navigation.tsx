import { Home, ShoppingCart, MapPin, UserCircle2 } from 'lucide-react';
import { useStore, type AppPage } from '../store/useStore';

const NAV_ITEMS: { page: AppPage; icon: typeof Home; label: string; activeOn?: AppPage[] }[] = [
  { page: 'home', icon: Home, label: 'Home' },
  { page: 'cart', icon: ShoppingCart, label: 'Cart' },
  { page: 'tracking', icon: MapPin, label: 'Track' },
  { page: 'profile', icon: UserCircle2, label: 'Profile', activeOn: ['profile', 'order_history'] },
];

export function Navigation() {
  const { page, setPage, cartCount } = useStore();
  const count = cartCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[430px] px-3 pb-2 safe-bottom">
        <div
          className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[1.75rem] shadow-[0_8px_28px_rgba(2,6,23,0.15)]"
        >
          <div className="h-16 grid grid-cols-4 items-center">
            {NAV_ITEMS.map(({ page: p, icon: Icon, label, activeOn }) => {
              const active = page === p || !!activeOn?.includes(page);
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="h-full flex flex-col items-center justify-center gap-1 rounded-2xl"
                >
                  <div className="relative">
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? 'text-slate-900' : 'text-slate-400'}
                    />
                    {p === 'cart' && count > 0 && (
                      <span className="badge-animate absolute -top-2 -right-2 min-w-[16px] h-4 px-1 bg-accent-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
