'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { StatsOverview } from '@/lib/types';
import { Tv, Film, Calendar, Sparkles } from 'lucide-react';

interface StatsCardsProps {
  stats: StatsOverview;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Séries',
      value: stats.totalSeries,
      subtext: 'Canais ativos',
      icon: Tv,
      color: 'text-[#A78BFA]',
    },
    {
      title: 'Vídeos Criados',
      value: stats.totalVideosCreated,
      subtext: 'Gerados no total',
      icon: Film,
      color: 'text-purple-400',
    },
    {
      title: 'Vídeos Este Mês',
      value: stats.videosThisMonth,
      subtext: 'Período atual',
      icon: Calendar,
      color: 'text-emerald-400',
    },
    {
      title: 'Créditos',
      value: stats.creditsRemaining,
      subtext: 'Créditos restantes',
      icon: Sparkles,
      color: 'text-[#A78BFA]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="p-5 bg-[#111116] border-[#27272F] hover:border-[#373743] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">{c.title}</span>
              <div className="w-8 h-8 rounded-xl bg-[#18181F] border border-[#27272F] flex items-center justify-center">
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-[#F7F7F8] tracking-tight">{c.value}</p>
              <p className="text-[11px] text-[#A1A1AA] mt-1">{c.subtext}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
