'use client';

import React from 'react';
import { FileText, Mic, Image, Subtitles, Smartphone, CheckCircle } from 'lucide-react';

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: FileText,
      title: 'Roteiro automático',
      desc: 'IA treinada nos melhores ganchos de retenção para estruturar narrativas envolventes.',
    },
    {
      icon: Mic,
      title: 'Narração por IA',
      desc: 'Vozes neurais hiper-realistas em português com entonação e ritmo naturais.',
    },
    {
      icon: Image,
      title: 'Visuais para cada cena',
      desc: 'Seleção automática de imagens e clipes em HD alinhados com o texto narrado.',
    },
    {
      icon: Subtitles,
      title: 'Legendas sincronizadas',
      desc: 'Legendas animadas no estilo Hormozi com palavras destacadas para alta atenção.',
    },
    {
      icon: Smartphone,
      title: 'Formato 9:16',
      desc: 'Vídeos verticais em 1080x1920 prontos para publicação em todas as redes.',
    },
    {
      icon: CheckCircle,
      title: 'Vídeo pronto para publicar',
      desc: 'Baixe o arquivo MP4 finalizado em minutos com apenas 1 clique.',
    },
  ];

  return (
    <section id="features" className="py-20 px-5 sm:px-6">
      <div className="max-w-[1100px] mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Tudo o que você precisa em um só lugar
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[rgba(255,255,255,0.55)] max-w-xl mx-auto font-normal">
            Tecnologia desenvolvida especificamente para criadores que buscam consistência e velocidade.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-3 hover:border-[rgba(255,255,255,0.16)] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#8B5CF6]">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-bold text-white">{b.title}</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.55)] leading-relaxed font-normal">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
