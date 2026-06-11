'use client';
import { useState } from 'react';
import { registerUser, loginUser } from '../actions';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let res: { success: boolean; userId?: string; message?: string };

    if (mode === 'login') {
      res = await loginUser(username);
    } else {
      res = await registerUser(username);
    }

    if (res.success && res.userId) {
      localStorage.setItem('userId', res.userId);
      router.push('/');
    } else {
      setError(res.message ?? 'Terjadi kesalahan.');
      setIsLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setUsername('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      {/* Animated bg blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">🟢</div>
          <h1 className="text-4xl font-bold font-mono tracking-tight">Slime Gacha</h1>
          <p className="text-slate-500 text-sm mt-2">Kumpulkan souls · Pull karakter langka</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700 space-y-4"
        >
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              placeholder={mode === 'login' ? 'Masukkan username kamu...' : 'Pilih username baru...'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
              className="w-full p-3 bg-slate-800 rounded-lg text-white border border-slate-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-all font-mono text-sm"
            />
            {mode === 'register' && (
              <p className="text-xs text-slate-600 mt-1.5">
                3–20 karakter · huruf, angka, underscore
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || username.trim().length < (mode === 'register' ? 3 : 1)}
            className={`w-full py-3 rounded-lg font-bold transition-all text-sm ${
              isLoading || username.trim().length < (mode === 'register' ? 3 : 1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : mode === 'login'
                  ? 'bg-green-700 hover:bg-green-600 text-white active:scale-95 shadow-lg shadow-green-900/40'
                  : 'bg-blue-700 hover:bg-blue-600 text-white active:scale-95 shadow-lg shadow-blue-900/40'
            }`}
          >
            {isLoading
              ? 'Memproses...'
              : mode === 'login'
                ? '▶ MASUK & MAIN'
                : '✦ DAFTAR & DAPAT 150 SOULS'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-4">
          {mode === 'login'
            ? 'Belum punya akun? Klik "Daftar Baru" di atas.'
            : 'Sudah punya akun? Klik "Masuk" di atas.'}
        </p>
      </div>
    </div>
  );
}
