import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  readLanguage,
  translate,
} from "../shared/i18n.ts";

export const LanguageContext = createContext<{
  language: string;
  setLanguage: (value: unknown) => void;
  t: typeof translate extends (l: unknown, ...args: infer A) => string
    ? (...args: A) => string
    : never;
  preferenceError: boolean;
} | null>(null);

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, updateLanguage] = useState(() => {
    try {
      return readLanguage(window.localStorage);
    } catch {
      return "ru";
    }
  });
  const [preferenceError, setPreferenceError] = useState(false);
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language],
  );
  const setLanguage = useCallback(
    (value: unknown) => updateLanguage(normalizeLanguage(value)),
    [],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("WorkFinder — Your next chapter");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t("WorkFinder — turn your potential into your next opportunity."),
      );
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", t("WorkFinder — Your next chapter"));
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute(
        "content",
        t("WorkFinder — turn your potential into your next opportunity."),
      );
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      setPreferenceError(false);
    } catch {
      setPreferenceError(true);
    }
  }, [language, t]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === null)
        setLanguage(event.newValue);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [setLanguage]);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, preferenceError }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
