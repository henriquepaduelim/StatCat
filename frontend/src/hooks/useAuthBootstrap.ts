import { useEffect } from "react";

import { fetchMe } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";

export const useAuthBootstrap = () => {
  const { token, user, setCredentials, clear, isInitialized, setInitialized } = useAuthStore(
    (state) => ({
      token: state.token,
      user: state.user,
      isInitialized: state.isInitialized,
      setCredentials: state.setCredentials,
      clear: state.clear,
      setInitialized: state.setInitialized,
    })
  );

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    const run = async () => {
      if (!token) {
        setInitialized(true);
        return;
      }

      if (user) {
        setInitialized(true);
        return;
      }

      try {
        const profile = await fetchMe();
        setCredentials({ user: profile, token });
      } catch (error) {
        clear();
      } finally {
        setInitialized(true);
      }
    };

    void run();
  }, [token, user, isInitialized, setCredentials, clear, setInitialized]);
};
