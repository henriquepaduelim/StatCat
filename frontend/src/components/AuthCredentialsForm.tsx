import { FormEvent } from "react";
import { TextInput } from "@tremor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

type AuthCredentialsFormProps = {
  mode: "login" | "register";
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onConfirmEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePasswordVisibility: () => void;
  onForgotPassword: () => void;
  emailLabel: string;
  passwordLabel: string;
  signInLabel: string;
  loadingLabel: string;
};

const AuthCredentialsForm = ({
  mode,
  firstName,
  lastName,
  email,
  confirmEmail,
  password,
  confirmPassword,
  showPassword,
  isSubmitting,
  error,
  successMessage,
  onSubmit,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onConfirmEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-muted" htmlFor="first-name">
              First Name
            </label>
             <label className="text-sm font-medium text-muted" htmlFor="last-name">
              Last Name
            </label>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              id="first-name"
              name="first-name"
              value={firstName}
              onChange={(event) => onFirstNameChange(event.target.value)}
              placeholder="Marvin"
              className="w-full rounded-md border border-black/10 bg-white/95 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              required
            />
            <input
              id="last-name"
              name="last-name"
              value={lastName}
              onChange={(event) => onLastNameChange(event.target.value)}
              placeholder="Fergusson"
              className="w-full rounded-md border border-black/10 bg-white/95 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              required
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-muted" htmlFor="email">
          {emailLabel}
        </label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="exemple@statcat.com"
          className="mt-2 w-full rounded-md border border-black/10 bg-white/95 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          required
        />
      </div>
      {isRegister ? (
        <div>
          <label className="text-sm font-medium text-muted" htmlFor="confirm-email">
            Confirm Email
          </label>
          <input
            id="confirm-email"
            type="email"
            name="confirm-email"
            autoComplete="email"
            value={confirmEmail}
            onChange={(event) => onConfirmEmailChange(event.target.value)}
            placeholder="exemple@statcat.com"
            className="mt-2 w-full rounded-md border border-black/10 bg-white/95 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            required
          />
        </div>
      ) : null}

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
            className="w-full rounded-md border border-black/10 px-3 py-2 pr-10 text-sm placeholder:text-gray-500 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
      {isRegister ? (
        <div>
          <label className="text-sm font-medium text-muted" htmlFor="confirm-password">
            Confirm Password
          </label>
          <div className="relative mt-2">
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-black/10 px-3 py-2 pr-10 text-sm placeholder:text-gray-500 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
      ) : null}

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
