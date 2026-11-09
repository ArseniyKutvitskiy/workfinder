import React from "react";
import { createRoot } from "react-dom/client";
import { Suspense, lazy } from "react";
const App = lazy(() => import("./App.tsx"));
import { FeedbackProvider } from "./Feedback.tsx";
import { LanguageProvider } from "./LanguageContext.tsx";
import { AuthProvider } from "./AuthContext.tsx";
import ErrorBoundary from "./ErrorBoundary.tsx";
import { Splash } from "./Splash.tsx";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <FeedbackProvider>
          <AuthProvider>
            <Suspense
              fallback={<Splash stage="app" />}
            >
              <App />
            </Suspense>
          </AuthProvider>
        </FeedbackProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
