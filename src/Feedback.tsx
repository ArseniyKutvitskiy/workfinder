import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useLanguage } from "./LanguageContext.tsx";

export type ToastVariant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: ToastVariant };
/** `message` is a translation key (or English source string). */
export type Notify = (message: string, variant?: ToastVariant) => void;
const FeedbackContext = createContext<Notify>(() => {});
export const useFeedback = () => useContext(FeedbackContext);
const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
const MAX_TOASTS = 3;

export function FeedbackProvider({ children }: React.PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);
  const { t } = useLanguage();
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);
  const notify = useCallback<Notify>(
    (message, variant = "success") => {
      const id = ++nextId.current;
      setToasts((list) => [
        // Collapse duplicates so repeated failures don't pile up.
        ...list.filter((toast) => toast.message !== message).slice(-(MAX_TOASTS - 1)),
        { id, message, variant },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), variant === "error" ? 8000 : 5000),
      );
    },
    [dismiss],
  );
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];
          return (
            <div
              key={toast.id}
              className={`toast toast-${toast.variant}`}
              role={toast.variant === "error" ? "alert" : "status"}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(toast.message)}</span>
              <button
                type="button"
                aria-label={t("Dismiss notification")}
                onClick={() => dismiss(toast.id)}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
}
