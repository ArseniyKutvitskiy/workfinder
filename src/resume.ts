import type { Profile } from "../shared/schemas.ts";
import { emptyProfile as sharedEmpty } from "../shared/schemas.ts";
import { normalizeLanguage, translate } from "../shared/i18n.ts";
import { RESUME_SECTIONS, resumeSubtitle, filledSections } from "../shared/resumeFormat.ts";

export const emptyProfile: Profile = { ...sharedEmpty };

export { RESUME_SECTIONS, resumeSubtitle };

export const firstMessage =
  "Hi! I’m your career assistant. Together we’ll build your resume step by step and then find jobs in your city. Let’s start: what’s your first and last name?";

export function markdown(profile: Profile, language: string) {
  return [
    `# ${profile.name || translate(language, "Your name")}`,
    resumeSubtitle(profile),
    ...filledSections(profile).flatMap(([title, , text]) => [`## ${translate(language, title)}`, text]),
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function download(text: string, filename: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
export function htmlResume(profile: Profile, language: string) {
  const locale = normalizeLanguage(language);
  const t = (key: string) => translate(locale, key);
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${escape(profile.name || t("Resume"))}</title><style>body{max-width:760px;margin:60px auto;padding:0 24px;font:16px/1.65 Georgia,serif;color:#152b27}h1{font-size:34px;margin-bottom:4px}.sub{color:#52645b}h2{font:600 15px Arial;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:8px;margin-top:32px}p{white-space:pre-wrap}@media print{body{margin:0}}</style><body><h1>${escape(profile.name || t("Your name"))}</h1><p class="sub">${escape(resumeSubtitle(profile))}</p>${filledSections(profile)
    .map(([label, , text]) => `<h2>${t(label)}</h2><p>${escape(text)}</p>`)
    .join("")}</body></html>`;
}
