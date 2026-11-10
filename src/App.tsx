import { useCallback } from "react";
import { navigation, defaultFilters } from "./workspaceConfig.ts";

import ResumePage from "./pages/ResumePage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import OverviewPage from "./pages/OverviewPage.tsx";
import { useWorkspace } from "./hooks/useWorkspace.ts";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Menu,
  Briefcase,
  MessageSquare,
  Sparkles,
  X,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { JobCard, JobDetails } from "./components.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";
import { Splash, SplashError } from "./Splash.tsx";
import { Brand, BrandWord } from "./Brand.tsx";
import { Avatar, userIdentity } from "./Avatar.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import {
  CITIES,
  CIS_COUNTRIES,
  CURRENCY_BY_COUNTRY,
  countryName,
  currencyFor,
} from "../shared/geo.ts";
import { JOB_SOURCES, SOURCE_LABELS } from "../shared/schemas.ts";
export default function App() {
  const state = useWorkspace();
  const {
    t,
    preferenceError,
    session,
    profile,
    saved,
    letters,
    setLetters,
    view,
    mobileNav,
    setMobileNav,
    isMobile,
    filters,
    setFilters,
    sources,
    loading,
    busy,
    error,
    jobError,
    letterError,
    ready,
    loadError,
    dirty,
    dirtyLetters,
    setDirtyLetters,
    selectedId,
    setSelectedId,
    copied,
    setCopied,
    setRetry,
    confirmation,
    setConfirmation,
    page,
    setPage,
    pages,
    total,
    selected,
    letterKey,
    navigate,
    selectJob,
    toggleSave,
    reset,
    generate,
    saveLetter,
    evaluateMatch,
    copyLetter,
    signOut,
    deleteAccount,
    visibleJobs,
    readiness,
    personalDefaults,
    jobNotice,
    published,
    draft,
    language,
    aiMode,
    pendingAction,
    online,
  } = state;
  const identity = userIdentity(session!.user, profile.name);
  const closeConfirmation = useCallback(() => setConfirmation(null), [setConfirmation]);
  // Jobs are shown only for a published resume (saved jobs are always available).
  const jobsLocked = !published && (view === "jobs" || view === "overview");
  const filtersChanged =
    JSON.stringify(filters) !== JSON.stringify(personalDefaults);
  if (loadError) return <SplashError message={loadError} onSignOut={signOut} />;
  if (!ready) return <Splash stage="data" />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
      </a>
      <aside
        className={`sidebar ${mobileNav ? "open" : ""}`}
        inert={!!selectedId || !!confirmation || (isMobile && !mobileNav)}
      >
        <a
          className="brand-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <Brand />
        </a>
        <button
          className="mobile-close icon-button"
          onClick={() => setMobileNav(false)}
          aria-label={t("Close navigation")}
        >
          <X />
        </button>
        <div className="workspace-label">{t("YOUR WORKSPACE")}</div>
        <nav>
          {navigation.map(([key, Icon, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => navigate(key)}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon size={19} />
              {t(label)}
              {key === "saved" && (
                <span className="nav-count">{saved.length}</span>
              )}
              {key === "chat" && <span className="ai-tag">{t("AI")}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="student-card">
            <GraduationCap size={23} />
            <h3>
              {t("Big potential.")}
              <br />
              {t("First steps.")}
            </h3>
            <p>{t("You don’t need years of experience to get started.")}</p>
            <button onClick={() => navigate("chat")}>
              {t("Let’s build your story")}
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="profile-chip">
            <span className="avatar-wrap">
              <Avatar user={session!.user} resumeName={profile.name} />
              <span
                className={`presence ${online ? "" : "offline"}`}
                title={t(online ? "Connected workspace" : "network.offline")}
              />
            </span>
            <div>
              <strong>{identity.name || t("Your workspace")}</strong>
              <span>{identity.email}</span>
            </div>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label={t("Close navigation overlay")}
        />
      )}
      <div
        className="main-shell"
        inert={!!selectedId || !!confirmation || (isMobile && mobileNav)}
      >
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(true)}
              aria-label={t("Open navigation")}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              {t("Workspace")}
              <ChevronRight size={14} />{" "}
              <strong>
                {t(navigation.find((n) => n[0] === view)?.[2] || "Overview")}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <LanguageSwitcher />
            <button
              className="text-button"
              onClick={signOut}
              disabled={
                busy || dirty || Object.values(dirtyLetters).some(Boolean)
              }
            >
              {t("Sign out")}
            </button>
            {/* Status badge only when something needs the user's attention. */}
            {(!online || aiMode === "fallback") && (
              <span
                className="demo-badge degraded"
                title={t(!online ? "network.offline" : "ai.fallback")}
              >
                <span />
                {t(!online ? "Offline" : "AI offline mode")}
              </span>
            )}
            <Avatar
              user={session!.user}
              resumeName={profile.name}
              size={30}
              className="top-avatar"
            />
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {!online && (
            <p className="notice offline-banner" role="status">
              {t("network.offline")}
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          {dirty && <p className="notice">{t("Unsaved resume changes")}</p>}
          {preferenceError && (
            <p className="notice" role="status">
              {t(
                "Language preference could not be saved. It will apply only to this session.",
              )}
            </p>
          )}
          {view === "overview" && <OverviewPage {...state} />}
          {(view === "jobs" || view === "saved") && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {t("OPPORTUNITY LOOKS GOOD ON YOU")}
                  </p>
                  <h1>
                    {view === "saved"
                      ? t("Your shortlist.")
                      : t("Find your next beginning.")}
                  </h1>
                  <p>
                    {view === "saved"
                      ? t(
                          "Keep the roles you love close. Take the next step when you’re ready.",
                        )
                      : t(
                          "Explore opportunities. Check experience and location requirements.",
                        )}
                  </p>
                </div>
              </div>
              {view === "jobs" && !jobsLocked && readiness.ready && !filtersChanged && (
                <p className="match-note">
                  <Sparkles size={15} aria-hidden="true" />
                  {t("Matched to your resume: {role} · {place}", {
                    role: personalDefaults.keyword || t("any role"),
                    place:
                      [personalDefaults.city, countryName(personalDefaults.country, language)]
                        .filter(Boolean)
                        .join(", ") || t("anywhere"),
                  })}
                </p>
              )}
              {view === "jobs" && !jobsLocked && (
                <section className="filters" aria-label={t("Search jobs")}>
                  <label className="search-field">
                    <Search size={18} aria-hidden="true" />
                    <input
                      type="search"
                      aria-label={t("Search jobs")}
                      placeholder={t("Job title, company, or skill")}
                      value={filters.keyword}
                      onChange={(e) =>
                        setFilters({ ...filters, keyword: e.target.value })
                      }
                    />
                  </label>
                  <div className="filter-grid">
                    <label className="field">
                      <span>{t("Country")}</span>
                      <select
                        value={filters.country}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            country: e.target.value,
                            city: "",
                            currency: e.target.value
                              ? currencyFor(e.target.value)
                              : filters.currency,
                          })
                        }
                      >
                        <option value="">{t("Anywhere (remote)")}</option>
                        <optgroup label={t("CIS countries")}>
                          {CIS_COUNTRIES.map((code) => (
                            <option key={code} value={code}>
                              {countryName(code, language)}
                            </option>
                          ))}
                        </optgroup>
                        {filters.country &&
                          !(CIS_COUNTRIES as readonly string[]).includes(filters.country) && (
                            <option value={filters.country}>
                              {countryName(filters.country, language)}
                            </option>
                          )}
                      </select>
                    </label>
                    <label className="field">
                      <span>{t("City")}</span>
                      <input
                        list="city-suggestions"
                        value={filters.city}
                        placeholder={t(filters.country ? "Any city" : "—")}
                        disabled={!filters.country}
                        maxLength={120}
                        onChange={(e) =>
                          setFilters({ ...filters, city: e.target.value })
                        }
                      />
                      <datalist id="city-suggestions">
                        {CITIES.filter((c) => c.country === filters.country).map((c) => (
                          <option key={c.ru} value={language === "en" ? c.en : c.ru} />
                        ))}
                      </datalist>
                    </label>
                    <label className="field">
                      <span>{t("Experience level")}</span>
                      <select
                        value={filters.level}
                        onChange={(e) =>
                          setFilters({ ...filters, level: e.target.value })
                        }
                      >
                        <option value="">{t("All experience levels")}</option>
                        {["No experience", "Entry level", "Experienced"].map(
                          (x) => (
                            <option key={x} value={x}>
                              {t(x)}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="field">
                      <span>{t("Work format")}</span>
                      <select
                        value={filters.remote}
                        onChange={(e) =>
                          setFilters({ ...filters, remote: e.target.value })
                        }
                      >
                        <option value="">{t("Any work format")}</option>
                        <option value="remote">{t("Remote")}</option>
                        <option value="onsite">{t("Onsite")}</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>{t("Role type")}</span>
                      <select
                        value={filters.roleType}
                        onChange={(e) =>
                          setFilters({ ...filters, roleType: e.target.value })
                        }
                      >
                        <option value="">{t("Any role type")}</option>
                        <option value="full">{t("Full-time")}</option>
                        <option value="part">{t("Part-time")}</option>
                        <option value="project">{t("Contract")}</option>
                        <option value="probation">{t("Internship")}</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>{t("Job source")}</span>
                      <select
                        value={filters.source}
                        onChange={(e) =>
                          setFilters({ ...filters, source: e.target.value })
                        }
                      >
                        <option value="all">{t("All sources")}</option>
                        {JOB_SOURCES.map((id) => (
                          <option key={id} value={id}>
                            {SOURCE_LABELS[id]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="field">
                      <span id="salary-label">{t("Minimum salary")}</span>
                      <div className="field-group">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="10000000"
                          step="10000"
                          placeholder="0"
                          aria-labelledby="salary-label"
                          value={filters.salary || ""}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              salary: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                        <select
                          aria-label={t("Currency")}
                          value={filters.currency}
                          onChange={(e) =>
                            setFilters({ ...filters, currency: e.target.value })
                          }
                        >
                          {[
                            ...new Set([
                              currencyFor(filters.country),
                              "USD",
                              "EUR",
                              ...Object.values(CURRENCY_BY_COUNTRY),
                            ]),
                          ].map((x) => (
                            <option key={x} value={x}>
                              {x === "RUR" ? "RUB" : x === "BYR" ? "BYN" : x}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  {filtersChanged && (
                    <button
                      type="button"
                      className="text-button filters-reset"
                      onClick={() => setFilters(personalDefaults)}
                    >
                      <X size={14} aria-hidden="true" />
                      {t(readiness.ready ? "Back to my matches" : "Reset filters")}
                    </button>
                  )}
                </section>
              )}
              <div className="section-heading" hidden={jobsLocked}>
                <span>
                  {loading
                    ? t("Finding opportunities…")
                    : t("jobs.count", {
                        count: total,
                      })}
                </span>
                <span>{t("Newest first")}</span>
              </div>
            </>
          )}
          {view === "jobs" &&
            !jobsLocked &&
            sources.some((x) => x.status !== "notConfigured") && (
              <div className="source-row" role="status">
                <span className="source-label">{t("Sources")}:</span>
                {sources
                  .filter(
                    (item) =>
                      item.status !== "notConfigured" &&
                      !(item.status === "ok" && !item.count),
                  )
                  .map((item) => (
                    <span
                      key={item.source}
                      className={"source-chip source-" + item.status}
                      title={t("source." + item.status)}
                    >
                      <span className="source-dot" aria-hidden="true" />
                      {SOURCE_LABELS[item.source]}
                      {item.count ? <b className="source-count">{item.count}</b> : null}
                      {item.status !== "ok" && (
                        <em>{t("source.short." + item.status)}</em>
                      )}
                    </span>
                  ))}
                <span className="source-note">{t("jobs.sampled")}</span>
                {jobNotice && <span className="source-note">{t(jobNotice)}</span>}
              </div>
            )}
          {jobsLocked && (
            <section className="jobs-locked">
              <span className="jobs-locked-icon" aria-hidden="true">
                <Briefcase size={26} />
              </span>
              <h2>{t("Your resume and field are not formed yet")}</h2>
              <p>
                {t(
                  "That is why there are no matching jobs yet. Finish the conversation with the assistant — after you publish your resume, we will pick jobs for your field and city.",
                )}
              </p>
              {readiness.percent > 0 && (
                <div className="jobs-locked-progress" aria-label={t("Resume completeness")}>
                  <div className="progress-track">
                    <div style={{ width: `${readiness.percent}%` }} />
                  </div>
                  <span>{t("Resume completeness")}: {readiness.percent}%</span>
                </div>
              )}
              <button className="primary-button" onClick={() => navigate("chat")}>
                <MessageSquare size={16} aria-hidden="true" />
                {t(draft ? "Open the draft" : readiness.percent ? "Continue in chat" : "Start with the assistant")}
              </button>
            </section>
          )}
          {["overview", "jobs", "saved"].includes(view) && !jobsLocked && (
            <>
              {jobError ? (
                <div className="empty-state" role="alert">
                  <h3>{t("We couldn’t load the jobs")}</h3>
                  <p>{t(jobError)}</p>
                  <button
                    className="secondary-button"
                    onClick={() => setRetry((r) => r + 1)}
                  >
                    {t("Try again")}
                  </button>
                </div>
              ) : loading ? (
                <div className="loading-grid" aria-live="polite">
                  {[1, 2, 3].map((n) => (
                    <div className="skeleton" key={n} />
                  ))}
                  <span className="sr-only">{t("Loading jobs")}</span>
                </div>
              ) : visibleJobs.length ? (
                <div className="job-grid">
                  {visibleJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      saved={saved.includes(job.id)}
                      onSave={toggleSave}
                      onSelect={selectJob}
                      hasSkills={!!profile.skills}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>
                    {view === "saved" && !saved.length
                      ? t("Your next opportunity belongs here")
                      : t("No jobs match these filters")}
                  </h3>
                  <p>
                    {view === "saved" && !saved.length
                      ? t("Tap the bookmark on a job to save it for later.")
                      : t("Try another keyword or widen your search.")}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setPage(0);
                      setFilters({ ...defaultFilters, country: personalDefaults.country });
                      navigate("jobs");
                    }}
                  >
                    {t("Explore all jobs")}
                  </button>
                </div>
              )}
              <p className="data-note">
                {t(
                  "Live listings · Apply on the original site · AI assessments are advisory",
                )}
              </p>
            </>
          )}
          {view === "chat" && <ChatPage {...state} />}
          {view === "resume" && <ResumePage {...state} />}
          <div className="pagination">
            {["jobs", "saved"].includes(view) && !jobsLocked && pages > 1 && (
              <>
                <button
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("Previous")}
                </button>
                <span>
                  {page + 1} / {Math.max(pages, 1)}
                </span>
                <button
                  disabled={page + 1 >= pages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("Next")}
                </button>
              </>
            )}
          </div>
          <footer>
            <BrandWord className="footer-brand" />
            <span>
              {t("A first step toward a future that feels like you.")}
            </span>
            <span className="legal-links">
              <a href="/privacy.html">{t("Privacy policy")}</a>
              <a href="/terms.html">{t("Terms of use")}</a>
            </span>
          </footer>
        </main>
      </div>
      {confirmation && (
        <ConfirmDialog
          title={t(confirmation === "delete-account" ? "Delete your account?" : "Clear resume and chat?")}
          message={t(confirmation === "delete-account" ? "account.deleteConsequences" : "reset.consequences")}
          confirmLabel={t(confirmation === "delete-account" ? "Delete account" : "Clear")}
          cancelLabel={t("Cancel")}
          busy={busy}
          onConfirm={() => {
            const what = confirmation;
            setConfirmation(null);
            if (what === "delete-account") deleteAccount(true);
            else reset(true);
          }}
          onCancel={closeConfirmation}
        />
      )}
      {selectedId && selected && (
        <JobDetails
          job={selected}
          profile={profile}
          letter={letters[letterKey]}
          busy={busy}
          error={letterError}
          onClose={() => setSelectedId(null)}
          onGenerate={generate}
          onLetter={(value) => {
            setLetters((prev) => ({
              ...prev,
              [letterKey]: value,
            }));
            setDirtyLetters((prev) => ({
              ...prev,
              [letterKey]: true,
            }));
            setCopied(false);
          }}
          onCopy={copyLetter}
          copied={copied}
          onMatch={evaluateMatch}
          onSaveLetter={saveLetter}
          letterDirty={!!dirtyLetters[letterKey]}
          pendingAction={pendingAction}
          aiMode={aiMode}
          saved={saved.includes(selected.id)}
          onSave={toggleSave}
          onOpenResume={() => {
            setSelectedId(null);
            navigate("resume");
          }}
        />
      )}
    </div>
  );
}
