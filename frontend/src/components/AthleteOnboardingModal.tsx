import type { Athlete } from "../types/athlete";
import NewAthleteStepOneForm from "./NewAthleteStepOneForm";
import NewAthleteStepTwoForm from "./NewAthleteStepTwoForm";

export type OnboardingStep = 1 | 2 | 3 | 4 | null;

type OnboardingAthlete = (Partial<Athlete> & { id: number }) | null;

type AthleteOnboardingModalProps = {
  step: OnboardingStep;
  createdAthlete: OnboardingAthlete;
  error: string | null;
  isSubmitPending: boolean;
  onCloseAll: () => void;
  onStepOneSuccess: (athlete: Athlete) => void;
  onStepTwoSuccess: () => void;
  onSkipStepTwo: () => void;
  onSubmitForApproval: () => void;
  onBackToStepTwo: () => void;
  onClosePendingReview: () => void;
};

const AthleteOnboardingModal = ({
  step,
  createdAthlete,
  error,
  isSubmitPending,
  onCloseAll,
  onStepOneSuccess,
  onStepTwoSuccess,
  onSkipStepTwo,
  onSubmitForApproval,
  onBackToStepTwo,
  onClosePendingReview,
}: AthleteOnboardingModalProps) => {
  if (step === null) {
    return null;
  }

  const containerSizeClass =
    step === 3 || step === 4
      ? "max-w-md p-8"
      : "max-w-8xl max-h-[95vh] overflow-y-auto p-6 sm:p-8";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay px-4 py-10">
      <div
        className={`modal-surface w-full rounded-2xl bg-container-gradient shadow-xl ${containerSizeClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCloseAll}
          className="absolute right-4 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted shadow-sm transition hover:text-accent focus-visible:ring-2 focus-visible:ring-action-primary"
          aria-label="Dismiss modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
        {step === 1 ? (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-container-foreground">
              Step 1: Basic Information
            </h2>
            <NewAthleteStepOneForm onSuccess={onStepOneSuccess} />
          </div>
        ) : step === 2 ? (
          createdAthlete ? (
            <div>
              <NewAthleteStepTwoForm
                athlete={createdAthlete as Athlete}
                onSuccess={onStepTwoSuccess}
                onClose={onSkipStepTwo}
                isEditMode={false}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted">Loading athlete information...</p>
            </div>
          )
        ) : step === 3 ? (
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
                <li>2. You&apos;ll receive an approval or feedback for any needed changes</li>
                <li>3. Once approved, you&apos;ll have full access to the platform</li>
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
                onClick={onBackToStepTwo}
                disabled={isSubmitPending}
                className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted hover:border-action-primary/50 disabled:opacity-60"
              >
                Edit Registration
              </button>
              <button
                type="button"
                onClick={onSubmitForApproval}
                disabled={isSubmitPending}
                className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 disabled:opacity-60"
              >
                {isSubmitPending ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          </div>
        ) : (
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
                Your athlete profile is currently being reviewed by our admin team. You&apos;ll be notified once your application is approved or if any changes are needed.
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
                onClick={onClosePendingReview}
                className="w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AthleteOnboardingModal;
