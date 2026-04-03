'use client';

import { useI18n } from '@/lib/i18n';

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === 'cs' ? 'en' : 'cs')}
      className="px-2 py-1 text-xs rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-text-secondary font-semibold"
      title={locale === 'cs' ? 'Switch to English' : 'Přepnout na češtinu'}
    >
      {locale === 'cs' ? '🇬🇧 EN' : '🇨🇿 CZ'}
    </button>
  );
}
