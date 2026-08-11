'use client';

import React from 'react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Escolha o tema',
      desc: 'Defina o nicho ou assunto do seu vídeo. Você pode escolher carros, histórias, curiosidades, finanças e muito mais.',
    },
    {
      num: '02',
      title: 'Klyvora cria',
      desc: 'Nossa IA gera o roteiro, a voz neural realista, seleciona as imagens em HD e sincroniza as legendas dinâmicas.',
    },
    {
      num: '03',
      title: 'Baixe e publique',
      desc: 'Receba o vídeo renderizado em 1080x1920 pronto para postar no TikTok, Instagram Reels e YouTube Shorts.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-5 sm:px-6">
      <div className="max-w-[1100px] mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Do tema ao vídeo em poucos minutos
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[rgba(255,255,255,0.55)] max-w-xl mx-auto font-normal">
            Três passos simples para alimentar seus canais sem rosto com conteúdo diário.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4 hover:border-[rgba(255,255,255,0.16)] transition-all"
            >
              <div className="text-2xl font-black text-[#8B5CF6] font-mono">
                {step.num}
              </div>
              <h3 className="text-[18px] font-bold text-white">{step.title}</h3>
              <p className="text-[13px] text-[rgba(255,255,255,0.55)] leading-relaxed font-normal">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
