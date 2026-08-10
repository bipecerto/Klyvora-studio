import React from 'react';

interface KlyvoraLogoProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const KlyvoraLogo: React.FC<KlyvoraLogoProps> = ({
  size = 'sm',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Icon: Small dark purple square with subtle play & spark */}
      <div className="w-[28px] h-[28px] rounded-lg bg-gradient-to-br from-[#5B3FD6] to-[#8B5CF6] p-[1px] shadow-sm flex items-center justify-center">
        <div className="w-full h-full bg-[#0A0A0B] rounded-[7px] flex items-center justify-center relative">
          <svg
            className="w-3.5 h-3.5 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="7,3 20,12 7,21" />
          </svg>
          <div className="absolute top-[4px] right-[4px] w-1 h-1 rounded-full bg-[#8B5CF6]" />
        </div>
      </div>

      <span className="font-bold text-[18px] tracking-tight text-white font-sans">
        Klyvora
      </span>
    </div>
  );
};
