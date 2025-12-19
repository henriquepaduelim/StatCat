import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { confirmPasswordReset, confirmPasswordWithCode } from "../api/auth";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const queryMode = useMemo(
    () => (searchParams.get("mode") ?? "").toLowerCase() === "code" ? "code" : "token",
    [searchParams]
  );
  const emailFromUrl = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const codeFromUrl = useMemo(() => searchParams.get("code") ?? "", [searchParams]);

  const [mode, setMode] = useState<"token" | "code">(queryMode);
  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(codeFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  useEffect(() => {
    setMode(queryMode);
  }, [queryMode]);

  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  useEffect(() => {
    if (codeFromUrl) {
      setCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedToken = token.trim();
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedNewPassword.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (mode === "token" && !trimmedToken) {
      setError("Reset token missing. Use the link from your email or request a new one.");
      return;
    }
    if (mode === "code" && (!trimmedEmail || !trimmedCode)) {
      setError("Enter both your email and the 6-digit code.");
      return;
    }
    if (mode === "code" && trimmedCode.length !== 6) {
      setError("The code must have 6 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "token") {
        await confirmPasswordReset(trimmedToken, trimmedNewPassword);
        setMessage("Password updated successfully. You can sign in with your new credentials.");
        setToken("");
      } else {
        await confirmPasswordWithCode(trimmedEmail, trimmedCode, trimmedNewPassword);
        setMessage("Password updated successfully. You can sign in with your new credentials.");
        setEmail("");
        setCode("");
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      const detail =
        (submitError as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "We couldn't update your password. Request a new link and try again.";
      setError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-4 py-12 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-action-primary">
          Reset password
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Set a new password</h1>
        <p className="mt-1 text-sm text-white/70">
          Use the reset token from your email link or the 6-digit code sent by an admin. Codes expire in 45 minutes.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("token");
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === "token"
                ? "bg-action-primary text-action-primary-foreground"
                : "border border-white/15 bg-white/5 text-white hover:border-action-primary/40"
            }`}
          >
            I have a reset link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("code");
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === "code"
                ? "bg-action-primary text-action-primary-foreground"
                : "border border-white/15 bg-white/5 text-white hover:border-action-primary/40"
            }`}
          >
            I have a 6-digit code
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "token" ? (
            <label className="flex flex-col gap-1 text-sm font-medium text-white">
              Reset token
              <textarea
                name="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="min-h-[96px] rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-action-primary/50"
                placeholder="Paste everything after token= from your email link"
                required
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium text-white">
                Email
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-action-primary/50"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-white">
                6-digit code
                <input
                  type="text"
                  name="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  maxLength={6}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-action-primary/50"
                  placeholder="123456"
                  required
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-white">
            New password
            <input
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-action-primary/50"
              placeholder="••••••••"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-white">
            Confirm new password
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-action-primary focus:outline-none focus:ring-2 focus:ring-action-primary/50"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-300">{message}</p>
          ) : null}

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-full bg-action-primary px-4 py-3 text-sm font-semibold text-action-primary-foreground shadow-md transition hover:bg-action-primary/90 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>

        <div className="mt-4 text-sm text-white/70">
          <p>
            If your link expired, request a new one from the login page and try again.
          </p>
          <Link to="/login" className="mt-2 inline-flex text-action-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
