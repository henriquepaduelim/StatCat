import { useAuthStore, type AthleteStatus } from "../stores/useAuthStore";

export const useAthleteStatus = (): AthleteStatus | null => {
  const user = useAuthStore((state) => state.user);
  
  if (!user || user.role !== "athlete") {
    return null;
  }
  
  return user.athlete_status || "INCOMPLETE";
};

export const useIsAthleteOnboarding = (): boolean => {
  const status = useAthleteStatus();
  return status === "INCOMPLETE" || status === "REJECTED";
};

export const useIsAwaitingApproval = (): boolean => {
  const status = useAthleteStatus();
  return status === "PENDING";
};

export const useIsAthleteApproved = (): boolean => {
  const status = useAthleteStatus();
  return status === "APPROVED";
};
