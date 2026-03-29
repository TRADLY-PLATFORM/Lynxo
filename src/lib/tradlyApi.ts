import type { Product, Variant } from '../data/products';

// ─── Environment ────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_TRADLY_BASE_URL ?? 'https://api.tradly.app';
const PK = import.meta.env.VITE_TRADLY_PUBLISHABLE_KEY ?? '';
const CURRENCY = import.meta.env.VITE_TRADLY_CURRENCY ?? 'USD';

export function isTradlyConfigured(): boolean {
  return !!PK && !PK.includes('your_key_here');
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class TradlyApiError extends Error {
  readonly status: number;
  readonly body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'TradlyApiError';
    this.status = status;
    this.body = body;
  }
}

// ─── Tradly types ─────────────────────────────────────────────────────────────

export interface TradlyRatingData {
  rating_average: number;
  rating_count: number;
}

export interface TradlyListing {
  id: number;
  title: string;
  description: string;
  images: string[];
  list_price: number;
  offer_percent: number;
  category_id: number[];
  stock: number;
  active: boolean;
  rating_data?: TradlyRatingData;
  attributes?: Record<string, unknown>;
}

export interface TradlyVariant {
  id: number;
  title?: string;
  list_price: number;
  offer_percent: number;
  stock: number;
  active: boolean;
  variant_values: string[];
}

export interface TradlyCategory {
  id: number;
  name: string;
  parent_id?: number | null;
}

export interface TradlyUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  key: {
    auth_key: string;
    refresh_key: string;
  };
}

export interface TradlyAddress {
  id: number;
  name: string;
  formatted_address: string;
  phone_number?: string;
  type: number;
}

export interface TradlyShipment {
  id: number;
  status: number;
  tracking_number?: string;
}

export interface TradlyOrder {
  id: number;
  reference: string;
  status: number;
  total: number;
  created_at: string;
  shipments?: TradlyShipment[];
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  authKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${PK}`,
    ...(options.headers as Record<string, string>),
  };
  if (authKey) {
    headers['X-Auth-Key'] = authKey;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    throw new TradlyApiError(res.status, `Tradly API error ${res.status}: ${res.statusText}`, body);
  }

  return res.json() as Promise<T>;
}

// ─── Listings / Categories ───────────────────────────────────────────────────

export interface GetListingsParams {
  page?: number;
  per_page?: number;
  category_id?: string;
  search_key?: string;
  sort?: string;
}

export async function getListings(params: GetListingsParams = {}): Promise<TradlyListing[]> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('per_page', String(params.per_page ?? 30));
  if (params.category_id) qs.set('category_id', params.category_id);
  if (params.search_key) qs.set('search_key', params.search_key);
  if (params.sort) qs.set('sort', params.sort);

  const res = await request<{ data: { listings: TradlyListing[]; total_count: number } }>(
    `/products/v1/listings?${qs.toString()}`,
  );
  return res.data.listings;
}

export async function getListingVariants(listingId: number): Promise<TradlyVariant[]> {
  const res = await request<{ variants: TradlyVariant[] }>(
    `/products/v1/listings/${listingId}/variants`,
  );
  return res.variants;
}

export async function getCategories(): Promise<TradlyCategory[]> {
  const res = await request<{ data: { categories: TradlyCategory[] } }>(
    '/v1/categories?page=1&per_page=50',
  );
  return res.data.categories;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export async function registerUser(data: RegisterData): Promise<{ verify_id: number }> {
  const res = await request<{ data: { verify_id: number } }>('/v1/users/register', {
    method: 'POST',
    body: JSON.stringify({
      user: {
        uuid: crypto.randomUUID(),
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        type: 'customer',
      },
    }),
  });
  return { verify_id: res.data.verify_id };
}

export interface LoginData {
  email: string;
  password: string;
}

export async function loginUser(data: LoginData): Promise<TradlyUser> {
  const res = await request<{ data: { user: TradlyUser } }>('/v1/users/login', {
    method: 'POST',
    body: JSON.stringify({
      user: {
        uuid: crypto.randomUUID(),
        email: data.email,
        password: data.password,
        type: 'customer',
      },
    }),
  });
  return res.data.user;
}

export async function verifyUser(verifyId: number, code: number): Promise<TradlyUser> {
  const res = await request<{ data: { user: TradlyUser } }>('/v1/users/verify', {
    method: 'POST',
    body: JSON.stringify({ verify_id: verifyId, code }),
  });
  return res.data.user;
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export interface CreateAddressData {
  name: string;
  formatted_address: string;
  phone_number?: string;
}

export async function createAddress(
  data: CreateAddressData,
  authKey: string,
): Promise<TradlyAddress> {
  const res = await request<{ data: { address: TradlyAddress } }>(
    '/v1/addresses',
    {
      method: 'POST',
      body: JSON.stringify({ address: { ...data, type: 2 } }),
    },
    authKey,
  );
  return res.data.address;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export async function addToTradlyCart(
  listingId: number,
  variantId: number,
  quantity: number,
  authKey: string,
): Promise<void> {
  await request(
    '/products/v1/cart',
    {
      method: 'POST',
      headers: { 'X-Currency': CURRENCY },
      body: JSON.stringify({ cart: { listing_id: listingId, variant_id: variantId, quantity } }),
    },
    authKey,
  );
}

export async function clearTradlyCart(authKey: string): Promise<void> {
  await request('/products/v1/cart', { method: 'DELETE' }, authKey);
}

// ─── Payment & Shipping methods ───────────────────────────────────────────

export interface TradlyPaymentMethod {
  id: number;
  name: string;
  type: string;
  channel: string;
  default: boolean;
  active: boolean;
}

export interface TradlyShippingMethod {
  id: number;
  name: string;
  type: string;
  channel: string;
  default: boolean;
  active: boolean;
}

export async function getPaymentMethods(): Promise<TradlyPaymentMethod[]> {
  const res = await request<{ data: { payment_methods: TradlyPaymentMethod[] } }>(
    '/v1/tenants/payment_methods',
  );
  return res.data.payment_methods;
}

export async function getShippingMethods(): Promise<TradlyShippingMethod[]> {
  const res = await request<{ data: { shipping_methods: TradlyShippingMethod[] } }>(
    '/v1/tenants/shipping_methods',
  );
  return res.data.shipping_methods;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutParams {
  payment_method_id: number;
  shipping_method_id: number;
  shipping_address_id: number;
}

export async function checkoutTradlyCart(
  params: CheckoutParams,
  authKey: string,
): Promise<TradlyOrder> {
  const res = await request<{ data: { order: TradlyOrder } }>(
    '/products/v1/cart/checkout',
    {
      method: 'POST',
      body: JSON.stringify({ order: params }),
    },
    authKey,
  );
  return res.data.order;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getTradlyOrder(orderId: string, authKey: string): Promise<TradlyOrder> {
  const res = await request<{ data: { order: TradlyOrder } }>(
    `/products/v1/orders/${orderId}`,
    {},
    authKey,
  );
  return res.data.order;
}

export async function getTradlyOrders(authKey: string): Promise<TradlyOrder[]> {
  const res = await request<{ data: { orders: TradlyOrder[] } }>(
    '/products/v1/orders',
    {},
    authKey,
  );
  return res.data.orders ?? [];
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

const TITLE_EMOJI_MAP: Array<[RegExp, string]> = [
  [/water|aqua|mineral/i,        '💧'],
  [/pouch|bottle/i,              '💦'],
  [/gas|lpg|cylinder|fuel/i,     '🔥'],
  [/meal|lunch|dinner|food|rice/i, '🍱'],
  [/bread|bakery|toast/i,        '🍞'],
  [/grocery|vegetable|fruit|veg/i,'🥦'],
  [/clean|maid|housekeep/i,      '🧹'],
  [/repair|service|fix|ac|appliance/i, '🔧'],
  [/coffee|tea|beverage|drink/i, '☕'],
  [/milk|dairy/i,                '🥛'],
  [/chicken|meat|non.?veg/i,     '🍗'],
  [/egg/i,                       '🥚'],
];

// Map a Tradly category id to a local category string (best-effort)
const CATEGORY_ID_MAP: Record<number, string> = {};

export function seedCategoryMap(categories: TradlyCategory[]): void {
  for (const c of categories) {
    const name = c.name.toLowerCase();
    if (/water|aqua/i.test(name)) CATEGORY_ID_MAP[c.id] = 'water';
    else if (/gas|lpg/i.test(name)) CATEGORY_ID_MAP[c.id] = 'gas';
    else if (/food|meal|bakery|bread/i.test(name)) CATEGORY_ID_MAP[c.id] = 'food';
    else if (/service|repair|clean/i.test(name)) CATEGORY_ID_MAP[c.id] = 'services';
    else CATEGORY_ID_MAP[c.id] = 'grocery';
  }
}

function pickEmoji(title: string): string {
  for (const [re, emoji] of TITLE_EMOJI_MAP) {
    if (re.test(title)) return emoji;
  }
  return '📦';
}

function resolveCategory(categoryIds: number[]): string {
  const firstId = categoryIds[0];
  if (firstId !== undefined && CATEGORY_ID_MAP[firstId]) {
    return CATEGORY_ID_MAP[firstId];
  }
  return 'grocery';
}

export function adaptListingToProduct(
  listing: TradlyListing,
  tradlyVariants?: TradlyVariant[],
): Product {
  const emoji = pickEmoji(listing.title);
  const category = resolveCategory(listing.category_id);
  const image = listing.images?.[0] ?? 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&q=80';
  const rating = listing.rating_data?.rating_average ?? 4.5;

  let variants: Variant[];

  if (tradlyVariants && tradlyVariants.length > 0) {
    variants = tradlyVariants
      .filter((v) => v.active)
      .map((v) => {
        const effectivePrice = v.offer_percent > 0
          ? Math.round(v.list_price * (1 - v.offer_percent / 100))
          : v.list_price;
        const label = v.title ?? v.variant_values.join(', ') ?? 'Standard';
        return {
          id: String(v.id),
          label,
          price: effectivePrice,
          unit: 'unit',
          inStock: v.active && v.stock > 0,
        };
      });
  } else {
    const effectivePrice = listing.offer_percent > 0
      ? Math.round(listing.list_price * (1 - listing.offer_percent / 100))
      : listing.list_price;
    variants = [
      {
        id: `${listing.id}-default`,
        label: 'Standard',
        price: effectivePrice,
        unit: 'unit',
        inStock: listing.active && listing.stock > 0,
      },
    ];
  }

  // Ensure at least one variant
  if (variants.length === 0) {
    variants = [
      {
        id: `${listing.id}-default`,
        label: 'Standard',
        price: listing.list_price,
        unit: 'unit',
        inStock: false,
      },
    ];
  }

  const basePrice = variants[0].price;

  return {
    id: String(listing.id),
    name: listing.title,
    description: listing.description ?? '',
    category,
    emoji,
    image,
    basePrice,
    unit: 'unit',
    rating,
    reviewCount: listing.rating_data?.rating_count ?? 0,
    variants,
    tags: [],
    popular: listing.rating_data ? listing.rating_data.rating_average >= 4.5 : false,
  };
}
