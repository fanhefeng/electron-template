import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible, i18n-able replacement for the native `confirm()`: the browser
 * dialog's buttons are OS-provided (un-localizable), can't be styled/themed,
 * and block the renderer. `role="alertdialog"` + `aria-modal` announce it to
 * screen readers; Esc cancels; initial focus lands on Cancel — the safe default
 * for a destructive action. Reusable for any confirm flow, not just delete.
 */
export const ConfirmDialog = ({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  // Ref so the mount-only effect always calls the latest onCancel without
  // re-binding (a fresh parent closure each render would otherwise re-run it).
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    cancelButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 [padding-inline:1rem]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        className="w-full max-w-sm rounded-lg bg-bg-primary p-5 shadow-xl"
      >
        <p className="text-sm text-text-primary">{message}</p>
        <div className="flex items-center justify-end gap-2 [margin-block-start:1.25rem]">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-status-error px-4 py-1.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
