import { useStore } from './store/useStore';
import { Navigation } from './components/Navigation';
import { VariantSheet } from './components/ProductCard';
import { CartErrorModal } from './components/CartErrorModal';
import { HomePage } from './pages/Home';
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { CheckoutSuccessPage } from './pages/CheckoutSuccess';
import { TrackingPage } from './pages/Tracking';
import { ProfilePage } from './pages/Profile';
import { OrderHistoryPage } from './pages/OrderHistory';

export default function App() {
  const { page } = useStore();

  // Hide navigation on checkout and checkout success pages
  const showNavigation = page !== 'checkout' && page !== 'checkout_success';

  return (
    <div className="relative h-dvh overflow-hidden bg-slate-50">
      {/* Page content */}
      {page === 'home' && <HomePage />}
      {page === 'cart' && <CartPage />}
      {page === 'checkout' && <CheckoutPage />}
      {page === 'checkout_success' && <CheckoutSuccessPage />}
      {page === 'tracking' && <TrackingPage />}
      {page === 'profile' && <ProfilePage />}
      {page === 'order_history' && <OrderHistoryPage />}

      {/* Bottom navigation - hidden on checkout pages */}
      {showNavigation && <Navigation />}

      {/* Variant bottom sheet (portal-like, always rendered) */}
      <VariantSheet />

      {/* Cart error modal (always rendered, shown when error exists) */}
      <CartErrorModal />
    </div>
  );
}
