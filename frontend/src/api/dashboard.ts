import api from "./client";

export type DashboardSummary = {
  athletes: {
    total: number;
    active: number;
    inactive: number;
  };
};

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary");
  return data;
};
