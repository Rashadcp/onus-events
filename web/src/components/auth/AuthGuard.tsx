"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'SALES_REPRESENTATIVE' | 'REPRESENTATIVE' | 'LOADING_STAFF' | 'SITE_INCHARGE' | 'CAPTAIN' | 'STORE_KEEPER')[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, isInitializing, initializeSession } = useAuthStore();
  const router = useRouter();

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Handle redirects on auth state changes
  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated || !user) {
        router.push('/');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Forbidden - redirect based on their role
        if (user.role === 'ADMIN') {
          router.push('/admin');
        } else if (user.role === 'SALES_REPRESENTATIVE' || user.role === 'REPRESENTATIVE') {
          router.push('/representative');
        } else {
          router.push('/');
        }
      }
    }
  }, [isInitializing, isAuthenticated, user, allowedRoles, router]);

  // Premium, beautiful glassmorphism loading animation for visual excellence!
  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden">
        {/* Decorative pastel glowing backdrops */}
        <div className="absolute top-[30%] left-[30%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[30%] right-[30%] w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-[80px]" />
        
        {/* Loading panel */}
        <div className="z-10 flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-lg max-w-[320px] text-center">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Double ring modern spinner */}
            <div className="absolute inset-0 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <div className="absolute w-8 h-8 border-4 border-slate-100 border-b-teal-500 rounded-full animate-spin-reverse" />
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Initializing Session</h3>
            <p className="text-xs text-slate-500">Checking credentials & workspace auth...</p>
          </div>
        </div>

        {/* CSS for custom spinning reverse direction inside the document */}
        <style jsx global>{`
          @keyframes spin-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          .animate-spin-reverse {
            animation: spin-reverse 1s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // Not authorized state
  if (!isAuthenticated || !user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
