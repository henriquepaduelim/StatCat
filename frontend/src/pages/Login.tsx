import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { Divider, TextInput } from "@tremor/react";

import { login, registerAccount } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

type Mode = "login" | "register";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const token = useAuthStore((state) => state.token);
  const t = useTranslation();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"coach" | "athlete">("coach");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isRegister) {
        await registerAccount(fullName.trim(), email.trim(), password, role);
        const { user, token } = await login(email.trim(), password, true);
        setCredentials({ user, token });
        setInitialized(true);
        navigate("/dashboard", { replace: true });
      } else {
        const { user, token } = await login(email.trim(), password, true);
        setCredentials({ user, token });
        setInitialized(true);
      }
    } catch (err) {
      console.error(err);
      setError(
        isRegister
          ? "Unable to create account. Please try again."
          : t.login.error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
  };

  if (token) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="relative min-h-screen">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 h-full w-full object-cover"
        style={{ zIndex: -1 }}
      >
        <source src="/public/media/login-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="flex min-h-screen items-center justify-center bg-black/50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-container-gradient bg-opacity-80 p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-container-foreground">
              {isRegister ? "Create your account" : t.login.title}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isRegister
                ? "Sign up with your email to access the platform."
                : t.login.subtitle}
            </p>
            <div className="mt-4 flex justify-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  isRegister
                    ? "text-muted hover:text-accent"
                    : "bg-action-primary text-action-primary-foreground"
                }`}
              >
                {t.common.signIn}
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  isRegister
                    ? "bg-action-primary text-action-primary-foreground"
                    : "text-muted hover:text-accent"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister ? (
              <>
                <div>
                  <label
                    className="text-sm font-medium text-muted"
                    htmlFor="full-name"
                  >
                    Full name
                  </label>
                  <TextInput
                    id="full-name"
                    name="full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Marvin Fergusson"
                    className="mt-2"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-muted">
                    Account type
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-md border p-4 text-sm font-medium transition ${
                        role === "coach"
                          ? "border-action-primary bg-action-primary/10 text-accent"
                          : "border-gray-300 hover:border-action-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="coach"
                        checked={role === "coach"}
                        onChange={() => setRole("coach")}
                        className="sr-only"
                      />
                      Coach
                    </label>
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-md border p-4 text-sm font-medium transition ${
                        role === "athlete"
                          ? "border-action-primary bg-action-primary/10 text-accent"
                          : "border-gray-300 hover:border-action-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="athlete"
                        checked={role === "athlete"}
                        onChange={() => setRole("athlete")}
                        className="sr-only"
                      />
                      Athlete
                    </label>
                  </div>
                </div>
              </>
            ) : null}

            <div>
              <label className="text-sm font-medium text-muted" htmlFor="email">
                {t.login.email}
              </label>
              <TextInput
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="marvin@statcat.com"
                className="mt-2 bg-blue-300 text-black"
                required
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-muted"
                htmlFor="password"
              >
                {t.login.password}
              </label>
              <TextInput
                id="password"
                type="password"
                name="password"
                autoComplete="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-2 bg-blue-300 text-black"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            {successMessage ? (
              <p className="text-sm text-emerald-500">{successMessage}</p>
            ) : null}

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? `${t.common.loading}...`
                : isRegister
                ? "Create account"
                : t.common.signIn}
            </button>
          </form>

          <Divider className="my-2 whitespace-nowrap">or with</Divider>
          <button
            type="button"
            className="flex w-full items-center justify-center space-x-2 rounded-md border border-black/10 bg-container px-4 py-2 text-sm font-medium text-container-foreground shadow-sm transition hover:bg-container/80"
          >
            <GoogleIcon className="h-5 w-5" aria-hidden={true} />
            <span>Continue with Google</span>
          </button>

          <p className="mt-4 text-center text-xs text-muted">
            By signing in, you agree to our
            <span className="mx-1 underline underline-offset-4">
              terms of service
            </span>
            and
            <span className="mx-1 underline underline-offset-4">
              privacy policy
            </span>
            .
          </p>

          {!isRegister ? (
            <p className="mt-4 text-center text-xs text-muted">
              {t.login.seeds}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Login;
