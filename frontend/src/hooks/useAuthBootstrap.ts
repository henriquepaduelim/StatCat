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
      return;
    }

    const run = async () => {
      if (!token) {
        setInitialized(true);
        return;
      }

      try {
        // Use user from store if available, otherwise fetch
        const profile = user || (await fetchMe());
        if (!user) {
          setCredentials({ user: profile, token: token! });
        }
      } catch (error) {
        // This catches errors from fetchMe()
        clear(); // This clears token and user, effectively logging them out
      } finally {
        setInitialized(true);
      }
    };

    void run();
  }, [token, user, isInitialized, setCredentials, setInitialized, clear]);
};
