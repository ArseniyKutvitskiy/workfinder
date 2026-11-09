import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuthTimeout } from "./authFlow.ts";

/**
 * Our own "Continue with Google" button (no personalised "Continue as …").
 * Google Identity Services opens a popup on this site and returns a one-time
 * code; the server exchanges it for an ID token, which Supabase verifies. The
 * consent screen therefore shows WorkFinder, never "<project>.supabase.co".
 */
type CodeClient = { requestCode(): void };
type GoogleOAuth = {
  initCodeClient(options: Record<string, unknown>): CodeClient;
};
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleOAuth> | null = null;

function loadGoogle(): Promise<GoogleOAuth> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  loading ??= new Promise<GoogleOAuth>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error("gsi"));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("gsi"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleButton({
  client,
  clientId,
  label,
  busyLabel,
  onError,
  onUnavailable,
}: {
  client: SupabaseClient;
  clientId: string;
  label: string;
  busyLabel: string;
  onError: (key: string) => void;
  onUnavailable: () => void;
}) {
  const codeClient = useRef<CodeClient | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadGoogle()
      .then((oauth) => {
        if (!active) return;
        codeClient.current = oauth.initCodeClient({
          client_id: clientId,
          scope: "openid email profile",
          ux_mode: "popup",
          select_account: true,
          callback: async (response: { code?: string; error?: string }) => {
            if (!response.code) {
              // Closing the popup is not an error worth showing.
              if (response.error && response.error !== "access_denied") onError("auth.googleFailed");
              return;
            }
            setBusy(true);
            try {
              const exchange = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: response.code }),
                signal: AbortSignal.timeout(15_000),
              });
              const body = await exchange.json().catch(() => ({}));
              if (!exchange.ok || typeof body.idToken !== "string") throw new Error("auth.googleFailed");
              const result = await withAuthTimeout(
                client.auth.signInWithIdToken({ provider: "google", token: body.idToken }),
              );
              if (result.error) throw result.error;
              // Success: AuthProvider receives the session and leaves this page.
            } catch (error) {
              onError(error instanceof Error && error.message === "auth.timeout" ? "auth.timeout" : "auth.googleFailed");
            } finally {
              if (active) setBusy(false);
            }
          },
          error_callback: (error: { type?: string }) => {
            // popup_closed is the student changing their mind.
            if (error?.type && error.type !== "popup_closed") onError("auth.googleFailed");
          },
        });
        setReady(true);
      })
      // Script blocked (ad blocker, network): fall back to the redirect flow.
      .catch(() => active && onUnavailable());
    return () => {
      active = false;
    };
  }, [client, clientId]);

  return (
    <button
      type="button"
      className="secondary-button google-button"
      disabled={!ready || busy}
      onClick={() => codeClient.current?.requestCode()}
    >
      <GoogleLogo />
      {busy ? busyLabel : label}
    </button>
  );
}
