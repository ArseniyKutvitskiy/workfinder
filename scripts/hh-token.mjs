// Obtain a HeadHunter application token (client_credentials) and store it in .env.local.
// Usage: put HH_CLIENT_ID and HH_CLIENT_SECRET into .env.local, then run
//   node scripts/hh-token.mjs
// The token and secret are never printed.
import fs from "node:fs";

const FILE = new URL("../.env.local", import.meta.url);
const text = fs.readFileSync(FILE, "utf8");
const env = Object.fromEntries(
  text
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);

const { HH_CLIENT_ID, HH_CLIENT_SECRET } = env;
const userAgent = env.HH_USER_AGENT || "WorkFinder/2.0";
if (!HH_CLIENT_ID || !HH_CLIENT_SECRET) {
  console.error("Add HH_CLIENT_ID and HH_CLIENT_SECRET to .env.local first.");
  process.exit(1);
}

const response = await fetch("https://api.hh.ru/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "HH-User-Agent": userAgent, "User-Agent": userAgent },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: HH_CLIENT_ID,
    client_secret: HH_CLIENT_SECRET,
  }),
});
const body = await response.json().catch(() => ({}));
if (!response.ok || !body.access_token) {
  // Error descriptions from hh.ru do not contain secrets.
  console.error(`hh.ru refused: ${response.status} ${body.error ?? ""} ${body.error_description ?? ""}`.trim());
  process.exit(1);
}

const line = `HH_ACCESS_TOKEN=${body.access_token}`;
const updated = /^HH_ACCESS_TOKEN=.*$/m.test(text)
  ? text.replace(/^HH_ACCESS_TOKEN=.*$/m, line)
  : `${text.replace(/\s*$/, "")}\n${line}\n`;
fs.writeFileSync(FILE, updated);
console.log("Token saved to .env.local (HH_ACCESS_TOKEN).");

const check = await fetch("https://api.hh.ru/vacancies?area=160&per_page=1", {
  headers: { Authorization: `Bearer ${body.access_token}`, "HH-User-Agent": userAgent, "User-Agent": userAgent },
});
const data = await check.json().catch(() => ({}));
console.log(check.ok ? `Check OK: ${data.found} vacancies in Almaty.` : `Check failed: ${check.status}`);
