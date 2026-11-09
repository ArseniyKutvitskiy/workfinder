import type { useWorkspace } from "../hooks/useWorkspace.ts";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  FileText,
  BriefcaseBusiness,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";
export default function OverviewPage(state: ReturnType<typeof useWorkspace>) {
  const { t, profile, completed, navigate } = state;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("YOUR NEXT CHAPTER STARTS HERE")}</p>
          <h1>
            {t("Make room for what’s next")}
            <span className="green">.</span>
          </h1>
          <p>
            {t("Your skills. Your ambitions. A little help finding your way.")}
          </p>
        </div>
        <button
          className="secondary-button sample-button"
          onClick={() => navigate("chat")}
        >
          <Sparkles size={15} />
          {t("Start a conversation")}
        </button>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span />
            {t("BUILT FOR YOUR BEGINNING")}
          </span>
          <h2>
            {t("You have potential.")}
            <br />
            {t("Let’s put it to work.")}
          </h2>
          <p>
            {t("Turn your experiences into a standout resume,")}{" "}
            <br className="desktop-break" />
            {t("discover your fit, and take the first step.")}
          </p>
          <button className="cream-button" onClick={() => navigate("chat")}>
            {completed ? t("Continue your resume") : t("Build my first resume")}
            <ArrowUpRight size={18} />
          </button>
          <div className="hero-footnote">
            <Check size={14} />
            {t("No experience? No problem.")}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-star">✳</div>
          <div className="floating-note note-top">
            <span className="note-icon">
              <Check size={18} />
            </span>
            <div>
              {t("Your story, polished")}
              <span>{t("One conversation away")}</span>
            </div>
          </div>
          <div className="resume-mini">
            <div className="mini-header">
              <span className="mini-avatar" />
              <div>
                <b>{t("YOUR NEXT CHAPTER")}</b>
                <i />
              </div>
              <Sparkles size={17} />
            </div>
            <div className="mini-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="mini-label">{t("THE SKILLS YOU BRING")}</div>
            <div className="mini-tags">
              <span>{t("Curiosity")}</span>
              <span>{t("Creativity")}</span>
            </div>
            <div className="mini-lines bottom">
              <i />
              <i />
            </div>
            <span className="mini-stamp">
              <ArrowUpRight size={28} />
            </span>
          </div>
          <div className="floating-note note-bottom">
            <span>↗</span>
            <div>
              {t("A future that fits you")}
              <span>{t("Start with what you know")}</span>
            </div>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <h2>{t("A little progress. A lot of possibility.")}</h2>
        <span>{t("Your career toolkit")}</span>
      </div>
      <div className="tool-grid">
        {(
          [
            [
              MessageSquare,
              "01",
              t("Tell your story"),
              t("Chat your way to a resume that shows what you can do."),
              t("Start a conversation"),
              "chat",
            ],
            [
              BriefcaseBusiness,
              "02",
              t("Find your fit"),
              t("Discover student-friendly roles matched to your skills."),
              t("Explore opportunities"),
              "jobs",
            ],
            [
              FileText,
              "03",
              t("Make it personal"),
              t("Turn a job you love into a tailored cover letter."),
              t("Find a role to write for"),
              "jobs",
            ],
          ] as [LucideIcon, string, string, string, string, string][]
        ).map(([Icon, number, title, text, action, dest]) => (
          <button
            className="tool-card"
            key={number}
            onClick={() => navigate(dest)}
          >
            <div className="flex justify-between items-center">
              <span className={`tool-icon icon-${number}`}>
                <Icon size={21} />
              </span>
              <span className="step-number">{number}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="tool-action">
              {action}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <div className="section-heading jobs-heading">
        <div>
          <h2>{t("Opportunities to get you going")}</h2>
          <p>
            {profile.skills
              ? t(
                  "Explore current opportunities and request an AI fit assessment.",
                )
              : t("A few places your next chapter could begin.")}
          </p>
        </div>
        <button className="text-button" onClick={() => navigate("jobs")}>
          {t("View all jobs")}
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
