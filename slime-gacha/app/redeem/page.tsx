'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { redeemVoucher } from '@/app/actions';
import { PREMIUM_PACKAGES, PREMIUM_BENEFITS } from '@/game/shop';

export default function RedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (!userId) { router.push('/register'); return; }
    if (!code.trim()) return;
    setLoading(true); setResult(null);
    const res = await redeemVoucher(userId, code.trim());
    setResult({ success: res.success, message: res.message ?? (res.success ? 'Berhasil!' : 'Gagal.') });
    setLoading(false);
    if (res.success) setCode('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 text-slate-500 hover:text-white text-sm transition-colors flex items-center gap-1"
      >
        ← Kembali
      </button>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🎫</div>
          <h1 className="text-3xl font-black text-white">Redeem Voucher</h1>
          <p className="text-slate-500 text-sm mt-1">Masukkan kode voucher untuk mendapatkan souls atau premium</p>
        </div>

        {/* Redeem form */}
        <form onSubmit={handleRedeem} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide font-semibold block mb-2">Kode Voucher</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: SOULS_100"
              maxLength={32}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono tracking-widest text-center focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-600"
            />
          </div>

          {result && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
              result.success
                ? 'bg-green-900/40 border border-green-700/50 text-green-300'
                : 'bg-red-900/40 border border-red-700/50 text-red-300'
            }`}>
              {result.success ? '✅ ' : '❌ '}{result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className={`w-full py-3 rounded-xl font-black text-lg transition-all ${
              loading || !code.trim()
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 active:scale-95 cursor-pointer'
            }`}
          >
            {loading ? '⏳ Memproses...' : '🎁 Redeem Sekarang'}
          </button>
        </form>

        {/* Premium packages */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-yellow-800/30 space-y-4"
          style={{ boxShadow: '0 0 40px rgba(234,179,8,0.08)' }}>
          <div className="text-center">
            <div className="text-2xl mb-1">💎</div>
            <h2 className="text-lg font-black text-yellow-400">Paket Premium</h2>
            <p className="text-slate-500 text-xs mt-0.5">Dapatkan voucher dari seller resmi</p>
          </div>

          {/* Benefits */}
          <div className="bg-yellow-900/10 border border-yellow-800/20 rounded-xl p-4 space-y-2">
            {PREMIUM_BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{b.icon}</span>
                <span className="text-slate-300">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Package list */}
          <div className="space-y-2">
            {PREMIUM_PACKAGES.map((pkg) => (
              <div key={pkg.code} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div>
                  <div className="text-sm font-bold text-white">{pkg.label}</div>
                  <div className="text-xs text-slate-500">
                    +{pkg.souls} souls
                    {pkg.premiumDays > 0 && <span className="text-yellow-400 ml-1">· {pkg.premiumDays} hari premium</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-green-400">{pkg.price}</div>
                  <div className="text-xs text-slate-600 font-mono">{pkg.code}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 text-center">
            Hubungi admin untuk pembelian voucher
          </p>
        </div>
      </div>
    </div>
  );
}
