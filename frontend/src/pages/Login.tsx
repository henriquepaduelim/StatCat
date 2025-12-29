import { FormEvent, Suspense, lazy, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCat } from "@fortawesome/free-solid-svg-icons";

import {
  login,
  registerAccount,
} from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { submitForApproval, submitForApprovalPublic } from "../api/athletes";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/client";
const PasswordRecoveryDialog = lazy(() => import("../components/PasswordRecoveryDialog"));
const AthleteOnboardingModal = lazy(() => import("../components/AthleteOnboardingModal"));
import type { OnboardingStep } from "../components/AthleteOnboardingModal";
import AuthCredentialsForm from "../components/AuthCredentialsForm";
import type { Athlete } from "../types/athlete";

type Mode = "login" | "register";
type OnboardingAthlete = (Partial<Athlete> & { id: number; user_id?: number; full_name?: string }) | null;
const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const t = useTranslation();

  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"request" | "confirm">("request");
  
  // Onboarding states
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);
  const [createdAthlete, setCreatedAthlete] = useState<OnboardingAthlete>(null);
  const [hasDismissedPendingModal, setHasDismissedPendingModal] = useState(false);
  const [signupToken, setSignupToken] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
  const isRegister = mode === "register";
  const renderLoginTitle = () => {
    if (isRegister) {
      return "Create your account";
    }
    const title = t.login.title;
    const keyword = "StatCat";
    const highlightIndex = title.indexOf(keyword);
    if (highlightIndex === -1) {
      return title;
    }
    const before = title.slice(0, highlightIndex);
    const after = title.slice(highlightIndex + keyword.length);
    return (
      <>
        {before}
        <span className="inline-flex items-center gap-1 text-action-primary">
          {keyword}
          <FontAwesomeIcon icon={faCat} className="text-lg" />
        </span>
        {after}
      </>
    );
  };

  // Fetch existing athlete if user already has athlete_id
  const { data: existingAthlete, error: athleteError } = useQuery<Athlete | null>({
    queryKey: ['athlete', user?.athlete_id],
    queryFn: async () => {
      if (!user?.athlete_id) return null;
      const { data } = await api.get<Athlete>(`/athletes/${user.athlete_id}`);
      return data;
    },
    enabled: !!user?.athlete_id && !createdAthlete && (onboardingStep === 2 || onboardingStep === 3),
    retry: false, // Don't retry on error
  });

  // Handle athlete fetch error
  useEffect(() => {
    if (athleteError) {
      console.error('Error fetching athlete:', athleteError);
      // If we can't fetch the athlete, create a placeholder
      if (onboardingStep === 2 && user && !createdAthlete) {
        setCreatedAthlete({
          id: user.athlete_id || user.id,
          user_id: user.id,
          full_name: user.full_name || '',
          email: user.email || '',
        });
      }
    }
  }, [athleteError, onboardingStep, user, createdAthlete]);

  // Set existing athlete when fetched or create a placeholder for new users
  useEffect(() => {
    if (existingAthlete && !createdAthlete) {
      setCreatedAthlete(existingAthlete);
    } else if (onboardingStep === 2 && !createdAthlete && user && !user.athlete_id) {
      // Create a placeholder athlete object for new users without athlete_id
      setCreatedAthlete({
        id: user.id,
        user_id: user.id,
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [existingAthlete, createdAthlete, onboardingStep, user]);

  // Auto-open onboarding modal for logged-in unapproved athletes
  useEffect(() => {
    if (user && token && onboardingStep === null) {
      if (user.role === "athlete" && user.athlete_status !== "APPROVED") {
        const status = user.athlete_status || "INCOMPLETE";
        if (status === "INCOMPLETE" || status === "REJECTED") {
          setOnboardingStep(2);
        } else if (status === "PENDING" && !hasDismissedPendingModal) {
          setOnboardingStep(4);
        }
      }
    }
  }, [user, token, onboardingStep, hasDismissedPendingModal]);

  useEffect(() => {
    if (!user) {
      setHasDismissedPendingModal(false);
      return;
    }
    setHasDismissedPendingModal(false);
  }, [user]);
  
  const submitApprovalMutation = useMutation({
    mutationFn: (athleteId: number) => {
      // Se não há token de login, use o fluxo público (token de signup) ou não envie
      if (!token && signupToken) {
        return submitForApprovalPublic(athleteId, signupToken);
      }
      if (!token && !signupToken) {
        return Promise.resolve();
      }
      return submitForApproval(athleteId); // requer token
    },
    onSuccess: () => {
      // Update user status in store
      const user = useAuthStore.getState().user;
      const token = useAuthStore.getState().token;
      if (user && token) {
        const updatedUserData = {
          ...user,
          athlete_status: "PENDING" as const
        };
        setCredentials({ user: updatedUserData, token });
      }
      // Move to final success step (step 4)
      setOnboardingStep(4);
    },
    onError: (error: unknown) => {
      console.error("Failed to submit for approval:", error);
      setError("Failed to submit for approval. Please try again.");
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setShowLoadingOverlay(true);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
      } catch (playError) {
        console.warn("Unable to play login background video", playError);
      }
    }
    setError(null);
    setSuccessMessage(null);

    try {
      if (isRegister) {
        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();
        const trimmedEmail = email.trim();
        const trimmedConfirmEmail = confirmEmail.trim();
        if (!trimmedFirst || !trimmedLast) {
          setError("Please enter your first and last name.");
          return;
        }
        if (!trimmedEmail || trimmedEmail !== trimmedConfirmEmail) {
          setError("Emails do not match.");
          return;
        }
        if (!password || password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        const signupResponse = await registerAccount(
          `${trimmedFirst} ${trimmedLast}`,
          trimmedEmail,
          password
        );
        setCreatedAthlete({
          id: signupResponse.athlete_id,
          user_id: signupResponse.id,
          full_name: signupResponse.full_name,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: signupResponse.email,
        });
        setSignupToken(null); // No longer using signup token flow for this
        setOnboardingStep(2);
        setError(null);
        setSuccessMessage("Account created. Complete your profile to submit for approval.");
        setInitialized(true);
      } else {
        const { user, token } = await login(email.trim(), password, true);
        setCredentials({ user, token });
        setInitialized(true);
        
        // Handle navigation based on user role and athlete status
        if (user.role === "athlete") {
          const athleteStatus = user.athlete_status || "INCOMPLETE";
          
          switch (athleteStatus) {
            case "INCOMPLETE":
            case "REJECTED":
              // Show onboarding modal on login page - Skip step 1, go directly to step 2
              setOnboardingStep(2);
              break;
            case "PENDING":
              // Show pending message modal on login page
              setOnboardingStep(4);
              break;
            case "APPROVED":
              // Only approved athletes can navigate away
              navigate("/player-profile", { replace: true });
              break;
            default:
              setOnboardingStep(1);
          }
        } else {
          // Admin, Staff and Coaches navigate normally
          navigate(from, { replace: true });
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const status = typeof err === "object" && err !== null
        ? (err as { response?: { status?: number; data?: { detail?: string } } }).response?.status
        : undefined;
      const detail = typeof err === "object" && err !== null
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;

      if (isRegister) {
        if (status === 400 || status === 409 || (detail && detail.toLowerCase().includes("email"))) {
          setError("Email already registered. Try logging in or use a different email.");
        } else {
          setError("Unable to create account. Please check your details and try again.");
        }
      } else {
        if (status === 403) {
          const detailObj =
            typeof detail === "object" && detail !== null
              ? (detail as Record<string, unknown>)
              : undefined;
          const requiresPasswordSetup =
            detailObj && typeof detailObj["requires_password_setup"] === "boolean"
              ? (detailObj["requires_password_setup"] as boolean)
              : false;
          if (requiresPasswordSetup) {
            setError("Set your password using the invite/reset link before signing in.");
          } else {
            setError("Your account is pending approval. Please wait for an admin to approve your access.");
          }
        } else if (status === 401) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else {
          setError("Unable to sign in now. Please try again.");
        }
      }
    } finally {
      setIsSubmitting(false);
      setShowLoadingOverlay(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };

  const resetAuthFields = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setConfirmEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
    // Clear form when switching modes
    if (nextMode === "login") {
      resetAuthFields();
    } else {
      setPassword("");
      setConfirmPassword("");
    }
    setSignupToken(null);
    setCreatedAthlete(null);
  };

  const openRecoveryModal = (step: "request" | "confirm" = "request") => {
    setRecoveryStep(step);
    setIsRecoveryModalOpen(true);
  };

  const closeRecoveryModal = () => {
    setIsRecoveryModalOpen(false);
  };

  const handleStepOneSuccess = (athlete: Athlete) => {
    setCreatedAthlete(athlete);
    setOnboardingStep(2);
    
    // Update user with athlete_id but keep status as INCOMPLETE
    const user = useAuthStore.getState().user;
    const token = useAuthStore.getState().token;
    if (user && token) {
      const updatedUser = {
        ...user,
        athlete_id: athlete.id,
      };
      setCredentials({ user: updatedUser, token });
    }
  };

  const handleStepTwoSuccess = () => {
    setOnboardingStep(3);
  };

  const handleSkipStepTwo = () => {
    // Skip step 2 and go directly to step 3 (review and submit)
    setOnboardingStep(3);
  };

  const handleSubmitForApproval = () => {
    const athleteId = user?.athlete_id || createdAthlete?.id;
    if (athleteId) {
      submitApprovalMutation.mutate(athleteId);
    }
  };

  const handleBackToStepTwo = () => {
    setOnboardingStep(2);
  };

const handlePendingReviewClose = () => {
    setHasDismissedPendingModal(true);
    setOnboardingStep(null);
    setMode("login");
    resetAuthFields();
  };

  const handleOnboardingClose = () => {
    setOnboardingStep(null);
    setCreatedAthlete(null);
    setError(null);
    setSuccessMessage(null);
    setHasDismissedPendingModal(true);
    setMode("login");
    resetAuthFields();
    setSignupToken(null);
  };

  const loginBgUrl = import.meta.env.VITE_LOGIN_BG_URL ?? "/media/login-bg.mp4";

  // Redirect logic for authenticated users
  if (token && !onboardingStep && user) {
    // Athletes should only leave if APPROVED
    if (user.role === "athlete") {
      if (user.athlete_status === "APPROVED") {
        return <Navigate to="/player-profile" replace />;
      }
      // If not approved, do nothing (stay on login page, modal will open via handleSubmit)
    } else {
      // Non-athletes can navigate normally
      return <Navigate to={from} replace />;
    }
  }

  return (
    <div className="relative min-h-screen">
      {loginBgUrl ? (
        <video
          loop
          muted
          playsInline
          preload="metadata"
          ref={videoRef}
          className="absolute top-0 left-0 h-full w-full object-cover"
          style={{ zIndex: -1 }}
        >
          <source src={loginBgUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : null}
      <div className="flex min-h-screen items-center justify-center bg-surface-primary/40 px-4 py-10">
        <div className={`w-full max-w-md rounded-2xl border border-border-muted bg-container-gradient p-8 shadow-xl transition-opacity duration-300 ${
          onboardingStep !== null || showLoadingOverlay ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-container-foreground">
              {renderLoginTitle()}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isRegister
                ? "Create your athlete account to access your reports and performance data."
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

        <AuthCredentialsForm
          mode={mode}
          firstName={firstName}
          lastName={lastName}
          email={email}
          confirmEmail={confirmEmail}
          password={password}
          confirmPassword={confirmPassword}
          showPassword={showPassword}
          isSubmitting={isSubmitting}
          error={error}
          successMessage={successMessage}
          onSubmit={handleSubmit}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onEmailChange={setEmail}
          onConfirmEmailChange={setConfirmEmail}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onTogglePasswordVisibility={() => setShowPassword((previous) => !previous)}
          onForgotPassword={() => openRecoveryModal("request")}
          emailLabel={t.login.email}
          passwordLabel={t.login.password}
          signInLabel={t.common.signIn}
            loadingLabel={t.common.loading}
          />

          <p className="mt-4 text-center text-xs text-muted">
            By signing in, you agree to our
            <a
              href={import.meta.env.VITE_TERMS_OF_SERVICE_URL || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline underline-offset-4"
            >
              Terms of Service
            </a>
            and
            <a
              href={import.meta.env.VITE_PRIVACY_POLICY_URL || "/privacy.html"}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <PasswordRecoveryDialog
          isOpen={isRecoveryModalOpen}
          initialStep={recoveryStep}
          onClose={closeRecoveryModal}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AthleteOnboardingModal
          step={onboardingStep}
          createdAthlete={createdAthlete}
          signupToken={signupToken}
          error={error}
          isSubmitPending={submitApprovalMutation.isPending}
          onCloseAll={handleOnboardingClose}
          onStepOneSuccess={handleStepOneSuccess}
          onStepTwoSuccess={handleStepTwoSuccess}
          onSkipStepTwo={handleSkipStepTwo}
          onSubmitForApproval={handleSubmitForApproval}
          onBackToStepTwo={handleBackToStepTwo}
          onClosePendingReview={handlePendingReviewClose}
        />
      </Suspense>

      {showLoadingOverlay ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-primary/70 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-action-primary border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
};

export default Login;
