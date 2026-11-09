import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageContext.tsx";
import { Brand } from "./Brand.tsx";

/**
 * One branded loading screen for every start-up stage. The bar shows real
 * progress: each stage has a ceiling, the bar eases toward it while the stage
 * runs, and it never goes backwards when the next stage's splash mounts.
 *
 *   auth  — server config + Supabase session   →  up to 35%
 *   app   — downloading the dashboard code     →  up to 70%
 *   data  — loading the student's workspace    →  up to 95%
 */
export type SplashStage = "auth" | "app" | "data";
const STAGE_FLOOR: Record<SplashStage, number> = { auth: 4, app: 38, data: 72 };
const STAGE_CEILING: Record<SplashStage, number> = { auth: 35, app: 70, data: 95 };
const APPEAR_DELAY_MS = 250;
let firstShownAt = 0;
/** Shared across remounts so the bar continues where the previous stage left it. */
let progress = 0;

export function Splash({ stage = "auth" }: { stage?: SplashStage }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(() => {
    progress = Math.max(progress, STAGE_FLOOR[stage]);
    return progress;
  });
  useEffect(() => {
    progress = Math.max(progress, STAGE_FLOOR[stage]);
    setValue(progress);
    // Ease toward the stage ceiling: fast at first, slower as it approaches,
    // so a slow network never makes the bar look "done" before it is.
    const timer = setInterval(() => {
      progress += (STAGE_CEILING[stage] - progress) * 0.12;
      setValue(progress);
    }, 120);
    return () => clearInterval(timer);
  }, [stage]);
  const now = performance.now();
  if (!firstShownAt) firstShownAt = now;
  const elapsed = now - firstShownAt;
  const style =
    elapsed >= APPEAR_DELAY_MS
      ? { animation: "none" }
      : { animationDelay: `${APPEAR_DELAY_MS - elapsed}ms` };
  const percent = Math.round(value);
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-inner" style={style}>
        <Brand size="lg" />
        <div
          className="splash-bar"
          role="progressbar"
          aria-label={t("Loading account…")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${value}%` }} />
        </div>
        <span className="sr-only">{t("Loading account…")}</span>
      </div>
    </div>
  );
}

/** Start-up failure: a clear message with recovery actions, in the same frame as the splash. */
export function SplashError({
  message,
  onSignOut,
}: {
  message: string;
  onSignOut?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="splash">
      <div className="splash-inner splash-error" role="alert" style={{ animation: "none" }}>
        <Brand size="lg" />
        <p>{t(message)}</p>
        <div className="splash-actions">
          <button className="primary-button" onClick={() => window.location.reload()}>
            {t("Try again")}
          </button>
          {onSignOut && (
            <button className="text-button" onClick={onSignOut}>
              {t("Sign out")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
