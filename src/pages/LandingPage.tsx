import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, Footer } from '../components/layout/Navbar';
import { VideoMarquee } from '../components/landing/VideoMarquee';
import { ResultsSection } from '../components/landing/ResultsSection';
import { BenefitsSection } from '../components/landing/BenefitsSection';
import { ComparisonSection } from '../components/landing/ComparisonSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { FaqSection } from '../components/landing/FaqSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';

interface LandingPageProps {
  onNavigate?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[rgba(255,255,255,0.92)] flex flex-col font-sans selection:bg-[#5B3FD6]/40 selection:text-white relative overflow-x-hidden">
      {/* Header */}
      <Navbar onNavigate={handleNav} />

      {/* Hero Section */}
      <section className="relative pt-[110px] sm:pt-[140px] pb-12 px-5 sm:px-6">
        {/* Subtle Radial Glow Behind Hero Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[350px] hero-radial-glow pointer-events-none z-0" />

        <div className="max-w-[1100px] mx-auto text-center relative z-10 space-y-6">
          {/* Creator Pill Social */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#141416] border border-[rgba(255,255,255,0.08)] text-[13px] text-[rgba(255,255,255,0.7)] shadow-sm">
            <div className="flex -space-x-1.5">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"
                alt="Creator avatar"
                className="w-4 h-4 rounded-full border border-[#141416] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80"
                alt="Creator avatar"
                className="w-4 h-4 rounded-full border border-[#141416] object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80"
                alt="Creator avatar"
                className="w-4 h-4 rounded-full border border-[#141416] object-cover"
              />
            </div>
            <span>Criadores produzindo com Klyvora</span>
          </div>

          {/* H1 Main Heading */}
          <h1 className="text-[42px] sm:text-[68px] lg:text-[72px] font-bold text-white tracking-[-0.03em] leading-[1.05] max-w-[760px] mx-auto">
            Transforme ideias em vídeos prontos para postar
          </h1>

          {/* Subtitle */}
          <p className="text-[17px] sm:text-[19px] text-[rgba(255,255,255,0.55)] max-w-[620px] mx-auto font-normal leading-relaxed">
            Roteiro, voz, imagens e legendas criados com IA. Você escolhe o tema e o Klyvora cuida do resto.
          </p>

          {/* CTA & Sub-caption */}
          <div className="pt-2 flex flex-col items-center gap-2">
            <button
              onClick={() => handleNav('/register')}
              className="klyvora-btn-gradient text-white font-semibold px-6 h-[48px] rounded-xl text-[15px] flex items-center justify-center shadow-lg active:scale-95 transition-all w-full sm:w-auto"
            >
              Começar a criar
            </button>
            <span className="text-[13px] text-[rgba(255,255,255,0.35)] font-normal">
              Crie seu primeiro vídeo em poucos minutos.
            </span>
          </div>
        </div>
      </section>

      {/* Video Marquee Carousel (Continuous Horizontal 9:16 Video Gallery) */}
      <VideoMarquee />

      {/* Results Section */}
      <ResultsSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Benefits Section */}
      <BenefitsSection />

      {/* Comparison Section */}
      <ComparisonSection />

      {/* FAQ Section */}
      <FaqSection />

      {/* Final CTA Section */}
      <FinalCtaSection onNavigate={handleNav} />

      {/* Footer */}
      <Footer onNavigate={handleNav} />
    </div>
  );
};
