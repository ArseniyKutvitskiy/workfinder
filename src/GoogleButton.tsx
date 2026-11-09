import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuthTimeout } from "./authFlow.ts";

/**
 * Official "Sign in with Google" button rendered on our own page (Google Identity
 * Services). Google returns an ID token here and Supabase verifies it, so the
 * consent screen shows WorkFinder instead of "<project>.supabase.co".
 */
type GoogleId = {
  initialize(options: Record<string, unknown>): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleId> | null = null;

function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("gsi"));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("gsi"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Raw nonce goes to Supabase; its SHA-256 goes to Google (Supabase compares them). */
async function makeNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export function GoogleButton({
  client,
  clientId,
  language,
  onError,
  onUnavailable,
}: {
  client: SupabaseClient;
  clientId: string;
  language: string;
  onError: (key: string) => void;
  onUnavailable: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  // Bumped after a failed attempt so the button is re-initialised with a fresh nonce.
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [google, nonce] = await Promise.all([loadGoogle(), makeNonce()]);
        if (!active || !host.current) return;
        google.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          ux_mode: "popup",
          context: "signin",
          itp_support: true,
          use_fedcm_for_button: true,
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) return onError("auth.googleFailed");
            setBusy(true);
            try {
              const result = await withAuthTimeout(
                client.auth.signInWithIdToken({ provider: "google", token: credential, nonce: nonce.raw }),
              );
              if (result.error) throw result.error;
              // Success: AuthProvider receives the session and leaves this page.
            } catch (error) {
              onError(error instanceof Error && error.message === "auth.timeout" ? "auth.timeout" : "auth.googleFailed");
              if (active) setAttempt((n) => n + 1);
            } finally {
              if (active) setBusy(false);
            }
          },
        });
        host.current.replaceChildren();
        google.renderButton(host.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          logo_alignment: "center",
          locale: language,
          width: Math.max(200, Math.min(400, Math.round(host.current.getBoundingClientRect().width))),
        });
      } catch {
        // Script blocked (ad blocker, network): fall back to the redirect flow.
        if (active) onUnavailable();
      }
    })();
    return () => {
      active = false;
    };
  }, [client, clientId, language, attempt]);

  return <div ref={host} className="google-button" aria-busy={busy} data-busy={busy || undefined} />;
}
