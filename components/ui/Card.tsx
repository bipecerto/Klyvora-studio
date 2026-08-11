'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  glow?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  glow = false,
  hoverEffect = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        rounded-2xl border border-[#27272F] transition-all duration-200 overflow-hidden
        ${elevated ? 'bg-[#18181F]' : 'bg-[#111116]'}
        ${glow ? 'klyvora-glow-sm border-[#7C3AED]/40' : ''}
        ${hoverEffect ? 'hover:border-[#373743] hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/40' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 pb-3 border-b border-[#27272F]/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-lg font-semibold text-[#F7F7F8] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-sm text-[#A1A1AA] mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 pt-3 border-t border-[#27272F]/60 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);
