import { useState } from "react";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { useLanguage } from "./LanguageContext.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";
import { Brand } from "./Brand.tsx";
import { withAuthTimeout } from "./authFlow.ts";

/**
 * Bump when the privacy policy or terms change in a way that needs a new
 * consent; everyone is then asked again on their next visit.
 */
export const CONSENT_VERSION = 1;

type StoredConsent = { version?: number };
export const hasConsent = (session: Session | null) =>
  (session?.user.user_metadata?.consent as StoredConsent | undefined)?.version === CONSENT_VERSION;

/**
 * Shown once after the first sign-in (email or Google), before any personal
 * data is collected: age, processing of personal data, and — separately —
 * the transfer to OpenAI abroad. The answer is stored with the account.
 */
export function ConsentScreen({ client }: { client: SupabaseClient }) {
  const { t } = useLanguage();
  const [age, setAge] = useState(false);
  const [data, setData] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = age && data && transfer;

  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await withAuthTimeout(
        client.auth.updateUser({
          data: {
            consent: { version: CONSENT_VERSION, at: new Date().toISOString(), age16: true, personalData: true, crossBorder: true },
          },
        }),
      );
      if (result.error) throw result.error;
      // AuthProvider receives USER_UPDATED with the new metadata and opens the workspace.
    } catch {
      setError("service.unavailable");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card consent-card" onSubmit={accept}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="auth-brand">
            <Brand />
          </h1>
          <LanguageSwitcher />
        </div>
        <h2>{t("Before we start")}</h2>
        <p>{t("WorkFinder works with your personal data. Please read and confirm:")}</p>
        <label className="consent-row">
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />
          <span>{t("I am 16 or older.")}</span>
        </label>
        <label className="consent-row">
          <input type="checkbox" checked={data} onChange={(e) => setData(e.target.checked)} />
          <span>
            {t("consent.data.before")}
            <a href="/terms.html" target="_blank" rel="noopener">
              {t("Terms of use")}
            </a>
            {t("consent.data.middle")}
            <a href="/privacy.html" target="_blank" rel="noopener">
              {t("Privacy policy")}
            </a>
            {t("consent.data.after")}
          </span>
        </label>
        <label className="consent-row">
          <input type="checkbox" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} />
          <span>{t("consent.transfer")}</span>
        </label>
        <p className="small muted">{t("consent.withdraw")}</p>
        <button className="primary-button" disabled={!ready || busy}>
          {t(busy ? "Please wait…" : "Agree and continue")}
        </button>
        <button type="button" className="text-button" disabled={busy} onClick={() => client.auth.signOut()}>
          {t("I do not agree — sign out")}
        </button>
        {error && (
          <p role="alert" className="notice">
            {t(error)}
          </p>
        )}
      </form>
    </div>
  );
}
