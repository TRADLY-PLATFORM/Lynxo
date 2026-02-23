import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';

export function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartTotal, setPage } = useStore();

  if (cart.length === 0) {
    return (
      <div className="page-enter flex flex-col items-center justify-center h-dvh pb-24 px-8 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5">
          <ShoppingBag size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Cart is empty</h2>
        <p className="text-slate-500 text-sm mb-8">Add products from the home page to get started.</p>
        <button
          onClick={() => setPage('home')}
          className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-primary-200"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const total = cartTotal();
  const deliveryFee = total >= 500 ? 0 : 30;
  const grandTotal = total + deliveryFee;

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top">
        <h1 className="text-xl font-black text-slate-900">
          Your Cart <span className="text-slate-400 text-base font-medium">({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
        </h1>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-3">
        {cart.map((item) => (
          <div key={`${item.product.id}-${item.variant.id}`}
            className="bg-white rounded-2xl p-3 flex gap-3 shadow-card border border-slate-100">
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 leading-tight">
                {item.product.emoji} {item.product.name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{item.variant.label}</p>
              <p className="text-primary-600 font-bold text-sm mt-1">
                ₹{item.variant.price} <span className="text-slate-400 font-normal text-xs">per {item.variant.unit}</span>
              </p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button
                onClick={() => removeFromCart(item.product.id, item.variant.id)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-1 py-1">
                <button
                  onClick={() => updateQuantity(item.product.id, item.variant.id, item.quantity - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm text-slate-700 active:bg-slate-50"
                >
                  <Minus size={12} />
                </button>
                <span className="text-sm font-bold text-slate-800 w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.product.id, item.variant.id, item.quantity + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-xl bg-primary-500 text-white shadow-sm active:bg-primary-600"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Delivery info */}
        {deliveryFee === 0 ? (
          <div className="bg-green-50 text-green-700 text-xs font-medium text-center py-2 rounded-xl">
            🎉 Free delivery on this order!
          </div>
        ) : (
          <div className="bg-amber-50 text-amber-700 text-xs font-medium text-center py-2 rounded-xl">
            Add ₹{500 - total} more for FREE delivery
          </div>
        )}
      </div>

      {/* Summary + CTA */}
      <div className="px-4 pt-3 pb-24 bg-white border-t border-slate-100" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Delivery</span>
            <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
              {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>₹{grandTotal}</span>
          </div>
        </div>

        <button
          onClick={() => setPage('checkout')}
          className="w-full bg-primary-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary-200 active:scale-[0.98] transition-transform"
        >
          Proceed to Checkout · ₹{grandTotal}
        </button>
      </div>
    </div>
  );
}
