import { useQuery } from "@tanstack/react-query";

import { getGoogleCredential, type GoogleCredential } from "../api/googleCalendar";

export const useGoogleCredential = () => {
  return useQuery({
    queryKey: ["google-credential"],
    queryFn: getGoogleCredential,
    staleTime: 1000 * 60,
  });
};

export type { GoogleCredential };

