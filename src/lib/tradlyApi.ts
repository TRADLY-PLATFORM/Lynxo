import type { Product } from "../data/products";
import { setCurrencyCode } from "./currency";

// ─── Environment ────────────────────────────────────────────────────────────

const BASE_URL =
	import.meta.env.VITE_TRADLY_BASE_URL ?? "https://api.tradly.app";
const PK = import.meta.env.VITE_TRADLY_PUBLISHABLE_KEY ?? "";
const CURRENCY = import.meta.env.VITE_TRADLY_CURRENCY ?? "";
const LYNXO_API_BASE_URL = import.meta.env.VITE_LYNXO_API_BASE_URL ?? "";

export function isTradlyConfigured(): boolean {
	return !!PK && !PK.includes("your_key_here");
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class TradlyApiError extends Error {
	readonly status: number;
	readonly body?: unknown;
	constructor(status: number, message: string, body?: unknown) {
		super(message);
		this.name = "TradlyApiError";
		this.status = status;
		this.body = body;
	}
}

// ─── Tradly types ─────────────────────────────────────────────────────────────

export interface TradlyPrice {
	amount: number;
	currency: string;
	formatted: string;
}

export interface TradlyRatingData {
	rating_average: number;
	rating_count?: number;
}

export interface TradlyListing {
	id: number;
	title: string;
	description: string;
	images: string[];
	list_price: TradlyPrice;
	offer_price: TradlyPrice;
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
	list_price: TradlyPrice;
	offer_price?: TradlyPrice;
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

interface TradlyTenantCurrency {
	id?: number;
	name?: string;
	code?: string;
	currency_code?: string;
	iso_code?: string;
	format?: string;
	default?: boolean;
	active?: boolean;
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
	formatted_address?: string;
	address_line_1?: string;
	address_line_2?: string;
	state?: string;
	post_code?: string | number;
	country?: string;
	phone_number?: string;
	type: number | string;
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

export interface LynxoTrackingLocation {
	latitude: number;
	longitude: number;
}

export interface LynxoTrackingEvent {
	id?: string;
	status?: string;
	label?: string;
	note?: string;
	description?: string;
	at?: string;
	timestamp?: string;
}

export interface LynxoOrderTracking {
	order_id?: string;
	status_code?: number;
	status?: number;
	status_label?: string;
	status_text?: string;
	live_location?: LynxoTrackingLocation;
	location?: LynxoTrackingLocation;
	customer_location?: LynxoTrackingLocation;
	eta_minutes?: number;
	updated_at?: string;
	map_url?: string;
	driver?: {
		name?: string;
		phone?: string;
	};
	events?: LynxoTrackingEvent[];
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(
	path: string,
	options: RequestInit = {},
	authKey?: string,
): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${PK}`,
		...(options.headers as Record<string, string>),
	};
	if (authKey) {
		headers["x-auth-key"] = authKey;
		headers["x-language"] = "en"; // Set default language
	}

	const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

	if (!res.ok) {
		let body: unknown;
		try {
			body = await res.json();
		} catch {
			/* ignore */
		}
		throw new TradlyApiError(
			res.status,
			`Tradly API error ${res.status}: ${res.statusText}`,
			body,
		);
	}

	return res.json() as Promise<T>;
}

let resolvedCurrency: string | null = null;

function pickCurrencyCode(c: TradlyTenantCurrency): string | null {
	return c.code ?? c.currency_code ?? c.iso_code ?? null;
}

async function resolveCurrency(): Promise<string> {
	if (resolvedCurrency) return resolvedCurrency;

	try {
		const currencies = await getCurrencies();
		const selected =
			currencies.find((c) => c.default && c.active) ??
			currencies.find((c) => c.active) ??
			currencies[0];
		const code = selected ? pickCurrencyCode(selected) : null;
		if (code) {
			resolvedCurrency = code;
			setCurrencyCode(code);
			return code;
		}
	} catch {
		// continue to fallback endpoint
	}

	try {
		const res = await request<{
			data: { currencies: TradlyTenantCurrency[] };
		}>("/v1/tenants/currencies");
		const currencies = res.data.currencies ?? [];
		const selected =
			currencies.find((c) => c.default && c.active) ??
			currencies.find((c) => c.active) ??
			currencies[0];

		const code = selected ? pickCurrencyCode(selected) : null;
		if (code) {
			resolvedCurrency = code;
			setCurrencyCode(code);
			return code;
		}
	} catch {
		// continue to env fallback
	}

	const envCurrency = CURRENCY.trim().toUpperCase();
	if (envCurrency) {
		resolvedCurrency = envCurrency;
		setCurrencyCode(envCurrency);
		return envCurrency;
	}

	throw new Error(
		"Unable to resolve currency from Tradly API for this tenant.",
	);
}

export async function getCurrencies(): Promise<TradlyTenantCurrency[]> {
	const res = await request<{
		data: { currencies: TradlyTenantCurrency[] };
	}>("/v1/currencies");
	return res.data.currencies ?? [];
}

function extractTradlyErrorCode(err: unknown): number | null {
	if (!(err instanceof TradlyApiError)) return null;
	const body = err.body as { error?: { code?: number } } | undefined;
	const code = body?.error?.code;
	return typeof code === "number" ? code : null;
}

async function withCurrencyRetry<T>(call: () => Promise<T>): Promise<T> {
	try {
		return await call();
	} catch (err) {
		// Recover from stale currency cache by re-resolving once.
		if (extractTradlyErrorCode(err) === 360) {
			resolvedCurrency = null;
			return call();
		}
		throw err;
	}
}

// ─── Listings / Categories ───────────────────────────────────────────────────

export interface GetListingsParams {
	page?: number;
	per_page?: number;
	category_id?: string;
	search_key?: string;
	sort?: string;
}

export async function getListings(
	params: GetListingsParams = {},
): Promise<TradlyListing[]> {
	const qs = new URLSearchParams();
	qs.set("page", String(params.page ?? 1));
	qs.set("per_page", String(params.per_page ?? 30));
	if (params.category_id) qs.set("category_id", params.category_id);
	if (params.search_key) qs.set("search_key", params.search_key);
	if (params.sort) qs.set("sort", params.sort);

	const res = await request<{
		data: { listings: TradlyListing[]; total_count: number };
	}>(`/products/v1/listings?${qs.toString()}`);
	return res.data.listings;
}

export async function getListingVariants(
	listingId: number,
): Promise<TradlyVariant[]> {
	const res = await request<{ data: { variants: TradlyVariant[] } }>(
		`/products/v1/listings/${listingId}/variants`,
	);
	return res?.data?.variants;
}

export async function getCategories(): Promise<TradlyCategory[]> {
	const res = await request<{ data: { categories: TradlyCategory[] } }>(
		"/v1/categories?page=1&per_page=50&parent=0",
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

export async function registerUser(
	data: RegisterData,
): Promise<{ verify_id: number }> {
	const res = await request<{ data: { verify_id: number } }>(
		"/v1/users/register",
		{
			method: "POST",
			body: JSON.stringify({
				user: {
					uuid: crypto.randomUUID(),
					first_name: data.first_name,
					last_name: data.last_name,
					email: data.email,
					password: data.password,
					type: "customer",
				},
			}),
		},
	);
	return { verify_id: res.data.verify_id };
}

export interface LoginData {
	email: string;
	password: string;
}

export async function loginUser(data: LoginData): Promise<TradlyUser> {
	const res = await request<{ data: { user: TradlyUser } }>(
		"/v1/users/login",
		{
			method: "POST",
			body: JSON.stringify({
				user: {
					uuid: crypto.randomUUID(),
					email: data.email,
					password: data.password,
					type: "customer",
				},
			}),
		},
	);
	return res.data.user;
}

export interface SignInData {
	email: string;
	first_name?: string;
	last_name?: string;
}

export interface SignInResponse {
	verify_id: number;
}

export async function signInUser(data: SignInData): Promise<SignInResponse> {
	const res = await request<{ data: { verify_id: number } }>(
		"/v1/users/login",
		{
			method: "POST",
			body: JSON.stringify({
				user: {
					uuid: crypto.randomUUID(),
					email: data.email,

					type: "customer",
				},
			}),
		},
	);
	return { verify_id: res.data.verify_id };
}

export async function verifyUser(
	verifyId: number,
	code: number,
): Promise<TradlyUser> {
	const res = await request<{ data: { user: TradlyUser } }>(
		"/v1/users/verify",
		{
			method: "POST",
			body: JSON.stringify({ verify_id: verifyId, code }),
		},
	);
	return res.data.user;
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export interface CreateAddressData {
	name: string;
	address_line_1: string;
	address_line_2?: string;
	landmark?: string;
	state: string;
	post_code: string;
	country: string;
	type: "shipping_address";
	coordinates?: {
		latitude: number;
		longitude: number;
	};
	phone_number?: string;
}

export async function createAddress(
	data: CreateAddressData,
	authKey: string,
): Promise<TradlyAddress> {
	const res = await request<{ data: { address: TradlyAddress } }>(
		"/v1/addresses",
		{
			method: "POST",
			body: JSON.stringify({ address: data }),
		},
		authKey,
	);
	return res.data.address;
}

export async function getAddresses(
	authKey: string,
	type: "shipping_address" | "store_address" = "shipping_address",
): Promise<TradlyAddress[]> {
	const res = await request<{ data: { addresses: TradlyAddress[] } }>(
		`/v1/addresses?type=${encodeURIComponent(type)}`,
		{},
		authKey,
	);
	return res.data.addresses ?? [];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface TradlyCartPrice {
	amount: number;
	currency: string;
	formatted: string;
}

export interface TradlyCartItem {
	id: number;
	quantity: number;
	custom_price: string;
	quantity_total_price: TradlyCartPrice;
	quantity_total_offer_price: TradlyCartPrice;
	tax_total_offer_price: number;
	listing: {
		id: number;
		title: string;
		description: string;
		images: string[];
		list_price: TradlyCartPrice;
		offer_price: TradlyCartPrice;
		offer_percent: number;
		stock: number;
		max_quantity: number;
		active: boolean;
		rating_data?: {
			rating_average: number;
			rating_count?: number;
		};
		attributes?: unknown[];
	};
}

export interface TradlyCartPricingItem {
	name: string;
	type: string;
	short_code: string;
	display: boolean;
	amount: number;
	buying: TradlyCartPrice;
}

export interface TradlyCartData {
	id: number;
	total: TradlyCartPrice;
	list_total: TradlyCartPrice;
	offer_total: TradlyCartPrice;
	shipping_total: TradlyCartPrice;
	grand_total: TradlyCartPrice;
	pricing_items: TradlyCartPricingItem[];
}

export interface TradlyCartResponse {
	cart: TradlyCartData;
	cart_details: TradlyCartItem[];
}

export async function getTradlyCart(
	authKey: string,
): Promise<TradlyCartResponse> {
	const res = await request<{
		data: TradlyCartResponse;
	}>("/products/v1/cart", {}, authKey);
	return res.data;
}

export async function addToTradlyCart(
	listingId: number,
	variantId: number | null,
	quantity: number,
	authKey: string,
): Promise<void> {
	await withCurrencyRetry(async () => {
		const currency = await resolveCurrency();
		await request(
			"/products/v1/cart",
			{
				method: "POST",
				headers: { "x-currency": currency },
				body: JSON.stringify({
					cart: {
						listing_id: listingId,
						quantity,
						...(variantId && {
							variant_id: variantId,
						}),
					},
				}),
			},
			authKey,
		);
	});
}

export async function clearTradlyCart(authKey: string): Promise<void> {
	await withCurrencyRetry(async () => {
		const currency = await resolveCurrency();
		await request(
			"/products/v1/cart",
			{ method: "DELETE", headers: { "x-currency": currency } },
			authKey,
		);
	});
}

export interface RemoveFromCartParams {
	listing_id: number[];
	cart_detail_id: number[];
}

export async function removeFromTradlyCart(
	params: RemoveFromCartParams,
	authKey: string,
): Promise<void> {
	const currency = await resolveCurrency();
	await request(
		"/products/v1/cart",
		{
			method: "PATCH",
			headers: { "x-currency": currency },
			body: JSON.stringify({ cart: params }),
		},
		authKey,
	);
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
	const res = await request<{
		data: { payment_methods: TradlyPaymentMethod[] };
	}>("/v1/tenants/payment_methods");
	return res.data.payment_methods;
}

export async function getShippingMethods(): Promise<TradlyShippingMethod[]> {
	const res = await request<{
		data: { shipping_methods: TradlyShippingMethod[] };
	}>("/v1/tenants/shipping_methods");
	return res.data.shipping_methods;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutParams {
	payment_method_id: number;
	shipping_method_id: number;
	shipping_address_id: number;
}

export interface CheckoutResponse {
	status: boolean;
	data: {
		order_reference: string;
	};
}

export async function checkoutTradlyCart(
	params: CheckoutParams,
	authKey: string,
): Promise<CheckoutResponse> {
	const res = await withCurrencyRetry(async () => {
		const currency = await resolveCurrency();
		return request<CheckoutResponse>(
			"/products/v1/cart/checkout",
			{
				method: "POST",
				headers: { "x-currency": currency },
				body: JSON.stringify({ order: params }),
			},
			authKey,
		);
	});
	return res;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getTradlyOrder(
	orderId: string,
	authKey: string,
): Promise<TradlyOrder> {
	const res = await request<{ data: { order: TradlyOrder } }>(
		`/products/v1/orders/${orderId}`,
		{},
		authKey,
	);
	return res.data.order;
}

export async function getTradlyOrders(
	authKey: string,
	params: { page?: number; per_page?: number; order_status?: string } = {},
): Promise<{ orders: TradlyOrder[]; totalCount?: number }> {
	const qs = new URLSearchParams();
	qs.set("page", String(params.page ?? 1));
	qs.set("per_page", String(params.per_page ?? 20));
	if (params.order_status) qs.set("order_status", params.order_status);

	const res = await request<{
		data: { orders: TradlyOrder[]; total_count?: number };
	}>(`/products/v1/orders?${qs.toString()}`, {}, authKey);
	return {
		orders: res.data.orders ?? [],
		totalCount: res.data.total_count,
	};
}

function resolveLynxoApiUrl(path: string): string {
	if (!LYNXO_API_BASE_URL.trim()) return path;
	const base = LYNXO_API_BASE_URL.replace(/\/$/, "");
	const suffix = path.startsWith("/") ? path : `/${path}`;
	return `${base}${suffix}`;
}

function readLynxoPayload(json: unknown): LynxoOrderTracking | null {
	if (!json || typeof json !== "object") return null;
	const obj = json as {
		data?: {
			tracking?: LynxoOrderTracking;
			order_tracking?: LynxoOrderTracking;
		};
		tracking?: LynxoOrderTracking;
		order_tracking?: LynxoOrderTracking;
	};
	return (
		obj.data?.tracking ??
		obj.data?.order_tracking ??
		obj.tracking ??
		obj.order_tracking ??
		(json as LynxoOrderTracking)
	);
}

export async function getLynxoOrderTracking(
	orderId: string,
	authKey?: string,
): Promise<LynxoOrderTracking | null> {
	const candidates = [
		`/api/lynxo/orders/${orderId}/tracking`,
		`/api/orders/${orderId}/tracking`,
	];

	for (const path of candidates) {
		const url = resolveLynxoApiUrl(path);
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (PK) headers.Authorization = `Bearer ${PK}`;
		if (authKey) headers["x-auth-key"] = authKey;

		const res = await fetch(url, { method: "GET", headers });
		if (res.status === 404) continue;
		if (!res.ok) return null;

		let body: unknown;
		try {
			body = await res.json();
		} catch {
			return null;
		}
		return readLynxoPayload(body);
	}

	return null;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

const TITLE_EMOJI_MAP: Array<[RegExp, string]> = [
	[/water|aqua|mineral/i, "💧"],
	[/pouch|bottle/i, "💦"],
	[/gas|lpg|cylinder|fuel/i, "🔥"],
	[/meal|lunch|dinner|food|rice/i, "🍱"],
	[/bread|bakery|toast/i, "🍞"],
	[/grocery|vegetable|fruit|veg/i, "🥦"],
	[/clean|maid|housekeep/i, "🧹"],
	[/repair|service|fix|ac|appliance/i, "🔧"],
	[/coffee|tea|beverage|drink/i, "☕"],
	[/milk|dairy/i, "🥛"],
	[/chicken|meat|non.?veg/i, "🍗"],
	[/egg/i, "🥚"],
];

// Map a Tradly category id to a local category string (best-effort)
const CATEGORY_ID_MAP: Record<number, string> = {};
const LOCAL_CATEGORY_IDS: Record<string, number[]> = {
	water: [],
	gas: [],
	food: [],
	grocery: [],
	services: [],
};

function mapCategoryNameToLocal(name: string): string {
	const text = name.toLowerCase();
	if (/water|aqua|mineral|hydration|drink/i.test(text)) return "water";
	if (/gas|lpg|fuel|cylinder|energy/i.test(text)) return "gas";
	if (
		/food|meal|bakery|bread|restaurant|kitchen|snack|beverage/i.test(
			text,
		)
	)
		return "food";
	if (
		/service|repair|clean|maintenance|home.?service|booking|appointment/i.test(
			text,
		)
	)
		return "services";
	return "grocery";
}

export function seedCategoryMap(categories: TradlyCategory[]): void {
	for (const key of Object.keys(LOCAL_CATEGORY_IDS)) {
		LOCAL_CATEGORY_IDS[key] = [];
	}

	for (const c of categories) {
		const localCategory = mapCategoryNameToLocal(c.name);

		CATEGORY_ID_MAP[c.id] = localCategory;
		LOCAL_CATEGORY_IDS[localCategory] = [
			...(LOCAL_CATEGORY_IDS[localCategory] ?? []),
			c.id,
		];
	}
}

export function getTradlyCategoryIdsByLocalCategory(
	localCategory: string,
): number[] {
	return [...(LOCAL_CATEGORY_IDS[localCategory] ?? [])];
}

function pickEmoji(title: string): string {
	for (const [re, emoji] of TITLE_EMOJI_MAP) {
		if (re.test(title)) return emoji;
	}
	return "📦";
}

function inferCategoryFromText(text: string): string {
	if (/water|aqua|mineral|hydration|drink/i.test(text)) return "water";
	if (/gas|lpg|fuel|cylinder/i.test(text)) return "gas";
	if (
		/repair|service|clean|maintenance|booking|appointment|technician|maid/i.test(
			text,
		)
	)
		return "services";
	if (
		/food|meal|lunch|dinner|bakery|bread|rice|chicken|egg|coffee|tea/i.test(
			text,
		)
	)
		return "food";
	return "grocery";
}

function resolveCategory(
	categoryIds: number[],
	title: string,
	description: string,
): string {
	for (const id of categoryIds) {
		if (CATEGORY_ID_MAP[id]) {
			return CATEGORY_ID_MAP[id];
		}
	}
	return inferCategoryFromText(`${title} ${description}`);
}

export function adaptListingToProduct(listing: TradlyListing): Product {
	const emoji = pickEmoji(listing.title);
	const category = resolveCategory(
		listing.category_id,
		listing.title,
		listing.description ?? "",
	);
	const image =
		listing.images?.[0] ??
		"https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&q=80";
	const rating = listing.rating_data?.rating_average ?? 4.5;

	// Use offer_price if available (pre-calculated by Tradly), else list_price
	const basePrice =
		listing.offer_price?.amount ?? listing.list_price.amount;

	// Note: Variants are NOT included here. They must be fetched separately
	// via getListingVariants() when a product is opened.
	// This keeps the product listing lightweight and fast.

	return {
		id: String(listing.id),
		name: listing.title,
		description: listing.description ?? "",
		category,
		emoji,
		image,
		basePrice,
		unit: "unit",
		rating,
		reviewCount: listing.rating_data?.rating_count ?? 0,
		variants: [], // Empty - variants fetched on-demand via getListingVariants()
		tags: [],
		popular: listing.rating_data
			? listing.rating_data.rating_average >= 4.5
			: false,
	};
}

