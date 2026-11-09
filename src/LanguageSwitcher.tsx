import React from "react";
import { useLanguage } from "./LanguageContext.tsx";
import { translate } from "../shared/i18n.ts";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={t("Language")}>
      {["ru", "en"].map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-label={translate(
            locale,
            locale === "ru" ? "Switch to Russian" : "Switch to English",
          )}
          aria-pressed={language === locale}
          onClick={() => setLanguage(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
