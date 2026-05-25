import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, title, description, onClose, children }: ModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Clickable dim backdrop overlay that triggers close */}
      <div 
        className="absolute inset-0 cursor-default" 
        onClick={onClose} 
        aria-hidden="true"
      />

      {/* Modal Dialog Card Container */}
      <div 
        className="relative bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-md md:max-w-lg flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start shrink-0 gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[#0F172A] leading-6 truncate">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 mt-1 leading-4">{description}</p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer transition shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Body Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1 text-sm text-[#1E293B] custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
