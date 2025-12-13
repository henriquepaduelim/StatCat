import { useMemo } from "react";
import { useAuthStore } from "../stores/useAuthStore";

const PendingApproval = () => {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);

  const statusLabel = useMemo(() => {
    const status = (user?.athlete_status || "PENDING").toUpperCase();
    if (status === "REJECTED") return "Rejected";
    if (status === "INCOMPLETE") return "Incomplete";
    return "Pending approval";
  }, [user?.athlete_status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border border-border/40 bg-container p-6 shadow-lg">
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-wide text-muted">Account status</p>
          <h1 className="text-2xl font-semibold text-container-foreground">{statusLabel}</h1>
          <p className="text-sm text-muted">
            {statusLabel === "Rejected"
              ? "Your registration was rejected. Please contact an administrator for details."
              : "Your registration is under review. You will be notified when it is approved."}
          </p>
          {user?.rejection_reason ? (
            <p className="text-sm text-warning">
              Reason: <span className="font-medium">{user.rejection_reason}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-border/30 bg-muted/10 p-4 text-sm text-muted">
          <p>
            Logged in as <span className="font-semibold text-container-foreground">{user?.email}</span>
          </p>
          <p>If this is not you, sign out and log in with another account.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => clear()}
            className="rounded-lg border border-action-primary/60 px-4 py-2 text-sm font-semibold text-action-primary transition hover:bg-action-primary/10"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
