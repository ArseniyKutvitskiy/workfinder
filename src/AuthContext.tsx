import { authFormSchema } from "../shared/schemas.ts";
import type {
  SupabaseClient,
  Session,
  Subscription,
} from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useLanguage } from "./LanguageContext.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";
import { Splash, SplashError } from "./Splash.tsx";
import { Brand } from "./Brand.tsx";
import { setAuthClient } from "./api.ts";
import { GoogleButton } from "./GoogleButton.tsx";
import { Welcome } from "./Welcome.tsx";
import {
  consumeOAuthError,
  googleAvailable,
  withAuthTimeout,
} from "./authFlow.ts";
const AuthContext = createContext<{
  client: SupabaseClient;
  session: Session | null;
  authConfig: AuthConfig;
} | null>(null);
type AuthConfig = { supabaseUrl: string; supabaseAnonKey: string; googleClientId?: string };
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw Error("Missing AuthProvider");
  return value;
};
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [client, setClient] = useState<SupabaseClient | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState(false);
  const { t } = useLanguage();
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [callbackError] = useState(() =>
    consumeOAuthError(window.location, window.history),
  );
  useEffect(() => {
    let active = true,
      subscription: Subscription | undefined;
    (async () => {
      try {
        const response = await fetch("/api/config", {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw Error();
        const config = await response.json();
        if (!active) return;
        const supabase = createClient(
          config.supabaseUrl,
          config.supabaseAnonKey,
          {
            auth: {
              flowType: "pkce",
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          },
        );
        if (!active) return;
        setClient(supabase);
        setAuthClient(supabase);
        setAuthConfig(config);
        subscription = supabase.auth.onAuthStateChange((event, current) => {
          if (!active) return;
          setSession(current);
          if (event === "PASSWORD_RECOVERY") setRecovery(true);
        }).data.subscription;
        const result = await withAuthTimeout(supabase.auth.getSession());
        if (result.error) throw result.error;
        if (active) {
          setSession(result.data.session);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError("setup.required");
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);
  if (error) return <SplashError message={error} />;
  if (loading || !client || !authConfig) return <Splash stage="auth" />;
  return (
    <AuthContext.Provider value={{ client, session, authConfig }}>
      {!session || recovery ? (
        <AuthForm
          initialNotice={callbackError}
          recovery={recovery}
          onRecovered={() => setRecovery(false)}
        />
      ) : (
        <React.Fragment key={session.user.id}>{children}</React.Fragment>
      )}
    </AuthContext.Provider>
  );
}
function AuthForm({
  recovery,
  onRecovered,
  initialNotice,
}: {
  recovery: boolean;
  onRecovered: () => void;
  initialNotice: string;
}) {
  const { client, authConfig } = useAuth(),
    { t } = useLanguage();
  // On-site Google button when configured; the redirect flow is the fallback.
  const [gsiFailed, setGsiFailed] = useState(false);
  const onSiteGoogle = !!authConfig.googleClientId && !gsiFailed;
  const [mode, setMode] = useState("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(initialNotice || "");
  useEffect(() => {
    const restore = () => setBusy(false);
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  const redirectTo = `${window.location.origin}/`;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (recovery) authFormSchema.shape.password.parse(password);
      else if (mode === "signup") authFormSchema.parse({ email, password });
      else authFormSchema.shape.email.parse(email);
      const result = await withAuthTimeout<{ error: Error | null }>(
        recovery
          ? client.auth.updateUser({ password })
          : mode === "signup"
            ? client.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: redirectTo },
              })
            : mode === "reset"
              ? client.auth.resetPasswordForEmail(email, { redirectTo })
              : client.auth.signInWithPassword({ email, password }),
      );
      if (result.error) throw result.error;
      if (recovery) onRecovered();
      else if (mode === "signup") setNotice("auth.signupCheckEmail");
      else if (mode === "reset") setNotice("auth.checkEmail");
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === "auth.timeout"
          ? "auth.timeout"
          : "auth.failed",
      );
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (!(await googleAvailable(authConfig))) {
        setNotice("auth.googleDisabled");
        return;
      }
      const result = await withAuthTimeout(
        client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        }),
      );
      if (result.error || !result.data?.url)
        throw new Error("auth.googleFailed");
      window.location.assign(result.data.url);
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === "auth.timeout"
          ? "auth.timeout"
          : "auth.googleFailed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`auth-page${recovery ? "" : " with-welcome"}`}>
      {!recovery && <Welcome />}
      <section className="auth-card">
        <div className="flex items-center justify-between gap-3">
          <h1 className="auth-brand">
            <Brand />
          </h1>
          <LanguageSwitcher />
        </div>
        <h2>
          {t(
            recovery
              ? "New password"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Reset password"
                  : "Sign in to your workspace",
          )}
        </h2>
        <p>{t("Your career workspace, securely saved.")}</p>
        <form onSubmit={submit}>
          {!recovery && (
            <label>
              {t("Email")}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
              />
            </label>
          )}
          {(recovery || mode !== "reset") && (
            <label>
              {t("Password")}
              <input
                type="password"
                autoComplete={
                  mode === "signup" || recovery
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === "signin" && !recovery ? 1 : 8}
                maxLength={128}
                required
              />
            </label>
          )}
          <button className="primary-button" disabled={busy}>
            {t(
              busy
                ? "Please wait…"
                : recovery
                  ? "Save password"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset link"
                      : "Sign in",
            )}
          </button>
        </form>
        {!recovery && (
          <>
            {onSiteGoogle ? (
              <GoogleButton
                client={client}
                clientId={authConfig.googleClientId!}
                label={t("Continue with Google")}
                busyLabel={t("Please wait…")}
                onError={setNotice}
                onUnavailable={() => setGsiFailed(true)}
              />
            ) : (
              <button
                className="secondary-button"
                onClick={google}
                disabled={busy}
              >
                {t("Continue with Google")}
              </button>
            )}
            <div className="flex flex-wrap gap-3">
              {["signin", "signup", "reset"]
                .filter((x) => x !== mode)
                .map((x) => (
                  <button
                    className="text-button"
                    key={x}
                    onClick={() => {
                      setMode(x);
                      setNotice("");
                    }}
                  >
                    {t(
                      x === "signin"
                        ? "Sign in"
                        : x === "signup"
                          ? "Create account"
                          : "Reset password",
                    )}
                  </button>
                ))}
            </div>
          </>
        )}
        {notice && (
          <p role="status" className="notice">
            {t(notice)}
          </p>
        )}
        <p className="small muted">
          {t(
            "AI features send your resume and chat to OpenAI when you use them. Do not include sensitive identifiers.",
          )}
        </p>
      </section>
    </div>
  );
}
