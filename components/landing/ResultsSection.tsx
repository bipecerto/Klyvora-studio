'use client';

import React from 'react';
import { Eye, TrendingUp, Heart, Clock, Sparkles } from 'lucide-react';

export const ResultsSection: React.FC = () => {
  return (
    <section className="py-20 px-5 sm:px-6">
      <div className="max-w-[1100px] mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Conteúdo criado para prender atenção
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[rgba(255,255,255,0.55)] max-w-xl mx-auto font-normal">
            Vídeos curtos no formato exato para maximizar a retenção e viralizar no TikTok, Reels e Shorts.
          </p>
        </div>

        {/* Showcase Central Card */}
        <div className="max-w-[760px] mx-auto rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(91,63,214,0.15)] border border-[rgba(139,92,246,0.3)] flex items-center justify-center text-[#8B5CF6]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white">Canal Automatizado com Klyvora</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.45)]">Nicho: Curiosidades & Fatos Sombrios</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[12px] font-semibold text-emerald-400 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              100% Monetizável
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] text-[rgba(255,255,255,0.45)]">
                <Eye className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Visualizações</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">1.8M+</p>
            </div>

            <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] text-[rgba(255,255,255,0.45)]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Retenção Média</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">98.4%</p>
            </div>

            <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] text-[rgba(255,255,255,0.45)]">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Curtidas</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">142K</p>
            </div>

            <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] space-y-1">
              <div className="flex items-center gap-1.5 text-[12px] text-[rgba(255,255,255,0.45)]">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tempo de Edição</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">2 min</p>
            </div>
          </div>

          {/* Sample Video Highlight Bar */}
          <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[rgba(255,255,255,0.65)]">
            <span className="text-center sm:text-left">
              "A inteligência artificial do Klyvora estrutura o roteiro para prender a atenção nos primeiros 3 segundos."
            </span>
            <span className="font-semibold text-white whitespace-nowrap bg-[#141416] px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)]">
              Ganchos Psicologicamente Otimizados
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
