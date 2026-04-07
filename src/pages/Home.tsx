import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Bell, RefreshCw } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { isTerminalOrderStatus, useStore } from "../store/useStore";
import { isTradlyConfigured } from "../lib/tradlyApi";

export function HomePage() {
	const [activeCategory, setActiveCategory] = useState("all");
	const [query, setQuery] = useState("");
	const {
		orders,
		tradlyProducts,
		productsLoading,
		productsError,
		fetchProducts,
		categories,
	} = useStore();
	const tradlyEnabled = isTradlyConfigured();

	// Debounce ref for filter changes
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			const params: {
				category_id?: string;
				search_key?: string;
			} = {};
			// Pass category ID directly to API (categories come from Tradly API)
			if (activeCategory !== "all") {
				params.category_id = activeCategory;
			}
			if (query.trim()) {
				params.search_key = query.trim();
			}
			fetchProducts(params);
		}, 400);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeCategory, query]);

	// Apply local filter UI on live Tradly products only.
	// Note: API already filters by category_id, so no need to filter locally by category
	const filtered = useMemo(() => {
		let list = tradlyProducts;
		// Just filter by search query if present
		if (query.trim()) {
			const q = query.toLowerCase();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.description.toLowerCase().includes(q) ||
					p.tags.some((t) =>
						t.toLowerCase().includes(q),
					),
			);
		}
		return list;
	}, [query, tradlyProducts]);

	const activeOrder = orders.find(
		(o) => !isTerminalOrderStatus(o.statusCode),
	);
	const hasProducts = filtered.length > 0;
	const showError = !!productsError && tradlyEnabled;

	return (
		<div className="page-enter pb-safe overflow-y-auto scrollbar-hide h-dvh">
			{/* Header */}
			<div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 safe-top">
				<div className="px-4 pt-4 pb-3">
					<div className="flex items-start justify-between mb-3">
						<div>
							<p className="text-slate-500 text-xs font-medium">
								Good day 👋
							</p>
							<h1 className="text-xl font-black text-slate-900 leading-tight">
								Lynxo
								<span className="text-primary-500">
									.
								</span>
							</h1>
						</div>
						<button className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 relative">
							<Bell
								size={18}
								className="text-slate-600"
							/>
							{activeOrder && (
								<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
							)}
						</button>
					</div>

					{/* Search */}
					<div className="relative">
						<Search
							size={16}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
						/>
						<input
							type="text"
							placeholder="Search products, services…"
							value={query}
							onChange={(e) =>
								setQuery(e.target.value)
							}
							className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-300"
						/>
					</div>
				</div>

				{/* Category chips */}
				<div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
					{categories.map((c) => (
						<button
							key={c.id}
							onClick={() =>
								setActiveCategory(c.id)
							}
							className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
								activeCategory === c.id
									? "bg-primary-500 text-white shadow-sm shadow-primary-200"
									: "bg-slate-100 text-slate-600"
							}`}
						>
							<span>{c.emoji}</span>
							<span>{c.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Active order banner */}
			{activeOrder && (
				<ActiveOrderBanner
					orderId={activeOrder.id}
					statusCode={activeOrder.statusCode}
				/>
			)}

			{/* Error banner */}
			{showError && (
				<div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
					<p className="text-red-600 text-sm">
						⚠️ Could not load live products
					</p>
					<button
						onClick={() => fetchProducts()}
						className="flex items-center gap-1 text-red-600 text-sm font-semibold"
					>
						<RefreshCw size={13} /> Retry
					</button>
				</div>
			)}

			{/* Product grid */}
			<div className="px-4 pt-4">
				{productsLoading ? (
					<ProductSkeleton />
				) : !hasProducts ? (
					<div className="flex flex-col items-center justify-center py-20 text-slate-400">
						<span className="text-5xl mb-3">
							🔍
						</span>
						<p className="font-semibold">
							No results found
						</p>
						<p className="text-sm mt-1">
							Try a different search or
							category
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-3">
						{filtered.map((p) => (
							<ProductCard
								key={p.id}
								product={p}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ProductSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="rounded-2xl bg-slate-100 animate-pulse overflow-hidden"
					style={{ height: 200 }}
				>
					<div className="h-28 bg-slate-200" />
					<div className="p-3 space-y-2">
						<div className="h-3 bg-slate-200 rounded-full w-3/4" />
						<div className="h-3 bg-slate-200 rounded-full w-1/2" />
						<div className="h-7 bg-slate-200 rounded-xl mt-2" />
					</div>
				</div>
			))}
		</div>
	);
}

function ActiveOrderBanner({
	orderId,
	statusCode,
}: {
	orderId: string;
	statusCode: number;
}) {
	const { setPage } = useStore();
	const statusLabel: Record<number, string> = {
		1: "📋 Incomplete",
		2: "✅ Confirmed",
		3: "📦 In progress",
		4: "🚚 Shipped",
		5: "🎉 Delivered",
		6: "❌ Canceled by customer",
		7: "❌ Canceled by admin",
		8: "🏁 Completed",
	};

	return (
		<button
			onClick={() => setPage("tracking")}
			className="mx-4 mt-3 w-[calc(100%-2rem)] bg-primary-500 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg shadow-primary-200"
		>
			<div className="text-left">
				<p className="text-xs font-medium opacity-80">
					Active Order · {orderId}
				</p>
				<p className="text-sm font-bold">
					{statusLabel[statusCode] ??
						`Status ${statusCode}`}
				</p>
			</div>
			<span className="text-lg">→</span>
		</button>
	);
}

