import React from "react";
import { translate } from "../shared/i18n.ts";
import { Brand } from "./Brand.tsx";

/**
 * Last-resort UI guard. "Try again" re-mounts the tree without losing the
 * Supabase session; "Reload page" is the escape hatch for a corrupted bundle.
 */
export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean; attempts: number }
> {
  state = { failed: false, attempts: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Class name and component stack only: messages may include user content.
    console.error("WorkFinder UI error", error.name, info.componentStack);
  }
  render() {
    if (!this.state.failed)
      return (
        <React.Fragment key={this.state.attempts}>
          {this.props.children}
        </React.Fragment>
      );
    const t = (key: string) => translate(document.documentElement.lang, key);
    return (
      <div className="auth-page">
        <section className="auth-card" role="alert">
          <h1 className="auth-brand">
            <Brand />
          </h1>
          <p>{t("Something went wrong. Please try again.")}</p>
          <div className="flex gap-3 flex-wrap">
            <button
              className="primary-button"
              onClick={() =>
                this.setState((s) => ({ failed: false, attempts: s.attempts + 1 }))
              }
            >
              {t("Try again")}
            </button>
            <button
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              {t("Reload page")}
            </button>
          </div>
        </section>
      </div>
    );
  }
}
