import { useStore } from './store/useStore';
import { Navigation } from './components/Navigation';
import { VariantSheet } from './components/ProductCard';
import { HomePage } from './pages/Home';
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { TrackingPage } from './pages/Tracking';

export default function App() {
  const { page } = useStore();

  return (
    <div className="relative h-dvh overflow-hidden bg-slate-50">
      {/* Page content */}
      {page === 'home'     && <HomePage />}
      {page === 'cart'     && <CartPage />}
      {page === 'checkout' && <CheckoutPage />}
      {page === 'tracking' && <TrackingPage />}

      {/* Bottom navigation */}
      <Navigation />

      {/* Variant bottom sheet (portal-like, always rendered) */}
      <VariantSheet />
    </div>
  );
}
