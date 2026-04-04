import { useState, useEffect, useRef } from "react";
import { Plus, Star } from "lucide-react";
import type { Product, Variant } from "../data/products";
import { useStore } from "../store/useStore";
import { BottomSheet } from "./BottomSheet";
import { formatMoney } from "../lib/currency";

interface ProductCardProps {
	product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
	const { openSheet } = useStore();

	return (
		<div
			className="bg-white rounded-2xl overflow-hidden shadow-card border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
			onClick={() => openSheet(product)}
		>
			{/* Image */}
			<div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
				<img
					src={product.image}
					alt={product.name}
					className="w-full h-full object-cover"
					loading="lazy"
				/>
				{product.popular && (
					<span className="absolute top-2 left-2 bg-accent-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
						Popular
					</span>
				)}
			</div>

			{/* Info */}
			<div className="p-3">
				<div className="flex items-start justify-between gap-1">
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-slate-900 text-sm leading-tight truncate">
							{product.emoji} {product.name}
						</p>
						<p className="text-slate-500 text-xs mt-0.5 leading-tight line-clamp-1">
							{product.description}
						</p>
					</div>
				</div>

				{/* Rating */}
				<div className="flex items-center gap-1 mt-1.5">
					<Star
						size={11}
						className="text-amber-400 fill-amber-400"
					/>
					<span className="text-xs font-medium text-slate-700">
						{product.rating}
					</span>
					<span className="text-xs text-slate-400">
						({product.reviewCount})
					</span>
				</div>

				{/* Price + CTA */}
				<div className="flex items-center justify-between mt-2">
					<p className="text-primary-600 font-bold text-sm">
						From {formatMoney(product.basePrice)}
					</p>
					<button
						onClick={(e) => {
							e.stopPropagation();
							openSheet(product);
						}}
						className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary-500 text-white shadow-md active:scale-90 transition-transform"
					>
						<Plus
							size={18}
							strokeWidth={2.5}
						/>
					</button>
				</div>
			</div>
		</div>
	);
}

/* ─── Variant Selector (inside BottomSheet) ─── */
export function VariantSheet() {
	const { sheetProduct, closeSheet } = useStore();

	if (!sheetProduct) return null;

	return (
		<BottomSheet
			open={!!sheetProduct}
			onClose={closeSheet}
			title={sheetProduct.name}
		>
			<VariantSheetBody
				key={sheetProduct.id}
				sheetProduct={sheetProduct}
			/>
		</BottomSheet>
	);
}

function VariantSheetBody({ sheetProduct }: { sheetProduct: Product }) {
	const {
		closeSheet,
		addToCart,
		cart,
		variantsLoading,
		fetchProductVariants,
		getProductVariants,
	} = useStore();
	const [variants, setVariants] = useState<Variant[] | null>(null);
	const [selected, setSelected] = useState<Variant | null>(null);
	const [added, setAdded] = useState(false);

	// Track which product we've fetched variants for (prevents duplicate calls)
	const fetchedProductIdRef = useRef<string | null>(null);

	// Fetch variants when component mounts (only once per product)
	useEffect(() => {
		// Skip if already fetched for this specific product
		if (fetchedProductIdRef.current === sheetProduct.id) return;

		async function loadVariants() {
			fetchedProductIdRef.current = sheetProduct.id;
			await fetchProductVariants(sheetProduct.id);
			const fetched = getProductVariants(sheetProduct.id);

			if (fetched && fetched.length > 0) {
				// Has variants - use them
				setVariants(fetched);
				setSelected(fetched.find((v) => v.inStock) ?? null);
			} else {
				// No variants - create a default variant from base price
				setVariants([]);
				setSelected({
					id: `${sheetProduct.id}-default`,
					label: "Standard",
					price: sheetProduct.basePrice,
					unit: sheetProduct.unit,
					inStock: true,
				});
			}
		}

		loadVariants();
		// Only depend on sheetProduct.id - other deps cause multiple calls
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sheetProduct.id]);

	const handleAdd = () => {
		if (!selected) return;
		addToCart(sheetProduct, selected);
		setAdded(true);
		setTimeout(() => {
			setAdded(false);
			closeSheet();
		}, 800);
	};

	const cartQty = cart
		.filter(
			(i) =>
				i.product.id === sheetProduct.id &&
				i.variant.id === selected?.id,
		)
		.reduce((s, i) => s + i.quantity, 0);

	// Show loading skeleton while fetching
	if (variants === null || variantsLoading) {
		return (
			<div className="px-5 pb-8">
				{/* Product summary */}
				<div className="flex gap-3 mb-5">
					<img
						src={sheetProduct.image}
						alt={sheetProduct.name}
						className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
					/>
					<div className="flex-1">
						<p className="text-slate-600 text-sm leading-relaxed">
							{sheetProduct.description}
						</p>
						<div className="flex items-center gap-1 mt-1">
							<Star
								size={12}
								className="text-amber-400 fill-amber-400"
							/>
							<span className="text-xs font-medium">
								{sheetProduct.rating}
							</span>
							<span className="text-xs text-slate-400">
								·{" "}
								{
									sheetProduct.reviewCount
								}{" "}
								reviews
							</span>
						</div>
					</div>
				</div>

				{/* Loading skeleton for variants */}
				<div className="space-y-2.5 animate-pulse">
					<div className="h-16 bg-slate-100 rounded-2xl" />
					<div className="h-16 bg-slate-100 rounded-2xl" />
				</div>
			</div>
		);
	}

	const hasVariants = variants.length > 0;

	return (
		<div className="px-5 pb-8">
			{/* Product summary */}
			<div className="flex gap-3 mb-5">
				<img
					src={sheetProduct.image}
					alt={sheetProduct.name}
					className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
				/>
				<div>
					<p className="text-slate-600 text-sm leading-relaxed">
						{sheetProduct.description}
					</p>
					<div className="flex items-center gap-1 mt-1">
						<Star
							size={12}
							className="text-amber-400 fill-amber-400"
						/>
						<span className="text-xs font-medium">
							{sheetProduct.rating}
						</span>
						<span className="text-xs text-slate-400">
							· {sheetProduct.reviewCount}{" "}
							reviews
						</span>
					</div>
				</div>
			</div>

			{/* Variants - only show if variants exist */}
			{hasVariants ? (
				<>
					<p className="text-sm font-semibold text-slate-700 mb-3">
						Select Option
					</p>
					<div className="space-y-2.5">
						{variants.map((v) => {
							const isSelected =
								selected?.id === v.id;
							return (
								<button
									key={v.id}
									disabled={
										!v.inStock
									}
									onClick={() =>
										setSelected(
											v,
										)
									}
									className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
										!v.inStock
											? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
											: isSelected
												? "border-primary-500 bg-primary-50"
												: "border-slate-200 bg-white active:bg-slate-50"
									}`}
								>
									<div className="flex items-center gap-3">
										<div
											className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
												isSelected
													? "border-primary-500 bg-primary-500"
													: "border-slate-300"
											}`}
										>
											{isSelected && (
												<div className="w-2 h-2 rounded-full bg-white" />
											)}
										</div>
										<span className="font-medium text-slate-800 text-sm">
											{
												v.label
											}
										</span>
										{!v.inStock && (
											<span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
												Out
												of
												stock
											</span>
										)}
									</div>
									<span
										className={`font-bold text-sm ${isSelected ? "text-primary-600" : "text-slate-700"}`}
									>
										{formatMoney(
											v.price,
										)}
									</span>
								</button>
							);
						})}
					</div>
				</>
			) : (
				/* No variants - show price info directly */
				<div className="bg-slate-50 rounded-2xl px-4 py-3 mb-4">
					<p className="text-sm text-slate-600">
						Price
					</p>
					<p className="text-2xl font-bold text-slate-900 mt-1">
						{formatMoney(sheetProduct.basePrice)}
					</p>
				</div>
			)}

			{/* Tags */}
			<div className="flex flex-wrap gap-2 mt-4">
				{sheetProduct.tags.map((t) => (
					<span
						key={t}
						className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full"
					>
						{t}
					</span>
				))}
			</div>

			{/* CTA */}
			<button
				onClick={handleAdd}
				disabled={!selected}
				className={`w-full mt-6 py-4 rounded-2xl font-bold text-base transition-all ${
					added
						? "bg-green-500 text-white scale-[0.98]"
						: selected
							? "bg-primary-500 text-white active:scale-[0.98] shadow-lg shadow-primary-200"
							: "bg-slate-200 text-slate-400 cursor-not-allowed"
				}`}
			>
				{added
					? "✓ Added to Cart!"
					: cartQty > 0
						? `Add More · ${formatMoney(selected?.price ?? 0)} (${cartQty} in cart)`
						: `Add to Cart · ${formatMoney(selected?.price ?? 0)}`}
			</button>
		</div>
	);
}

