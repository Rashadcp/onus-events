"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthGuard } from '../../components/auth/AuthGuard';

export default function EventsRedirectPage() {
  const router = useRouter();
  const { user, initializeSession, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        router.replace('/admin?tab=simple-events');
      } else {
        router.replace('/representative?tab=simple-events');
      }
    }
  }, [isAuthenticated, user, router]);

  return (
    <AuthGuard>
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Redirecting to Simple Events...</p>
        </div>
      </div>
    </AuthGuard>
  );
}
