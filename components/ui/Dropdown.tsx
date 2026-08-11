'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 w-48 rounded-xl bg-[#18181F] border border-[#27272F] shadow-2xl
            py-1.5 focus:outline-none animate-fadeIn
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left transition-colors
                ${
                  item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-[#F7F7F8] hover:bg-[#27272F]'
                }
              `}
            >
              {item.icon && <span className="text-current">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap">
        <div className="bg-[#18181F] text-[#F7F7F8] text-[11px] px-2.5 py-1 rounded-lg border border-[#27272F] shadow-lg">
          {content}
        </div>
      </div>
    </div>
  );
};
