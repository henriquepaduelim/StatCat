import { useEffect } from "react";
import { fetchMe } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";

export const useAuthBootstrap = () => {
  const { token, user, isInitialized } = useAuthStore();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const clear = useAuthStore((state) => state.clear);

  useEffect(() => {
    if (isInitialized) {
      // console.log("useAuthBootstrap - Already initialized, skipping");
      return;
    }

    const run = async () => {
      // console.log("useAuthBootstrap - Starting with token:", token ? "present" : "none");
      // console.log("useAuthBootstrap - Starting with user:", user ? user.email : "none");
      
      if (!token) {
        // console.log("useAuthBootstrap - No token, setting initialized");
        setInitialized(true);
        return;
      }

      try {
        // console.log("useAuthBootstrap - Attempting to fetch user profile...");
        // Use user from store if available, otherwise fetch
        const profile = user || (await fetchMe());
        // console.log("useAuthBootstrap - Fetched profile:", profile);
        // console.log("useAuthBootstrap - Profile role:", profile?.role);
        // console.log("useAuthBootstrap - Profile athlete_status:", profile?.athlete_status);
        
        if (!user) {
          // console.log("useAuthBootstrap - Setting credentials with fetched profile");
          setCredentials({ user: profile, token: token! });
        }
      } catch (error: any) {
        // console.error("useAuthBootstrap - Error fetching user profile:", error);
        // console.error("useAuthBootstrap - Error response:", error?.response);
        // console.error("useAuthBootstrap - Error status:", error?.response?.status);
        // Only clear if it's a 401 Unauthorized error
        if (error?.response?.status === 401) {
          // console.log("useAuthBootstrap - Token expired or invalid, clearing auth");
          clear(); // This clears token and user, effectively logging them out
        }
        // For other errors, just log them but don't clear auth
      } finally {
        // console.log("useAuthBootstrap - Setting initialized to true");
        setInitialized(true);
      }
    };

    void run();
  }, [token, user, isInitialized, setCredentials, setInitialized, clear]);
};
