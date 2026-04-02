import { useState } from 'react';
import { LogOut, Mail, ReceiptText, UserRound } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ProfilePage() {
  const {
    tradlyUser,
    setPage,
    logout,
    loginOrRegisterUser,
    verifySession,
    verifyAndCompleteUser,
    setVerifySession,
  } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const firstName = name.trim().split(' ')[0];
      const lastName = name.trim().split(' ').slice(1).join(' ') || '.';
      const emailLower = email.trim().toLowerCase();
      const password = btoa(emailLower + '_lynxo_2024');
      const legacyPassword = btoa(email.trim() + '_lynxo_2024');
      const result = await loginOrRegisterUser(
        email,
        password,
        firstName,
        lastName,
        legacyPassword,
      );
      if (result === 'logged_in') {
        setSuccess('Logged in successfully.');
      } else {
        setSuccess('OTP sent. Please verify below.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not login.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = parseInt(otpCode, 10);
    if (!otpCode || otpCode.length < 6 || Number.isNaN(code)) {
      setError('Enter a valid 6-digit OTP.');
      return;
    }
    if (verifySession?.pendingOrderData) {
      setError('This OTP session belongs to checkout. Please verify from checkout page.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await verifyAndCompleteUser(code);
      setSuccess('Email verified and login complete.');
      setOtpCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter h-dvh flex flex-col overflow-hidden">
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100 safe-top flex-shrink-0">
        <h1 className="text-xl font-black text-slate-900">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4 pb-28">
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
              <UserRound size={20} className="text-slate-500" />
            </div>
            {tradlyUser ? (
              <div>
                <p className="text-sm font-bold text-slate-900">{tradlyUser.firstName}</p>
                <p className="text-sm text-slate-600">{tradlyUser.email}</p>
                <p className="text-xs text-slate-400 mt-1">User ID: {tradlyUser.userId}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900">Not logged in</p>
                <p className="text-sm text-slate-600">Login with OTP directly from profile.</p>
              </div>
            )}
          </div>
        </div>

        {!tradlyUser && (
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Login / Register</h3>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary-300"
            />
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full py-3 rounded-2xl font-bold text-sm ${
                loading ? 'bg-primary-300 text-white' : 'bg-primary-500 text-white'
              }`}
            >
              {loading ? 'Please wait…' : 'Send OTP / Login'}
            </button>

            {verifySession && (
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">OTP sent to {verifySession.email}</p>
                <input
                  type="number"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.slice(0, 6)); setError(''); }}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary-300"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className={`w-full py-3 rounded-2xl font-bold text-sm ${
                    loading ? 'bg-primary-300 text-white' : 'bg-primary-500 text-white'
                  }`}
                >
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </button>
                <button
                  onClick={() => setVerifySession(null)}
                  className="w-full py-2 text-xs text-slate-500"
                >
                  Cancel OTP Session
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && <p className="text-xs text-green-600">{success}</p>}
          </div>
        )}

        <button
          onClick={() => setPage('order_history')}
          className="w-full bg-white rounded-2xl p-4 shadow-card border border-slate-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <ReceiptText size={18} className="text-primary-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">Order History</p>
              <p className="text-xs text-slate-500">View your Tradly orders</p>
            </div>
          </div>
          <span className="text-slate-400 text-xl">›</span>
        </button>

        {tradlyUser && (
          <button
            onClick={logout}
            className="w-full bg-white rounded-2xl p-4 shadow-card border border-slate-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <LogOut size={18} className="text-red-500" />
              </div>
              <p className="text-sm font-semibold text-slate-900">Logout</p>
            </div>
            <span className="text-slate-400 text-xl">›</span>
          </button>
        )}
      </div>
    </div>
  );
}
