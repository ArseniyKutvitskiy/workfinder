/**
 * Lightweight geography for matching a student's city/country to job sources.
 * Free-text profile values ("Алматы", "almaty", "Алматы, Казахстан") are
 * normalised to a canonical city and an ISO country code.
 */
export type CountryCode = string;

/** CIS markets WorkFinder serves with local jobs, in the order shown in the UI. */
export const CIS_COUNTRIES = ["KZ", "RU", "UZ", "KG", "BY", "AZ", "GE", "AM", "TJ"] as const;
export type CisCountry = (typeof CIS_COUNTRIES)[number];
/** Salary currency per market (codes as HeadHunter uses them; USD where hh has none). */
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  KZ: "KZT",
  RU: "RUR",
  UZ: "UZS",
  KG: "KGS",
  BY: "BYR",
  AZ: "AZN",
  GE: "GEL",
  AM: "USD",
  TJ: "USD",
};
export const currencyFor = (country: string) => CURRENCY_BY_COUNTRY[country] ?? "USD";

type City = {
  ru: string;
  en: string;
  country: CisCountry;
  aliases?: string[];
  /** KLADR region code for trudvsem.ru (Russia only). */
  region?: string;
};

export const CITIES: City[] = [
  // Kazakhstan
  { ru: "Алматы", en: "Almaty", country: "KZ", aliases: ["алма-ата", "almaty", "alma-ata"] },
  { ru: "Астана", en: "Astana", country: "KZ", aliases: ["нур-султан", "nur-sultan", "akmola"] },
  { ru: "Шымкент", en: "Shymkent", country: "KZ", aliases: ["чимкент"] },
  { ru: "Караганда", en: "Karaganda", country: "KZ", aliases: ["караганды", "qaraghandy"] },
  { ru: "Актобе", en: "Aktobe", country: "KZ", aliases: ["актюбинск", "aqtobe"] },
  { ru: "Тараз", en: "Taraz", country: "KZ" },
  { ru: "Павлодар", en: "Pavlodar", country: "KZ" },
  { ru: "Усть-Каменогорск", en: "Ust-Kamenogorsk", country: "KZ", aliases: ["оскемен", "oskemen"] },
  { ru: "Семей", en: "Semey", country: "KZ", aliases: ["семипалатинск"] },
  { ru: "Атырау", en: "Atyrau", country: "KZ" },
  { ru: "Костанай", en: "Kostanay", country: "KZ", aliases: ["кустанай"] },
  { ru: "Кызылорда", en: "Kyzylorda", country: "KZ" },
  { ru: "Уральск", en: "Oral", country: "KZ", aliases: ["орал", "uralsk"] },
  { ru: "Петропавловск", en: "Petropavl", country: "KZ", aliases: ["петропавл", "petropavlovsk"] },
  { ru: "Актау", en: "Aktau", country: "KZ", aliases: ["aqtau"] },
  { ru: "Туркестан", en: "Turkistan", country: "KZ", aliases: ["turkestan"] },
  { ru: "Кокшетау", en: "Kokshetau", country: "KZ" },
  { ru: "Талдыкорган", en: "Taldykorgan", country: "KZ" },
  { ru: "Экибастуз", en: "Ekibastuz", country: "KZ" },
  // Uzbekistan
  { ru: "Ташкент", en: "Tashkent", country: "UZ", aliases: ["toshkent"] },
  { ru: "Самарканд", en: "Samarkand", country: "UZ", aliases: ["samarqand"] },
  { ru: "Бухара", en: "Bukhara", country: "UZ", aliases: ["buxoro"] },
  { ru: "Наманган", en: "Namangan", country: "UZ" },
  { ru: "Андижан", en: "Andijan", country: "UZ", aliases: ["andijon"] },
  { ru: "Фергана", en: "Fergana", country: "UZ", aliases: ["farg'ona", "fargona"] },
  { ru: "Нукус", en: "Nukus", country: "UZ" },
  // Kyrgyzstan
  { ru: "Бишкек", en: "Bishkek", country: "KG", aliases: ["фрунзе"] },
  { ru: "Ош", en: "Osh", country: "KG" },
  { ru: "Каракол", en: "Karakol", country: "KG" },
  // Belarus
  { ru: "Минск", en: "Minsk", country: "BY", aliases: ["мінск"] },
  { ru: "Гомель", en: "Gomel", country: "BY", aliases: ["homel"] },
  { ru: "Брест", en: "Brest", country: "BY" },
  { ru: "Гродно", en: "Grodno", country: "BY", aliases: ["hrodna"] },
  { ru: "Витебск", en: "Vitebsk", country: "BY" },
  { ru: "Могилёв", en: "Mogilev", country: "BY", aliases: ["могилев", "mahilyow"] },
  // Azerbaijan
  { ru: "Баку", en: "Baku", country: "AZ", aliases: ["baki"] },
  { ru: "Гянджа", en: "Ganja", country: "AZ" },
  { ru: "Сумгаит", en: "Sumgait", country: "AZ", aliases: ["sumqayit"] },
  // Georgia
  { ru: "Тбилиси", en: "Tbilisi", country: "GE" },
  { ru: "Батуми", en: "Batumi", country: "GE" },
  { ru: "Кутаиси", en: "Kutaisi", country: "GE" },
  // Armenia
  { ru: "Ереван", en: "Yerevan", country: "AM" },
  { ru: "Гюмри", en: "Gyumri", country: "AM" },
  // Tajikistan
  { ru: "Душанбе", en: "Dushanbe", country: "TJ" },
  { ru: "Худжанд", en: "Khujand", country: "TJ" },
  // Russia
  { ru: "Москва", en: "Moscow", country: "RU", region: "7700000000000", aliases: ["moskva"] },
  { ru: "Санкт-Петербург", en: "Saint Petersburg", country: "RU", region: "7800000000000", aliases: ["спб", "питер", "петербург", "st petersburg", "spb"] },
  { ru: "Новосибирск", en: "Novosibirsk", country: "RU", region: "5400000000000" },
  { ru: "Екатеринбург", en: "Yekaterinburg", country: "RU", region: "6600000000000", aliases: ["ekaterinburg", "екб"] },
  { ru: "Казань", en: "Kazan", country: "RU", region: "1600000000000" },
  { ru: "Нижний Новгород", en: "Nizhny Novgorod", country: "RU", region: "5200000000000" },
  { ru: "Челябинск", en: "Chelyabinsk", country: "RU", region: "7400000000000" },
  { ru: "Самара", en: "Samara", country: "RU", region: "6300000000000" },
  { ru: "Омск", en: "Omsk", country: "RU", region: "5500000000000" },
  { ru: "Ростов-на-Дону", en: "Rostov-on-Don", country: "RU", region: "6100000000000", aliases: ["ростов"] },
  { ru: "Уфа", en: "Ufa", country: "RU", region: "0200000000000" },
  { ru: "Красноярск", en: "Krasnoyarsk", country: "RU", region: "2400000000000" },
  { ru: "Воронеж", en: "Voronezh", country: "RU", region: "3600000000000" },
  { ru: "Пермь", en: "Perm", country: "RU", region: "5900000000000" },
  { ru: "Волгоград", en: "Volgograd", country: "RU", region: "3400000000000" },
  { ru: "Краснодар", en: "Krasnodar", country: "RU", region: "2300000000000" },
  { ru: "Тюмень", en: "Tyumen", country: "RU", region: "7200000000000" },
  { ru: "Томск", en: "Tomsk", country: "RU", region: "7000000000000" },
  { ru: "Владивосток", en: "Vladivostok", country: "RU", region: "2500000000000" },
];

const COUNTRY_ALIASES: Record<string, CountryCode> = {
  kz: "KZ",
  kazakhstan: "KZ",
  "казахстан": "KZ",
  "қазақстан": "KZ",
  "республика казахстан": "KZ",
  ru: "RU",
  russia: "RU",
  "россия": "RU",
  "российская федерация": "RU",
  "рф": "RU",
  uz: "UZ",
  uzbekistan: "UZ",
  "узбекистан": "UZ",
  "o'zbekiston": "UZ",
  kg: "KG",
  kyrgyzstan: "KG",
  "кыргызстан": "KG",
  "киргизия": "KG",
  "кыргызская республика": "KG",
  by: "BY",
  belarus: "BY",
  "беларусь": "BY",
  "белоруссия": "BY",
  "республика беларусь": "BY",
  az: "AZ",
  azerbaijan: "AZ",
  "азербайджан": "AZ",
  ge: "GE",
  georgia: "GE",
  "грузия": "GE",
  "сакартвело": "GE",
  am: "AM",
  armenia: "AM",
  "армения": "AM",
  tj: "TJ",
  tajikistan: "TJ",
  "таджикистан": "TJ",
  de: "DE",
  germany: "DE",
  "германия": "DE",
  gb: "GB",
  uk: "GB",
  "united kingdom": "GB",
  "великобритания": "GB",
  us: "US",
  usa: "US",
  "united states": "US",
  "сша": "US",
  pl: "PL",
  poland: "PL",
  "польша": "PL",
  nl: "NL",
  netherlands: "NL",
  "нидерланды": "NL",
};

export const COUNTRY_NAMES: Record<string, { ru: string; en: string }> = {
  KZ: { ru: "Казахстан", en: "Kazakhstan" },
  RU: { ru: "Россия", en: "Russia" },
  UZ: { ru: "Узбекистан", en: "Uzbekistan" },
  KG: { ru: "Кыргызстан", en: "Kyrgyzstan" },
  BY: { ru: "Беларусь", en: "Belarus" },
  AZ: { ru: "Азербайджан", en: "Azerbaijan" },
  GE: { ru: "Грузия", en: "Georgia" },
  AM: { ru: "Армения", en: "Armenia" },
  TJ: { ru: "Таджикистан", en: "Tajikistan" },
  DE: { ru: "Германия", en: "Germany" },
  GB: { ru: "Великобритания", en: "United Kingdom" },
  US: { ru: "США", en: "United States" },
  PL: { ru: "Польша", en: "Poland" },
  NL: { ru: "Нидерланды", en: "Netherlands" },
};

const norm = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/^г\.\s*|^город\s+/u, "")
    .replace(/[.,]+$/g, "")
    .trim();

export function findCity(value: string): City | undefined {
  const key = norm(value);
  if (!key) return undefined;
  return CITIES.find(
    (c) =>
      norm(c.ru) === key ||
      norm(c.en) === key ||
      (c.aliases ?? []).some((a) => norm(a) === key),
  );
}

export function countryCode(value: string): CountryCode | "" {
  const key = norm(value);
  if (!key) return "";
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  if (/^[a-z]{2}$/i.test(key)) return key.toUpperCase();
  return "";
}

/**
 * Resolve profile text into a search location. "Алматы, Казахстан" in one
 * field, or city + country separately, both work. Unknown cities are kept
 * as typed (providers accept free text) with the country if known.
 */
export function resolveLocation(cityText: string, countryText = "") {
  const parts = cityText.split(/\s*,\s*/).filter(Boolean);
  const cityPart = parts[0] ?? "";
  const countryPart = countryText || parts.slice(1).join(", ");
  const city = findCity(cityPart);
  const country = city?.country || countryCode(countryPart) || countryCode(cityPart);
  return {
    city: city ? city.ru : countryCode(cityPart) ? "" : cityPart.trim(),
    cityEn: city?.en ?? "",
    country,
    region: city?.region ?? "",
  };
}

export const countryName = (code: string, language: string) =>
  COUNTRY_NAMES[code]?.[language === "en" ? "en" : "ru"] ?? code;
