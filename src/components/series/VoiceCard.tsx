import React from 'react';
import { Play, Pause, Loader2, Check, Volume2 } from 'lucide-react';

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Neutral';
  styleTag: string;
  description: string;
}

interface VoiceCardProps {
  voice: VoicePreset;
  isSelected: boolean;
  onSelect: (voiceId: string) => void;
  isPreviewLoading: boolean;
  isPlaying: boolean;
  onPreviewToggle: (e: React.MouseEvent) => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  onSelect,
  isPreviewLoading,
  isPlaying,
  onPreviewToggle,
}) => {
  return (
    <div
      onClick={() => onSelect(voice.id)}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none flex flex-col justify-between space-y-3 ${
        isSelected
          ? 'bg-[#7C3AED]/15 border-[#7C3AED] shadow-lg shadow-[#7C3AED]/10 ring-1 ring-[#7C3AED]/50'
          : 'bg-[#18181F] border-[#27272F] hover:border-[#3F3F4E] hover:bg-[#1E1E26]'
      }`}
    >
      {/* Top row: Voice Info & Preview Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
              isSelected
                ? 'bg-[#7C3AED] text-white shadow-md'
                : 'bg-[#27272F] text-[#A1A1AA]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#F7F7F8] tracking-tight">{voice.name}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#27272F] text-[#A1A1AA] font-medium">
                {voice.styleTag}
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">{voice.gender}</p>
          </div>
        </div>

        {/* Selected badge or checkmark */}
        {isSelected && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#A78BFA] bg-[#7C3AED]/20 border border-[#7C3AED]/30 px-2 py-0.5 rounded-md">
            <Check className="w-3 h-3" /> Selected
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-2">
        {voice.description}
      </p>

      {/* Bottom row: Preview Button */}
      <div className="pt-2 border-t border-[#27272F]/60 flex items-center justify-between">
        <button
          type="button"
          onClick={onPreviewToggle}
          disabled={isPreviewLoading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isPlaying
              ? 'bg-[#7C3AED] text-white animate-pulse'
              : 'bg-[#27272F] hover:bg-[#32323D] text-[#F7F7F8]'
          }`}
        >
          {isPreviewLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A78BFA]" />
              <span className="text-[11px]">Gerando preview...</span>
            </>
          ) : isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span className="text-[11px]">Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-[#A78BFA]" />
              <span className="text-[11px]">Ouvir Preview</span>
            </>
          )}
        </button>

        {isPlaying && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#A78BFA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-ping" /> Reproduzindo
          </span>
        )}
      </div>
    </div>
  );
};
