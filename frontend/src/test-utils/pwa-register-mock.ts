export const useRegisterSW = () => ({
  offlineReady: [false, () => undefined] as [boolean, (value: boolean) => void],
  needRefresh: [false, () => undefined] as [boolean, (value: boolean) => void],
  updateServiceWorker: () => undefined,
});
