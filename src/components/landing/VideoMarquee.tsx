import React from 'react';
import { Play } from 'lucide-react';

export interface VideoCardData {
  id: string;
  niche: string;
  title: string;
  image: string;
  views: string;
}

const VIDEO_ITEMS: VideoCardData[] = [
  {
    id: '1',
    niche: 'Automotivo',
    title: 'A Lenda Oculta do Bugatti Veyron',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80',
    views: '1.8M',
  },
  {
    id: '2',
    niche: 'Mistério',
    title: 'O Enigma do Passo Dyatlov em 1959',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    views: '2.4M',
  },
  {
    id: '3',
    niche: 'História',
    title: 'O Maior Segredo do Império Romano',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&auto=format&fit=crop&q=80',
    views: '1.5M',
  },
  {
    id: '4',
    niche: 'Ciência',
    title: 'E Se o Sol Apagasse por 24 Horas?',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80',
    views: '920K',
  },
  {
    id: '5',
    niche: 'Curiosidades',
    title: 'A Regra dos 72 para Multiplicar Riqueza',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=80',
    views: '1.1M',
  },
  {
    id: '6',
    niche: 'Viagens',
    title: 'Os 5 Lugares Mais Isolados da Terra',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=80',
    views: '840K',
  },
  {
    id: '7',
    niche: 'Tecnologia',
    title: 'Como a IA Vai Transformar o Futuro',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80',
    views: '1.9M',
  },
  {
    id: '8',
    niche: 'Natureza',
    title: 'O Mistério das Profundezas dos Oceanos',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop&q=80',
    views: '1.3M',
  },
  {
    id: '9',
    niche: 'Luxo',
    title: 'A Mansão Mais Cara do Planeta',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',
    views: '2.1M',
  },
];

export const VideoMarquee: React.FC = () => {
  return (
    <section className="w-full pt-6 pb-16 overflow-hidden">
      {/* Label and curved arrow indicator above marquee */}
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium tracking-wide uppercase text-[rgba(255,255,255,0.45)]">
            Estilos que você pode criar
          </span>
          <svg
            className="w-8 h-4 text-[#8B5CF6]/70 hidden sm:block"
            viewBox="0 0 40 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M 2 5 C 15 18, 25 18, 35 12 M 30 8 L 36 12 L 32 17" />
          </svg>
        </div>
        <span className="text-[12px] text-[rgba(255,255,255,0.35)] font-normal hidden sm:block">
          Geração 100% automatizada
        </span>
      </div>

      {/* Marquee Track Container with Gradient Edge Fades */}
      <div className="relative w-full overflow-hidden">
        {/* Left Fade Overlay */}
        <div className="absolute top-0 bottom-0 left-0 w-[60px] sm:w-[120px] bg-gradient-to-r from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent z-10 pointer-events-none" />

        {/* Right Fade Overlay */}
        <div className="absolute top-0 bottom-0 right-0 w-[60px] sm:w-[120px] bg-gradient-to-l from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent z-10 pointer-events-none" />

        {/* Continuous Infinite Scrolling Track */}
        <div className="animate-marquee flex gap-4 pl-4">
          {/* CONJUNTO A */}
          {VIDEO_ITEMS.map((item, idx) => (
            <VideoCard key={`set1-${item.id}-${idx}`} item={item} />
          ))}

          {/* CONJUNTO A DUPLICADO for seamless infinite loop */}
          {VIDEO_ITEMS.map((item, idx) => (
            <VideoCard key={`set2-${item.id}-${idx}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

const VideoCard: React.FC<{ item: VideoCardData }> = ({ item }) => {
  return (
    <div className="w-[190px] sm:w-[250px] aspect-[9/16] shrink-0 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#141416] overflow-hidden relative group transition-transform duration-300 hover:border-[rgba(255,255,255,0.2)]">
      {/* Background Image */}
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-between p-3.5 sm:p-4">
        {/* Top Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-semibold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.1)]">
            {item.niche}
          </span>
          <span className="text-[10px] text-[rgba(255,255,255,0.7)] bg-black/50 px-2 py-0.5 rounded font-mono">
            9:16
          </span>
        </div>

        {/* Center Play Button */}
        <div className="flex justify-center my-auto opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom Title & Views */}
        <div className="space-y-1">
          <p className="text-[12px] sm:text-[13px] font-semibold text-white leading-snug line-clamp-2 text-shadow-sm">
            {item.title}
          </p>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[rgba(255,255,255,0.55)]">
            <span>{item.views} views</span>
            <span className="text-emerald-400 font-medium">98% retenção</span>
          </div>
        </div>
      </div>
    </div>
  );
};
