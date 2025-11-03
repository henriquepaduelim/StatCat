import { useEffect, useRef } from "react";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmAriaLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

const ConfirmDeleteModal = ({
  isOpen,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmAriaLabel,
  onCancel,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    lastFocusedElement.current = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lastFocusedElement.current instanceof HTMLElement) {
        lastFocusedElement.current.focus();
      }
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-xl bg-container p-6 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id="confirm-delete-title" className="text-lg font-semibold text-container-foreground">
          {title}
        </h2>
        <p id="confirm-delete-description" className="mt-2 text-sm text-muted">
          {description}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onConfirm}
            aria-label={confirmAriaLabel ?? confirmLabel}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          >
            <svg
              className="h-4 w-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m5 0H4" />
            </svg>
            {isLoading ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
