import { useEffect, useState } from "react";
import { CheckCircle, Mail, Home } from "lucide-react";
import { useStore } from "../store/useStore";

export function CheckoutSuccessPage() {
	const { currentOrderId, orders, setPage } = useStore();
	const [orderRef, setOrderRef] = useState<string | null>(null);

	// Try to get order reference from either currentOrderId or the orders array
	useEffect(() => {
		console.log("CheckoutSuccessPage mounted", { currentOrderId, ordersLength: orders.length });

		// Try currentOrderId first
		if (currentOrderId) {
			setOrderRef(currentOrderId);
			console.log("Using currentOrderId:", currentOrderId);
		} else if (orders.length > 0) {
			// Check if there's a recent order (last one added)
			const latestOrder = orders[0];
			setOrderRef(latestOrder.reference);
			console.log("Using latest order:", latestOrder.reference);
		} else {
			// Check localStorage as backup
			const successFlag = localStorage.getItem('checkout_success');
			console.log("No order found, checking localStorage:", successFlag);
			if (successFlag) {
				setOrderRef("Order confirmed");
				// Clear the flag after reading
				localStorage.removeItem('checkout_success');
			} else {
				setOrderRef(null);
			}
		}
	}, [currentOrderId, orders]);

	const displayRef = orderRef || "Order confirmed";

	return (
		<div className="page-enter h-dvh flex flex-col overflow-hidden">
			{/* Success Animation */}
			<div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
				<div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
					<CheckCircle size={48} className="text-green-500" />
				</div>

				<h1 className="text-2xl font-black text-slate-900 mb-2 text-center">
					Order Placed Successfully!
				</h1>

				<p className="text-slate-500 text-sm mb-8 text-center">
					Thank you for your order. We've received it and it's now being processed.
				</p>

				{/* Order Details Card */}
				<div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-card border border-slate-100 mb-6">
					<div className="flex justify-between items-center mb-4">
						<span className="text-sm text-slate-500">Order Reference</span>
						<span className="text-base font-bold text-primary-600">
							#{displayRef}
						</span>
					</div>

					<div className="border-t border-slate-100 pt-4 mt-4">
						<div className="flex items-start gap-3">
							<Mail size={18} className="text-primary-500 flex-shrink-0 mt-0.5" />
							<div className="text-left">
								<p className="text-sm font-semibold text-slate-800 mb-1">
									Confirmation email sent
								</p>
								<p className="text-xs text-slate-500">
									We've sent an order confirmation to your email address with all the details.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="w-full max-w-sm space-y-3">
					<button
						onClick={() => setPage("tracking")}
						className="w-full py-4 rounded-2xl font-bold text-base bg-primary-500 text-white shadow-lg shadow-primary-200 active:scale-[0.98] transition-transform"
					>
						Track Order
					</button>

					<button
						onClick={() => setPage("home")}
						className="w-full py-4 rounded-2xl font-bold text-base bg-white text-slate-700 border-2 border-slate-200 active:bg-slate-50 transition-colors flex items-center justify-center gap-2"
					>
						<Home size={18} />
						Back to Home
					</button>
				</div>
			</div>
		</div>
	);
}
