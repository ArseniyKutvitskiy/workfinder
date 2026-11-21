import type { AiMode, Job, Profile } from "../shared/schemas.ts";
import type { PendingAction } from "./hooks/useWorkspace.ts";
import React from "react";
import {
  ArrowUpRight,
  Bookmark,
  MapPin,
  Sparkles,
  Check,
  X,
  Loader2,
} from "lucide-react";
export const Spinner = ({ size = 16 }: { size?: number }) => (
  <Loader2 size={size} className="spin" aria-hidden="true" />
);
import { useLanguage } from "./LanguageContext.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";
import { RESUME_SECTIONS, resumeSubtitle } from "./resume.ts";
import { formatSalary, postedAgo } from "./jobFormat.ts";

/** Provider placeholders that should not be shown as if they were data. */
const PLACEHOLDERS = new Set(["", "not specified", "не указано", "salary not listed"]);
export const known = (value?: string | null): value is string =>
  !!value && !PLACEHOLDERS.has(value.trim().toLowerCase());
/** "Berlin; Chemnitz, Sachsen; Dresden" → { first: "Berlin", more: 2 } */
export function shortLocation(location: string) {
  const parts = location
    .split(/\s*;\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { first: parts[0] ?? "", more: Math.max(0, parts.length - 1), full: parts.join(", ") };
}
/** "Бар Естествознание" → "БЕ", "SKY GROUP" → "SG", "Kaspi" → "K". */
export function companyInitials(company: string) {
  const words = company.replace(/[«»"'()]/g, " ").split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w));
  const skip = /^(тоо|ооо|ао|зао|оао|ип|llc|ltd|inc|gmbh)$/i;
  const main = words.filter((w) => !skip.test(w));
  const list = main.length ? main : words;
  return (list.length > 1 ? list[0][0] + list[1][0] : (list[0] ?? "?")[0]).toUpperCase();
}
export function JobCard({
  job,
  saved,
  onSave,
  onSelect,
}: {
  job: Job;
  saved: boolean;
  onSave: (id: string) => void;
  onSelect: (job: Job) => void;
  hasSkills: boolean;
}) {
  const { t, language } = useLanguage();
  const salary = formatSalary(job.salary, language);
  const posted = postedAgo(job.publishedAt, language);
  const place = known(job.location) ? shortLocation(job.location) : null;
  const facts = [
    job.remote ? t("Remote") : "",
    known(job.type) ? t(job.type) : "",
    known(job.level) ? t(job.level) : "",
  ].filter((v, i, all) => v && all.indexOf(v) === i);
  return (
    <article className="job-card">
      <header className="job-card-head">
        <span className="company-logo" style={{ "--logo": job.color } as React.CSSProperties} aria-hidden="true">
          {companyInitials(job.company)}
        </span>
        <span className="job-card-company">
          <span className="company-name" title={job.company}>
            {job.company}
          </span>
          {posted && <span className="job-posted">{posted}</span>}
        </span>
        <button
          className={`icon-button job-save ${saved ? "saved" : ""}`}
          onClick={() => onSave(job.id)}
          aria-label={t(saved ? "Unsave {title}" : "Save {title}", { title: t(job.title) })}
          aria-pressed={saved}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </header>
      <button className="job-title" onClick={() => onSelect(job)}>
        {t(job.title)}
      </button>
      <p className={`job-salary${salary ? "" : " none"}`}>{salary || t("Salary not listed")}</p>
      {(place || facts.length > 0) && (
        <ul className="job-facts">
          {place && (
            <li title={place.full}>
              <MapPin size={14} aria-hidden="true" />
              {t(place.first)}
              {place.more > 0 && ` +${place.more}`}
            </li>
          )}
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      {job.skills.length > 0 && (
        <div className="tags">
          {job.skills.slice(0, 3).map((s) => (
            <span key={s}>{t(s)}</span>
          ))}
        </div>
      )}
      <footer className="job-card-foot">
        <button className={`match-pill${job.score != null ? " scored" : ""}`} onClick={() => onSelect(job)}>
          <Sparkles size={13} aria-hidden="true" />
          {job.score != null ? t("{score}% match", { score: job.score }) : t("View fit")}
        </button>
        <button className="job-more" onClick={() => onSelect(job)} aria-label={t("Details: {title}", { title: t(job.title) })}>
          {t("Details")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
export function ResumePreview({ profile }: { profile: Profile }) {
  const { t } = useLanguage();
  const subtitle = resumeSubtitle(profile);
  return (
    <article className="resume-paper" id="resume-print">
      <div className="resume-line" />
      <h1>{profile.name || t("Your name")}</h1>
      <p className={`resume-contact ${!subtitle ? "placeholder" : ""}`}>
        {subtitle || t("Role · City, country · Email")}
      </p>
      {RESUME_SECTIONS.map(([label, key]) => (
        <section key={key}>
          <h2>{t(label)}</h2>
          <p className={!profile[key] ? "placeholder" : ""}>
            {profile[key] ||
              t("resume.placeholder", {
                section: t(label).toLowerCase(),
              })}
          </p>
        </section>
      ))}
    </article>
  );
}
export function JobDetails({
  job,
  profile,
  letter,
  busy,
  error,
  onClose,
  onGenerate,
  onLetter,
  onCopy,
  copied,
  onMatch,
  onSaveLetter,
  letterDirty,
  pendingAction,
  aiMode,
  saved,
  onSave,
  onOpenResume,
}: {
  job: Job;
  profile: Profile;
  letter?: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onGenerate: () => void;
  onLetter: (value: string) => void;
  onCopy: () => void;
  copied: boolean;
  onMatch: () => void;
  onSaveLetter: () => void;
  letterDirty: boolean;
  pendingAction: PendingAction;
  aiMode: AiMode;
  saved: boolean;
  onSave: (id: string) => void;
  onOpenResume: () => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => setExpanded(false), [job.id]);
  const matched = job.matched || [];
  const missing = job.missing || [];
  const place = shortLocation(job.location);
  const facts = [
    known(job.location) ? place.full : "",
    known(job.type) ? t(job.type) : "",
    known(job.level) ? t(job.level) : "",
    known(job.salary) ? t(job.salary) : "",
  ].filter(Boolean);
  const longText = job.description.length > 700;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="job-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-head">
          <span className="company-logo" style={{ "--logo": job.color } as React.CSSProperties} aria-hidden="true">
            {companyInitials(job.company)}
          </span>
          <div className="dialog-title">
            <p className="eyebrow">{job.company}</p>
            <h2 id="job-dialog-title">{t(job.title)}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close job details")}
            autoFocus
          >
            <X />
          </button>
        </header>
        {facts.length > 0 && (
          <ul className="fact-chips">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        )}
        <div className="dialog-actions">
          {job.url && (
            <a
              className="primary-button"
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("View original listing")}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          )}
          <button
            className="secondary-button"
            onClick={() => onSave(job.id)}
            aria-pressed={saved}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
            {t(saved ? "In saved" : "Add to saved")}
          </button>
        </div>

        <section className="fit-box" aria-labelledby="fit-title">
          <div className="fit-head">
            <strong id="fit-title">{t("Your skill match")}</strong>
            <strong className="fit-score">
              {job.score == null ? "—" : `${job.score}%`}
            </strong>
          </div>
          <div className="progress-track">
            <div style={{ width: `${job.score ?? 0}%` }} />
          </div>
          <p>
            {job.explanation ||
              t("Explore current opportunities and request an AI fit assessment.")}
          </p>
          {job.score != null && (matched.length > 0 || missing.length > 0) && (
            <div className="fit-lists">
              {matched.length > 0 && (
                <div>
                  <span>{t("Matching evidence")}</span>
                  <div className="tags tags-match">
                    {matched.map((s) => (
                      <span key={s}>
                        <Check size={11} aria-hidden="true" />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <span>{t("Missing requirements")}</span>
                  <div className="tags tags-missing">
                    {missing.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            className="secondary-button"
            onClick={onMatch}
            disabled={busy}
            aria-busy={pendingAction === "match"}
          >
            {pendingAction === "match" ? <Spinner /> : <Sparkles size={15} />}
            {t(pendingAction === "match" ? "Assessing fit…" : "Assess with AI")}
          </button>
        </section>

        <section className="letter-section" aria-labelledby="letter-title">
          <div className="letter-head">
            <div>
              <h3 id="letter-title">{t("Your cover letter")}</h3>
              <p className="muted small">
                {t("A draft based on your resume and this role. Review before sharing.")}
              </p>
            </div>
            <div className="letter-controls">
              <span className={`tiny-label ai-${aiMode}`}>
                {t(aiMode === "live" ? "Live AI" : "AI offline mode")}
              </span>
              <LanguageSwitcher />
            </div>
          </div>
          {!profile.name || !profile.skills ? (
            <div className="notice notice-action">
              <p>{t("Add your name and skills in My resume to generate a letter.")}</p>
              <button className="secondary-button" onClick={onOpenResume}>
                {t("Open My resume")}
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              onClick={onGenerate}
              disabled={busy}
              aria-busy={pendingAction === "letter"}
            >
              {pendingAction === "letter" ? <Spinner /> : <Sparkles size={16} />}
              {pendingAction === "letter"
                ? t("Writing your draft…")
                : letter
                  ? t("Regenerate draft")
                  : t("Generate cover letter")}
            </button>
          )}
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          {letter !== undefined && (
            <>
              <label htmlFor="letter" className="sr-only">
                {t("Edit your cover letter")}
              </label>
              <textarea
                id="letter"
                className="letter-editor"
                value={letter}
                disabled={busy}
                onChange={(e) => onLetter(e.target.value)}
              />
              <p className="ai-note">{t("ai.generatedNote")}</p>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  className="primary-button"
                  disabled={busy || !letterDirty}
                  onClick={onSaveLetter}
                >
                  {pendingAction === "save" && <Spinner />}
                  {t(
                    pendingAction === "save"
                      ? "Saving…"
                      : letterDirty
                        ? "Save changes"
                        : "Saved",
                  )}
                </button>
                <button className="secondary-button" onClick={onCopy}>
                  {copied ? <Check size={15} aria-hidden="true" /> : null}
                  {copied ? t("Copied!") : t("Copy letter")}
                </button>
                <span className="small muted">
                  {t("Drafts are saved separately for each language. Your edits are preserved.")}
                </span>
              </div>
            </>
          )}
        </section>

        {job.description && (
          <section className="description-section" aria-labelledby="desc-title">
            <h3 id="desc-title">{t("Job description")}</h3>
            <div
              className={`description ${longText && !expanded ? "clamped" : ""}`}
            >
              {t(job.description)}
            </div>
            {longText && (
              <button
                className="text-button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {t(expanded ? "Collapse" : "Show full description")}
              </button>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
