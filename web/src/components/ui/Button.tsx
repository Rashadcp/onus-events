import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  loading = false, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'btn-glow';
      case 'secondary':
        return 'px-4 py-2.5 rounded-lg bg-slate-900 border border-[#E2E8F0] text-white hover:bg-slate-800 transition duration-200 shadow-sm';
      case 'danger':
        return 'px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition duration-200 shadow-sm';
      case 'ghost':
        return 'px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-slate-700 transition duration-200';
      default:
        return 'btn-glow';
    }
  };

  return (
    <button
      className={`${getVariantClasses()} flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
