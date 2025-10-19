import { useEffect } from "react";
import axios from "axios";

import { fetchMe } from "../api/auth";
import api from "../api/client";
import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../theme/useThemeStore";
import type { Client } from "../types/client";

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

        // Load all accessible client themes and set the active one
        try {
          if (profile.role === "staff") {
            const response = await api.get<Client[]>("/clients");
            const clients = response.data;

            if (clients && clients.length > 0) {
              const { setThemesFromClients, setTheme } = useThemeStore.getState();
              setThemesFromClients(clients); // 1. Populate the store with all themes

              // 2. Find the current user's client and set it as active
              const currentUserClient = clients.find(
                (c) => c.id === profile.client_id
              );
              if (currentUserClient) {
                setTheme(currentUserClient.slug); // Set active theme by slug
              }
            }
          } else if (profile.client_id) {
            const response = await api.get<Client>(`/clients/${profile.client_id}`);
            const client = response.data;
            if (client) {
              const { setThemesFromClients, setTheme } = useThemeStore.getState();
              setThemesFromClients([client]);
              setTheme(client.slug);
            }
          }
        } catch (e) {
          console.error("Failed to load client themes", e);
          if (axios.isAxiosError(e) && e.response?.status === 401) {
            clear();
          }
        }
      } catch (error) {
        // This catches errors from fetchMe()
        clear(); // This clears token and user, effectively logging them out
      } finally {
        setInitialized(true);
      }
    };

    void run();
  }, [token, user, isInitialized]);
};
