import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export function CartErrorModal() {
	const {
		cartSyncError,
		clearCartSyncError,
		resolveMixedCartError,
		clearCart,
		cart
	} = useStore();

	if (!cartSyncError) return null;

	const handleClearCart = async () => {
		// Option 1: Clear entire cart and let user start fresh
		await clearCart();
		clearCartSyncError();
	};

	const handleResolveConflict = async () => {
		// Option 2: Try to resolve the conflict by re-syncing
		await resolveMixedCartError();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
			{/* Overlay */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={clearCartSyncError}
			/>

			{/* Modal */}
			<div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-bounce-in">
				{/* Close button */}
				<button
					onClick={clearCartSyncError}
					className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
				>
					<X size={16} />
				</button>

				{/* Icon */}
				<div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
					<AlertTriangle size={32} className="text-amber-500" />
				</div>

				{/* Title */}
				<h2 className="text-xl font-bold text-slate-900 mb-2">
					Cart Conflict
				</h2>

				{/* Message */}
				<p className="text-sm text-slate-600 leading-relaxed mb-6">
					{cartSyncError}
				</p>

				{/* Actions */}
				<div className="space-y-3">
					<button
						onClick={handleResolveConflict}
						className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
					>
						<span>Try Syncing Cart Again</span>
					</button>

					<button
						onClick={handleClearCart}
						className="w-full py-3.5 rounded-2xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
					>
						<Trash2 size={16} />
						<span>Clear Cart ({cart.length} items)</span>
					</button>

					<button
						onClick={clearCartSyncError}
						className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
					>
						Cancel
					</button>
				</div>

				{/* Helper text */}
				<p className="text-xs text-slate-400 text-center mt-4">
					💡 Tip: Some items cannot be mixed in the same order (e.g., water & gas)
				</p>
			</div>
		</div>
	);
}
