import { LogOut, ReceiptText, UserRound } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ProfilePage() {
  const { tradlyUser, setPage, logout } = useStore();

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
                <p className="text-sm text-slate-600">Login happens during checkout via OTP.</p>
              </div>
            )}
          </div>
        </div>

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
