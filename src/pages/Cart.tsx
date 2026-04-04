import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../store/useStore";
import { formatMoney } from "../lib/currency";

export function CartPage() {
	const {
		cart,
		updateQuantity,
		removeFromCart,
		cartTotal,
		setPage,
		tradlyCart,
		tradlyUser,
		verifyCartConnection,
	} = useStore();

	// Track if we've already attempted to fetch cart data for this session
	const hasAttemptedFetchRef = useRef(false);

	// Verify cart connection when page loads (only once)
	useEffect(() => {
		const loadCart = async () => {
			// Only fetch if: user is authenticated AND cart is null AND we haven't tried yet
			if (
				tradlyUser &&
				tradlyCart === null &&
				!hasAttemptedFetchRef.current
			) {
				hasAttemptedFetchRef.current = true;
				try {
					await verifyCartConnection();
				} catch (err) {
					console.warn("Failed to load cart:", err);
				}
			}
		};

		loadCart();
		// Only run when tradlyUser changes - not when tradlyCart changes
	}, [tradlyUser]);

	// Use Tradly cart totals if available, otherwise fall back to local calculation
	const cartData = useMemo(() => {
		if (tradlyCart?.cart?.total?.amount) {
			return {
				total: tradlyCart.cart.total.amount,
				grandTotal: tradlyCart.cart.grand_total?.amount ?? 0,
				shippingTotal:
					tradlyCart.cart.shipping_total?.amount ?? 0,
				pricingItems: tradlyCart.cart.pricing_items ?? [],
				cartDetails: tradlyCart.cart_details ?? [],
			};
		}
		// Fallback to local calculation
		const total = cartTotal();
		const deliveryFee = total >= 500 ? 0 : 30;
		return {
			total,
			grandTotal: total + deliveryFee,
			shippingTotal: deliveryFee,
			pricingItems: null,
			cartDetails: null,
		};
	}, [tradlyCart, cartTotal]);

	if (cart.length === 0) {
		return (
			<div className="page-enter flex flex-col items-center justify-center h-dvh pb-24 px-8 text-center">
				<div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5">
					<ShoppingBag
						size={40}
						className="text-slate-300"
					/>
				</div>
				<h2 className="text-xl font-bold text-slate-800 mb-2">
					Cart is empty
				</h2>
				<p className="text-slate-500 text-sm mb-8">
					Add products from the home page to get
					started.
				</p>
				<button
					onClick={() => setPage("home")}
					className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-primary-200"
				>
					Browse Products
				</button>
			</div>
		);
	}

	return (
		<div className="page-enter h-dvh flex flex-col overflow-hidden">
			{/* Header */}
			<div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top">
				<h1 className="text-xl font-black text-slate-900">
					Your Cart{" "}
					<span className="text-slate-400 text-base font-medium">
						({cart.length} item
						{cart.length !== 1 ? "s" : ""})
					</span>
				</h1>
			</div>

			{/* Items list */}
			<div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-3">
				{cart.map((item) => {
					// Find matching cart detail from Tradly to get max_quantity
					const cartDetail =
						cartData.cartDetails?.find(
							(d) =>
								d.listing.id ===
								parseInt(
									item.product.id,
									10,
								),
						);
					const maxQuantity =
						cartDetail?.listing.max_quantity;
					const stock = cartDetail?.listing.stock ?? 0;

					return (
						<div
							key={`${item.product.id}-${item.variant.id}`}
							className="bg-white rounded-2xl p-3 flex gap-3 shadow-card border border-slate-100"
						>
							<img
								src={item.product.image}
								alt={item.product.name}
								className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
							/>
							<div className="flex-1 min-w-0">
								<p className="font-semibold text-sm text-slate-900 leading-tight">
									{
										item
											.product
											.emoji
									}{" "}
									{
										item
											.product
											.name
									}
								</p>
								<p className="text-xs text-slate-500 mt-0.5">
									{
										item
											.variant
											.label
									}
								</p>
								<p className="text-primary-600 font-bold text-sm mt-1">
									{formatMoney(
										item
											.variant
											.price,
									)}{" "}
									<span className="text-slate-400 font-normal text-xs">
										per{" "}
										{
											item
												.variant
												.unit
										}
									</span>
								</p>
							</div>
							<div className="flex flex-col items-end justify-between">
								<button
									onClick={() =>
										removeFromCart(
											item
												.product
												.id,
											item
												.variant
												.id,
										)
									}
									className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400"
								>
									<Trash2
										size={14}
									/>
								</button>
								<div className="flex items-center gap-2 bg-slate-100 rounded-xl px-1 py-1">
									<button
										onClick={() =>
											updateQuantity(
												item
													.product
													.id,
												item
													.variant
													.id,
												item.quantity -
													1,
											)
										}
										disabled={
											item.quantity <=
											1
										}
										className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm text-slate-700 active:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Minus
											size={
												12
											}
										/>
									</button>
									<span className="text-sm font-bold text-slate-800 w-5 text-center">
										{
											item.quantity
										}
									</span>
									<button
										onClick={() =>
											updateQuantity(
												item
													.product
													.id,
												item
													.variant
													.id,
												item.quantity +
													1,
											)
										}
										disabled={
											maxQuantity !==
												undefined &&
											item.quantity >=
												maxQuantity
										}
										className="w-6 h-6 flex items-center justify-center rounded-xl bg-primary-500 text-white shadow-sm active:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
										title={
											maxQuantity !==
												undefined &&
											item.quantity >=
												maxQuantity
												? `Maximum quantity: ${maxQuantity}`
												: undefined
										}
									>
										<Plus
											size={
												12
											}
										/>
									</button>
								</div>
							</div>
						</div>
					);
				})}

				{/* Delivery info */}
				{cartData.shippingTotal === 0 ? (
					<div className="bg-green-50 text-green-700 text-xs font-medium text-center py-2 rounded-xl">
						🎉 Free delivery on this order!
					</div>
				) : (
					<div className="bg-amber-50 text-amber-700 text-xs font-medium text-center py-2 rounded-xl">
						{formatMoney(cartData.shippingTotal)}{" "}
						shipping fee applied
					</div>
				)}
			</div>

			{/* Summary + CTA */}
			<div
				className="px-4 pt-3 pb-24 bg-white border-t border-slate-100"
				style={{
					paddingBottom:
						"calc(5.5rem + env(safe-area-inset-bottom))",
				}}
			>
				<div className="space-y-1.5 mb-4">
					{/* Show pricing items from Tradly API */}
					{cartData.pricingItems &&
						cartData.pricingItems.map((item) => (
							<div
								key={item.short_code}
								className="flex justify-between text-sm text-slate-600"
							>
								<span>{item.name}</span>
								<span>
									{
										item
											.buying
											.formatted
									}
								</span>
							</div>
						))}

					{/* If no pricing items, show basic breakdown */}
					{!cartData.pricingItems && (
						<>
							<div className="flex justify-between text-sm text-slate-600">
								<span>Sub Total</span>
								<span>
									{formatMoney(
										cartData.total,
									)}
								</span>
							</div>
							<div className="flex justify-between text-sm text-slate-600">
								<span>Shipping</span>
								<span>
									{cartData.shippingTotal ===
									0
										? "Free"
										: formatMoney(
												cartData.shippingTotal,
											)}
								</span>
							</div>
						</>
					)}

					<div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
						<span>Total</span>
						<span>
							{formatMoney(
								cartData.grandTotal,
							)}
						</span>
					</div>
				</div>

				<button
					onClick={() => setPage("checkout")}
					className="w-full bg-primary-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary-200 active:scale-[0.98] transition-transform"
				>
					Proceed to Checkout ·{" "}
					{formatMoney(cartData.grandTotal)}
				</button>
			</div>
		</div>
	);
}

