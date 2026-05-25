import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label 
            htmlFor={id} 
            className="text-xs font-bold text-slate-500 uppercase tracking-widest"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`glow-input w-full text-sm ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
