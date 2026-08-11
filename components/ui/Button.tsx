'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.98] select-none';

  const variants = {
    primary: 'bg-gradient-to-r from-[#5B21B6] via-[#7C3AED] to-[#8B5CF6] text-white hover:brightness-110 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-[#A78BFA]/20',
    secondary: 'bg-[#18181F] text-[#F7F7F8] hover:bg-[#27272F] border border-[#27272F]',
    outline: 'bg-transparent text-[#F7F7F8] border border-[#27272F] hover:bg-[#18181F] hover:border-[#373743]',
    ghost: 'bg-transparent text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#18181F]',
    danger: 'bg-red-900/40 text-red-200 border border-red-800/50 hover:bg-red-900/60',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
