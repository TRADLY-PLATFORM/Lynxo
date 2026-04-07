import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, Variant } from "../data/products";
import type { Category } from "../data/products";
import { setCurrencyCode } from "../lib/currency";
import {
	isTradlyConfigured,
	TradlyApiError,
	getListings,
	getListingVariants,
	getCategories,
	seedCategoryMap,
	adaptListingToProduct,
	adaptTradlyCategoriesToLocal,
	loginUser,
	registerUser,
	signInUser,
	verifyUser,
	createAddress,
	addToTradlyCart,
	getTradlyCart,
	clearTradlyCart,
	removeFromTradlyCart,
	checkoutTradlyCart,
	getPaymentMethods,
	getShippingMethods,
	getTradlyOrder,
	getTradlyOrders,
	getLynxoOrderTracking,
	getAddresses,
} from "../lib/tradlyApi";
import type {
	GetListingsParams,
	LynxoOrderTracking,
	TradlyCartResponse,
	TradlyPaymentMethod,
	TradlyOrder,
	TradlyUser,
	TradlyVariant,
} from "../lib/tradlyApi";

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

export const ORDER_STATUS_STEPS: {
	code: TradlyOrderStatusCode;
	label: string;
	icon: string;
}[] = [
	{ code: 1, label: "Order Incomplete", icon: "📋" },
	{ code: 2, label: "Confirmed", icon: "✅" },
	{ code: 3, label: "In Progress", icon: "📦" },
	{ code: 4, label: "Shipped", icon: "🚚" },
	{ code: 5, label: "Delivered", icon: "🎉" },
	{ code: 8, label: "Completed", icon: "🏁" },
];

export function getOrderStatusLabel(code: number): string {
	switch (code) {
		case 1:
			return "Incomplete";
		case 2:
			return "Confirmed";
		case 3:
			return "In progress";
		case 4:
			return "Shipped";
		case 5:
			return "Delivered";
		case 6:
			return "Canceled by customer";
		case 7:
			return "Canceled by admin";
		case 8:
			return "Completed";
		default:
			return "Unknown";
	}
}

export function isTerminalOrderStatus(code: number): boolean {
	return code === 5 || code === 6 || code === 7 || code === 8;
}

export type AppPage =
	| "home"
	| "cart"
	| "checkout"
	| "checkout_success"
	| "tracking"
	| "profile"
	| "order_history";

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
	addressId?: number; // Pre-created address ID from OTP flow
}

export interface VerifySession {
	verifyId: number;
	email: string;
	password: string | null; // Null for OTP-based authentication
	pendingOrderData: PendingCheckoutData | null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
	if (typeof document === "undefined") return;
	document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string): void {
	if (typeof document === "undefined") return;
	document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function persistAuthSession(user: TradlyUserSession): void {
	if (typeof window !== "undefined") {
		window.localStorage.setItem("auth_key", user.authKey);
		window.localStorage.setItem("refresh_key", user.refreshKey);
		window.localStorage.setItem("login", "true");
	}
	// Matches Butterflies pattern: keep auth_key in cookie for cross-page reads.
	writeCookie("auth_key", user.authKey, 12 * 60 * 60);
}

function clearAuthSessionStorage(): void {
	if (typeof window !== "undefined") {
		window.localStorage.removeItem("auth_key");
		window.localStorage.removeItem("refresh_key");
		window.localStorage.removeItem("login");
	}
	clearCookie("auth_key");
}

interface AppState {
	page: AppPage;
	setPage: (p: AppPage) => void;

	// Categories from API
	categories: Category[];
	categoriesLoading: boolean;
	categoriesError: string | null;
	fetchCategories: () => Promise<void>;

	cart: CartItem[];
	addToCart: (product: Product, variant: Variant) => void;
	removeFromCart: (productId: string, variantId: string) => Promise<void>;
	updateQuantity: (
		productId: string,
		variantId: string,
		qty: number,
	) => void;
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
	setTradlyUser: (u: AppState["tradlyUser"]) => void;
	setVerifySession: (v: AppState["verifySession"]) => void;
	logout: () => void;
	loginOrRegisterUser: (
		email: string,
		password: string,
		firstName: string,
		lastName: string,
		legacyPassword?: string,
	) => Promise<"logged_in" | "needs_verify">;
	verifyAndCompleteUser: (code: number) => Promise<void>;

	tradlyProducts: Product[];
	productsLoading: boolean;
	productsError: string | null;
	fetchProducts: (params?: GetListingsParams) => Promise<void>;

	// Variant fetching - stores fetched variants by listing ID
	productVariants: Record<string, import("../data/products").Variant[]>;
	variantsLoading: boolean;
	fetchProductVariants: (listingId: string) => Promise<void>;
	getProductVariants: (
		listingId: string,
	) => import("../data/products").Variant[];

	// Cart sync state
	cartSyncError: string | null;
	clearCartSyncError: () => void;
	resolveMixedCartError: () => Promise<void>;
	verifyCartConnection: () => Promise<void>;

	// Tradly cart data (rich cart from API)
	tradlyCart: TradlyCartResponse | null;
	refreshTradlyCart: () => Promise<void>;
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
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const postCode = address.match(/\b\d{4,10}\b/)?.[0] ?? "00000";

	return {
		name,
		phone_number: "0000000000",
		address_line_1: parts[0] ?? address,
		address_line_2: parts.slice(1).join(", ") || undefined,
		landmark: parts[1] || undefined,
		state: parts.length >= 2 ? parts[parts.length - 2] : "NA",
		post_code: postCode,
		country: parts.length >= 1 ? parts[parts.length - 1] : "NA",
		type: "shipping_address" as const,
		coordinates: coordinates ?? undefined,
	};
}

function mapTradlyOrderToLocal(
	tradlyOrder: TradlyOrder,
	existing?: Order,
): Order {
	const now = new Date();
	const eta = new Date(now.getTime() + 45 * 60_000);
	const code = statusCode(tradlyOrder.status);
	const id = String(tradlyOrder.id);

	return {
		id,
		tradlyId: id,
		reference:
			tradlyOrder.reference ?? existing?.reference ?? `TR-${id}`,
		items: existing?.items ?? [],
		total: tradlyOrder.total ?? existing?.total ?? 0,
		deliverySlot: existing?.deliverySlot ?? "Standard",
		address: existing?.address ?? "Address saved in account",
		statusCode: code,
		statusLabel: getOrderStatusLabel(code),
		placedAt:
			tradlyOrder.created_at ??
			existing?.placedAt ??
			now.toISOString(),
		estimatedDelivery:
			existing?.estimatedDelivery ?? eta.toISOString(),
		customerCoordinates: existing?.customerCoordinates ?? null,
		liveTracking: existing?.liveTracking,
	};
}

function mergeLynxoTracking(
	order: Order,
	tracking: LynxoOrderTracking | null,
): Order {
	if (!tracking) return order;

	const rawStatus = tracking.status_code ?? tracking.status;
	const hasStatus =
		typeof rawStatus === "number" && rawStatus >= 1 && rawStatus <= 8;
	const nextStatusCode = hasStatus
		? statusCode(rawStatus)
		: order.statusCode;
	const nextStatusLabel =
		tracking.status_label ??
		tracking.status_text ??
		(hasStatus
			? getOrderStatusLabel(nextStatusCode)
			: order.statusLabel);

	const etaMinutes =
		typeof tracking.eta_minutes === "number"
			? tracking.eta_minutes
			: undefined;
	const estimatedDelivery =
		etaMinutes !== undefined
			? new Date(Date.now() + etaMinutes * 60_000).toISOString()
			: order.estimatedDelivery;

	const events = (tracking.events ?? [])
		.map((event, index) => {
			const label = event.label ?? event.status ?? "";
			const at = event.at ?? event.timestamp ?? "";
			if (!label || !at) return null;
			return {
				id: event.id ?? `${index}-${label}-${at}`,
				label,
				note: event.note ?? event.description,
				at,
			};
		})
		.filter(Boolean) as NonNullable<Order["liveTracking"]>["events"];

	return {
		...order,
		statusCode: nextStatusCode,
		statusLabel: nextStatusLabel,
		estimatedDelivery,
		liveTracking: {
			liveLocation:
				tracking.live_location ??
				tracking.location ??
				order.liveTracking?.liveLocation ??
				null,
			customerLocation:
				tracking.customer_location ??
				order.liveTracking?.customerLocation ??
				order.customerCoordinates ??
				null,
			updatedAt:
				tracking.updated_at ??
				order.liveTracking?.updatedAt,
			etaMinutes,
			courierName:
				tracking.driver?.name ??
				order.liveTracking?.courierName,
			courierPhone:
				tracking.driver?.phone ??
				order.liveTracking?.courierPhone,
			mapUrl: tracking.map_url ?? order.liveTracking?.mapUrl,
			events:
				events.length > 0
					? events
					: (order.liveTracking?.events ?? []),
		},
	};
}

function upsertOrders(existing: Order[], incoming: Order[]): Order[] {
	const map = new Map(existing.map((order) => [order.id, order]));
	for (const order of incoming) map.set(order.id, order);
	return Array.from(map.values()).sort(
		(a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt),
	);
}

function parseTradlyNumericId(
	raw: string,
	kind: "listing" | "variant",
): number {
	const cleaned = raw.replace(/-default$/, "");
	const value = parseInt(cleaned, 10);
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(
			`Cart contains non-Tradly ${kind} IDs. Clear cart and add products from live catalog, then retry.`,
		);
	}
	return value;
}

async function syncTradlyCart(
	state: Pick<AppState, "cart" | "tradlyUser">,
): Promise<void> {
	if (!isTradlyConfigured() || !state.tradlyUser) return;
	// Require a fully established session from login/verify before calling cart APIs.
	if (!state.tradlyUser.userId || !state.tradlyUser.email) return;

	// Always clear before re-syncing to ensure quantities are correct
	// This prevents duplicates and ensures server cart matches local cart
	try {
		await clearTradlyCart(state.tradlyUser.authKey);
	} catch (err) {
		// Tradly can return "Cart not found" when the user has no remote cart yet.
		// That's safe to ignore because we'll create cart lines right after.
		if (err instanceof TradlyApiError) {
			const code = (
				err.body as
					| { error?: { code?: number } }
					| undefined
			)?.error?.code;
			if (code !== 471) throw err;
		} else {
			throw err;
		}
	}

	// Add each item to the cart with correct quantity
	for (const item of state.cart) {
		const listingId = parseTradlyNumericId(
			item.product.id,
			"listing",
		);

		// Parse variant ID: null for default variants, numeric ID otherwise
		let variantId: number | null = null;
		if (!item.variant.id.endsWith("-default")) {
			variantId = parseTradlyNumericId(
				item.variant.id,
				"variant",
			);
		}

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
			page: "home",
			setPage: (page) => set({ page }),

			// Categories state - start with just "All", API will populate the rest
			categories: [{ id: "all", label: "All", emoji: "🛍️" }],
			categoriesLoading: false,
			categoriesError: null,
			fetchCategories: async () => {
				if (!isTradlyConfigured()) {
					set({
						categoriesError: "Tradly API not configured.",
						categoriesLoading: false,
					});
					return;
				}

				set({ categoriesLoading: true, categoriesError: null });
				try {
					const tradlyCategories = await getCategories();
					const localCategories = adaptTradlyCategoriesToLocal(tradlyCategories);

					// Seed the category map for product filtering
					seedCategoryMap(tradlyCategories);

					set({
						categories: localCategories,
						categoriesLoading: false,
						categoriesError: null,
					});
				} catch (err) {
					const message =
						err instanceof Error
							? err.message
							: "Failed to load categories";
					set({
						categoriesError: message,
						categoriesLoading: false,
					});
				}
			},

			cart: [],
			addToCart: async (product, variant) => {
				const existing = get().cart.find(
					(i) =>
						i.product.id === product.id &&
						i.variant.id === variant.id,
				);

				// Optimistic update: add to local state immediately
				if (existing) {
					set({
						cart: get().cart.map((i) =>
							i.product.id === product.id &&
							i.variant.id === variant.id
								? {
										...i,
										quantity:
											i.quantity +
											1,
									}
								: i,
						),
					});
				} else {
					set({
						cart: [
							...get().cart,
							{
								product,
								variant,
								quantity: 1,
							},
						],
					});
				}

				// Skip Tradly API call if not logged in - items stay in local state only
				if (!get().tradlyUser) {
					console.log("User not logged in - item stored in local cart only");
					return;
				}

				// Sync to Tradly API immediately (in background)
				try {
					const listingId = parseTradlyNumericId(
						product.id,
						"listing",
					);

					// Parse variant ID: null for default variants, numeric ID otherwise
					let variantId: number | null = null;
					if (!variant.id.endsWith("-default")) {
						variantId = parseTradlyNumericId(
							variant.id,
							"variant",
						);
					}

					await addToTradlyCart(
						listingId,
						variantId,
						existing ? existing.quantity + 1 : 1,
						get().tradlyUser?.authKey ?? "",
					);

					// Silent cart refresh after successful add
					void get().refreshTradlyCart();
				} catch (err) {
					// Rollback: remove the item if Tradly API failed
					if (err instanceof TradlyApiError) {
						const code = (
							err.body as
								| {
										error?: {
											code?: number;
										};
								  }
								| undefined
						)?.error?.code;

						// Handle "Mixed cart not supported" error
						if (code === 489) {
							// Rollback: remove the item we just added
							set({
								cart: get().cart.filter(
									(i) =>
										!(
											i
												.product
												.id ===
												product.id &&
											i
												.variant
												.id ===
												variant.id
										),
								),
								cartSyncError:
									"This item cannot be added to your cart because it's from a different category. Your current cart contains items that cannot be mixed with this product. Please clear your cart to continue.",
							});
							return;
						}

						// Invalid/stale auth key
						if (
							err.status === 401 ||
							(err.status === 412 &&
								code === 753)
						) {
							// Rollback and clear session
							set({
								cart: get().cart.filter(
									(i) =>
										!(
											i
												.product
												.id ===
												product.id &&
											i
												.variant
												.id ===
												variant.id
										),
								),
								tradlyUser: null,
							});
							return;
						}
					}

					// For other errors, also rollback
					set({
						cart: get().cart.filter(
							(i) =>
								!(
									i.product.id ===
										product.id &&
									i.variant.id ===
										variant.id
								),
						),
					});
					throw err;
				}
			},
			removeFromCart: async (productId, variantId) => {
				// Optimistic update: remove from local state immediately
				const itemToRemove = get().cart.find(
					(i) =>
						i.product.id === productId &&
						i.variant.id === variantId,
				);

				set({
					cart: get().cart.filter(
						(i) =>
							!(
								i.product.id ===
									productId &&
								i.variant.id ===
									variantId
							),
					),
				});

				// Sync removal to Tradly API
				if (itemToRemove && get().tradlyUser) {
					try {
						const listingId =
							parseTradlyNumericId(
								productId,
								"listing",
							);

						// Find the cart_detail_id from Tradly cart
						const cartDetail =
							get().tradlyCart?.cart_details?.find(
								(d) =>
									d.listing.id ===
									listingId,
							);

						if (cartDetail) {
							await removeFromTradlyCart(
								{
									listing_id: [
										listingId,
									],
									cart_detail_id: [
										cartDetail.id,
									],
								},
								get().tradlyUser!
									.authKey,
							);

							// Silent cart refresh after successful removal
							void get().refreshTradlyCart();
						}
					} catch (err) {
						// Log error but don't block UI - item is already removed from local state
						console.error(
							"Failed to remove from Tradly cart:",
							err,
						);
					}
				}
			},
			updateQuantity: async (productId, variantId, qty) => {
				if (qty <= 0) {
					await get().removeFromCart(
						productId,
						variantId,
					);
					return;
				}

				const itemToUpdate = get().cart.find(
					(i) =>
						i.product.id === productId &&
						i.variant.id === variantId,
				);

				if (!itemToUpdate) return;

				const oldQuantity = itemToUpdate.quantity;

				// Optimistic update: update quantity immediately
				set({
					cart: get().cart.map((i) =>
						i.product.id === productId &&
						i.variant.id === variantId
							? { ...i, quantity: qty }
							: i,
					),
				});

				// Skip Tradly API call if not logged in - items stay in local state only
				if (!get().tradlyUser) {
					console.log("User not logged in - quantity updated in local cart only");
					return;
				}

				// Sync to Tradly API in background
				try {
					const listingId = parseTradlyNumericId(
						itemToUpdate.product.id,
						"listing",
					);

					let variantId: number | null = null;
					if (
						!itemToUpdate.variant.id.endsWith(
							"-default",
						)
					) {
						variantId = parseTradlyNumericId(
							itemToUpdate.variant.id,
							"variant",
						);
					}

					await addToTradlyCart(
						listingId,
						variantId,
						qty,
						get().tradlyUser?.authKey ?? "",
					);

					// Silent cart refresh after successful update
					void get().refreshTradlyCart();
				} catch (err) {
					// Rollback: revert quantity if API failed
					if (err instanceof TradlyApiError) {
						const code = (
							err.body as
								| {
										error?: {
											code?: number;
										};
								  }
								| undefined
						)?.error?.code;

						// Handle "Mixed cart not supported" error
						if (code === 489) {
							// Rollback to old quantity
							set({
								cart: get().cart.map(
									(i) =>
										i.product
											.id ===
											productId &&
										i.variant
											.id ===
											variantId
											? {
													...i,
													quantity: oldQuantity,
												}
											: i,
								),
								cartSyncError:
									"This item cannot be added to your cart because it's from a different category. Please clear your cart to continue.",
							});
							return;
						}

						// Invalid/stale auth key
						if (
							err.status === 401 ||
							(err.status === 412 &&
								code === 753)
						) {
							// Rollback and clear session
							set({
								cart: get().cart.map(
									(i) =>
										i.product
											.id ===
											productId &&
										i.variant
											.id ===
											variantId
											? {
													...i,
													quantity: oldQuantity,
												}
											: i,
								),
								tradlyUser: null,
							});
							return;
						}
					}

					// For other errors, also rollback
					set({
						cart: get().cart.map((i) =>
							i.product.id === productId &&
							i.variant.id === variantId
								? {
										...i,
										quantity: oldQuantity,
									}
								: i,
						),
					});
					throw err;
				}
			},
			clearCart: async () => {
				// Clear local state immediately
				set({
					cart: [],
					cartSyncError: null,
					tradlyCart: null,
				});

				// Also clear Tradly cart
				const authKey = get().tradlyUser?.authKey;
				if (authKey) {
					try {
						await clearTradlyCart(authKey);
					} catch {
						// Ignore errors when clearing remote cart
					}
				}
			},
			cartTotal: () =>
				get().cart.reduce(
					(sum, i) =>
						sum + i.variant.price * i.quantity,
					0,
				),
			cartCount: () =>
				get().cart.reduce((sum, i) => sum + i.quantity, 0),
			syncTradlyCartFromLocal: async () => {
				// Clear any previous cart sync errors
				set({ cartSyncError: null });

				try {
					await syncTradlyCart(get());
				} catch (err) {
					if (err instanceof TradlyApiError) {
						const code = (
							err.body as
								| {
										error?: {
											code?: number;
										};
								  }
								| undefined
						)?.error?.code;

						// Handle "Mixed cart not supported" error
						if (code === 489) {
							set({
								cartSyncError:
									"This item cannot be added to your cart because it's from a different category. Your current cart contains items that cannot be mixed with this product. Please clear your cart to continue.",
							});
							return;
						}

						// Invalid/stale auth key. Clear session so app can recover with fresh OTP login.
						if (
							err.status === 401 ||
							(err.status === 412 &&
								code === 753)
						) {
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
			setCurrentOrderId: (orderId) =>
				set({ currentOrderId: orderId }),

			placeOrderAsync: async (input) => {
				const state = get();
				if (!isTradlyConfigured()) {
					throw new Error(
						"Tradly API is not configured.",
					);
				}
				if (!state.tradlyUser) {
					throw new Error(
						"Please login to place your order.",
					);
				}
				if (state.cart.length === 0) {
					throw new Error("Your cart is empty.");
				}

				// Check for existing cart sync error before placing order
				if (state.cartSyncError) {
					throw new Error(
						"Please resolve the cart conflict before placing your order.",
					);
				}

				try {
					// NOTE: Cart is already synced via addToCart/updateQuantity
					// No need to clear and re-sync - that causes unnecessary API calls

					let tradlyAddr;

					// Use pre-created address ID if available (from OTP flow)
					if (input.addressId) {
						// Fetch the address to get full details
						const existingAddresses = await getAddresses(
							state.tradlyUser.authKey,
							"shipping_address",
						);
						tradlyAddr = existingAddresses.find(
							(addr) => addr.id === input.addressId
						);

						if (!tradlyAddr) {
							throw new Error("Pre-created address not found. Please try again.");
						}
					} else {
						// Check if address already exists before creating new one
						const existingAddresses = await getAddresses(
							state.tradlyUser.authKey,
							"shipping_address",
						);

						const newAddressPayload =
							buildAddressPayload(
								input.name,
								input.address,
								input.coordinates,
							);

						// Find if we already have an address with the same data
						const existingAddress =
							existingAddresses.find(
								(addr) =>
									addr.address_line_1 ===
										newAddressPayload.address_line_1 &&
									addr.post_code ===
										newAddressPayload.post_code,
							);

						tradlyAddr =
							existingAddress ||
							(await createAddress(
								newAddressPayload,
								state.tradlyUser.authKey,
							));
					}

					const [paymentMethods, shippingMethods] =
						await Promise.all([
							getPaymentMethods(),
							getShippingMethods(),
						]);

					const selectedPayment = paymentMethods.find(
						(method) =>
							method.id ===
								input.paymentMethodId &&
							method.active,
					);
					const fallbackPayment =
						paymentMethods.find(
							(method) =>
								method.default &&
								method.active,
						) ??
						paymentMethods.find(
							(method) => method.active,
						);
					const paymentMethod =
						selectedPayment ?? fallbackPayment;

					if (!paymentMethod)
						throw new Error(
							"No active payment method found.",
						);

					const shippingMethod =
						shippingMethods.find(
							(method) =>
								method.default &&
								method.active,
						) ??
						shippingMethods.find(
							(method) => method.active,
						);
					if (!shippingMethod)
						throw new Error(
							"No active shipping method found.",
						);

					const checkoutResponse =
						await checkoutTradlyCart(
							{
								payment_method_id:
									paymentMethod.id,
								shipping_method_id:
									shippingMethod.id,
								shipping_address_id:
									tradlyAddr.id,
							},
							state.tradlyUser.authKey,
						);

					// Create a local order from checkout response
					const orderReference =
						checkoutResponse.data.order_reference;
					const orderId = orderReference;
					const now = new Date();

					const localOrder: Order = {
						id: orderId,
						tradlyId: orderReference,
						reference: orderReference,
						items: [...state.cart],
						total: state.cartTotal(),
						deliverySlot: input.slot,
						address: input.address,
						statusCode: 2, // Confirmed
						statusLabel: "Confirmed",
						placedAt: now.toISOString(),
						estimatedDelivery: new Date(
							now.getTime() + 45 * 60_000,
						).toISOString(),
						customerCoordinates:
							input.coordinates ?? null,
						liveTracking: {
							customerLocation:
								input.coordinates ??
								null,
							liveLocation: null,
							events: [],
						},
					};

					set((s) => ({
						orders: upsertOrders(s.orders, [
							localOrder,
						]),
						currentOrderId: localOrder.id,
						cart: [], // Clear cart after successful checkout
						tradlyCart: null, // Also clear Tradly cart state
						ordersError: null,
					}));

					console.log("Order created:", localOrder);
					return localOrder.id;
				} catch (err) {
					if (
						err instanceof TradlyApiError &&
						err.status === 401
					) {
						clearAuthSessionStorage();
						set({
							tradlyUser: null,
							ordersError:
								"Session expired. Please verify your email and try checkout again.",
						});
						throw new Error(
							"Session expired. Please verify your email and try checkout again.",
						);
					}
					const message =
						err instanceof Error
							? err.message
							: "Could not place order with Tradly.";
					set({ ordersError: message });
					throw new Error(message);
				}
			},

			refreshCurrentOrder: async () => {
				const state = get();
				if (!state.currentOrderId || !state.tradlyUser)
					return;

				try {
					const [tradlyOrder, lynxoTracking] =
						await Promise.all([
							getTradlyOrder(
								state.currentOrderId,
								state.tradlyUser
									.authKey,
							),
							getLynxoOrderTracking(
								state.currentOrderId,
								state.tradlyUser
									.authKey,
							).catch(() => null),
						]);
					const existing = state.orders.find(
						(order) =>
							order.id ===
							state.currentOrderId,
					);
					const updated = mergeLynxoTracking(
						mapTradlyOrderToLocal(
							tradlyOrder,
							existing,
						),
						lynxoTracking,
					);

					set((s) => ({
						orders: upsertOrders(s.orders, [
							updated,
						]),
						ordersError: null,
					}));
				} catch (err) {
					if (
						err instanceof TradlyApiError &&
						err.status === 401
					) {
						clearAuthSessionStorage();
						set({
							tradlyUser: null,
							ordersError:
								"Session expired. Please verify your email to continue tracking.",
						});
						return;
					}
					const message =
						err instanceof Error
							? err.message
							: "Failed to refresh order status.";
					set({ ordersError: message });
				}
			},

			fetchOrderHistory: async (reset = false) => {
				const state = get();
				if (!state.tradlyUser) {
					set({
						ordersError:
							"Please login to view order history.",
					});
					return;
				}

				const page = reset ? 1 : state.ordersPage;
				set({ ordersLoading: true, ordersError: null });

				try {
					const { orders: tradlyOrders, totalCount } =
						await getTradlyOrders(
							state.tradlyUser.authKey,
							{
								page,
								per_page: 20,
							},
						);

					const mapped = tradlyOrders.map((order) => {
						const existing = get().orders.find(
							(current) =>
								current.id ===
								String(order.id),
						);
						return mapTradlyOrderToLocal(
							order,
							existing,
						);
					});

					set((s) => {
						const merged = reset
							? mapped
							: upsertOrders(
									s.orders,
									mapped,
								);
						const hasMoreFromTotal = totalCount
							? merged.length < totalCount
							: mapped.length === 20;
						const nextCurrentOrderId =
							s.currentOrderId ??
							mapped[0]?.id ??
							null;

						return {
							orders: merged,
							currentOrderId:
								nextCurrentOrderId,
							ordersPage: page + 1,
							ordersHasMore:
								hasMoreFromTotal,
							ordersLoading: false,
							ordersError: null,
						};
					});
				} catch (err) {
					if (
						err instanceof TradlyApiError &&
						err.status === 401
					) {
						clearAuthSessionStorage();
						set({
							tradlyUser: null,
							ordersLoading: false,
							ordersError:
								"Session expired. Please login again from checkout.",
						});
						return;
					}
					const message =
						err instanceof Error
							? err.message
							: "Failed to load order history.";
					set({
						ordersLoading: false,
						ordersError: message,
					});
				}
			},

			paymentMethods: [],
			paymentMethodsLoading: false,
			paymentMethodsError: null,
			fetchPaymentMethods: async () => {
				if (!isTradlyConfigured()) {
					set({
						paymentMethodsError:
							"Tradly API not configured.",
						paymentMethods: [],
					});
					return;
				}

				set({
					paymentMethodsLoading: true,
					paymentMethodsError: null,
				});
				try {
					const methods = await getPaymentMethods();
					const active = methods.filter(
						(method) => method.active,
					);
					set({
						paymentMethods: active,
						paymentMethodsLoading: false,
						paymentMethodsError: null,
					});
				} catch (err) {
					const message =
						err instanceof Error
							? err.message
							: "Failed to load payment methods.";
					set({
						paymentMethodsLoading: false,
						paymentMethodsError: message,
						paymentMethods: [],
					});
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
				set({
					tradlyUser: null,
					verifySession: null,
					page: "home",
				});
			},

			loginOrRegisterUser: async (
				email,
				_password,
				firstName,
				lastName,
				_legacyPassword,
			) => {
				const normalizedEmail = email.trim().toLowerCase();

				try {
					// Step 1: Try to register (sign up)
					const { verify_id } = await registerUser({
						email: normalizedEmail,
						password: "", // Password not needed for OTP flow
						first_name: firstName,
						last_name: lastName,
					});

					// Registration successful - set up OTP verification
					set({
						verifySession: {
							verifyId: verify_id,
							email: normalizedEmail,
							password: null,
							pendingOrderData: null,
						},
					});
					return "needs_verify";
				} catch (registerErr) {
					// Step 2: If user already exists (code 101), try sign in
					if (
						registerErr instanceof
							TradlyApiError &&
						registerErr.status === 412
					) {
						const code = (
							registerErr.body as
								| {
										error?: {
											code?: number;
										};
								  }
								| undefined
						)?.error?.code;

						// User already exists - call sign in API
						if (code === 101) {
							try {
								const {
									verify_id: signInVerifyId,
								} = await signInUser({
									email: normalizedEmail,
								});

								// Sign in successful - set up OTP verification
								set({
									verifySession: {
										verifyId: signInVerifyId,
										email: normalizedEmail,
										password: null,
										pendingOrderData:
											null,
									},
								});
								return "needs_verify";
							} catch (signInErr) {
								throw new Error(
									signInErr instanceof
										Error
										? signInErr.message
										: "Sign in failed. Please try again.",
								);
							}
						}
					}

					// Other errors - throw as-is
					throw new Error(
						registerErr instanceof Error
							? registerErr.message
							: "Registration failed. Please try again.",
					);
				}
			},

			verifyAndCompleteUser: async (code) => {
				const vs = get().verifySession;
				if (!vs)
					throw new Error("No verify session active");
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

				// After successful login, sync cart with Tradly
				try {
					console.log("User logged in, syncing cart with Tradly...");
					const cartData = await getTradlyCart(session.authKey);

					if (cartData && cartData.cart && cartData.cart_details.length > 0) {
						// Tradly cart has items - replace local cart with Tradly data
						console.log("Tradly cart has items - replacing local cart");

						// Create cart items from Tradly data
						const syncedCart: CartItem[] = [];
						for (const detail of cartData.cart_details) {
							const listingId = String(detail.listing.id);

							// Get image from listing
							const listingImage = Array.isArray(detail.listing.images) && detail.listing.images.length > 0
								? detail.listing.images[0]
								: "";

							// Get price
							const price = detail.listing.offer_price?.amount ?? detail.listing.list_price.amount;

							syncedCart.push({
								product: {
									id: listingId,
									name: detail.listing.title,
									emoji: listingImage ? "" : "📦",
									image: listingImage,
									category: "",
									rating: detail.listing.rating_data?.rating_average ?? 0,
									description: "",
									basePrice: price,
									unit: "item",
									reviewCount: 0,
									variants: [],
									tags: [],
								},
								variant: {
									id: `${listingId}-default`,
									label: "Standard",
									price: price,
									unit: "unit",
									inStock: detail.listing.stock > 0,
								},
								quantity: detail.quantity,
							});
						}

						// Replace local cart with Tradly cart
						set({ cart: syncedCart, tradlyCart: cartData });
					} else {
						// Tradly cart is empty - sync all local items to Tradly
						console.log("Tradly cart is empty - syncing local items to Tradly");

						// Clear existing Tradly cart first
						try {
							await clearTradlyCart(session.authKey);
						} catch {
							// Cart might not exist yet, which is fine
							console.log("No existing Tradly cart to clear");
						}

						// Add all local items to Tradly
						for (const item of get().cart) {
							const listingId = parseTradlyNumericId(
								item.product.id,
								"listing",
							);

							let variantId: number | null = null;
							if (!item.variant.id.endsWith("-default")) {
								variantId = parseTradlyNumericId(
									item.variant.id,
									"variant",
								);
							}

							await addToTradlyCart(
								listingId,
								variantId,
								item.quantity,
								session.authKey,
							);
						}

						// Fetch updated Tradly cart
						const updatedCartData = await getTradlyCart(session.authKey);
						set({ tradlyCart: updatedCartData });
					}
				} catch (err) {
					// Log error but don't block login - cart sync can happen later
					console.error("Failed to sync cart after login:", err);
				}
			},

			tradlyProducts: [],
			productsLoading: false,
			productsError: null,

			// Variant fetching state
			productVariants: {},
			variantsLoading: false,

			fetchProducts: async (params = {}) => {
				if (!isTradlyConfigured()) {
					set({
						productsError:
							"Tradly API not configured",
						productsLoading: false,
					});
					return;
				}
				set({ productsLoading: true, productsError: null });
				try {
					// Fetch categories along with products
					try {
						await get().fetchCategories();
					} catch {
						// non-fatal - continue with products
					}

					const listings = await getListings(params);
					const listingCurrency =
						listings[0]?.list_price?.currency;
					if (listingCurrency) {
						setCurrencyCode(listingCurrency);
					}
					const products = listings.map((l) =>
						adaptListingToProduct(l),
					);
					set({
						tradlyProducts: products,
						productsLoading: false,
					});
				} catch (err) {
					const msg =
						err instanceof Error
							? err.message
							: "Failed to load products";
					set({
						productsError: msg,
						productsLoading: false,
					});
				}
			},

			fetchProductVariants: async (listingId: string) => {
				// Return early if already fetched
				if (get().productVariants[listingId]) {
					return;
				}

				set({ variantsLoading: true });
				try {
					const numericId = parseInt(listingId, 10);
					if (Number.isNaN(numericId)) {
						throw new Error(
							`Invalid listing ID: ${listingId}`,
						);
					}

					const tradlyVariants =
						await getListingVariants(numericId);
					console.log({ tradlyVariants });

					// Adapt Tradly variants to local Variant format
					const variants = tradlyVariants
						.filter(
							(v: TradlyVariant) => v.active,
						)
						.map((v: TradlyVariant) => ({
							id: String(v.id),
							label:
								v.title ??
								v.variant_values.join(
									", ",
								) ??
								"Standard",
							price:
								v.offer_price?.amount ??
								v.list_price.amount,
							unit: "unit" as const,
							inStock:
								v.active && v.stock > 0,
						}));

					// Cache the variants
					set((s) => ({
						productVariants: {
							...s.productVariants,
							[listingId]: variants,
						},
						variantsLoading: false,
					}));
				} catch (err) {
					// If variants fail to fetch, store empty array so we don't retry
					set((s) => ({
						productVariants: {
							...s.productVariants,
							[listingId]: [],
						},
						variantsLoading: false,
					}));
				}
			},

			getProductVariants: (listingId: string) => {
				return get().productVariants[listingId] ?? null;
			},

			// Cart sync error state
			cartSyncError: null,

			// Tradly cart data (rich cart from API)
			tradlyCart: null,

			clearCartSyncError: () => {
				set({ cartSyncError: null });
			},
			resolveMixedCartError: async () => {
				// Clear both local and Tradly cart, then re-sync
				try {
					// Clear Tradly cart first
					const authKey = get().tradlyUser?.authKey;
					if (!authKey) {
						throw new Error("Not logged in");
					}

					await clearTradlyCart(authKey);

					// Re-add all items from local cart
					for (const item of get().cart) {
						const listingId =
							parseTradlyNumericId(
								item.product.id,
								"listing",
							);

						let variantId: number | null = null;
						if (
							!item.variant.id.endsWith(
								"-default",
							)
						) {
							variantId =
								parseTradlyNumericId(
									item.variant.id,
									"variant",
								);
						}

						await addToTradlyCart(
							listingId,
							variantId,
							item.quantity,
							authKey,
						);
					}

					set({ cartSyncError: null });
				} catch (err) {
					// If still fails, update error message
					const message =
						err instanceof Error
							? err.message
							: "Could not resolve cart conflict. Please try clearing your cart.";
					set({ cartSyncError: message });
				}
			},

			verifyCartConnection: async () => {
				// Fetch and store Tradly cart data
				await get().refreshTradlyCart();
			},

			refreshTradlyCart: async () => {
				// Fetch Tradly cart data and sync with local state
				if (!isTradlyConfigured()) {
					console.log("Tradly not configured");
					return;
				}

				const tradlyUser = get().tradlyUser;
				if (!tradlyUser) {
					console.log("No Tradly user found");
					return;
				}

				const authKey = tradlyUser.authKey;
				if (!authKey) {
					console.log("No auth key found");
					return;
				}

				try {
					console.log("Fetching Tradly cart...");
					const cartData =
						await getTradlyCart(authKey);

					// Validate response structure before setting
					if (cartData && cartData.cart) {
						console.log(
							"Cart data received:",
							cartData,
						);

						// Sync local cart with Tradly cart bidirectionally
						const localCart = get().cart;
						const syncedCart: CartItem[] = [];
						const processedListingIds =
							new Set<string>();

						// Process each item from Tradly cart
						for (const detail of cartData.cart_details) {
							const listingId = String(
								detail.listing.id,
							);
							processedListingIds.add(
								listingId,
							);

							// Find matching local cart item
							const localItem =
								localCart.find(
									(i) =>
										i.product
											.id ===
										listingId,
								);

							if (localItem) {
								// Update quantity of existing item
								syncedCart.push({
									...localItem,
									quantity: detail.quantity,
								});
							} else {
								// New item in Tradly cart that's not in local cart
								// Create a CartItem from Tradly data and add it
								console.log(
									"Adding Tradly item to local cart:",
									listingId,
								);

								// Get image from listing
								const listingImage =
									Array.isArray(
										detail
											.listing
											.images,
									) &&
									detail.listing
										.images
										.length >
										0
										? detail
												.listing
												.images[0]
										: "";

								// Get price (prefer offer_price, fallback to list_price)
								const price =
									detail.listing
										.offer_price
										?.amount ??
									detail.listing
										.list_price
										.amount;

								syncedCart.push({
									product: {
										id: listingId,
										name: detail
											.listing
											.title,
										emoji: listingImage
											? ""
											: "📦",
										image: listingImage,
										category: "",
										rating:
											detail
												.listing
												.rating_data
												?.rating_average ??
											0,
										description:
											"",
										basePrice: price,
										unit: "item",
										reviewCount: 0,
										variants: [],
										tags: [],
									},
									variant: {
										id: `${listingId}-default`,
										label: "Standard",
										price: price,
										unit: "unit",
										inStock:
											detail
												.listing
												.stock >
											0,
									},
									quantity: detail.quantity,
								});
							}
						}

						// Check if there are items in local cart that aren't in Tradly cart
						// This shouldn't happen if addToCart/updateQuantity work correctly
						const localOnlyItems =
							localCart.filter(
								(i) =>
									!processedListingIds.has(
										i.product
											.id,
									),
							);

						if (localOnlyItems.length > 0) {
							console.warn(
								"Items in local cart not in Tradly cart:",
								localOnlyItems.map(
									(i) =>
										i.product
											.id,
								),
							);
							// Remove these items from local cart - they failed to sync
						}

						// Always update local cart to match Tradly
						if (
							syncedCart.length !==
								localCart.length ||
							syncedCart.some(
								(item, idx) =>
									item.quantity !==
									localCart[idx]
										?.quantity,
							)
						) {
							console.log(
								"Syncing local cart with Tradly cart",
							);
							set({ cart: syncedCart });
						}

						set({ tradlyCart: cartData });
					} else {
						// Response is malformed, clear cart data
						console.warn(
							"Tradly cart response is malformed",
						);
						set({ tradlyCart: null });
					}
				} catch (err) {
					// If fetch fails, clear cart data and log it
					console.error("Cart refresh failed:", err);
					set({ tradlyCart: null });
				}
			},
		}),
		{
			name: "lynxo-store",
			partialize: (s) => ({
				cart: s.cart,
				orders: s.orders,
				currentOrderId: s.currentOrderId,
				tradlyUser: s.tradlyUser,
				productVariants: s.productVariants,
				cartSyncError: s.cartSyncError,
				// NOTE: tradlyCart is NOT persisted - always fetch fresh from server
			}),
		},
	),
);


