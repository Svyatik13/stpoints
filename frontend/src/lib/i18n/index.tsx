'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cs } from './cs';
import { en } from './en';
import type { Translations } from './cs';

type Locale = 'cs' | 'en';

const translations: Record<Locale, Translations> = { cs, en };

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'cs',
  t: cs,
  setLocale: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('cs');

  useEffect(() => {
    const saved = localStorage.getItem('st-locale') as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('st-locale', l);
    document.documentElement.lang = l;
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
