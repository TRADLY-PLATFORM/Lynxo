import { useState } from 'react';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';

const DELIVERY_SLOTS = [
  { id: 's1', label: 'ASAP',          sublabel: '30–45 mins',       icon: '⚡' },
  { id: 's2', label: 'Morning',       sublabel: '9:00 – 11:00 AM',  icon: '🌅' },
  { id: 's3', label: 'Afternoon',     sublabel: '12:00 – 2:00 PM',  icon: '☀️' },
  { id: 's4', label: 'Evening',       sublabel: '5:00 – 7:00 PM',   icon: '🌆' },
  { id: 's5', label: 'Night',         sublabel: '8:00 – 10:00 PM',  icon: '🌙' },
  { id: 's6', label: 'Schedule',      sublabel: 'Pick a date',       icon: '📅' },
];

const PAYMENT_METHODS = [
  { id: 'upi',  label: 'UPI',          icon: '📱' },
  { id: 'card', label: 'Card',         icon: '💳' },
  { id: 'cash', label: 'Cash on Delivery', icon: '💵' },
];

export function CheckoutPage() {
  const { cart, cartTotal, placeOrder, setPage, currentOrderId } = useStore();
  const [address, setAddress]   = useState('');
  const [slot, setSlot]         = useState('s1');
  const [payment, setPayment]   = useState('upi');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const total = cartTotal();
  const deliveryFee = total >= 500 ? 0 : 30;
  const grandTotal = total + deliveryFee;
  const selectedSlot = DELIVERY_SLOTS.find((s) => s.id === slot)!;

  if (cart.length === 0 && !currentOrderId) {
    return (
      <div className="page-enter flex flex-col items-center justify-center h-dvh pb-24 px-8 text-center">
        <span className="text-5xl mb-4">🛒</span>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Nothing to checkout</h2>
        <p className="text-slate-500 text-sm mb-6">Add items to your cart first.</p>
        <button
          onClick={() => setPage('home')}
          className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-semibold"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const handlePlaceOrder = () => {
    if (!address.trim()) {
      setError('Please enter a delivery address');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      placeOrder(address, selectedSlot.label);
      setLoading(false);
      setPage('tracking');
    }, 1200);
  };

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
        <h1 className="text-xl font-black text-slate-900">Checkout</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4 space-y-5">

          {/* Delivery Address */}
          <Section icon={<MapPin size={18} className="text-primary-500" />} title="Delivery Address">
            <textarea
              rows={3}
              placeholder="Enter your full delivery address…"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError(''); }}
              className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none resize-none focus:ring-2 ${
                error ? 'ring-2 ring-red-300' : 'focus:ring-primary-300'
              }`}
            />
            {error && <p className="text-red-500 text-xs mt-1 pl-1">{error}</p>}
            <button className="flex items-center gap-2 text-primary-600 text-sm font-medium mt-2">
              <MapPin size={14} />
              Use current location
            </button>
          </Section>

          {/* Time Slot */}
          <Section icon={<Clock size={18} className="text-primary-500" />} title="Delivery Time">
            <div className="grid grid-cols-3 gap-2">
              {DELIVERY_SLOTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSlot(s.id)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all ${
                    slot === s.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-xs font-bold leading-tight text-center ${
                    slot === s.id ? 'text-primary-700' : 'text-slate-700'
                  }`}>
                    {s.label}
                  </span>
                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                    {s.sublabel}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Order summary */}
          <Section icon={<span className="text-lg">🧾</span>} title="Order Summary">
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={`${item.product.id}-${item.variant.id}`}
                  className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex-1 truncate">
                    {item.product.emoji} {item.product.name} · {item.variant.label}
                  </span>
                  <span className="text-slate-800 font-medium ml-2 flex-shrink-0">
                    ₹{item.variant.price} × {item.quantity}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span><span>₹{total}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                    {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total</span><span>₹{grandTotal}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Payment */}
          <Section icon={<span className="text-lg">💳</span>} title="Payment Method">
            <div className="space-y-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setPayment(pm.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                    payment === pm.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    payment === pm.id ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                  }`}>
                    {payment === pm.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-lg">{pm.icon}</span>
                  <span className={`font-medium text-sm ${
                    payment === pm.id ? 'text-primary-700' : 'text-slate-700'
                  }`}>
                    {pm.label}
                  </span>
                  {payment === pm.id && (
                    <ChevronRight size={16} className="ml-auto text-primary-400" />
                  )}
                </button>
              ))}
            </div>
          </Section>

        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-4 bg-white border-t border-slate-100 flex-shrink-0" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            loading
              ? 'bg-primary-300 text-white'
              : 'bg-primary-500 text-white shadow-lg shadow-primary-200 active:scale-[0.98]'
          }`}
        >
          {loading
            ? '⏳ Placing your order…'
            : `Place Order · ₹${grandTotal}`}
        </button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}
