import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/useAuthStore";
import { useAthleteStatus } from "../hooks/useAthleteStatus";

const AwaitingApproval = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clear);
  const athleteStatus = useAthleteStatus();

  useEffect(() => {
    // Redirect if user is not athlete or not pending
    if (!user || user.role !== "athlete") {
      navigate("/login", { replace: true });
      return;
    }

    if (athleteStatus === "APPROVED") {
      navigate("/reports", { replace: true });
      return;
    }

    if (athleteStatus === "INCOMPLETE" || athleteStatus === "REJECTED") {
      navigate("/athlete-onboarding", { replace: true });
      return;
    }
  }, [user, athleteStatus, navigate]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  if (!user || athleteStatus !== "PENDING") {
    return null;
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
        <div className="w-full max-w-2xl rounded-2xl bg-container-gradient bg-opacity-10 p-8 shadow-xl text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-container-foreground">
              Application Under Review
            </h1>
            <p className="mt-2 text-muted">
              Thank you for submitting your athlete profile! Our team is currently reviewing your information.
            </p>
          </div>

          <div className="space-y-4 text-sm text-muted">
            <div className="rounded-lg border border-black/5 bg-white/50 p-4">
              <h3 className="font-medium text-container-foreground mb-2">What happens next?</h3>
              <ul className="space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-action-primary flex-shrink-0"></span>
                  Our team will review your athlete profile
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-action-primary flex-shrink-0"></span>
                  You'll receive an email notification once approved
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-action-primary flex-shrink-0"></span>
                  After approval, you can access your reports and performance data
                </li>
              </ul>
            </div>

            <p className="text-xs">
              This process typically takes 1-2 business days. If you have any questions, please contact our support team.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-black/5">
            <button
              onClick={handleLogout}
              className="rounded-lg bg-action-primary px-6 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwaitingApproval;
