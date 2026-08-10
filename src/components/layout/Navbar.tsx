import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KlyvoraLogo } from '../ui/KlyvoraLogo';

interface NavbarProps {
  onNavigate?: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-[64px] transition-all duration-200 ${
        scrolled
          ? 'bg-[#0A0A0B]/85 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 h-full flex items-center justify-between">
        {/* Left: Logo */}
        <button
          onClick={() => handleNav('/')}
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <KlyvoraLogo size="sm" />
        </button>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-[14px] text-[rgba(255,255,255,0.65)] font-normal">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            Como funciona
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Recursos
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNav('/login')}
            className="hidden sm:inline-block text-[14px] text-[rgba(255,255,255,0.65)] hover:text-white transition-colors font-medium px-2 py-1"
          >
            Entrar
          </button>
          <button
            onClick={() => handleNav('/register')}
            className="klyvora-btn-gradient text-white text-[13px] sm:text-[14px] font-semibold px-4 py-2 rounded-xl h-[38px] flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            Começar agora
          </button>
        </div>
      </div>
    </header>
  );
};

export const Footer: React.FC<{ onNavigate?: (p: string) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] bg-[#0A0A0B] py-10 px-5 sm:px-6">
      <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-[13px] text-[rgba(255,255,255,0.45)]">
        <div className="flex items-center gap-3">
          <KlyvoraLogo size="sm" />
          <span>© {new Date().getFullYear()} Klyvora. Todos os direitos reservados.</span>
        </div>

        <div className="flex items-center gap-6 font-normal">
          <a href="#how-it-works" className="hover:text-white transition-colors">Como funciona</a>
          <a href="#features" className="hover:text-white transition-colors">Recursos</a>
          <button onClick={() => handleNav('/login')} className="hover:text-white transition-colors">Termos</button>
          <button onClick={() => handleNav('/register')} className="hover:text-white transition-colors">Privacidade</button>
        </div>
      </div>
    </footer>
  );
};
