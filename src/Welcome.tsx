import { MessageSquare, FileText, Briefcase, Check } from "lucide-react";
import { useLanguage } from "./LanguageContext.tsx";

/**
 * What a first-time visitor sees next to the sign-in form: what WorkFinder
 * does, in three steps, with a small preview of the result. Purely static.
 */
export function Welcome() {
  const { t } = useLanguage();
  const steps = [
    [MessageSquare, "Tell the assistant about yourself", "It asks simple questions about your studies, skills and plans — no forms to fill in."],
    [FileText, "Get a detailed resume", "The assistant turns your answers into a full resume. Edit it and download the PDF."],
    [Briefcase, "See jobs that fit you", "Jobs for your field: in your country and remote, with a match estimate and a cover letter."],
  ] as const;
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <p className="eyebrow">{t("FOR STUDENTS AND FIRST JOBS")}</p>
      <h1 id="welcome-title">
        {t("Your first job starts with a conversation.")}
      </h1>
      <p className="welcome-lead">
        {t("WorkFinder is a career assistant: it builds your resume in a chat and finds jobs that match it.")}
      </p>
      <ol className="welcome-steps">
        {steps.map(([Icon, title, text], i) => (
          <li key={title}>
            <span className="welcome-step-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div>
              <strong>
                {i + 1}. {t(title)}
              </strong>
              <p>{t(text)}</p>
            </div>
          </li>
        ))}
      </ol>
      {/* Decorative preview of the flow: a question, an answer, the resulting resume. */}
      <div className="welcome-preview" aria-hidden="true">
        <div className="welcome-bubble">{t("Where do you study, and what do you enjoy most?")}</div>
        <div className="welcome-bubble mine">{t("KazNU, 3rd year of marketing. I run a coffee shop’s Instagram.")}</div>
        <div className="welcome-sheet">
          <span className="welcome-sheet-name" />
          <span className="welcome-sheet-role" />
          <span className="welcome-sheet-line" />
          <span className="welcome-sheet-line short" />
          <div className="welcome-sheet-chips">
            <i>SMM</i>
            <i>Canva</i>
            <i>Reels</i>
          </div>
          <span className="welcome-sheet-done">
            <Check size={12} /> {t("Resume ready")}
          </span>
        </div>
      </div>
      <ul className="welcome-facts">
        <li>{t("Free")}</li>
        <li>{t("Kazakhstan, Russia and the CIS")}</li>
        <li>{t("No experience needed")}</li>
      </ul>
    </section>
  );
}
