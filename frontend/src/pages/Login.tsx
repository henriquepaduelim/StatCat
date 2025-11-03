import { FormEvent, useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { Divider, TextInput } from "@tremor/react";

import { login, registerAccount } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import NewAthleteStepOneForm from "../components/NewAthleteStepOneForm";
import NewAthleteStepTwoForm from "../components/NewAthleteStepTwoForm";
import { submitForApproval } from "../api/athletes";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/client";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
  </svg>
);

type Mode = "login" | "register";
type OnboardingStep = 1 | 2 | 3 | 4 | null;

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
  const [role, setRole] = useState<"coach" | "athlete">("athlete");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Onboarding states
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);
  const [createdAthlete, setCreatedAthlete] = useState<any>(null);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
  const isRegister = mode === "register";

  // Fetch existing athlete if user already has athlete_id
  const { data: existingAthlete } = useQuery({
    queryKey: ['athlete', user?.athlete_id],
    queryFn: async () => {
      if (!user?.athlete_id) return null;
      const { data } = await api.get(`/athletes/${user.athlete_id}`);
      return data;
    },
    enabled: !!user?.athlete_id && !createdAthlete && (onboardingStep === 2 || onboardingStep === 3),
  });

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
          setOnboardingStep(4 as any);
        }
      }
    }
  }, [user, token, onboardingStep]);
  
  const submitApprovalMutation = useMutation({
    mutationFn: (athleteId: number) => submitForApproval(athleteId),
    onSuccess: (updatedUser) => {
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
      setOnboardingStep(4 as any);
    },
    onError: (error: any) => {
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
              setOnboardingStep(4 as any);
              break;
            case "APPROVED":
              // Only approved athletes can navigate away
              navigate("/reports", { replace: true });
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
    }
  };

  const handleStepOneSuccess = (athlete: any) => {
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

  // Redirect logic for authenticated users
  if (token && !onboardingStep && user) {
    // Athletes should only leave if APPROVED
    if (user.role === "athlete") {
      if (user.athlete_status === "APPROVED") {
        return <Navigate to="/reports" replace />;
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
              {isRegister ? "Create your account" : t.login.title}
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
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-black/10 bg-blue-300 px-3 py-2 pr-10 text-sm text-black placeholder:text-black/60 focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60 hover:text-black transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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

      {/* Onboarding Modal */}
      {onboardingStep !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10">
          <div 
            className={`w-full rounded-2xl bg-container-gradient shadow-xl ${
              onboardingStep === 3 || onboardingStep === 4 
                ? "max-w-md p-8" 
                : "max-w-8xl max-h-[95vh] overflow-y-auto p-6 sm:p-8"
            }`}
            onClick={(e) => e.stopPropagation()}
          >

            {onboardingStep === 1 ? (
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-container-foreground">
                  Step 1: Basic Information
                </h2>
                <NewAthleteStepOneForm onSuccess={handleStepOneSuccess} />
              </div>
            ) : onboardingStep === 2 ? (
              createdAthlete ? (
                <div>
              
                  <NewAthleteStepTwoForm
                    athlete={createdAthlete}
                    onSuccess={handleStepTwoSuccess}
                    onClose={handleSkipStepTwo}
                    isEditMode={false}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted">Loading athlete information...</p>
                </div>
              )
            ) : onboardingStep === 3 ? (
              // Step 3: Review and Submit for Approval
              <div className="text-center space-y-6">
                <div className="space-y-24">
                  <h2 className="text-xl sm:text-2xl font-semibold text-container-foreground">
                    Registration Complete!
                  </h2>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    You have successfully completed your athlete registration. You can now submit your application for admin review and approval.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                  <ol className="text-sm text-blue-800 space-y-1 text-left">
                    <li>1. Your application will be reviewed by our admin team</li>
                    <li>2. You'll receive an approval or feedback for any needed changes</li>
                    <li>3. Once approved, you'll have full access to the platform</li>
                  </ol>
                </div>
                
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 max-w-md mx-auto">
                    {error}
                  </div>
                ) : null}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleBackToStepTwo}
                    disabled={submitApprovalMutation.isPending}
                    className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted hover:border-action-primary/50 disabled:opacity-60"
                  >
                    Edit Registration
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    disabled={submitApprovalMutation.isPending}
                    className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 disabled:opacity-60"
                  >
                    {submitApprovalMutation.isPending ? "Submitting..." : "Submit for Approval"}
                  </button>
                </div>
              </div>
            ) : (
              // Step 4: Application Pending / Submitted
              <div className="text-center space-y-4">
                <div className="space-y-24">
                  <div className="mx-auto w-12 h-12 bg-amber-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-container-foreground">
                    Application Under Review
                  </h2>
                  <p className="text-sm text-muted">
                    Your athlete profile is currently being reviewed by our admin team. You'll be notified once your application is approved or if any changes are needed.
                  </p>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <h3 className="font-medium text-amber-900 mb-2 text-sm">Current Status</h3>
                  <div className="text-sm text-amber-800 space-y-1">
                    <p className="flex items-center justify-center gap-2">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                      <strong>PENDING</strong> - Awaiting admin approval
                    </p>
                    <p className="text-xs">
                      This usually takes 1-2 business days. You can close this page and come back later to check your status.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingStep(null);
                      clearAuth();
                    }}
                    className="w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Login;
