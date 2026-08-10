import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FinalCtaProps {
  onNavigate?: (path: string) => void;
}

export const FinalCtaSection: React.FC<FinalCtaProps> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <section className="py-20 px-5 sm:px-6">
      <div className="max-w-[1100px] mx-auto text-center">
        <div className="p-8 sm:p-14 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 relative overflow-hidden shadow-2xl">
          {/* Subtle radial glow inside card */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[rgba(139,92,246,0.12)] rounded-full blur-[80px] pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white relative z-10">
            Seu próximo vídeo começa aqui.
          </h2>
          <p className="text-[15px] sm:text-[17px] text-[rgba(255,255,255,0.55)] max-w-lg mx-auto relative z-10 font-normal">
            Transforme suas ideias em vídeos virais sem precisar aparecer ou editar manualmente.
          </p>

          <div className="pt-2 relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleNav('/register')}
              className="klyvora-btn-gradient text-white font-semibold px-8 py-3.5 rounded-xl text-[15px] shadow-lg active:scale-95 transition-all w-full sm:w-auto"
            >
              Começar a criar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
