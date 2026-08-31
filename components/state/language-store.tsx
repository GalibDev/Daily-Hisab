"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  translate,
  type AppLanguage,
  type TranslationKey,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(getStoredLanguage());

    const syncLanguage = (event: Event) => {
      const requested = (event as CustomEvent<AppLanguage>).detail;
      setLanguageState(requested ? normalizeLanguage(requested) : getStoredLanguage());
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) setLanguageState(normalizeLanguage(event.newValue));
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "bangla" ? "bn" : "en";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: nextLanguage }));
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => translate(language, key, values),
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
