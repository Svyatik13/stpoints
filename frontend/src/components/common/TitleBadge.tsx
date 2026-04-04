import React from 'react';

export const TITLE_STYLES: Record<string, { gradient: string; shadow: string; shimmer?: boolean }> = {
  og:        { gradient: 'from-[#ef4444] to-[#f97316]', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]', shimmer: true },
  god:       { gradient: 'from-[#f472b6] via-[#a855f7] to-[#ec4899]', shadow: 'shadow-[0_0_15px_rgba(244,114,182,0.5)]', shimmer: true },
  lord:      { gradient: 'from-[#facc15] to-[#eab308]', shadow: 'shadow-[0_0_10px_rgba(250,204,21,0.4)]' },
  whale:     { gradient: 'from-[#06b6d4] to-[#3b82f6]', shadow: 'shadow-[0_0_10px_rgba(6,182,212,0.4)]' },
  miner:     { gradient: 'from-[#94a3b8] to-[#06b6d4]', shadow: 'shadow-[0_0_8px_rgba(148,163,184,0.3)]' },
  gambler:   { gradient: 'from-[#10b981] to-[#059669]', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  veteran:   { gradient: 'from-[#84cc16] to-[#4d7c0f]', shadow: 'shadow-[0_0_8px_rgba(132,204,22,0.3)]' },
  dedicated: { gradient: 'from-[#f97316] to-[#ea580c]', shadow: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]' },
  collector: { gradient: 'from-[#8b5cf6] to-[#d946ef]', shadow: 'shadow-[0_0_10px_rgba(139,92,246,0.4)]' },
  trader:    { gradient: 'from-[#14b8a6] to-[#0d9488]', shadow: 'shadow-[0_0_8px_rgba(20,184,166,0.3)]' },
};

interface TitleBadgeProps {
  titleKey: string | null;
  label?: string;
  className?: string;
}

export default function TitleBadge({ titleKey, label, className = '' }: TitleBadgeProps) {
  if (!titleKey || !TITLE_STYLES[titleKey]) return null;

  const style = TITLE_STYLES[titleKey];
  const displayLabel = label || titleKey.toUpperCase();

  return (
    <span className={`
      relative inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black tracking-tighter uppercase
      bg-gradient-to-br ${style.gradient} ${style.shadow} text-white leading-none
      ${style.shimmer ? 'animate-shimmer bg-[length:200%_auto]' : ''}
      ${className}
    `}>
      {displayLabel}
      {style.shimmer && (
        <span className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer pointer-events-none"></span>
      )}
    </span>
  );
}
