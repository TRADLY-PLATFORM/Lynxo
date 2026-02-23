import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Variant } from '../data/products';

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
  placeOrder: (address: string, slot: string) => string;
  advanceOrderStatus: (orderId: string) => void;
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
    }),
    {
      name: 'lynxo-store',
      partialize: (s) => ({ cart: s.cart, orders: s.orders }),
    },
  ),
);
