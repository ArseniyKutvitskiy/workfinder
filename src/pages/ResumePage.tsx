import type { useWorkspace } from "../hooks/useWorkspace.ts";
import type { Profile } from "../../shared/schemas.ts";
import { useState } from "react";
import { Sparkles, Download, FileText, FileCode, Save, Check } from "lucide-react";
import { markdown, download } from "../resume.ts";
import { resumeExportable, resumeFileName } from "../../shared/schemas.ts";
import { ResumePreview } from "../components.tsx";
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
  } = state;
  const exportable = resumeExportable(profile);
  const [manual, setManual] = useState(false);
  // Until the student publishes from the chat (or chooses to fill it in by hand),
  // this tab explains where the resume comes from instead of showing empty forms.
  if (!published && !manual && !dirty)
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
            <button className="text-button" onClick={() => setManual(true)}>
              {t("Fill it in manually")}
            </button>
          </div>
        </section>
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("A LITTLE POLISH. ALL YOU.")}</p>
          <h1>{t("Your story on paper.")}</h1>
          <p>{t("Edit your details, check the preview, and make it yours.")}</p>
        </div>
        <button
          className="primary-button"
          disabled={busy || !dirty}
          onClick={saveProfile}
        >
          {dirty ? <Save size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          {t(dirty ? "Save changes" : "Saved")}
        </button>
      </div>
      <div className="resume-layout">
        <section className="resume-editor">
          <fieldset disabled={busy}>
            <h3>{t("The details that make you, you.")}</h3>
            {(
              [
                ["name", t("Full name")],
                ["occupation", t("Field or desired role")],
                ["summary", t("About me")],
                ["city", t("City")],
                ["country", t("Country")],
                ["contact", t("Email or phone")],
                ["goals", t("Career interests")],
                ["experience", t("Work experience")],
                ["education", t("Education")],
                ["skills", t("Skills (comma-separated)")],
                ["projects", t("Projects")],
              ] as [keyof Profile, string][]
            ).map(([key, title]) => (
              <label
                key={key}
                className={
                  ["city", "country"].includes(key) ? "half-field" : undefined
                }
              >
                {title}
                {["name", "contact", "occupation", "city", "country"].includes(key) ? (
                  <input
                    value={profile[key as keyof Profile]}
                    maxLength={5000}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        [key]: e.target.value,
                      })
                    }
                  />
                ) : (
                  <textarea
                    value={profile[key as keyof Profile]}
                    maxLength={5000}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        [key]: e.target.value,
                      })
                    }
                  />
                )}
              </label>
            ))}
            <button className="text-button" onClick={() => navigate("chat")}>
              <Sparkles size={15} />
              {t("Start a conversation")}
            </button>
            <button className="text-button danger" onClick={() => reset()}>
              {t("Clear resume and chat")}
            </button>
          </fieldset>
        </section>
        <div>
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
              <button
                className="download-button"
                onClick={exportPdf}
                disabled={busy || !exportable}
              >
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
                onClick={() =>
                  download(
                    markdown(profile, language),
                    resumeFileName(profile.name, language) + ".md",
                    "text/markdown",
                  )
                }
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
                <button className="text-button" onClick={() => navigate("chat")}>
                  <Sparkles size={15} aria-hidden="true" />
                  {t("Fill in with the assistant")}
                </button>
              </div>
            )}
          </section>
          <div className="preview-caption">
            <span>{t("LIVE PREVIEW")}</span>
          </div>
          <ResumePreview profile={profile} />
        </div>
      </div>
    </>
  );
}
