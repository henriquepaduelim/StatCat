import { FormEvent } from "react";
import { TextInput } from "@tremor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

type AuthCredentialsFormProps = {
  mode: "login" | "register";
  fullName: string;
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePasswordVisibility: () => void;
  onForgotPassword: () => void;
  emailLabel: string;
  passwordLabel: string;
  signInLabel: string;
  loadingLabel: string;
};

const AuthCredentialsForm = ({
  mode,
  fullName,
  email,
  password,
  showPassword,
  isSubmitting,
  error,
  successMessage,
  onSubmit,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onTogglePasswordVisibility,
  onForgotPassword,
  emailLabel,
  passwordLabel,
  signInLabel,
  loadingLabel,
}: AuthCredentialsFormProps) => {
  const isRegister = mode === "register";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isRegister ? (
        <div>
          <label className="text-sm font-medium text-muted" htmlFor="full-name">
            Full name
          </label>
          <TextInput
            id="full-name"
            name="full-name"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            placeholder="Marvin Fergusson"
            className="mt-2"
            required
          />
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-muted" htmlFor="email">
          {emailLabel}
        </label>
        <TextInput
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="marvin@statcat.com"
          className="mt-2 bg-blue-300 text-black"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-muted" htmlFor="password">
          {passwordLabel}
        </label>
        {!isRegister ? (
          <div className="mt-1 text-right">
            <button
              type="button"
              className="text-xs font-semibold text-action-primary hover:text-action-primary/80 transition"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>
        ) : null}
        <div className="relative mt-2">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-black/10 bg-blue-300 px-3 py-2 pr-10 text-sm text-black placeholder:text-black/60 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            required
          />
          <button
            type="button"
            onClick={onTogglePasswordVisibility}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60 hover:text-black transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-500">{successMessage}</p> : null}

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? `${loadingLabel}...` : isRegister ? "Create account" : signInLabel}
      </button>
    </form>
  );
};

export default AuthCredentialsForm;
