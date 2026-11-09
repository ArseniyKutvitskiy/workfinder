import { navigation, defaultFilters, personalFilters } from "../workspaceConfig.ts";
import {
  profileReadiness,
  resumeFileName,
  isPublished,
  latestDraft,
} from "../../shared/schemas.ts";
import type { Profile } from "../../shared/schemas.ts";

import { useFeedback } from "../Feedback.tsx";
import type {
  Message,
  Job,
  Match,
  JobsResponse,
  AiMode,
} from "../../shared/schemas.ts";
/** Which AI/save action is running in the job dialog, for precise button labels. */
export type PendingAction = "letter" | "match" | "save" | null;
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "service.unavailable";
import { useEffect, useRef, useState } from "react";

import { api, request, streamChat, streamLetter } from "../api.ts";
import { emptyProfile } from "../resume.ts";
import { useLanguage } from "../LanguageContext.tsx";
import { useAuth } from "../AuthContext.tsx";
export function useWorkspace() {
  const notify = useFeedback();
  const { language, t, preferenceError } = useLanguage();
  const { client, session } = useAuth();
  const [profile, updateProfile] = useState(emptyProfile),
    [messages, setMessages] = useState<Message[]>([]),
    [saved, setSaved] = useState<string[]>([]),
    [letters, setLetters] = useState<Record<string, string>>({});
  const [view, setView] = useState("overview"),
    [mobileNav, setMobileNav] = useState(false),
    [isMobile, setIsMobile] = useState(
      () => window.matchMedia("(max-width: 640px)").matches,
    );
  const [input, setInput] = useState(""),
    [jobs, setJobs] = useState<Job[]>([]),
    [filters, setFilters] = useState(defaultFilters);
  const [sources, setSources] = useState<NonNullable<JobsResponse["sources"]>>(
    [],
  );
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [jobError, setJobError] = useState(""),
    [letterError, setLetterError] = useState("");
  const [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState(""),
    [dirty, setDirty] = useState(false),
    [dirtyLetters, setDirtyLetters] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [selectedSnapshot, setSelectedSnapshot] = useState<Job | null>(null),
    [analysis, setAnalysis] = useState<
      | (Match & {
          id: string | null;
          language: string;
        })
      | null
    >(null);
  const [copied, setCopied] = useState(false),
    [retry, setRetry] = useState(0),
    [confirmation, setConfirmation] = useState<string | null>(null);
  const [page, setPage] = useState(0),
    [pages, setPages] = useState(0),
    [total, setTotal] = useState(0),
    [template, setTemplate] = useState("modern");
  const [jobNotice, setJobNotice] = useState("");
  const [aiMode, setAiMode] = useState<AiMode>("live"),
    [pendingAction, setPendingAction] = useState<PendingAction>(null),
    [online, setOnline] = useState(() => navigator.onLine !== false);
  const version = useRef(0),
    chatEnd = useRef<HTMLDivElement>(null),
    dialogOrigin = useRef<HTMLElement | null>(null),
    activeChat = useRef<AbortController | null>(null);
  const readiness = profileReadiness(profile),
    completed = readiness.filled,
    percent = readiness.percent;
  const personalDefaults = personalFilters(profile);
  const selected = selectedSnapshot && {
    ...selectedSnapshot,
    ...(analysis?.id === selectedId && analysis?.language === language
      ? analysis
      : {}),
    id: selectedSnapshot.id,
  };
  const letterKey = selectedId + ":" + language;
  const setProfile = (value: Profile) => {
    updateProfile(value);
    setDirty(true);
    setAnalysis(null);
  };
  useEffect(() => {
    let active = true;
    api("workspace")
      .then((data) => {
        if (!active) return;
        updateProfile(data.profile);
        setFilters(personalFilters(data.profile));
        // Chat first: until the resume is ready, the assistant is the home screen.
        if (!profileReadiness(data.profile).ready) setView("chat");
        setMessages(data.messages);
        setSaved(data.saved);
        setLetters(data.letters);
        setAiMode(data.aiMode ?? "live");
        version.current = data.version;
        setReady(true);
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      });
    return () => {
      active = false;
      activeChat.current?.abort();
    };
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      notify("network.online", "success");
      setRetry((r) => r + 1);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [notify]);
  /** Surface whether the last AI result came from the provider or the offline engine. */
  /** Announce offline mode once when it starts, not after every message. */
  const fallbackAnnounced = useRef(false);
  function trackAi(fallback: boolean | undefined, success?: string) {
    setAiMode(fallback ? "fallback" : "live");
    if (fallback) {
      if (!fallbackAnnounced.current) notify("ai.fallback", "info");
      fallbackAnnounced.current = true;
    } else {
      fallbackAnnounced.current = false;
      if (success) notify(success, "success");
    }
  }
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || Object.values(dirtyLetters).some(Boolean)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, dirtyLetters]);
  useEffect(() => {
    if (!ready || !["overview", "jobs", "saved"].includes(view)) return;
    // Jobs are matched to the published resume; before that there is nothing to match.
    if (view !== "saved" && !isPublished(messages)) {
      setLoading(false);
      setJobs([]);
      setTotal(0);
      setPages(0);
      setSources([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setJobError("");
    const timer = setTimeout(
      () =>
        api(
          view === "saved" ? "saved-jobs" : "jobs",
          view === "saved"
            ? {
                page,
              }
            : {
                ...filters,
                page,
              },
          controller.signal,
        )
          .then((data) => {
            setJobs(data.jobs);
            setSources(data.sources || []);
            setJobNotice(data.notice ?? "");
            setPages(data.pages);
            setTotal(data.total);
          })
          .catch((e) => {
            if (e.name !== "AbortError") setJobError(errorMessage(e));
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ready, filters, view, page, retry, isPublished(messages)]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, view]);
  useEffect(() => {
    setCopied(false);
  }, [language]);
  useEffect(() => {
    if (!selectedId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
      if (e.key === "Tab") {
        const items = [
          ...document.querySelectorAll<HTMLElement>(
            ".job-dialog button:not(:disabled), .job-dialog textarea, .job-dialog a[href]",
          ),
        ];
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
      dialogOrigin.current?.focus();
    };
  }, [selectedId]);
  function navigate(next: string) {
    setView(next);
    setMobileNav(false);
    setError("");
    setPage(0);
  }
  const detailRequest = useRef(0);
  async function selectJob(job: Job) {
    const sequence = ++detailRequest.current;
    dialogOrigin.current = document.activeElement as HTMLElement;
    setSelectedSnapshot(job);
    setSelectedId(job.id);
    setAnalysis(null);
    setLetterError("");
    setCopied(false);
    try {
      const result = await api("job", {
        jobId: job.id,
        language,
      });
      if (sequence === detailRequest.current) setSelectedSnapshot(result.job);
    } catch (e) {
      if (sequence === detailRequest.current) setLetterError(errorMessage(e));
    }
  }
  const bookmarkPending = useRef(new Set<string>());
  async function toggleSave(id: string) {
    if (bookmarkPending.current.has(id)) return;
    bookmarkPending.current.add(id);
    const value = !saved.includes(id);
    setSaved((prev) =>
      value ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
    try {
      await api("bookmark", {
        jobId: id,
        saved: value,
      });
      notify("Changes saved");
      if (view === "saved") setRetry((x) => x + 1);
    } catch (e) {
      setSaved((prev) =>
        value ? prev.filter((x) => x !== id) : [...new Set([...prev, id])],
      );
      // A failed bookmark must not replace the whole job list with an error state.
      notify(errorMessage(e), "error");
    } finally {
      bookmarkPending.current.delete(id);
    }
  }
  async function persistProfile() {
    if (!dirty) return;
    const result = await api("resume", {
      profile,
      version: version.current,
      language,
    });
    version.current = result.version;
    if (result.messages) setMessages(result.messages);
    setDirty(false);
  }
  async function saveProfile() {
    setBusy(true);
    setError("");
    try {
      await persistProfile();
      // Edits to city, country or role re-target the job search.
      setFilters(personalFilters(profile));
      notify("Changes saved");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(
    e?: React.FormEvent | null,
    button?: { text: string; action: "compose" | "publish" },
  ) {
    e?.preventDefault();
    const text = (button?.text ?? input).trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    // The message now lives in the conversation; clear the box right away.
    if (!button) setInput("");
    const previous = messages;
    activeChat.current = new AbortController();
    setMessages([
      ...previous,
      {
        role: "user",
        text,
      },
      {
        role: "assistant",
        text: "",
      },
    ]);
    try {
      const result = await streamChat(
        {
          profile,
          version: version.current,
          message: text,
          language,
          ...(button ? { action: button.action } : {}),
        },
        (delta) =>
          setMessages((current) =>
            current.map((m, i) =>
              i === current.length - 1
                ? {
                    ...m,
                    text: m.text + delta,
                  }
                : m,
            ),
          ),
        activeChat.current.signal,
      );
      updateProfile(result.profile);
      const wasReady = profileReadiness(profile).ready;
      if (profileReadiness(result.profile).ready) {
        // Keep job search in sync with what the student just told the assistant.
        setFilters(personalFilters(result.profile));
        if (!wasReady) notify("Your resume is ready! Jobs are now matched to you.", "success");
      }
      setMessages(result.messages);
      version.current = result.version;
      if (result.messages.at(-1)?.published) notify("Resume published", "success");
      setDirty(false);
      setAnalysis(null);
      trackAi(result.fallback);
    } catch (e) {
      setMessages(previous);
      // Give the unsent text back (unless the student already typed something new).
      if (!button) setInput((current) => current || text);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      activeChat.current = null;
    }
  }
  async function reset(confirmed = false) {
    if (confirmed !== true) {
      setConfirmation("reset");
      return;
    }
    setBusy(true);
    try {
      const r = await api("reset", {
        version: version.current,
      });
      updateProfile(r.profile);
      setMessages([]);
      version.current = r.version;
      setDirty(false);
      setInput("");
      setAnalysis(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    const id = selectedId,
      key = id + ":" + language,
      previous = letters[key];
    setBusy(true);
    setPendingAction("letter");
    setLetterError("");
    try {
      await persistProfile();
      let draft = "";
      const r = await streamLetter(
        {
          jobId: id,
          language,
        },
        (delta) => {
          draft += delta;
          setLetters((prev) => ({
            ...prev,
            [key]: draft,
          }));
        },
      );
      setLetters((prev) => ({
        ...prev,
        [key]: r.letter,
      }));
      setDirtyLetters((prev) => ({
        ...prev,
        [key]: false,
      }));
      setCopied(false);
      trackAi(r.fallback, "Cover letter saved");
    } catch (e) {
      setLetters((prev) => {
        const next = {
          ...prev,
        };
        if (previous === undefined) delete next[key];
        else next[key] = previous;
        return next;
      });
      setLetterError(errorMessage(e));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }
  async function saveLetter() {
    setBusy(true);
    setPendingAction("save");
    setLetterError("");
    try {
      await api("letter", {
        jobId: selectedId,
        language,
        letter: letters[letterKey],
      });
      setDirtyLetters((prev) => ({
        ...prev,
        [letterKey]: false,
      }));
      notify("Changes saved");
    } catch (e) {
      setLetterError(errorMessage(e));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }
  async function evaluateMatch() {
    setBusy(true);
    setPendingAction("match");
    setLetterError("");
    try {
      await persistProfile();
      const r = await api("match", {
        jobId: selectedId,
        language,
      });
      setAnalysis({
        ...r,
        id: selectedId,
        language,
      });
      trackAi(r.fallback);
    } catch (e) {
      setLetterError(errorMessage(e));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }
  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letters[letterKey]);
      setCopied(true);
      notify("Copied!");
    } catch {
      setLetterError(
        "Clipboard access is unavailable. Select the letter text and copy it manually.",
      );
    }
  }
  async function exportPdf() {
    setBusy(true);
    setError("");
    try {
      await persistProfile();
      const r = await request("resume/pdf", {
        language,
        template,
      });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = resumeFileName(profile.name, language) + ".pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    try {
      const result = await client.auth.signOut();
      if (result.error) throw result.error;
    } catch {
      setError("service.unavailable");
      setLoadError("service.unavailable");
    }
  }
  useEffect(() => {
    document.title =
      t(navigation.find((n) => n[0] === view)?.[2] || "Overview") +
      " · workfinder.";
  }, [view, t]);
  useEffect(()=>{setPage(0);},[filters]);
  const visibleJobs = view === "overview" ? jobs.slice(0, 3) : jobs;
  return {
    notify,
    aiMode,
    pendingAction,
    online,
    language,
    t,
    preferenceError,
    client,
    session,
    profile,
    updateProfile,
    messages,
    setMessages,
    saved,
    setSaved,
    letters,
    setLetters,
    view,
    setView,
    mobileNav,
    setMobileNav,
    isMobile,
    setIsMobile,
    input,
    setInput,
    jobs,
    setJobs,
    filters,
    setFilters,
    sources,
    setSources,
    loading,
    setLoading,
    busy,
    setBusy,
    error,
    setError,
    jobError,
    setJobError,
    letterError,
    setLetterError,
    ready,
    setReady,
    loadError,
    setLoadError,
    dirty,
    setDirty,
    dirtyLetters,
    setDirtyLetters,
    selectedId,
    setSelectedId,
    selectedSnapshot,
    setSelectedSnapshot,
    analysis,
    setAnalysis,
    copied,
    setCopied,
    retry,
    setRetry,
    confirmation,
    setConfirmation,
    page,
    setPage,
    pages,
    setPages,
    total,
    setTotal,
    template,
    setTemplate,
    version,
    chatEnd,
    dialogOrigin,
    activeChat,
    completed,
    percent,
    readiness,
    personalDefaults,
    published: isPublished(messages),
    draft: latestDraft(messages),
    composeResume: () => send(null, { text: t("Compose my resume"), action: "compose" }),
    publishResume: () => send(null, { text: t("Publish my resume"), action: "publish" }),
    jobNotice,
    selected,
    letterKey,
    setProfile,
    navigate,
    detailRequest,
    selectJob,
    toggleSave,
    persistProfile,
    saveProfile,
    send,
    reset,
    generate,
    saveLetter,
    evaluateMatch,
    copyLetter,
    exportPdf,
    signOut,
    visibleJobs,
  };
}
