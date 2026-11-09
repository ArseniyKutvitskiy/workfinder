// Never keep the login screen blocked while waiting on an external provider.
export async function withAuthTimeout<T>(
  operation: Promise<T>,
  milliseconds = 15000,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("auth.timeout")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function consumeOAuthError(
  location: Pick<Location, "href">,
  history: Pick<History, "replaceState" | "state">,
) {
  const url = new URL(location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (!url.searchParams.has("error") && !fragment.has("error")) return "";
  for (const key of ["error", "error_code", "error_description"]) {
    url.searchParams.delete(key);
    fragment.delete(key);
  }
  url.hash = fragment.toString();
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  return "auth.googleFailed";
}

export async function googleAvailable(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: config.supabaseAnonKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("auth.failed");
  const settings = await response.json();
  return settings.external?.google === true;
}
