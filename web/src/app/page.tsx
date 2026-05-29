"use client";

import React, { useEffect, useState } from 'react';
import { CalendarDays, Eye, EyeOff, LockKeyhole, PackageCheck, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { loginApi } from '../services/api';

export default function LoginPage() {
  const [representativeId, setRepresentativeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, user, isAuthenticated, initializeSession } = useAuthStore();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        window.location.href = '/admin';
      } else if (user.role === 'SALES_REPRESENTATIVE' || user.role === 'REPRESENTATIVE') {
        window.location.href = '/representative';
      } else if (user.role === 'LOADING_STAFF') {
        window.location.href = '/logistics';
      } else {
        window.location.href = '/schedule';
      }
    }
  }, [isAuthenticated, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!representativeId || !password) {
      setError('Please enter User ID and password.');
      return;
    }

    setLoading(true);

    try {
      const data = await loginApi({ email: representativeId.trim(), password });
      login(data.user, data.accessToken);

      const role = data.user.role;
      if (role === 'ADMIN') {
        window.location.href = '/admin';
      } else if (role === 'SALES_REPRESENTATIVE' || role === 'REPRESENTATIVE') {
        window.location.href = '/representative';
      } else if (role === 'LOADING_STAFF') {
        window.location.href = '/logistics';
      } else {
        window.location.href = '/schedule';
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-50 p-4 font-sans text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.png" alt="Onus Events" className="h-16 w-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Sign in to your workspace</h2>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">Use your ID and password to continue.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-750 font-semibold leading-relaxed text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="user-id" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              User ID
            </label>
            <input
              id="user-id"
              type="text"
              value={representativeId}
              onChange={(e) => setRepresentativeId(e.target.value)}
              className="glow-input w-full text-sm font-semibold focus:border-blue-500"
              placeholder="Email, phone, or representative ID"
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glow-input w-full text-sm font-semibold pr-10 focus:border-blue-500"
                placeholder="Enter password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-blue-600 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

       
      </div>
    </main>
  );
}
