'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#A1A1AA] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              w-full bg-[#0D0D12] text-[#F7F7F8] placeholder-[#A1A1AA]/50 text-sm rounded-xl border border-[#27272F]
              py-2.5 px-3.5 transition-all duration-200
              focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#A1A1AA] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#A1A1AA]/80 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
