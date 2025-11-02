import { useAuthStore } from "../stores/useAuthStore";

export type UserRole = "admin" | "coach" | "athlete" | "staff";

export interface Permissions {
  canViewDashboard: boolean;
  canViewAthletes: boolean;
  canCreateAthletes: boolean;
  canEditAthletes: boolean;
  canDeleteAthletes: boolean;
  canViewReports: boolean;
  canViewAllReports: boolean;
  canCreateCoaches: boolean;
  canManageUsers: boolean;
}

export const usePermissions = (): Permissions => {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return {
      canViewDashboard: false,
      canViewAthletes: false,
      canCreateAthletes: false,
      canEditAthletes: false,
      canDeleteAthletes: false,
      canViewReports: false,
      canViewAllReports: false,
      canCreateCoaches: false,
      canManageUsers: false,
    };
  }

  const role = user.role as UserRole;

  switch (role) {
    case "admin":
      return {
        canViewDashboard: true,
        canViewAthletes: true,
        canCreateAthletes: true,
        canEditAthletes: true,
        canDeleteAthletes: true,
        canViewReports: true,
        canViewAllReports: true,
        canCreateCoaches: true,
        canManageUsers: true,
      };

    case "coach":
    case "staff":
      return {
        canViewDashboard: true,
        canViewAthletes: true,
        canCreateAthletes: true,
        canEditAthletes: true,
        canDeleteAthletes: true,
        canViewReports: true,
        canViewAllReports: true,
        canCreateCoaches: false, // Only admin can create coaches
        canManageUsers: false,
      };

    case "athlete":
      {
        // Athletes can only access features if they are approved
        const isApproved = user.athlete_status === "APPROVED";
        const canOnboard = user.athlete_status === "INCOMPLETE" || user.athlete_status === "REJECTED";
        
        return {
          canViewDashboard: false,
          canViewAthletes: false,
          canCreateAthletes: false,
          canEditAthletes: canOnboard, // Allow editing during onboarding
          canDeleteAthletes: false,
          canViewReports: isApproved,
          canViewAllReports: false, // Can only view their own reports
          canCreateCoaches: false,
          canManageUsers: false,
        };
      }

    default:
      return {
        canViewDashboard: false,
        canViewAthletes: false,
        canCreateAthletes: false,
        canEditAthletes: false,
        canDeleteAthletes: false,
        canViewReports: false,
        canViewAllReports: false,
        canCreateCoaches: false,
        canManageUsers: false,
      };
  }
};

export const useIsRole = (role: UserRole): boolean => {
  const user = useAuthStore((state) => state.user);
  return user?.role === role;
};

export const useIsAnyRole = (roles: UserRole[]): boolean => {
  const user = useAuthStore((state) => state.user);
  return roles.includes(user?.role as UserRole);
};
