import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Variant } from '../data/products';
import {
  isTradlyConfigured,
  getListings,
  getCategories,
  seedCategoryMap,
  adaptListingToProduct,
  loginUser,
  registerUser,
  verifyUser,
  createAddress,
  addToTradlyCart,
  clearTradlyCart,
  checkoutTradlyCart,
} from '../lib/tradlyApi';
import type { GetListingsParams } from '../lib/tradlyApi';

export interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  deliverySlot: string;
  address: string;
  status: OrderStatus;
  placedAt: string;
  estimatedDelivery: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered';

export const ORDER_STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'placed',           label: 'Order Placed',       icon: '📋' },
  { key: 'confirmed',        label: 'Confirmed',          icon: '✅' },
  { key: 'preparing',        label: 'Preparing',          icon: '📦' },
  { key: 'out_for_delivery', label: 'Out for Delivery',   icon: '🚴' },
  { key: 'delivered',        label: 'Delivered',          icon: '🎉' },
];

export type AppPage = 'home' | 'cart' | 'checkout' | 'tracking';

export interface TradlyUserSession {
  authKey: string;
  refreshKey: string;
  userId: string;
  firstName: string;
  email: string;
}

export interface VerifySession {
  verifyId: number;
  email: string;
  password: string;
  pendingOrderData: { address: string; slot: string; name: string } | null;
}

interface AppState {
  /* Navigation */
  page: AppPage;
  setPage: (p: AppPage) => void;

  /* Cart */
  cart: CartItem[];
  addToCart: (product: Product, variant: Variant) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;

  /* Bottom sheet */
  sheetProduct: Product | null;
  openSheet: (p: Product) => void;
  closeSheet: () => void;

  /* Orders */
  orders: Order[];
  currentOrderId: string | null;
  /** Synchronous local-only order placement (backward compat) */
  placeOrder: (address: string, slot: string) => string;
  /** Async order placement with Tradly integration */
  placeOrderAsync: (address: string, slot: string, name: string, email: string) => Promise<string>;
  advanceOrderStatus: (orderId: string) => void;

  /* Tradly user session */
  tradlyUser: TradlyUserSession | null;
  verifySession: VerifySession | null;
  setTradlyUser: (u: AppState['tradlyUser']) => void;
  setVerifySession: (v: AppState['verifySession']) => void;
  loginOrRegisterUser: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<'logged_in' | 'needs_verify'>;
  verifyAndCompleteUser: (code: number) => Promise<void>;

  /* Products from Tradly */
  tradlyProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  fetchProducts: (params?: GetListingsParams) => Promise<void>;

  /* Tradly order tracking */
  tradlyOrderId: string | null;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* ─── Navigation ─── */
      page: 'home',
      setPage: (page) => set({ page }),

      /* ─── Cart ─── */
      cart: [],

      addToCart: (product, variant) => {
        const existing = get().cart.find(
          (i) => i.product.id === product.id && i.variant.id === variant.id,
        );
        if (existing) {
          set({
            cart: get().cart.map((i) =>
              i.product.id === product.id && i.variant.id === variant.id
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            ),
          });
        } else {
          set({ cart: [...get().cart, { product, variant, quantity: 1 }] });
        }
      },

      removeFromCart: (productId, variantId) => {
        set({
          cart: get().cart.filter(
            (i) => !(i.product.id === productId && i.variant.id === variantId),
          ),
        });
      },

      updateQuantity: (productId, variantId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(productId, variantId);
          return;
        }
        set({
          cart: get().cart.map((i) =>
            i.product.id === productId && i.variant.id === variantId
              ? { ...i, quantity: qty }
              : i,
          ),
        });
      },

      clearCart: () => set({ cart: [] }),

      cartTotal: () =>
        get().cart.reduce((sum, i) => sum + i.variant.price * i.quantity, 0),

      cartCount: () =>
        get().cart.reduce((sum, i) => sum + i.quantity, 0),

      /* ─── Bottom sheet ─── */
      sheetProduct: null,
      openSheet: (product) => set({ sheetProduct: product }),
      closeSheet: () => set({ sheetProduct: null }),

      /* ─── Orders ─── */
      orders: [],
      currentOrderId: null,

      placeOrder: (address, slot) => {
        const id = `ORD-${Date.now()}`;
        const now = new Date();
        const eta = new Date(now.getTime() + 45 * 60_000);
        const order: Order = {
          id,
          items: [...get().cart],
          total: get().cartTotal(),
          deliverySlot: slot,
          address,
          status: 'placed',
          placedAt: now.toISOString(),
          estimatedDelivery: eta.toISOString(),
        };
        set((s) => ({
          orders: [order, ...s.orders],
          currentOrderId: id,
          cart: [],
        }));
        return id;
      },

      placeOrderAsync: async (address, slot, name, _email) => {
        const state = get();
        const configured = isTradlyConfigured();
        const user = state.tradlyUser;

        let realTradlyOrderId: string | null = null;

        if (configured && user) {
          try {
            // Clear then rebuild Tradly cart
            try { await clearTradlyCart(user.authKey); } catch { /* ignore */ }

            for (const item of state.cart) {
              await addToTradlyCart(
                parseInt(item.product.id, 10),
                parseInt(item.variant.id.replace('-default', ''), 10) || parseInt(item.product.id, 10),
                item.quantity,
                user.authKey,
              );
            }

            const tradlyAddr = await createAddress(
              { name, formatted_address: address },
              user.authKey,
            );

            const paymentMethodId = parseInt(import.meta.env.VITE_TRADLY_PAYMENT_METHOD_ID ?? '1', 10);
            const shippingMethodId = parseInt(import.meta.env.VITE_TRADLY_SHIPPING_METHOD_ID ?? '1', 10);

            const tradlyOrder = await checkoutTradlyCart(
              {
                payment_method_id: paymentMethodId,
                shipping_method_id: shippingMethodId,
                shipping_address_id: tradlyAddr.id,
              },
              user.authKey,
            );

            realTradlyOrderId = String(tradlyOrder.id);
          } catch (err) {
            // Log but don't block local order creation
            console.warn('[Tradly] Checkout failed, falling back to local order:', err);
          }
        }

        // Always create a local order for UI
        const id = `ORD-${Date.now()}`;
        const now = new Date();
        const eta = new Date(now.getTime() + 45 * 60_000);
        const order: Order = {
          id,
          items: [...state.cart],
          total: state.cartTotal(),
          deliverySlot: slot,
          address,
          status: 'placed',
          placedAt: now.toISOString(),
          estimatedDelivery: eta.toISOString(),
        };

        set((s) => ({
          orders: [order, ...s.orders],
          currentOrderId: id,
          cart: [],
          tradlyOrderId: realTradlyOrderId ?? s.tradlyOrderId,
        }));

        return id;
      },

      advanceOrderStatus: (orderId) => {
        const statusOrder: OrderStatus[] = [
          'placed',
          'confirmed',
          'preparing',
          'out_for_delivery',
          'delivered',
        ];
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const idx = statusOrder.indexOf(o.status);
            if (idx === statusOrder.length - 1) return o;
            return { ...o, status: statusOrder[idx + 1] };
          }),
        }));
      },

      /* ─── Tradly user session ─── */
      tradlyUser: null,
      verifySession: null,

      setTradlyUser: (u) => set({ tradlyUser: u }),
      setVerifySession: (v) => set({ verifySession: v }),

      loginOrRegisterUser: async (email, password, firstName, lastName) => {
        try {
          const user = await loginUser({ email, password });
          set({
            tradlyUser: {
              authKey: user.key.auth_key,
              refreshKey: user.key.refresh_key,
              userId: user.id,
              firstName: user.first_name,
              email: user.email,
            },
          });
          return 'logged_in';
        } catch {
          // Login failed — try register
          const { verify_id } = await registerUser({ email, password, first_name: firstName, last_name: lastName });
          set({
            verifySession: {
              verifyId: verify_id,
              email,
              password,
              pendingOrderData: null,
            },
          });
          return 'needs_verify';
        }
      },

      verifyAndCompleteUser: async (code) => {
        const vs = get().verifySession;
        if (!vs) throw new Error('No verify session active');
        const user = await verifyUser(vs.verifyId, code);
        set({
          tradlyUser: {
            authKey: user.key.auth_key,
            refreshKey: user.key.refresh_key,
            userId: user.id,
            firstName: user.first_name,
            email: user.email,
          },
          verifySession: null,
        });
      },

      /* ─── Products ─── */
      tradlyProducts: [],
      productsLoading: false,
      productsError: null,

      fetchProducts: async (params = {}) => {
        if (!isTradlyConfigured()) {
          set({ productsError: 'Tradly API not configured', productsLoading: false });
          return;
        }
        set({ productsLoading: true, productsError: null });
        try {
          // Seed category map in background (ignore errors)
          try {
            const cats = await getCategories();
            seedCategoryMap(cats);
          } catch { /* non-fatal */ }

          const listings = await getListings(params);
          const products = listings.map((l) => adaptListingToProduct(l));
          set({ tradlyProducts: products, productsLoading: false });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to load products';
          set({ productsError: msg, productsLoading: false });
        }
      },

      /* ─── Tradly order ID ─── */
      tradlyOrderId: null,
    }),
    {
      name: 'lynxo-store',
      partialize: (s) => ({
        cart: s.cart,
        orders: s.orders,
        tradlyUser: s.tradlyUser,
        tradlyOrderId: s.tradlyOrderId,
      }),
    },
  ),
);
