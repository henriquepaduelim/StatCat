import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";

import { login } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";

const Login = () => {
  const location = useLocation();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const token = useAuthStore((state) => state.token);
  const t = useTranslation();

  const [email, setEmail] = useState("admin@combine.dev");
  const [password, setPassword] = useState("admin123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { user, token } = await login(email, password, true);
      setCredentials({ user, token });
      setInitialized(true);
    } catch (err) {
      console.error(err);
      setError(t.login.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (token) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-on-surface">{t.login.title}</h1>
          <p className="mt-2 text-sm text-muted">{t.login.subtitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="text-sm font-medium text-muted">
            {t.login.email}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.login.password}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? `${t.common.loading}...` : t.common.signIn}
          </button>
          <p className="text-center text-xs text-muted">
            {t.login.seeds}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
