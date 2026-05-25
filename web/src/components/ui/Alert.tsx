import React from 'react';

interface AlertProps {
  message: string;
  type?: 'success' | 'warning' | 'error';
  onClose?: () => void;
}

export function Alert({ message, type = 'success', onClose }: AlertProps) {
  const getAlertClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '✅';
    }
  };

  return (
    <div className={`mb-6 p-4 rounded-lg border text-xs flex items-center justify-between gap-2 ${getAlertClasses()}`}>
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm leading-none">{getIcon()}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          className="text-xs font-semibold hover:underline cursor-pointer opacity-70 hover:opacity-100"
        >
          Close
        </button>
      )}
    </div>
  );
}
