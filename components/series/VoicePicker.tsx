'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VoiceCard, VoicePreset } from './VoiceCard';
import { previewVoice } from '../../services/narrationService';
import { Sparkles, Sliders, AlertCircle } from 'lucide-react';

export const GEMINI_VOICES: VoicePreset[] = [
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    styleTag: 'Informative',
    description: 'Voz masculina autoritativa e informativa, ideal para documentários e história.',
  },
  {
    id: 'Gacrux',
    name: 'Gacrux',
    gender: 'Male',
    styleTag: 'Mature',
    description: 'Voz madura e ponderada, excelente para histórias profundas e mistérios.',
  },
  {
    id: 'Algenib',
    name: 'Algenib',
    gender: 'Male',
    styleTag: 'Gravelly',
    description: 'Voz grave marcante, perfeita para carros, esportes e relatos intensos.',
  },
  {
    id: 'Rasalgethi',
    name: 'Rasalgethi',
    gender: 'Male',
    styleTag: 'Informative',
    description: 'Voz masculina clara e narrativa com alto engajamento em vídeos curtos.',
  },
  {
    id: 'Iapetus',
    name: 'Iapetus',
    gender: 'Male',
    styleTag: 'Clear',
    description: 'Locução nítida e direta, ideal para curiosidades e fatos surpreendentes.',
  },
  {
    id: 'Sulafat',
    name: 'Sulafat',
    gender: 'Female',
    styleTag: 'Warm',
    description: 'Voz feminina acolhedora e expressiva, ótima para storytelling e mistérios.',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    styleTag: 'Firm',
    description: 'Voz firme e moderna, ideal para tecnologia, notícias e ciência.',
  },
  {
    id: 'Achernar',
    name: 'Achernar',
    gender: 'Female',
    styleTag: 'Soft',
    description: 'Tom suave e sereno, recomendado para curiosidades e vídeos educativos.',
  },
];

export const VOICE_STYLES = [
  { id: 'Documentary', name: 'Documentary', desc: 'Narrativo e autoritativo' },
  { id: 'Natural', name: 'Natural', desc: 'Conversacional e fluido' },
  { id: 'Deep', name: 'Deep', desc: 'Grave e cadenciado' },
  { id: 'Calm', name: 'Calm', desc: 'Tranquilo e focado' },
  { id: 'Energetic', name: 'Energetic', desc: 'Dinâmico e entusiasmado' },
  { id: 'Dramatic', name: 'Dramatic', desc: 'Tenso e emocionante' },
];

interface VoicePickerProps {
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  selectedVoiceStyle: string;
  onSelectVoiceStyle: (style: string) => void;
  language?: string;
}

export const VoicePicker: React.FC<VoicePickerProps> = ({
  selectedVoiceId,
  onSelectVoice,
  selectedVoiceStyle,
  onSelectVoiceStyle,
  language = 'Portuguese',
}) => {
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      audioCacheRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      });
      audioCacheRef.current.clear();
    };
  }, []);

  const handlePreviewToggle = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    setPreviewError(null);

    // If clicking on already playing voice, pause it
    if (playingVoiceId === voiceId && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    // Stop current playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }

    const cacheKey = `${voiceId}_${language}`;
    let audioUrl = audioCacheRef.current.get(cacheKey);

    if (!audioUrl) {
      setLoadingVoiceId(voiceId);
      try {
        const res = await previewVoice(voiceId, language);
        if (res.audioUrl) {
          audioUrl = res.audioUrl;
        } else if (res.audioBase64) {
          const byteCharacters = atob(res.audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: res.mimeType || 'audio/wav' });
          audioUrl = URL.createObjectURL(blob);
        }

        if (audioUrl) {
          audioCacheRef.current.set(cacheKey, audioUrl);
        }
      } catch (err: any) {
        console.error('Failed to preview voice:', err);
        setPreviewError(err.message || 'Falha ao gerar o áudio de preview.');
        setLoadingVoiceId(null);
        return;
      } finally {
        setLoadingVoiceId(null);
      }
    }

    if (!audioUrl) {
      setPreviewError('Não foi possível obter o áudio de preview.');
      return;
    }

    // Play audio
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);

    audio.onended = () => {
      setPlayingVoiceId(null);
    };

    audio.onpause = () => {
      setPlayingVoiceId(null);
    };

    audio.onerror = () => {
      setPreviewError('Erro ao reproduzir áudio de preview.');
      setPlayingVoiceId(null);
    };

    try {
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setPreviewError('Clique no botão para liberar a reprodução de áudio.');
      setPlayingVoiceId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error alert */}
      {previewError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{previewError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPreviewError(null)}
            className="text-rose-400 hover:text-white text-xs underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Voice Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
            Narradores Disponíveis (Gemini TTS)
          </label>
          <span className="text-[11px] text-[#A1A1AA]">Idioma: {language}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {GEMINI_VOICES.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isSelected={selectedVoiceId === voice.id}
              onSelect={onSelectVoice}
              isPreviewLoading={loadingVoiceId === voice.id}
              isPlaying={playingVoiceId === voice.id}
              onPreviewToggle={(e) => handlePreviewToggle(e, voice.id)}
            />
          ))}
        </div>
      </div>

      {/* Voice Style Selection */}
      <div className="space-y-3 pt-4 border-t border-[#27272F]">
        <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-[#A78BFA]" />
          Estilo / Entonação da Narração
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {VOICE_STYLES.map((style) => {
            const isSelected = selectedVoiceStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onSelectVoiceStyle(style.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white font-bold ring-1 ring-[#7C3AED]'
                    : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA] hover:border-[#3F3F4E] hover:text-[#F7F7F8]'
                }`}
              >
                <p className="text-xs font-semibold">{style.name}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5 line-clamp-1">{style.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
