import { FormEvent, Suspense, lazy, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { Divider } from "@tremor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCat } from "@fortawesome/free-solid-svg-icons";

import {
  login,
  registerAccount,
} from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { submitForApproval } from "../api/athletes";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/client";
const PasswordRecoveryDialog = lazy(() => import("../components/PasswordRecoveryDialog"));
const AthleteOnboardingModal = lazy(() => import("../components/AthleteOnboardingModal"));
import type { OnboardingStep } from "../components/AthleteOnboardingModal";
import AuthCredentialsForm from "../components/AuthCredentialsForm";
import type { Athlete } from "../types/athlete";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

type Mode = "login" | "register";
type OnboardingAthlete = (Partial<Athlete> & { id: number; user_id?: number; full_name?: string }) | null;
const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const clearAuth = useAuthStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const t = useTranslation();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"request" | "confirm">("request");
  
  // Onboarding states
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);
  const [createdAthlete, setCreatedAthlete] = useState<OnboardingAthlete>(null);

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
        } else if (status === "PENDING") {
          setOnboardingStep(4);
        }
      }
    }
  }, [user, token, onboardingStep]);
  
  const submitApprovalMutation = useMutation({
    mutationFn: (athleteId: number) => submitForApproval(athleteId),
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
    setError(null);
    setSuccessMessage(null);

    try {
      if (isRegister) {
        // Register and automatically login
        await registerAccount(fullName.trim(), email.trim(), password, "athlete");
        
        // Automatically login the user
        const { user, token } = await login(email.trim(), password, true);
        setCredentials({ user, token });
        setInitialized(true);
        
        // Start onboarding process in modal - Skip step 1, go directly to step 2
        setOnboardingStep(2);
        setError(null);
        setSuccessMessage(null);
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
          // Coaches and other roles navigate normally
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      console.error(err);
      if (isRegister) {
        setError("Unable to create account. Please check if the email is already registered and try again.");
      } else {
        setError("Invalid email or password. Please check your credentials and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
    // Clear form when switching modes
    if (nextMode === "login") {
      setFullName("");
    } else {
      setPassword("");
    }
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
    setOnboardingStep(null);
    clearAuth();
  };

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
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 h-full w-full object-cover"
        style={{ zIndex: -1 }}
      >
        <source src="/media/login-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="flex min-h-screen items-center justify-center bg-black/50 px-4 py-10">
        <div className={`w-full max-w-md rounded-2xl bg-container-gradient bg-opacity-80 p-8 shadow-xl transition-opacity duration-300 ${
          onboardingStep !== null ? "opacity-0 pointer-events-none" : "opacity-100"
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
            fullName={fullName}
            email={email}
            password={password}
            showPassword={showPassword}
            isSubmitting={isSubmitting}
            error={error}
            successMessage={successMessage}
            onSubmit={handleSubmit}
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onTogglePasswordVisibility={() => setShowPassword((previous) => !previous)}
            onForgotPassword={() => openRecoveryModal("request")}
            emailLabel={t.login.email}
            passwordLabel={t.login.password}
            signInLabel={t.common.signIn}
            loadingLabel={t.common.loading}
          />

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
          error={error}
          isSubmitPending={submitApprovalMutation.isPending}
          onStepOneSuccess={handleStepOneSuccess}
          onStepTwoSuccess={handleStepTwoSuccess}
          onSkipStepTwo={handleSkipStepTwo}
          onSubmitForApproval={handleSubmitForApproval}
          onBackToStepTwo={handleBackToStepTwo}
          onClosePendingReview={handlePendingReviewClose}
        />
      </Suspense>
    </div>
  );
};

export default Login;
