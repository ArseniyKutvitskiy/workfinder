import { useEffect, useRef } from "react";
import type { useWorkspace } from "../hooks/useWorkspace.ts";
import type { Profile, Message } from "../../shared/schemas.ts";
import { Sparkles, Send, Check, RotateCcw, Briefcase, FileText, Upload, PenLine } from "lucide-react";
import { firstMessage } from "../resume.ts";
import { BrandWord } from "../Brand.tsx";
import { chatSegments } from "../chatText.ts";
import { ResumeDocument } from "../ResumeDocument.tsx";
import { useLanguage } from "../LanguageContext.tsx";

export default function ChatPage(state: ReturnType<typeof useWorkspace>) {
  const {
    t,
    profile,
    messages,
    input,
    setInput,
    busy,
    error,
    chatEnd,
    percent,
    send,
    reset,
    aiMode,
    readiness,
    navigate,
    draft,
    composeResume,
    publishResume,
  } = state;
  // A draft is "open" until a later message publishes it.
  let draftIndex = -1;
  messages.forEach((m, i) => {
    if (m.draft) draftIndex = i;
  });
  const publishedAfterDraft = messages.slice(draftIndex + 1).some((m) => m.published);
  const answered = messages.filter((m) => m.role === "user").length;
  // Auto-grow the input with its text (up to ~5 lines); shrink back after sending.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [input]);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("START WITH A CONVERSATION")}</p>
          <h1>{t("Your experience matters.")}</h1>
          <p>
            {t(
              "Class projects, volunteering, side interests — it all starts somewhere.",
            )}
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => reset()}
          disabled={busy}
        >
          <RotateCcw size={15} />
          {t("Start over")}
        </button>
      </div>
      <div className="builder-layout">
        <section className="chat-panel">
          <div className="chat-header">
            <span className="assistant-icon">
              <Sparkles size={19} />
            </span>
            <div>
              <strong>{t("Resume assistant")}</strong>
              <span>
                {t(
                  aiMode === "live"
                    ? "Live AI · Responses stream in real time"
                    : "AI offline mode",
                )}
              </span>
            </div>
            {answered > 0 && (
              <span className="chat-step" title={t("Answers given")}>
                {t("chat.answers", { count: answered })}
              </span>
            )}
          </div>
          <div className="chat-messages" aria-label={t("Resume assistant")}>
            {(messages.length
              ? messages
              : [{ role: "assistant" as const, text: t(firstMessage) }]
            ).map((message: Message, i) => (
              <div key={i} className="message-group">
                <div className={`message ${message.role}`}>
                  <span className="message-label">
                    {message.role === "assistant" ? <BrandWord /> : t("You")}
                  </span>
                  {message.text ? (
                    <p>
                      {message.role === "assistant"
                        ? chatSegments(message.text).map((part, i) =>
                            part.bold ? <strong key={i}>{part.text}</strong> : part.text,
                          )
                        : message.text}
                    </p>
                  ) : (
                    <p className="typing" aria-label={t("Putting your answer into place…")}>
                      <span />
                      <span />
                      <span />
                    </p>
                  )}
                </div>
                {message.draft && (
                  <DraftCard
                    draft={message.draft}
                    latest={message.draft === draft && !publishedAfterDraft}
                    busy={busy}
                    onPublish={publishResume}
                  />
                )}
                {message.published && (
                  <div className="ready-card" role="status">
                    <strong>{t("Your resume is published")}</strong>
                    <p>{t("It is now in My resume, ready to download and to match jobs.")}</p>
                    <div className="card-actions">
                      <button className="primary-button" onClick={() => navigate("resume")}>
                        <FileText size={16} aria-hidden="true" />
                        {t("Open My resume")}
                      </button>
                      <button className="secondary-button" onClick={() => navigate("jobs")}>
                        <Briefcase size={16} aria-hidden="true" />
                        {t("Show my jobs")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && messages.at(-1)?.text && (
              <p className="muted small">{t("Putting your answer into place…")}</p>
            )}
            <div ref={chatEnd} />
          </div>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          {
            <form className="chat-form" onSubmit={send}>
              <label className="sr-only" htmlFor="chat-input">
                {t("Your answer")}
              </label>
              <textarea
                ref={inputRef}
                rows={1}
                id="chat-input"
                placeholder={t("Tell us a little about yourself…")}
                value={input}
                maxLength={5000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                disabled={busy}
              />
              <button
                className="send-button"
                disabled={!input.trim() || busy}
                aria-label={t("Send answer")}
              >
                <Send size={18} />
              </button>
              <span>{t("Enter to send · Shift + Enter for a new line")}</span>
            </form>
          }
        </section>
        <aside className="builder-aside">
          <p className="eyebrow">{t("YOUR STORY, TAKING SHAPE")}</p>
          <h3>{t("One step closer.")}</h3>
          <div className="flex justify-between small">
            <span>{t("Resume completeness")}</span>
            <strong>{percent}%</strong>
          </div>
          <div className="progress-track">
            <div
              style={{
                width: `${percent}%`,
              }}
            />
          </div>
          {(
            [
              [["name"], "Introduction", true],
              [["city", "country"], "City and country", true],
              [["occupation"], "Field of work", true],
              [["education"], "Education", true],
              [["courses"], "Courses", false],
              [["experience"], "Work experience", false],
              [["projects"], "Projects", false],
              [["skills"], "Your skills", true],
              [["strengths"], "Personal qualities", false],
              [["languages"], "Languages", false],
              [["achievements"], "Achievements", false],
              [["goals"], "Career interests", false],
              [["contact"], "Contact details", false],
            ] as [(keyof Profile)[], string, boolean][]
          ).map(([keys, title, required], i) => {
            const done = keys.some((k) => profile[k]?.trim());
            return (
              <div className="checklist-row" key={title}>
                <span className={done ? "done" : ""}>
                  {done ? <Check size={13} /> : i + 1}
                </span>
                {t(title)}
                {required && !done && (
                  <em className="required-mark" title={t("Needed to match jobs")}>
                    {t("needed")}
                  </em>
                )}
              </div>
            );
          })}
          <div className="tip-box">
            <Sparkles size={18} />
            <p>
              <strong>{t("A small tip")}</strong>
              {t(
                "You don’t have to sound impressive. Be specific about what you’ve done and what you’d love to learn.",
              )}
            </p>
          </div>
          <p className="small muted">
            {t(
              "AI features send your resume and chat to OpenAI when you use them. Do not include sensitive identifiers.",
            )}
          </p>
        </aside>
      </div>
    </>
  );
}

/** A composed resume shown inside the chat, with the publish action. */
function DraftCard({
  draft,
  latest,
  busy,
  onPublish,
}: {
  draft: Profile;
  latest: boolean;
  busy: boolean;
  onPublish: () => void;
}) {
  const { t } = useLanguage();
  return (
    <article className={`draft-card ${latest ? "" : "draft-old"}`} aria-label={t("Resume draft")}>
      <span className="draft-badge">{t(latest ? "Draft" : "Previous draft")}</span>
      <ResumeDocument profile={draft} compact />
      <p className="ai-note">{t("ai.generatedNote")}</p>
      {latest && (
        <footer>
          <button className="primary-button" onClick={onPublish} disabled={busy}>
            <Upload size={16} aria-hidden="true" />
            {t("Save resume")}
          </button>
          <span>
            <PenLine size={14} aria-hidden="true" />
            {t("Want changes? Just write them in the chat.")}
          </span>
        </footer>
      )}
    </article>
  );
}
