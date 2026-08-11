'use client';

import React from 'react';
import { X, Check, Sparkles } from 'lucide-react';

export const ComparisonSection: React.FC = () => {
  return (
    <section className="py-20 px-5 sm:px-6">
      <div className="max-w-[1100px] mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Por que escolher o Klyvora?
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[rgba(255,255,255,0.55)] max-w-xl mx-auto font-normal">
            Compare o tempo e os custos entre os métodos tradicionais e a automação com IA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Editar Manualmente */}
          <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(239,68,68,0.2)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-white">Editar manualmente</h3>
                <span className="text-[11px] font-semibold text-rose-400 bg-[rgba(239,68,68,0.1)] px-2.5 py-1 rounded-md border border-[rgba(239,68,68,0.2)]">
                  Lento & Cansativo
                </span>
              </div>
              <p className="text-[13px] text-[rgba(255,255,255,0.45)]">
                Exige horas de aprendizado em softwares complexos de edição de vídeo.
              </p>
              <ul className="space-y-3 text-[13px] text-[rgba(255,255,255,0.65)] pt-2 border-t border-[rgba(255,255,255,0.06)]">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>3 a 5 horas gastos por vídeo</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Necessita gravar ou buscar voz própria</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Legendas digitadas palavra por palavra</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Dificuldade para manter frequência diária</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2: Contratar Editor */}
          <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(239,68,68,0.2)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-white">Contratar editor</h3>
                <span className="text-[11px] font-semibold text-rose-400 bg-[rgba(239,68,68,0.1)] px-2.5 py-1 rounded-md border border-[rgba(239,68,68,0.2)]">
                  Muito Caro
                </span>
              </div>
              <p className="text-[13px] text-[rgba(255,255,255,0.45)]">
                Custo recorrente elevado por vídeo com prazos imprevisíveis de entrega.
              </p>
              <ul className="space-y-3 text-[13px] text-[rgba(255,255,255,0.65)] pt-2 border-t border-[rgba(255,255,255,0.06)]">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>R$ 100 a R$ 250 investidos por vídeo</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Custo adicional para locutores profissionais</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Prazos de 24h a 48h por entrega</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Inviável para gerenciar múltiplos canais</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 3: Klyvora */}
          <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(139,92,246,0.5)] flex flex-col justify-between space-y-6 relative overflow-hidden shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-white flex items-center gap-1.5">
                  Klyvora
                  <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                </h3>
                <span className="text-[11px] font-semibold text-[#8B5CF6] bg-[rgba(91,63,214,0.15)] px-2.5 py-1 rounded-md border border-[rgba(139,92,246,0.3)]">
                  Automático & Escalável
                </span>
              </div>
              <p className="text-[13px] text-[rgba(255,255,255,0.55)]">
                Solução completa por IA: crie vídeos profissionais em menos de 2 minutos.
              </p>
              <ul className="space-y-3 text-[13px] text-white pt-2 border-t border-[rgba(255,255,255,0.08)]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Vídeo pronto em menos de 2 minutos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Vozes neurais ultra-realistas em português</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Legendas animadas no estilo Hormozi</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Crie dezenas de vídeos por dia sem esforço</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
