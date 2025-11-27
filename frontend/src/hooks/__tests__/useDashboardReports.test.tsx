import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useDashboardReports } from "../useDashboardReports";
import { formatDateKey } from "../../lib/dashboardDateUtils";
import type { Athlete } from "../../types/athlete";
import type { Team } from "../../types/team";

const mockUseReportSubmissionWorkflow = vi.fn();
const mockSubmitGameReport = vi.fn();
const mockSubmitReportCard = vi.fn();

vi.mock("../useReportSubmissionWorkflow", () => ({
  useReportSubmissionWorkflow: (...args: unknown[]) =>
    mockUseReportSubmissionWorkflow(...args),
}));

vi.mock("../../api/matchReports", () => ({
  submitGameReport: (...args: unknown[]) => mockSubmitGameReport(...args),
}));

vi.mock("../../api/reportSubmissions", () => ({
  submitReportCardRequest: (...args: unknown[]) => mockSubmitReportCard(...args),
}));

const baseAthletes: Athlete[] = [
  { id: 1, first_name: "A", last_name: "A", team_id: 2, status: "active" } as Athlete,
];
const baseTeams: Team[] = [
  { id: 2, name: "Team A", age_category: "U14", created_at: "", updated_at: "", athlete_count: 1 },
] as Team[];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  mockUseReportSubmissionWorkflow.mockReturnValue({
    pendingReports: [{ id: 100 }],
    myReports: [{ id: 200 }],
    selectedSubmission: null,
    isSubmissionModalOpen: false,
    openSubmissionModal: vi.fn(),
    closeSubmissionModal: vi.fn(),
    handleApproveSubmission: vi.fn(),
    handleRejectSubmission: vi.fn(),
    approvingSubmissionId: null,
    rejectingSubmissionId: null,
    refetchSubmissions: vi.fn(),
  });
});

describe("useDashboardReports", () => {
  it("prefills game report modal with selected team and today date", () => {
    const { result } = renderHook(
      () =>
        useDashboardReports({
          athletes: baseAthletes,
          teams: baseTeams,
          athletesByTeamId: { 2: baseAthletes },
          canApproveReports: true,
          canRecordCombineMetrics: true,
          selectedTeamId: 2,
          setTeamNotice: vi.fn(),
        }),
      { wrapper },
    );

    act(() => {
      result.current.teamInsightsCardProps.onGameReport();
    });

    const todayKey = formatDateKey(new Date());
    expect(result.current.reportModalsProps.gameReportProps.isOpen).toBe(true);
    expect(result.current.reportModalsProps.gameReportProps.form.teamId).toBe(2);
    expect(result.current.reportModalsProps.gameReportProps.form.date).toBe(todayKey);
  });

  it("exposes pending reports when approvals are allowed", () => {
    const { result } = renderHook(
      () =>
        useDashboardReports({
          athletes: baseAthletes,
          teams: baseTeams,
          athletesByTeamId: { 2: baseAthletes },
          canApproveReports: true,
          canRecordCombineMetrics: true,
          selectedTeamId: 2,
          setTeamNotice: vi.fn(),
        }),
      { wrapper },
    );

    expect(result.current.teamInsightsCardProps.pendingReports).toHaveLength(1);
    expect(result.current.teamInsightsCardProps.mySubmissions).toHaveLength(1);
  });
});
