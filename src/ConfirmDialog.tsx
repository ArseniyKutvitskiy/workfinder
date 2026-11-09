import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Centered confirmation for destructive actions. Shown over the page so it is
 * visible wherever the button was pressed; Esc or a click outside cancels.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    // Safe default: focus "Cancel", so Enter never deletes by accident.
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab") {
        const buttons = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      origin?.focus?.();
    };
  }, [onCancel]);
  return (
    <div className="modal-backdrop confirm-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="confirm-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button ref={cancelRef} className="secondary-button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
