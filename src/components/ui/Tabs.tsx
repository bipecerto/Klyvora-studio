import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-[#27272F] overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap
              ${
                isActive
                  ? 'border-[#7C3AED] text-[#F7F7F8] bg-[#18181F]/40'
                  : 'border-transparent text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#111116]'
              }
            `}
          >
            {tab.icon && <span className={isActive ? 'text-[#A78BFA]' : 'text-[#A1A1AA]'}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                  isActive ? 'bg-[#7C3AED] text-white' : 'bg-[#27272F] text-[#A1A1AA]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
