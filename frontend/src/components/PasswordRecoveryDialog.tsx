import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "@tremor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faKey,
  faLock,
  faPaperPlane,
  faRightToBracket,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useMutation } from "@tanstack/react-query";

import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../api/auth";

type RecoveryStep = "request" | "confirm";

type ApiErrorResponse = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

type PasswordRecoveryDialogProps = {
  isOpen: boolean;
  initialStep?: RecoveryStep;
  onClose: () => void;
};

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const PasswordRecoveryDialog = ({
  isOpen,
  initialStep = "request",
  onClose,
}: PasswordRecoveryDialogProps) => {
  const [step, setStep] = useState<RecoveryStep>(initialStep);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const passwordResetRequestMutation = useMutation({
    mutationFn: (emailAddress: string) => requestPasswordReset(emailAddress),
  });

  const passwordResetConfirmMutation = useMutation({
    mutationFn: (payload: { token: string; newPassword: string }) =>
      confirmPasswordReset(payload.token, payload.newPassword),
  });
  const { reset: resetPasswordRequestMutation } = passwordResetRequestMutation;
  const { reset: resetPasswordConfirmMutation } = passwordResetConfirmMutation;

  const trapFocus = useCallback(
    (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        focusableSelector
      );
      if (focusableElements.length === 0) return;

      const focusable = Array.from(focusableElements).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true"
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    []
  );
 
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    setStep(initialStep);
    setError(null);
    setMessage(null);

    const focusTimeout = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        trapFocus(event);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialStep, isOpen, onClose, trapFocus]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setEmail("");
    setToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
    resetPasswordRequestMutation();
    resetPasswordConfirmMutation();

    if (previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
    }
  }, [isOpen, resetPasswordConfirmMutation, resetPasswordRequestMutation]);

  const handleSwitchStep = (nextStep: RecoveryStep) => {
    setStep(nextStep);
    setError(null);
    setMessage(null);
    if (nextStep === "request") {
      setToken("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setEmail("");
    }
  };

  const handlePasswordResetRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    passwordResetRequestMutation.mutate(email.trim(), {
      onSuccess: () => {
        setMessage(
          "If the email belongs to an admin or athlete account, a reset code is on its way. The code expires in 30 minutes."
        );
      },
      onError: (mutationError: unknown) => {
        const detail =
          (mutationError as ApiErrorResponse)?.response?.data?.detail ??
          "Unable to process your request right now. Please try again.";
        setError(detail);
      },
    });
  };

  const handlePasswordResetConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.trim().length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    passwordResetConfirmMutation.mutate(
      { token: token.trim(), newPassword },
      {
        onSuccess: () => {
          setMessage(
            "Password updated successfully. You can close this window and sign in with your new credentials."
          );
          setToken("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (mutationError: unknown) => {
          const detail =
            (mutationError as ApiErrorResponse)?.response?.data?.detail ??
            "We could not verify that reset code. Please request a new one.";
          setError(detail);
        },
      }
    );
  };

  const dialogTitle = useMemo(
    () => (step === "request" ? "Request reset instructions" : "Use your reset code"),
    [step]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-10"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-recovery-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-action-primary">
              Reset password
            </p>
            <h2 id="password-recovery-title" className="text-lg font-semibold text-primary">
              {dialogTitle}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Only administrators and athletes can reset passwords here. Coach recovery will be available soon.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-primary focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2"
            aria-label="Close password reset dialog"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => handleSwitchStep("request")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              step === "request"
                ? "border-action-primary text-action-primary"
                : "border-black/10 text-muted hover:text-primary"
            }`}
          >
            <FontAwesomeIcon icon={faEnvelope} className="mr-2 h-4 w-4" />
            Request code
          </button>
          <button
            type="button"
            onClick={() => handleSwitchStep("confirm")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              step === "confirm"
                ? "border-action-primary text-action-primary"
                : "border-black/10 text-muted hover:text-primary"
            }`}
          >
            <FontAwesomeIcon icon={faKey} className="mr-2 h-4 w-4" />
            Use reset code
          </button>
        </div>

        {step === "request" ? (
          <form className="mt-6 space-y-4" onSubmit={handlePasswordResetRequest}>
            <div>
              <label className="text-sm font-medium text-muted" htmlFor="recovery-email">
                Account email
              </label>
              <TextInput
                id="recovery-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:opacity-60"
              disabled={passwordResetRequestMutation.isPending}
            >
              <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
              {passwordResetRequestMutation.isPending ? "Sending instructions..." : "Send reset instructions"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handlePasswordResetConfirm}>
            <div>
              <label className="text-sm font-medium text-muted" htmlFor="recovery-token">
                Reset code
              </label>
              <textarea
                id="recovery-token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-2 h-24 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="Paste the code from your email"
                required
              />
              <p className="mt-1 text-xs text-muted">
                Codes expire in 30 minutes. We will never ask you to share this code outside this screen.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted" htmlFor="recovery-new-password">
                New password
              </label>
              <div className="relative mt-2">
                <input
                  id="recovery-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-md border border-black/10 px-3 py-2 pr-10 text-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  placeholder="••••••••"
                  required
                />
                <FontAwesomeIcon
                  icon={faLock}
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted" htmlFor="recovery-confirm-password">
                Confirm new password
              </label>
              <input
                id="recovery-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="••••••••"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:opacity-60"
              disabled={passwordResetConfirmMutation.isPending}
            >
              <FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4" />
              {passwordResetConfirmMutation.isPending ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordRecoveryDialog;
