import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../stores/useAuthStore";
import { useAthleteStatus } from "../hooks/useAthleteStatus";
import { submitForApproval } from "../api/athletes";
import api from "../api/client";
import NewAthleteStepOneForm from "../components/NewAthleteStepOneForm";
import NewAthleteStepTwoForm from "../components/NewAthleteStepTwoForm";

const AthleteOnboarding = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const token = useAuthStore((state) => state.token);
  const athleteStatus = useAthleteStatus();
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | "confirmed">(1);
  const [createdAthlete, setCreatedAthlete] = useState<any>(null);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);

  // Fetch existing athlete if user already has athlete_id
  const { data: existingAthlete, isLoading: isLoadingAthlete } = useQuery({
    queryKey: ['athlete', user?.athlete_id],
    queryFn: async () => {
      if (!user?.athlete_id) return null;
      const { data } = await api.get(`/athletes/${user.athlete_id}`);
      return data;
    },
    enabled: !!user?.athlete_id && !createdAthlete,
  });

  const submitApprovalMutation = useMutation({
    mutationFn: (athleteId: number) => submitForApproval(athleteId),
    onSuccess: (updatedUser) => {
      // Update user status in store
      if (user && token) {
        const updatedUserData = {
          ...user,
          athlete_status: "PENDING" as const
        };
        setCredentials({ user: updatedUserData, token });
      }
      // Show confirmation page instead of redirecting
      setCurrentStep("confirmed");
    },
    onError: (error: any) => {
      console.error("Failed to submit for approval:", error);
      console.error("Error response:", error?.response?.data);
    },
  });

  useEffect(() => {
    console.log("AthleteOnboarding useEffect - User:", user);
    console.log("AthleteOnboarding useEffect - Athlete status:", athleteStatus);
    
    // Redirect if user is not athlete or already approved
    if (!user) {
      console.log("AthleteOnboarding useEffect - No user, waiting...");
      return;
    }
    
    if (user.role !== "athlete") {
      console.log("AthleteOnboarding useEffect - User is not athlete, redirecting to reports");
      navigate("/reports", { replace: true });
      return;
    }
    
    if (athleteStatus === "APPROVED") {
      console.log("AthleteOnboarding useEffect - Athlete approved, redirecting to reports");
      navigate("/reports", { replace: true });
      return;
    }
    
    // If user already has an athlete_id and we fetched the data, set it
    if (user.athlete_id && existingAthlete && !createdAthlete) {
      console.log("AthleteOnboarding useEffect - Setting existing athlete and moving to step 2");
      setCreatedAthlete(existingAthlete);
      setCurrentStep(2);
    }
  }, [user, athleteStatus, navigate, existingAthlete, createdAthlete]);

  const handleStepOneSuccess = (athlete: any) => {
    setCreatedAthlete(athlete);
    setCurrentStep(2);
    
    // Update user with athlete_id but keep status as INCOMPLETE
    if (user && token) {
      const updatedUser = {
        ...user,
        athlete_id: athlete.id,
      };
      setCredentials({ user: updatedUser, token });
    }
  };

  const handleStepTwoSuccess = () => {
    // Move to review step instead of navigating away
    setRegistrationCompleted(true);
    setCurrentStep(3);
  };

  const handleSkipStepTwo = () => {
    // Move to review step even if skipping step two
    setRegistrationCompleted(true);
    setCurrentStep(3);
  };

  const handleSubmitForApproval = () => {
    if (createdAthlete?.id) {
      submitApprovalMutation.mutate(createdAthlete.id);
    }
  };

  if (!user || user.role !== "athlete") {
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
          <div className="text-center text-white">
            <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-white/30 border-t-white"></div>
            <p className="mt-4">Loading your athlete profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while fetching existing athlete
  if (user.athlete_id && isLoadingAthlete && !createdAthlete) {
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
          <div className="text-center text-white">
            <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-white/30 border-t-white"></div>
            <p className="mt-4">Loading your athlete profile...</p>
          </div>
        </div>
      </div>
    );
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
        <div className="w-full max-w-7xl rounded-2xl bg-container-gradient bg-opacity-10 p-8 shadow-xl transition-all duration-300 ease-in-out">
          {currentStep === 1 ? (
            <div>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-container-foreground">
                  Complete Your Athlete Profile
                </h1>
                <p className="mt-2 text-sm text-muted">
                  {athleteStatus === "REJECTED" 
                    ? "Please review and update your information based on the feedback provided."
                    : "Step 1 of 2: Basic athlete information"}
                </p>
                {athleteStatus === "REJECTED" && user.rejection_reason && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <strong>Feedback:</strong> {user.rejection_reason}
                  </div>
                )}
              </div>
              <NewAthleteStepOneForm onSuccess={handleStepOneSuccess} />
            </div>
          ) : currentStep === 2 ? (
            createdAthlete ? (
              <div>
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-semibold text-container-foreground">
                    Complete Your Athlete Profile
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    Step 2 of 2: Additional details
                  </p>
                </div>
                <NewAthleteStepTwoForm
                  athlete={createdAthlete}
                  onSuccess={handleStepTwoSuccess}
                  onClose={handleSkipStepTwo}
                  isEditMode={false}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-action-primary/30 border-t-action-primary"></div>
                <p className="mt-4 text-muted">Loading athlete information...</p>
              </div>
            )
          ) : currentStep === 3 ? (
            // Step 3: Review and Submit for Approval
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-container-foreground">
                  Registration Complete!
                </h1>
                <p className="text-muted max-w-md mx-auto">
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
              
              <div className="flex gap-3 justify-center">
                <button 
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={submitApprovalMutation.isPending}
                  className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit Registration
                </button>
                <button 
                  type="button"
                  onClick={handleSubmitForApproval}
                  disabled={submitApprovalMutation.isPending}
                  className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitApprovalMutation.isPending ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </div>
          ) : (
            // Confirmation: Application submitted
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-container-foreground">
                  Application Submitted!
                </h1>
                <p className="text-muted max-w-md mx-auto">
                  Your athlete registration has been successfully submitted for admin review. You'll receive an email notification once your application has been reviewed.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                <h3 className="font-medium text-green-900 mb-2">Application Status</h3>
                <p className="text-sm text-green-800">
                  Status: <strong>Pending Review</strong>
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button 
                  type="button"
                  onClick={() => navigate("/awaiting-approval", { replace: true })}
                  className="rounded-md bg-action-primary px-6 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
                >
                  View Application Status
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AthleteOnboarding;
