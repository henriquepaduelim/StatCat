import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { confirmPasswordReset } from "../api/auth";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedToken = token.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedToken) {
      setError("Reset token missing. Use the link from your email or request a new one.");
      return;
    }
    if (trimmedNewPassword.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(trimmedToken, trimmedNewPassword);
      setMessage("Password updated successfully. You can sign in with your new credentials.");
      setToken("");
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
          Paste the reset token from your email link. Tokens expire in 30 minutes and work for every role.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
