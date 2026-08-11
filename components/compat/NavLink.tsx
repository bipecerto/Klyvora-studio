'use client';

// Shim que replica a API do <NavLink> do react-router-dom (render props com
// isActive) usando next/link + usePathname, para não precisar reescrever o
// JSX dos componentes que já usavam essa API.

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type RenderProp<T> = T | ((state: { isActive: boolean }) => T);

interface NavLinkProps {
  to: string;
  onClick?: () => void;
  className?: RenderProp<string>;
  children?: RenderProp<React.ReactNode>;
}

export function NavLink({ to, onClick, className, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === to || (to !== '/' && pathname?.startsWith(`${to}/`));

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive: !!isActive }) : className;
  const resolvedChildren =
    typeof children === 'function' ? children({ isActive: !!isActive }) : children;

  return (
    <Link href={to} onClick={onClick} className={resolvedClassName}>
      {resolvedChildren}
    </Link>
  );
}
