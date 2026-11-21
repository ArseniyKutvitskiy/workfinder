/** Display helpers for job cards: readable salary and "posted N days ago". */

const SYMBOLS: Record<string, string> = {
  RUR: "₽", RUB: "₽", KZT: "₸", USD: "$", EUR: "€", GBP: "£",
  UZS: "сум", KGS: "сом", BYR: "Br", BYN: "Br", AZN: "₼", GEL: "₾", AMD: "֏", TJS: "сомони",
};

const group = (n: number, language: string) =>
  new Intl.NumberFormat(language === "en" ? "en-US" : "ru-RU").format(n).replace(/ /g, " ");

/**
 * "80000–… RUR" → "от 80 000 ₽", "…–120000 KZT" → "до 120 000 ₸",
 * "80000–120000 RUR" → "80 000 – 120 000 ₽". Other text is returned as is,
 * "" when there is no salary.
 */
export function formatSalary(value: string, language: string): string {
  const text = value.trim();
  if (!text || /not listed|не указан/i.test(text)) return "";
  const m = text.match(/^(\d+|…)\s*[–-]\s*(\d+|…)\s*([A-Z]{3})?$/);
  if (!m) return text;
  const [, fromRaw, toRaw, code = ""] = m;
  const from = fromRaw === "…" ? null : Number(fromRaw);
  const to = toRaw === "…" ? null : Number(toRaw);
  const cur = SYMBOLS[code] ?? code;
  const tail = cur ? ` ${cur}` : "";
  const ru = language !== "en";
  if (from && to) return from === to ? `${group(from, language)}${tail}` : `${group(from, language)} – ${group(to, language)}${tail}`;
  if (from) return `${ru ? "от" : "from"} ${group(from, language)}${tail}`;
  if (to) return `${ru ? "до" : "up to"} ${group(to, language)}${tail}`;
  return "";
}

/** "сегодня", "вчера", "3 дня назад", "2 недели назад" (or English). */
export function postedAgo(iso: string | null | undefined, language: string, now = Date.now()): string {
  const at = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(at)) return "";
  const days = Math.floor((now - at) / 86_400_000);
  if (days < 0) return "";
  const en = language === "en";
  if (days === 0) return en ? "today" : "сегодня";
  if (days === 1) return en ? "yesterday" : "вчера";
  const plural = (n: number, one: string, few: string, many: string) => {
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
  };
  if (days < 7) return en ? `${days} days ago` : `${days} ${plural(days, "день", "дня", "дней")} назад`;
  if (days < 31) {
    const w = Math.floor(days / 7);
    return en ? `${w} week${w > 1 ? "s" : ""} ago` : `${w} ${plural(w, "неделю", "недели", "недель")} назад`;
  }
  return en ? "over a month ago" : "больше месяца назад";
}
