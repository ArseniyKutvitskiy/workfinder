import type { useWorkspace } from "../hooks/useWorkspace.ts";
import type { Profile } from "../../shared/schemas.ts";
import { useState } from "react";
import { Sparkles, Download, FileText, FileCode, Save, Check, PenLine, X, CircleDashed } from "lucide-react";
import { markdown, download } from "../resume.ts";
import { resumeExportable, resumeFileName, sectionText } from "../../shared/schemas.ts";
import { RESUME_SECTIONS } from "../../shared/resumeFormat.ts";
import { ResumeDocument } from "../ResumeDocument.tsx";

/** Header fields edited as single lines; the rest are multi-line sections. */
const BASICS: [keyof Profile, string][] = [
  ["name", "Full name"],
  ["occupation", "Field or desired role"],
  ["city", "City"],
  ["country", "Country"],
  ["contact", "Email or phone"],
];
const LIST_SECTIONS = new Set<keyof Profile>(["experience", "education", "courses", "projects", "strengths", "languages", "achievements"]);

export default function ResumePage(state: ReturnType<typeof useWorkspace>) {
  const {
    language,
    t,
    profile,
    busy,
    dirty,
    template,
    setTemplate,
    setProfile,
    navigate,
    saveProfile,
    reset,
    exportPdf,
    published,
    draft,
    deleteAccount,
  } = state;
  const exportable = resumeExportable(profile);
  const [manual, setManual] = useState(false);
  // Snapshot taken when editing starts, so "Cancel" restores it.
  const [editing, setEditing] = useState<Profile | null>(null);

  // Until the student saves a resume from the chat (or chooses to fill it in by hand),
  // this tab explains where the resume comes from instead of showing empty forms.
  if (!published && !manual && !dirty && !editing)
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">{t("A LITTLE POLISH. ALL YOU.")}</p>
            <h1>{t("Your story on paper.")}</h1>
          </div>
        </div>
        <section className="resume-empty">
          <span className="resume-empty-icon" aria-hidden="true">
            <FileText size={28} />
          </span>
          <h2>{t(draft ? "Your draft is waiting in the chat" : "Your resume will appear here")}</h2>
          <p>
            {t(
              draft
                ? "Review the draft the assistant composed, ask for changes if needed, and press «Publish resume»."
                : "Answer a few questions in the chat — the assistant will compose a complete resume for you. After you publish it, it appears here in full, ready to edit and download.",
            )}
          </p>
          <div className="card-actions">
            <button className="primary-button" onClick={() => navigate("chat")}>
              <Sparkles size={16} aria-hidden="true" />
              {t(draft ? "Open the draft" : "Continue in chat")}
            </button>
            <button
              className="text-button"
              onClick={() => {
                setManual(true);
                setEditing(profile);
              }}
            >
              {t("Fill it in manually")}
            </button>
          </div>
        </section>
      </>
    );

  const sections = RESUME_SECTIONS.map(([label, key]) => ({ label, key, filled: !!sectionText(profile[key]) }));
  const filled = sections.filter((s) => s.filled).length;
  const update = (key: keyof Profile, value: string) => setProfile({ ...profile, [key]: value });

  if (editing)
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">{t("YOUR RESUME")}</p>
            <h1>{t("Editing your resume")}</h1>
            <p>{t("Changes are saved to My resume and used to match jobs.")}</p>
          </div>
        </div>
        <form
          className="resume-edit"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveProfile();
            setEditing(null);
          }}
        >
          <fieldset disabled={busy}>
            <section className="resume-edit-group">
              <h3>{t("Basics")}</h3>
              <div className="resume-edit-grid">
                {BASICS.map(([key, title]) => (
                  <label key={key}>
                    {t(title)}
                    <input value={profile[key]} maxLength={key === "occupation" ? 300 : 120} onChange={(e) => update(key, e.target.value)} />
                  </label>
                ))}
              </div>
            </section>
            {RESUME_SECTIONS.map(([label, key]) => (
              <section className="resume-edit-group" key={key}>
                <h3>{t(label)}</h3>
                <label>
                  <span className="sr-only">{t(label)}</span>
                  <textarea
                    value={sectionText(profile[key])}
                    maxLength={5000}
                    rows={key === "skills" || key === "goals" ? 3 : 6}
                    placeholder={LIST_SECTIONS.has(key) ? t("Each item on a new line") : undefined}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              </section>
            ))}
            <div className="danger-zone">
              <button type="button" className="text-button danger" onClick={() => reset()}>
                {t("Clear resume and chat")}
              </button>
              <button type="button" className="text-button danger" onClick={() => deleteAccount()}>
                {t("Delete account and all data")}
              </button>
            </div>
          </fieldset>
          <div className="resume-edit-bar">
            <span>{dirty ? t("Unsaved changes") : t("Saved")}</span>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                setProfile(editing);
                setEditing(null);
              }}
            >
              <X size={15} aria-hidden="true" />
              {t("Cancel")}
            </button>
            <button className="primary-button" disabled={busy || !dirty}>
              <Save size={15} aria-hidden="true" />
              {t("Save changes")}
            </button>
          </div>
        </form>
      </>
    );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("YOUR RESUME")}</p>
          <h1>{t("A resume that works for you.")}</h1>
          <p>{t("Review it, download it, or improve it with the assistant.")}</p>
        </div>
        <div className="card-actions">
          <button className="secondary-button" onClick={() => navigate("chat")}>
            <Sparkles size={15} aria-hidden="true" />
            {t("Improve with the assistant")}
          </button>
          <button className="primary-button" onClick={() => setEditing(profile)}>
            <PenLine size={15} aria-hidden="true" />
            {t("Edit")}
          </button>
        </div>
      </div>
      <div className="resume-view">
        <div className="resume-sheet">
          <ResumeDocument profile={profile} />
        </div>
        <aside className="resume-side">
          <section className="download-panel" aria-labelledby="download-title">
            <div className="download-head">
              <h3 id="download-title">{t("Download resume")}</h3>
              <div className="segmented" role="radiogroup" aria-label={t("PDF template")}>
                {(["modern", "classic"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={template === id}
                    className={template === id ? "active" : ""}
                    onClick={() => setTemplate(id)}
                  >
                    {t(id === "modern" ? "Modern" : "Classic")}
                  </button>
                ))}
              </div>
            </div>
            <div className="download-actions">
              <button className="download-button" onClick={exportPdf} disabled={busy || !exportable}>
                <FileText size={18} aria-hidden="true" />
                <span>
                  <strong>PDF</strong>
                  <small>{t("For employers and printing")}</small>
                </span>
                <Download size={16} aria-hidden="true" />
              </button>
              <button
                className="download-button"
                disabled={!exportable}
                onClick={() => download(markdown(profile, language), resumeFileName(profile.name, language) + ".md", "text/markdown")}
              >
                <FileCode size={18} aria-hidden="true" />
                <span>
                  <strong>Markdown</strong>
                  <small>{t("Plain text for editing")}</small>
                </span>
                <Download size={16} aria-hidden="true" />
              </button>
            </div>
            {exportable ? (
              <p className="download-note">{t("PDFs are saved privately in your account")}</p>
            ) : (
              <div className="download-empty" role="status">
                <p>{t("resume.emptyHint")}</p>
              </div>
            )}
          </section>
          <section className="resume-strength">
            <h3>{t("How complete is your resume")}</h3>
            <p className="small muted">{t("resume.sectionsFilled", { filled, total: sections.length })}</p>
            <div className="progress-track">
              <div style={{ width: `${Math.round((filled / sections.length) * 100)}%` }} />
            </div>
            <ul>
              {sections.map((s) => (
                <li key={s.key} className={s.filled ? "done" : ""}>
                  {s.filled ? <Check size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
                  <span>{t(s.label)}</span>
                  {!s.filled && <em>{t("Not filled yet")}</em>}
                </li>
              ))}
            </ul>
            {filled < sections.length && (
              <button className="text-button" onClick={() => navigate("chat")}>
                <Sparkles size={15} aria-hidden="true" />
                {t("Add with the assistant")}
              </button>
            )}
          </section>
          <button type="button" className="text-button danger resume-delete" onClick={() => deleteAccount()}>
            {t("Delete account and all data")}
          </button>
          <p className="small muted resume-saved-note">
            <Check size={14} aria-hidden="true" />
            {t(dirty ? "Unsaved changes" : "Saved in your account")}
          </p>
        </aside>
      </div>
    </>
  );
}
