import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Variant } from '../data/products';
import { setCurrencyCode } from '../lib/currency';
import {
  isTradlyConfigured,
  TradlyApiError,
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
  getPaymentMethods,
  getShippingMethods,
  getTradlyOrder,
  getTradlyOrders,
  getLynxoOrderTracking,
} from '../lib/tradlyApi';
import type {
  GetListingsParams,
  LynxoOrderTracking,
  TradlyPaymentMethod,
  TradlyOrder,
  TradlyUser,
} from '../lib/tradlyApi';

export interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
}

export type TradlyOrderStatusCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Order {
  id: string;
  tradlyId: string;
  reference: string;
  items: CartItem[];
  total: number;
  deliverySlot: string;
  address: string;
  statusCode: TradlyOrderStatusCode;
  statusLabel: string;
  placedAt: string;
  estimatedDelivery: string;
  customerCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  liveTracking?: {
    liveLocation?: {
      latitude: number;
      longitude: number;
    } | null;
    customerLocation?: {
      latitude: number;
      longitude: number;
    } | null;
    updatedAt?: string;
    etaMinutes?: number;
    courierName?: string;
    courierPhone?: string;
    mapUrl?: string;
    events: Array<{
      id: string;
      label: string;
      note?: string;
      at: string;
    }>;
  };
}

export const ORDER_STATUS_STEPS: { code: TradlyOrderStatusCode; label: string; icon: string }[] = [
  { code: 1, label: 'Order Incomplete', icon: '📋' },
  { code: 2, label: 'Confirmed', icon: '✅' },
  { code: 3, label: 'In Progress', icon: '📦' },
  { code: 4, label: 'Shipped', icon: '🚚' },
  { code: 5, label: 'Delivered', icon: '🎉' },
  { code: 8, label: 'Completed', icon: '🏁' },
];

export function getOrderStatusLabel(code: number): string {
  switch (code) {
    case 1: return 'Incomplete';
    case 2: return 'Confirmed';
    case 3: return 'In progress';
    case 4: return 'Shipped';
    case 5: return 'Delivered';
    case 6: return 'Canceled by customer';
    case 7: return 'Canceled by admin';
    case 8: return 'Completed';
    default: return 'Unknown';
  }
}

export function isTerminalOrderStatus(code: number): boolean {
  return code === 5 || code === 6 || code === 7 || code === 8;
}

export type AppPage = 'home' | 'cart' | 'checkout' | 'tracking' | 'profile' | 'order_history';

export interface TradlyUserSession {
  authKey: string;
  refreshKey: string;
  userId: string;
  firstName: string;
  email: string;
}

interface PendingCheckoutData {
  address: string;
  slot: string;
  name: string;
  email: string;
  paymentMethodId: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface VerifySession {
  verifyId: number;
  email: string;
  password: string;
  pendingOrderData: PendingCheckoutData | null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function persistAuthSession(user: TradlyUserSession): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('auth_key', user.authKey);
    window.localStorage.setItem('refresh_key', user.refreshKey);
    window.localStorage.setItem('login', 'true');
  }
  // Matches Butterflies pattern: keep auth_key in cookie for cross-page reads.
  writeCookie('auth_key', user.authKey, 12 * 60 * 60);
}

function clearAuthSessionStorage(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('auth_key');
    window.localStorage.removeItem('refresh_key');
    window.localStorage.removeItem('login');
  }
  clearCookie('auth_key');
}

interface AppState {
  page: AppPage;
  setPage: (p: AppPage) => void;

  cart: CartItem[];
  addToCart: (product: Product, variant: Variant) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
  syncTradlyCartFromLocal: () => Promise<void>;

  sheetProduct: Product | null;
  openSheet: (p: Product) => void;
  closeSheet: () => void;

  orders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  ordersPage: number;
  ordersHasMore: boolean;
  currentOrderId: string | null;
  setCurrentOrderId: (orderId: string) => void;
  placeOrderAsync: (input: PendingCheckoutData) => Promise<string>;
  refreshCurrentOrder: () => Promise<void>;
  fetchOrderHistory: (reset?: boolean) => Promise<void>;

  paymentMethods: TradlyPaymentMethod[];
  paymentMethodsLoading: boolean;
  paymentMethodsError: string | null;
  fetchPaymentMethods: () => Promise<void>;

  tradlyUser: TradlyUserSession | null;
  verifySession: VerifySession | null;
  setTradlyUser: (u: AppState['tradlyUser']) => void;
  setVerifySession: (v: AppState['verifySession']) => void;
  logout: () => void;
  loginOrRegisterUser: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    legacyPassword?: string,
  ) => Promise<'logged_in' | 'needs_verify'>;
  verifyAndCompleteUser: (code: number) => Promise<void>;

  tradlyProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  fetchProducts: (params?: GetListingsParams) => Promise<void>;
}

function statusCode(input: number): TradlyOrderStatusCode {
  if (input >= 1 && input <= 8) return input as TradlyOrderStatusCode;
  return 1;
}

function buildAddressPayload(
  name: string,
  address: string,
  coordinates?: { latitude: number; longitude: number } | null,
) {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const postCode = address.match(/\b\d{4,10}\b/)?.[0] ?? '00000';

  return {
    name,
    phone_number: '0000000000',
    address_line_1: parts[0] ?? address,
    address_line_2: parts.slice(1).join(', ') || undefined,
    landmark: parts[1] || undefined,
    state: parts.length >= 2 ? parts[parts.length - 2] : 'NA',
    post_code: postCode,
    country: parts.length >= 1 ? parts[parts.length - 1] : 'NA',
    type: 'shipping_address' as const,
    coordinates: coordinates ?? undefined,
  };
}

function mapTradlyOrderToLocal(tradlyOrder: TradlyOrder, existing?: Order): Order {
  const now = new Date();
  const eta = new Date(now.getTime() + 45 * 60_000);
  const code = statusCode(tradlyOrder.status);
  const id = String(tradlyOrder.id);

  return {
    id,
    tradlyId: id,
    reference: tradlyOrder.reference ?? existing?.reference ?? `TR-${id}`,
    items: existing?.items ?? [],
    total: tradlyOrder.total ?? existing?.total ?? 0,
    deliverySlot: existing?.deliverySlot ?? 'Standard',
    address: existing?.address ?? 'Address saved in account',
    statusCode: code,
    statusLabel: getOrderStatusLabel(code),
    placedAt: tradlyOrder.created_at ?? existing?.placedAt ?? now.toISOString(),
    estimatedDelivery: existing?.estimatedDelivery ?? eta.toISOString(),
    customerCoordinates: existing?.customerCoordinates ?? null,
    liveTracking: existing?.liveTracking,
  };
}

function mergeLynxoTracking(order: Order, tracking: LynxoOrderTracking | null): Order {
  if (!tracking) return order;

  const rawStatus = tracking.status_code ?? tracking.status;
  const hasStatus = typeof rawStatus === 'number' && rawStatus >= 1 && rawStatus <= 8;
  const nextStatusCode = hasStatus ? statusCode(rawStatus) : order.statusCode;
  const nextStatusLabel =
    tracking.status_label
    ?? tracking.status_text
    ?? (hasStatus ? getOrderStatusLabel(nextStatusCode) : order.statusLabel);

  const etaMinutes = typeof tracking.eta_minutes === 'number' ? tracking.eta_minutes : undefined;
  const estimatedDelivery = etaMinutes !== undefined
    ? new Date(Date.now() + etaMinutes * 60_000).toISOString()
    : order.estimatedDelivery;

  const events = (tracking.events ?? [])
    .map((event, index) => {
      const label = event.label ?? event.status ?? '';
      const at = event.at ?? event.timestamp ?? '';
      if (!label || !at) return null;
      return {
        id: event.id ?? `${index}-${label}-${at}`,
        label,
        note: event.note ?? event.description,
        at,
      };
    })
    .filter(Boolean) as NonNullable<Order['liveTracking']>['events'];

  return {
    ...order,
    statusCode: nextStatusCode,
    statusLabel: nextStatusLabel,
    estimatedDelivery,
    liveTracking: {
      liveLocation: tracking.live_location ?? tracking.location ?? order.liveTracking?.liveLocation ?? null,
      customerLocation: tracking.customer_location ?? order.liveTracking?.customerLocation ?? order.customerCoordinates ?? null,
      updatedAt: tracking.updated_at ?? order.liveTracking?.updatedAt,
      etaMinutes,
      courierName: tracking.driver?.name ?? order.liveTracking?.courierName,
      courierPhone: tracking.driver?.phone ?? order.liveTracking?.courierPhone,
      mapUrl: tracking.map_url ?? order.liveTracking?.mapUrl,
      events: events.length > 0 ? events : (order.liveTracking?.events ?? []),
    },
  };
}

function upsertOrders(existing: Order[], incoming: Order[]): Order[] {
  const map = new Map(existing.map((order) => [order.id, order]));
  for (const order of incoming) map.set(order.id, order);
  return Array.from(map.values()).sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

function parseTradlyNumericId(raw: string, kind: 'listing' | 'variant'): number {
  const cleaned = raw.replace(/-default$/, '');
  const value = parseInt(cleaned, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Cart contains non-Tradly ${kind} IDs. Clear cart and add products from live catalog, then retry.`,
    );
  }
  return value;
}

async function syncTradlyCart(state: Pick<AppState, 'cart' | 'tradlyUser'>): Promise<void> {
  if (!isTradlyConfigured() || !state.tradlyUser) return;
  // Require a fully established session from login/verify before calling cart APIs.
  if (!state.tradlyUser.userId || !state.tradlyUser.email) return;

  try {
    await clearTradlyCart(state.tradlyUser.authKey);
  } catch (err) {
    // Tradly can return "Cart not found" when the user has no remote cart yet.
    // That's safe to ignore because we'll create cart lines right after.
    if (err instanceof TradlyApiError) {
      const code = (err.body as { error?: { code?: number } } | undefined)?.error?.code;
      if (code !== 471) throw err;
    } else {
      throw err;
    }
  }

  for (const item of state.cart) {
    const listingId = parseTradlyNumericId(item.product.id, 'listing');
    const variantId = parseTradlyNumericId(item.variant.id, 'variant');
    await addToTradlyCart(
      listingId,
      variantId,
      item.quantity,
      state.tradlyUser.authKey,
    );
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      page: 'home',
      setPage: (page) => set({ page }),

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
        void get().syncTradlyCartFromLocal().catch(() => {
          // Keep local cart usable even if remote sync fails.
        });
      },
      removeFromCart: (productId, variantId) => {
        set({
          cart: get().cart.filter(
            (i) => !(i.product.id === productId && i.variant.id === variantId),
          ),
        });
        void get().syncTradlyCartFromLocal().catch(() => {
          // Keep local cart usable even if remote sync fails.
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
        void get().syncTradlyCartFromLocal().catch(() => {
          // Keep local cart usable even if remote sync fails.
        });
      },
      clearCart: () => {
        set({ cart: [] });
        void get().syncTradlyCartFromLocal().catch(() => {
          // Keep local cart usable even if remote sync fails.
        });
      },
      cartTotal: () => get().cart.reduce((sum, i) => sum + i.variant.price * i.quantity, 0),
      cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
      syncTradlyCartFromLocal: async () => {
        try {
          await syncTradlyCart(get());
        } catch (err) {
          if (err instanceof TradlyApiError) {
            const code = (err.body as { error?: { code?: number } } | undefined)?.error?.code;
            // Invalid/stale auth key. Clear session so app can recover with fresh OTP login.
            if (err.status === 401 || (err.status === 412 && code === 753)) {
              clearAuthSessionStorage();
              set({ tradlyUser: null });
              return;
            }
          }
          throw err;
        }
      },

      sheetProduct: null,
      openSheet: (product) => set({ sheetProduct: product }),
      closeSheet: () => set({ sheetProduct: null }),

      orders: [],
      ordersLoading: false,
      ordersError: null,
      ordersPage: 1,
      ordersHasMore: true,
      currentOrderId: null,
      setCurrentOrderId: (orderId) => set({ currentOrderId: orderId }),

      placeOrderAsync: async (input) => {
        const state = get();
        if (!isTradlyConfigured()) {
          throw new Error('Tradly API is not configured.');
        }
        if (!state.tradlyUser) {
          throw new Error('Please login to place your order.');
        }
        if (state.cart.length === 0) {
          throw new Error('Your cart is empty.');
        }

        try {
          await syncTradlyCart(state);

          const tradlyAddr = await createAddress(
            buildAddressPayload(input.name, input.address, input.coordinates),
            state.tradlyUser.authKey,
          );

          const [paymentMethods, shippingMethods] = await Promise.all([
            getPaymentMethods(),
            getShippingMethods(),
          ]);

          const selectedPayment = paymentMethods.find(
            (method) => method.id === input.paymentMethodId && method.active,
          );
          const fallbackPayment =
            paymentMethods.find((method) => method.default && method.active)
            ?? paymentMethods.find((method) => method.active);
          const paymentMethod = selectedPayment ?? fallbackPayment;

          if (!paymentMethod) throw new Error('No active payment method found.');

          const shippingMethod =
            shippingMethods.find((method) => method.default && method.active)
            ?? shippingMethods.find((method) => method.active);
          if (!shippingMethod) throw new Error('No active shipping method found.');

          const tradlyOrder = await checkoutTradlyCart(
            {
              payment_method_id: paymentMethod.id,
              shipping_method_id: shippingMethod.id,
              shipping_address_id: tradlyAddr.id,
            },
            state.tradlyUser.authKey,
          );

          const localOrder = mapTradlyOrderToLocal(tradlyOrder, {
            id: String(tradlyOrder.id),
            tradlyId: String(tradlyOrder.id),
            reference: tradlyOrder.reference,
            items: [...state.cart],
            total: state.cartTotal(),
            deliverySlot: input.slot,
            address: input.address,
            statusCode: statusCode(tradlyOrder.status),
            statusLabel: getOrderStatusLabel(tradlyOrder.status),
            placedAt: new Date().toISOString(),
            estimatedDelivery: new Date(Date.now() + 45 * 60_000).toISOString(),
            customerCoordinates: input.coordinates ?? null,
            liveTracking: {
              customerLocation: input.coordinates ?? null,
              liveLocation: null,
              events: [],
            },
          });

          set((s) => ({
            orders: upsertOrders(s.orders, [localOrder]),
            currentOrderId: localOrder.id,
            cart: [],
            ordersError: null,
          }));

          return localOrder.id;
        } catch (err) {
          if (err instanceof TradlyApiError && err.status === 401) {
            clearAuthSessionStorage();
            set({
              tradlyUser: null,
              ordersError: 'Session expired. Please verify your email and try checkout again.',
            });
            throw new Error('Session expired. Please verify your email and try checkout again.');
          }
          const message = err instanceof Error ? err.message : 'Could not place order with Tradly.';
          set({ ordersError: message });
          throw new Error(message);
        }
      },

      refreshCurrentOrder: async () => {
        const state = get();
        if (!state.currentOrderId || !state.tradlyUser) return;

        try {
          const [tradlyOrder, lynxoTracking] = await Promise.all([
            getTradlyOrder(state.currentOrderId, state.tradlyUser.authKey),
            getLynxoOrderTracking(state.currentOrderId, state.tradlyUser.authKey).catch(() => null),
          ]);
          const existing = state.orders.find((order) => order.id === state.currentOrderId);
          const updated = mergeLynxoTracking(
            mapTradlyOrderToLocal(tradlyOrder, existing),
            lynxoTracking,
          );

          set((s) => ({
            orders: upsertOrders(s.orders, [updated]),
            ordersError: null,
          }));
        } catch (err) {
          if (err instanceof TradlyApiError && err.status === 401) {
            clearAuthSessionStorage();
            set({
              tradlyUser: null,
              ordersError: 'Session expired. Please verify your email to continue tracking.',
            });
            return;
          }
          const message = err instanceof Error ? err.message : 'Failed to refresh order status.';
          set({ ordersError: message });
        }
      },

      fetchOrderHistory: async (reset = false) => {
        const state = get();
        if (!state.tradlyUser) {
          set({ ordersError: 'Please login to view order history.' });
          return;
        }

        const page = reset ? 1 : state.ordersPage;
        set({ ordersLoading: true, ordersError: null });

        try {
          const { orders: tradlyOrders, totalCount } = await getTradlyOrders(state.tradlyUser.authKey, {
            page,
            per_page: 20,
          });

          const mapped = tradlyOrders.map((order) => {
            const existing = get().orders.find((current) => current.id === String(order.id));
            return mapTradlyOrderToLocal(order, existing);
          });

          set((s) => {
            const merged = reset ? mapped : upsertOrders(s.orders, mapped);
            const hasMoreFromTotal = totalCount ? merged.length < totalCount : mapped.length === 20;
            const nextCurrentOrderId = s.currentOrderId ?? mapped[0]?.id ?? null;

            return {
              orders: merged,
              currentOrderId: nextCurrentOrderId,
              ordersPage: page + 1,
              ordersHasMore: hasMoreFromTotal,
              ordersLoading: false,
              ordersError: null,
            };
          });
        } catch (err) {
          if (err instanceof TradlyApiError && err.status === 401) {
            clearAuthSessionStorage();
            set({
              tradlyUser: null,
              ordersLoading: false,
              ordersError: 'Session expired. Please login again from checkout.',
            });
            return;
          }
          const message = err instanceof Error ? err.message : 'Failed to load order history.';
          set({ ordersLoading: false, ordersError: message });
        }
      },

      paymentMethods: [],
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      fetchPaymentMethods: async () => {
        if (!isTradlyConfigured()) {
          set({ paymentMethodsError: 'Tradly API not configured.', paymentMethods: [] });
          return;
        }

        set({ paymentMethodsLoading: true, paymentMethodsError: null });
        try {
          const methods = await getPaymentMethods();
          const active = methods.filter((method) => method.active);
          set({ paymentMethods: active, paymentMethodsLoading: false, paymentMethodsError: null });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load payment methods.';
          set({ paymentMethodsLoading: false, paymentMethodsError: message, paymentMethods: [] });
        }
      },

      tradlyUser: null,
      verifySession: null,
      setTradlyUser: (u) => {
        if (u) persistAuthSession(u);
        else clearAuthSessionStorage();
        set({ tradlyUser: u });
      },
      setVerifySession: (v) => set({ verifySession: v }),
      logout: () => {
        clearAuthSessionStorage();
        set({ tradlyUser: null, verifySession: null, page: 'home' });
      },

      loginOrRegisterUser: async (email, password, firstName, lastName, legacyPassword) => {
        const normalizedEmail = email.trim().toLowerCase();
        const loginPasswords = Array.from(new Set([password, legacyPassword].filter(Boolean) as string[]));

        const tryLogin = async (): Promise<TradlyUser | null> => {
          for (const candidate of loginPasswords) {
            try {
              return await loginUser({ email: normalizedEmail, password: candidate });
            } catch {
              // try next candidate
            }
          }
          return null;
        };

        try {
          const user = await tryLogin();
          if (user) {
            const session: TradlyUserSession = {
              authKey: user.key.auth_key,
              refreshKey: user.key.refresh_key,
              userId: user.id,
              firstName: user.first_name,
              email: user.email,
            };
            persistAuthSession(session);
            set({
              tradlyUser: session,
            });
            return 'logged_in';
          }
          throw new Error('Login failed');
        } catch (loginErr) {
          try {
            const { verify_id } = await registerUser({
              email: normalizedEmail,
              password,
              first_name: firstName,
              last_name: lastName,
            });
            set({
              verifySession: {
                verifyId: verify_id,
                email: normalizedEmail,
                password,
                pendingOrderData: null,
              },
            });
            return 'needs_verify';
          } catch (registerErr) {
            // Some tenants return 412 when the account already exists.
            if (registerErr instanceof TradlyApiError && registerErr.status === 412) {
              const user = await tryLogin();
              if (!user) {
                throw new Error(
                  'Existing account detected. Could not login with derived password. Please use the same email case as your original signup or contact support to reset password.',
                );
              }
              const session: TradlyUserSession = {
                authKey: user.key.auth_key,
                refreshKey: user.key.refresh_key,
                userId: user.id,
                firstName: user.first_name,
                email: user.email,
              };
              persistAuthSession(session);
              set({
                tradlyUser: session,
              });
              return 'logged_in';
            }

            throw (registerErr instanceof Error ? registerErr : loginErr);
          }
        }
      },

      verifyAndCompleteUser: async (code) => {
        const vs = get().verifySession;
        if (!vs) throw new Error('No verify session active');
        const user = await verifyUser(vs.verifyId, code);
        const session: TradlyUserSession = {
          authKey: user.key.auth_key,
          refreshKey: user.key.refresh_key,
          userId: user.id,
          firstName: user.first_name,
          email: user.email,
        };
        persistAuthSession(session);
        set({
          tradlyUser: session,
          verifySession: null,
        });
      },

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
          try {
            const cats = await getCategories();
            seedCategoryMap(cats);
          } catch {
            // non-fatal
          }

          const listings = await getListings(params);
          const listingCurrency = listings[0]?.list_price?.currency;
          if (listingCurrency) {
            setCurrencyCode(listingCurrency);
          }
          const products = listings.map((l) => adaptListingToProduct(l));
          set({ tradlyProducts: products, productsLoading: false });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to load products';
          set({ productsError: msg, productsLoading: false });
        }
      },
    }),
    {
      name: 'lynxo-store',
      partialize: (s) => ({
        cart: s.cart,
        orders: s.orders,
        currentOrderId: s.currentOrderId,
        tradlyUser: s.tradlyUser,
      }),
    },
  ),
);
