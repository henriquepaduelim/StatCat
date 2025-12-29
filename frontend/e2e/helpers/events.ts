import { getOptionalEventName } from "./env";

export const requireEventNameOrSkip = (skip: (reason: string) => void): string => {
  const name = getOptionalEventName();
  if (!name) {
    skip("Set E2E_EVENT_NAME in frontend/e2e/.env.local pointing to a pre-created event (includes the athlete and coach participants).");
    return "";
  }
  return name;
};
