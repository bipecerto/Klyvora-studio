import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'O que é o Klyvora?',
      a: 'O Klyvora é uma plataforma de automação com inteligência artificial para criação de vídeos curtos no formato vertical (9:16). Ele gera roteiro, voz realista, cenas visuais e legendas animadas em poucos minutos.',
    },
    {
      q: 'Preciso aparecer nos vídeos?',
      a: 'Não! O Klyvora foi desenvolvido especificamente para a criação de canais sem rosto (faceless channels). A voz e as imagens de IA cuidam de toda a apresentação do vídeo.',
    },
    {
      q: 'Posso criar vídeos para Shorts, Reels e TikTok?',
      a: 'Sim. Os vídeos são exportados na resolução padrão 1080x1920 (9:16), perfeita para publicação no TikTok, Instagram Reels, YouTube Shorts e Kwai.',
    },
    {
      q: 'Posso editar o vídeo antes de baixar?',
      a: 'Sim. Você pode revisar e ajustar o roteiro, trocar de voz neural ou alterar o estilo das legendas antes de finalizar a renderização.',
    },
    {
      q: 'Como funciona a geração com IA?',
      a: 'Nossa inteligência artificial analisa o tema escolhido, escreve uma narrativa envolvente, converte o texto em áudio neural com entonação humana e sincroniza clipes visuais HD com as frases faladas.',
    },
  ];

  return (
    <section id="faq" className="py-20 px-5 sm:px-6">
      <div className="max-w-[760px] mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Perguntas Frequentes
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[rgba(255,255,255,0.55)]">
            Tire suas dúvidas sobre a criação de vídeos com o Klyvora.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-[12px] bg-[#141416] border border-[rgba(255,255,255,0.08)] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-[15px] text-white flex items-center justify-between gap-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8B5CF6] transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-[13px] text-[rgba(255,255,255,0.55)] leading-relaxed border-t border-[rgba(255,255,255,0.04)] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
