import type { Dispatch, SetStateAction } from "react";

type RegisterState = [boolean, Dispatch<SetStateAction<boolean>>];

const noopDispatch: Dispatch<SetStateAction<boolean>> = () => undefined;
const createState = (): RegisterState => [false, noopDispatch];

export const useRegisterSW = () => ({
  needRefresh: createState(),
  offlineReady: createState(),
  updateServiceWorker: async () => undefined,
});

// Simple noop registerSW for builds without the PWA plugin
export const registerSW = (_options?: any) => () => undefined;
