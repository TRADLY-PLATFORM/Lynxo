import { useEffect, useState } from 'react';
import { MapPin, Clock, ChevronRight, User, Mail } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getAddresses, isTradlyConfigured, TradlyApiError } from '../lib/tradlyApi';
import { formatMoney } from '../lib/currency';

const DELIVERY_SLOTS = [
  { id: 's1', label: 'ASAP',      sublabel: '30–45 mins',      icon: '⚡' },
  { id: 's2', label: 'Morning',   sublabel: '9:00 – 11:00 AM', icon: '🌅' },
  { id: 's3', label: 'Afternoon', sublabel: '12:00 – 2:00 PM', icon: '☀️' },
  { id: 's4', label: 'Evening',   sublabel: '5:00 – 7:00 PM',  icon: '🌆' },
  { id: 's5', label: 'Night',     sublabel: '8:00 – 10:00 PM', icon: '🌙' },
  { id: 's6', label: 'Schedule',  sublabel: 'Pick a date',     icon: '📅' },
];

export function CheckoutPage() {
  const {
    cart,
    cartTotal,
    placeOrderAsync,
    setPage,
    tradlyUser,
    verifySession,
    loginOrRegisterUser,
    verifyAndCompleteUser,
    setVerifySession,
    setTradlyUser,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    fetchPaymentMethods,
  } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [slot, setSlot] = useState('s1');
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [prefilledAddress, setPrefilledAddress] = useState(false);

  const total = cartTotal();
  const deliveryFee = total >= 500 ? 0 : 30;
  const grandTotal = total + deliveryFee;
  const selectedSlot = DELIVERY_SLOTS.find((s) => s.id === slot)!;
  const tradlyEnabled = isTradlyConfigured();

  useEffect(() => {
    if (tradlyEnabled) {
      fetchPaymentMethods();
    }
  }, [tradlyEnabled, fetchPaymentMethods]);

  useEffect(() => {
    if (paymentMethodId !== null) return;
    const defaultMethod =
      paymentMethods.find((method) => method.default && method.active)
      ?? paymentMethods.find((method) => method.active);
    if (defaultMethod) {
      setPaymentMethodId(defaultMethod.id);
    }
  }, [paymentMethods, paymentMethodId]);

  useEffect(() => {
    if (!tradlyUser) return;
    if (!name.trim() && tradlyUser.firstName) {
      setName(tradlyUser.firstName);
    }
    if (!email.trim() && tradlyUser.email) {
      setEmail(tradlyUser.email);
    }
  }, [tradlyUser, name, email]);

  useEffect(() => {
    if (!tradlyUser || prefilledAddress || address.trim()) return;
    let cancelled = false;
    const authKey = tradlyUser.authKey;

    async function prefillAddress() {
      try {
        const addresses = await getAddresses(authKey, 'shipping_address');
        if (cancelled || addresses.length === 0) return;
        const latest = addresses[0];
        const formatted = [
          latest.address_line_1,
          latest.address_line_2,
          latest.state,
          latest.post_code ? String(latest.post_code) : '',
          latest.country,
        ].filter(Boolean).join(', ');

        const fallback = latest.formatted_address ?? '';
        const value = formatted || fallback;
        if (value) {
          setAddress(value);
        }
      } finally {
        if (!cancelled) setPrefilledAddress(true);
      }
    }

    void prefillAddress();
    return () => { cancelled = true; };
  }, [tradlyUser, prefilledAddress, address]);

  if (cart.length === 0) {
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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device/browser.');
      return;
    }

    setGeoLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const locationLabel = `Lat ${lat}, Lng ${lng}`;

        setCoordinates({ latitude: lat, longitude: lng });
        setAddress(locationLabel);
        setGeoLoading(false);
      },
      (geoError) => {
        setGeoLoading(false);
        setError(geoError.message || 'Unable to get current location.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };

  const handleVerifyOtp = async () => {
    const code = parseInt(otpCode, 10);
    if (!otpCode || otpCode.length < 6 || Number.isNaN(code)) {
      setOtpError('Enter a valid 6-digit code');
      return;
    }

    const pending = verifySession?.pendingOrderData;
    if (!pending) {
      setOtpError('Missing pending checkout data. Please try again.');
      return;
    }

    setOtpError('');
    setLoading(true);
    try {
      await verifyAndCompleteUser(code);
      await placeOrderAsync(pending);
      setPage('tracking');
    } catch (err) {
      if (err instanceof TradlyApiError && err.status === 412) {
        setOtpError('Invalid or expired OTP. Request a fresh OTP and try again.');
      } else {
        setOtpError(err instanceof Error ? err.message : 'Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return; }
    if (!address.trim()) { setError('Please enter a delivery address'); return; }
    if (paymentMethodId === null) { setError('Please select a payment method'); return; }

    setError('');
    setLoading(true);

    const checkoutPayload = {
      address,
      slot: selectedSlot.label,
      name,
      email,
      paymentMethodId,
      coordinates,
    };

    try {
      const emailLower = email.trim().toLowerCase();
      const sessionEmailLower = tradlyUser?.email?.trim().toLowerCase();
      const needsFreshAuth = tradlyEnabled && (!tradlyUser || sessionEmailLower !== emailLower);

      if (needsFreshAuth) {
        // Ensure we don't accidentally place an order with a stale persisted user session.
        if (tradlyUser && sessionEmailLower !== emailLower) {
          setTradlyUser(null);
        }

        const firstName = name.split(' ')[0];
        const lastName = name.split(' ').slice(1).join(' ') || '.';
        const password = btoa(emailLower + '_lynxo_2024');
        const legacyPassword = btoa(email.trim() + '_lynxo_2024');

        const result = await loginOrRegisterUser(
          email,
          password,
          firstName,
          lastName,
          legacyPassword,
        );

        if (result === 'needs_verify') {
          setVerifySession({
            ...(useStore.getState().verifySession!),
            pendingOrderData: checkoutPayload,
          });
          setLoading(false);
          return;
        }
      }

      await placeOrderAsync(checkoutPayload);
      setPage('tracking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order.');
    } finally {
      setLoading(false);
    }
  };

  if (verifySession) {
    return (
      <div className="page-enter h-dvh flex flex-col overflow-hidden">
        <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
          <h1 className="text-xl font-black text-slate-900">Verify Email</h1>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 flex flex-col items-center">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-card border border-slate-100">
            <div className="text-center mb-6">
              <span className="text-5xl">📬</span>
              <h2 className="text-lg font-bold text-slate-800 mt-3">Check your inbox</h2>
              <p className="text-slate-500 text-sm mt-1">
                We sent a 6-digit code to
                <br />
                <span className="font-semibold text-slate-700">{verifySession.email}</span>
              </p>
            </div>

            <input
              type="number"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.slice(0, 6)); setOtpError(''); }}
              className={`w-full text-center text-2xl font-bold tracking-widest px-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 mb-3 ${
                otpError ? 'ring-2 ring-red-300' : 'focus:ring-primary-300'
              }`}
              maxLength={6}
            />

            {otpError && <p className="text-red-500 text-xs text-center mb-3">{otpError}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                loading
                  ? 'bg-primary-300 text-white'
                  : 'bg-primary-500 text-white shadow-lg shadow-primary-200 active:scale-[0.98]'
              }`}
            >
              {loading ? '⏳ Verifying…' : 'Verify & Place Order'}
            </button>

            <button
              onClick={() => setVerifySession(null)}
              className="w-full text-center text-slate-400 text-sm mt-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
        <h1 className="text-xl font-black text-slate-900">Checkout</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 py-4 space-y-5">
          <Section icon={<User size={18} className="text-primary-500" />} title="Your Details">
            <div className="space-y-3">
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  className={`w-full pl-9 pr-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none focus:ring-2 ${
                    error && !name.trim() ? 'ring-2 ring-red-300' : 'focus:ring-primary-300'
                  }`}
                />
              </div>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`w-full pl-9 pr-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none focus:ring-2 ${
                    error && (!email.trim() || !email.includes('@')) ? 'ring-2 ring-red-300' : 'focus:ring-primary-300'
                  }`}
                />
              </div>
            </div>
          </Section>

          <Section icon={<MapPin size={18} className="text-primary-500" />} title="Delivery Address">
            <textarea
              rows={3}
              placeholder="Enter your full delivery address…"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError(''); }}
              className={`w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none resize-none focus:ring-2 ${
                error && !address.trim() ? 'ring-2 ring-red-300' : 'focus:ring-primary-300'
              }`}
            />
            <button
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-2 text-primary-600 text-sm font-medium mt-2"
            >
              <MapPin size={14} />
              {geoLoading ? 'Detecting location…' : 'Use current location'}
            </button>
          </Section>

          <Section icon={<Clock size={18} className="text-primary-500" />} title="Delivery Time">
            <div className="grid grid-cols-3 gap-2">
              {DELIVERY_SLOTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSlot(s.id)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all ${
                    slot === s.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-xs font-bold leading-tight text-center ${
                    slot === s.id ? 'text-primary-700' : 'text-slate-700'
                  }`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-slate-400 text-center leading-tight">{s.sublabel}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section icon={<span className="text-lg">🧾</span>} title="Order Summary">
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={`${item.product.id}-${item.variant.id}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex-1 truncate">
                    {item.product.emoji} {item.product.name} · {item.variant.label}
                  </span>
                  <span className="text-slate-800 font-medium ml-2 flex-shrink-0">
                    {formatMoney(item.variant.price)} × {item.quantity}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span><span>{formatMoney(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                    {deliveryFee === 0 ? 'Free' : formatMoney(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total</span><span>{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
          </Section>

          <Section icon={<span className="text-lg">💳</span>} title="Payment Method">
            {paymentMethodsLoading && (
              <p className="text-sm text-slate-500">Loading payment methods…</p>
            )}

            {!paymentMethodsLoading && paymentMethods.length === 0 && (
              <p className="text-sm text-red-500">
                {paymentMethodsError || 'No active payment method found for this tenant.'}
              </p>
            )}

            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => { setPaymentMethodId(pm.id); setError(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                    paymentMethodId === pm.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethodId === pm.id ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                  }`}
                  >
                    {paymentMethodId === pm.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-lg">💳</span>
                  <span className={`font-medium text-sm ${
                    paymentMethodId === pm.id ? 'text-primary-700' : 'text-slate-700'
                  }`}
                  >
                    {pm.name}
                  </span>
                  {paymentMethodId === pm.id && (
                    <ChevronRight size={16} className="ml-auto text-primary-400" />
                  )}
                </button>
              ))}
            </div>
          </Section>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>

      <div
        className="px-4 py-4 bg-white border-t border-slate-100 flex-shrink-0"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handlePlaceOrder}
          disabled={loading || paymentMethods.length === 0}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            loading
              ? 'bg-primary-300 text-white'
              : 'bg-primary-500 text-white shadow-lg shadow-primary-200 active:scale-[0.98]'
          }`}
        >
          {loading ? '⏳ Placing your order…' : `Place Order · ${formatMoney(grandTotal)}`}
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
