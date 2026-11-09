import { useState } from "react";
import type { User } from "@supabase/supabase-js";

/** Allowed avatar hosts; must match the CSP img-src list in server/app.ts. */
const AVATAR_HOSTS = ["lh3.googleusercontent.com"];

/** Display identity: resume name first, then the sign-in provider's profile, then the email. */
export function userIdentity(user: User, resumeName: string) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = resumeName.trim() || text(meta.full_name) || text(meta.name);
  const rawPhoto = text(meta.avatar_url) || text(meta.picture);
  let photo = "";
  try {
    const url = new URL(rawPhoto);
    if (url.protocol === "https:" && AVATAR_HOSTS.includes(url.hostname)) photo = url.href;
  } catch {
    /* no or invalid photo URL */
  }
  const email = user.email ?? "";
  const source = name || email.split("@")[0] || "?";
  const initials = (
    name
      ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]).join("")
      : [...source][0]
  ).toLocaleUpperCase();
  return { name, email, photo, initials };
}

/** Stable pastel tone per person so initials avatars are distinguishable. */
const TONES = [
  ["#e3efe8", "#176950"],
  ["#ede6da", "#7a6447"],
  ["#e4ebf4", "#35577e"],
  ["#f1e5e9", "#8a4560"],
  ["#e9e7f3", "#55508a"],
];
function tone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return TONES[h % TONES.length];
}

export function Avatar({
  user,
  resumeName,
  size = 34,
  className = "",
}: {
  user: User;
  resumeName: string;
  size?: number;
  className?: string;
}) {
  const { photo, initials, email } = userIdentity(user, resumeName);
  const [broken, setBroken] = useState(false);
  const [bg, fg] = tone(email || initials);
  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {photo && !broken ? (
        <img
          src={photo}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
