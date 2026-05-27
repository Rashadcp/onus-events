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
    <main className="min-h-screen w-full bg-slate-50 p-4 font-sans text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[1fr_440px]">
          <section className="hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-slate-200">
                <ShieldCheck className="h-4 w-4 text-blue-300" />
                Secured ERP Access
              </div>
              <h1 className="max-w-md text-4xl font-bold leading-tight">
                ONUS Event Rental Management
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
                One simple login for admin, sales representatives, logistics, inventory, and event operations.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <CalendarDays className="h-5 w-5 text-blue-300" />
                <div>
                  <p className="text-sm font-semibold">Event Scheduling</p>
                  <p className="text-xs text-slate-400">Create, confirm, and monitor bookings.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <PackageCheck className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold">Stock Availability</p>
                  <p className="text-xs text-slate-400">Check free stock before quotation.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <LockKeyhole className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold">Role Based Access</p>
                  <p className="text-xs text-slate-400">Users open only their allowed window.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                  O
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">ONUS EVENT</h1>
                  <p className="text-sm text-slate-500">Rental ERP System</p>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Sign in to your workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Use your ID and password to continue.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="user-id" className="text-sm font-medium text-slate-700">
                  User ID
                </label>
                <input
                  id="user-id"
                  type="text"
                  value={representativeId}
                  onChange={(e) => setRepresentativeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Email, phone, or representative ID"
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 pr-10 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Single login for all users</p>
              <p className="mt-1 text-xs leading-5">
                Admin, sales representative, loading staff, captain, site incharge, and store keeper accounts use this same page.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
