"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptsInfo, setAttemptsInfo] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);

  // Background neon glow particle position states for interactive parallax feel!
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAttemptsInfo(null);

    if (!username || !password) {
      setError('Please fill in all security fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      const data = response.data;

      // Success
      setSuccess('Authorization granted. Redirecting to workspace...');
      login(data.user, data.accessToken);

      // Redirect user based on their organizational role after a brief delay
      setTimeout(() => {
        const role = data.user.role;
        if (role === 'ADMIN') {
          window.location.href = '/admin';
        } else if (role === 'REPRESENTATIVE') {
          window.location.href = '/representative';
        } else if (role === 'LOADING_STAFF') {
          setError('Mobile app is recommended for Loading Staff. Accessing dashboard...');
          window.location.href = '/logistics';
        } else {
          window.location.href = '/schedule';
        }
      }, 1500);

    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Connection failure. Please verify backend API server status.';
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] overflow-hidden px-4">
      {/* Glow Particles (Soft Pastels for light background) */}
      <div 
        className="radial-glow bg-[#2563EB] w-[400px] h-[400px] top-[10%] left-[10%] opacity-[0.06]"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div 
        className="radial-glow bg-[#14B8A6] w-[450px] h-[450px] bottom-[10%] right-[10%] opacity-[0.06]"
        style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)` }}
      />

      {/* Main Login Interface */}
      <div className="w-full max-w-[420px] z-10">
        {/* Upper Heading Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[#2563EB] to-[#14B8A6] bg-clip-text text-transparent">
            ONUS EVENT
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Secure Enterprise Management Ecosystem
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8">
          <h2 className="text-xl font-bold text-[#0F172A] mb-6 text-center">
            Sign In to Console
          </h2>

          {/* Secure Error Notification Banners */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <span className="font-bold text-sm leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Secure Success Notification Banners */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
              <span className="font-bold text-sm leading-none">✅</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Username/Email Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="username-field" className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                Username or Email
              </label>
              <input
                id="username-field"
                type="text"
                autoComplete="username"
                className="glow-input w-full"
                placeholder="Enter username/email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password-field" className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                Password
              </label>
              <input
                id="password-field"
                type="password"
                autoComplete="current-password"
                className="glow-input w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Login Action Button */}
            <button
              type="submit"
              className="btn-glow w-full mt-4 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Access Console</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Audit Statement */}
        <p className="text-center text-slate-400 text-[10px] uppercase tracking-wider mt-8">
          Authorized personnel access only • All sessions audited
        </p>
      </div>
    </main>
  );
}
