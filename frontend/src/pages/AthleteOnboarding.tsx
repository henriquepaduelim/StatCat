import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@tremor/react";

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
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
      navigate("/awaiting-approval", { replace: true });
    },
    onError: (error: any) => {
      console.error("Failed to submit for approval:", error);
      console.error("Error response:", error?.response?.data);
      // You could show a toast or error message here
    },
  });

  useEffect(() => {
    console.log("AthleteOnboarding useEffect - User:", user);
    console.log("AthleteOnboarding useEffect - User role:", user?.role);
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
    
    console.log("AthleteOnboarding useEffect - Athlete should be here, status:", athleteStatus);
    
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
    return <div>Loading...</div>;
  }

  // Show loading while fetching existing athlete
  if (user.athlete_id && isLoadingAthlete && !createdAthlete) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div>Loading your athlete profile...</div>
      </div>
    );
  }

  console.log("AthleteOnboarding - User:", user);
  console.log("AthleteOnboarding - Current Step:", currentStep);
  console.log("AthleteOnboarding - Created Athlete:", createdAthlete);
  console.log("AthleteOnboarding - Existing Athlete:", existingAthlete);
  console.log("AthleteOnboarding - Athlete Status:", athleteStatus);

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-container-foreground">
            Complete Your Athlete Profile
          </h1>
          <p className="mt-2 text-muted">
            {athleteStatus === "REJECTED" 
              ? "Please review and update your information based on the feedback provided."
              : "Please fill out your athlete information to get started. This will be reviewed by our team."
            }
          </p>
          
          {athleteStatus === "REJECTED" && user.rejection_reason && (
            <div className="mt-4 mx-auto max-w-2xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Feedback:</strong> {user.rejection_reason}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl">
          {currentStep === 1 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 1: Basic Information</h2>
              <NewAthleteStepOneForm
                onSuccess={handleStepOneSuccess}
              />
            </div>
          ) : currentStep === 2 ? (
            createdAthlete ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Step 2: Additional Details</h2>
                <NewAthleteStepTwoForm
                  athlete={createdAthlete}
                  onSuccess={handleStepTwoSuccess}
                  onClose={handleSkipStepTwo}
                  isEditMode={false}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <p>Loading athlete information...</p>
              </div>
            )
          ) : (
            // Step 3: Review and Submit for Approval
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-container-foreground">
                  Registration Complete!
                </h2>
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
                <Button 
                  variant="secondary" 
                  onClick={() => setCurrentStep(2)}
                  disabled={submitApprovalMutation.isPending}
                >
                  Edit Registration
                </Button>
                <Button 
                  onClick={handleSubmitForApproval}
                  loading={submitApprovalMutation.isPending}
                  disabled={submitApprovalMutation.isPending}
                >
                  {submitApprovalMutation.isPending ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AthleteOnboarding;
