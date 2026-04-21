import React from 'react';
import { Shield, Anchor, Pickaxe, Trophy, Crown, Star, Heart, Flame, Gem, TrendingUp, Sparkles } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export const TITLE_CONFIG: Record<string, { 
  label: string; 
  icon: React.ReactNode; 
  styles: string; 
  shadow: string;
}> = {
  st_admin: {
    label: 'ADMIN',
    icon: <Shield className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-st-red via-st-purple to-st-cyan text-white border-white/20 animate-pulse-glow font-black',
    shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]'
  },
  og: {
    label: 'OG',
    icon: <Flame className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-[#ef4444] to-[#f97316] text-white border-white/10',
    shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]'
  },
  god: {
    label: 'GOD',
    icon: <Sparkles className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-[#f472b6] via-[#a855f7] to-[#ec4899] text-white border-white/20',
    shadow: 'shadow-[0_0_15px_rgba(244,114,182,0.5)]'
  },
  whale: {
    label: 'WHALE',
    icon: <Anchor className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-st-cyan/80 to-blue-600 text-white border-st-cyan/30',
    shadow: 'shadow-[0_0_12px_rgba(0,232,255,0.4)]'
  },
  miner: {
    label: 'MINER',
    icon: <Pickaxe className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-st-gold to-orange-500 text-black border-st-gold/50 font-bold',
    shadow: 'shadow-[0_0_12px_rgba(251,191,36,0.3)]'
  },
  gambler: {
    label: 'GAMBLER',
    icon: <Crown className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-st-emerald to-st-emerald-dim text-white border-st-emerald/30',
    shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]'
  },
  veteran: {
    label: 'VETERAN',
    icon: <Trophy className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white border-white/10',
    shadow: 'shadow-[0_0_8px_rgba(255,255,255,0.15)]'
  },
  highroller: {
    label: 'HIGH ROLLER',
    icon: <Gem className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-st-purple to-pink-600 text-white border-st-purple/30',
    shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]'
  },
  legend: {
    label: 'LEGEND',
    icon: <Star className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-br from-yellow-300 via-white to-yellow-500 text-black border-white/40 font-extrabold',
    shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]'
  },
  dedicated: {
    label: 'DEDICATED',
    icon: <Heart className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-pink-500 to-st-red text-white border-white/10',
    shadow: 'shadow-[0_0_8px_rgba(236,72,153,0.3)]'
  },
  trader: {
    label: 'TRADER',
    icon: <TrendingUp className="w-2.5 h-2.5" />,
    styles: 'bg-gradient-to-r from-st-cyan to-st-emerald text-white border-white/10',
    shadow: 'shadow-[0_0_8px_rgba(0,232,255,0.3)]'
  }
};

interface TitleBadgeProps {
  titleKey: string | null | undefined;
  className?: string;
}

export default function TitleBadge({ titleKey, className = '' }: TitleBadgeProps) {
  if (!titleKey) return null;

  const config = TITLE_CONFIG[titleKey.toLowerCase()];
  
  if (!config) {
    return (
      <span className={twMerge(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border bg-white/5 text-text-muted border-white/5 uppercase',
        className
      )}>
        {titleKey}
      </span>
    );
  }

  return (
    <span className={twMerge(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest border transition-all duration-500 uppercase',
      config.styles,
      config.shadow,
      className
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}
