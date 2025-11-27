import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useDashboardEvents } from "../useDashboardEvents";
import { formatDateKey } from "../../lib/dashboardDateUtils";
import type { Athlete } from "../../types/athlete";
import type { Team } from "../../types/team";
import type { Event } from "../../types/event";
import type { useTranslation } from "../../i18n/useTranslation";

const mockUseEvents = vi.fn();
const mockUseMyEvents = vi.fn();
const mockUseCreateEvent = vi.fn();
const mockUseConfirmEventAttendance = vi.fn();
const mockUseDeleteEvent = vi.fn();
const mockUseDashboardEventData = vi.fn();
const mockUseInviteeFilters = vi.fn();

vi.mock("../useEvents", () => ({
  useEvents: (...args: unknown[]) => mockUseEvents(...args),
  useMyEvents: (...args: unknown[]) => mockUseMyEvents(...args),
  useCreateEvent: (...args: unknown[]) => mockUseCreateEvent(...args),
  useConfirmEventAttendance: (...args: unknown[]) => mockUseConfirmEventAttendance(...args),
  useDeleteEvent: (...args: unknown[]) => mockUseDeleteEvent(...args),
}));

vi.mock("../useDashboardEventData", () => ({
  useDashboardEventData: (...args: unknown[]) => mockUseDashboardEventData(...args),
}));

vi.mock("../useEventInviteeFilters", () => ({
  useEventInviteeFilters: (...args: unknown[]) => mockUseInviteeFilters(...args),
}));

type SummaryLabels = ReturnType<typeof useTranslation>["dashboard"]["summary"];

const summaryLabels = {
  calendar: { errorIncomplete: "Fill required fields" },
} as unknown as SummaryLabels;

const baseAthletes: Athlete[] = [
  { id: 1, first_name: "A", last_name: "A", team_id: 5, status: "active" } as Athlete,
];
const baseTeams: Team[] = [
  { id: 5, name: "Team A", age_category: "U14", created_at: "", updated_at: "", athlete_count: 1 },
] as Team[];
const baseEvents: Event[] = [
  {
    id: 10,
    name: "Match",
    event_date: formatDateKey(new Date()),
    start_time: "10:00",
    location: "Field 1",
    notes: "",
    status: "scheduled",
    team_id: 5,
    team_ids: [5],
    coach_id: 1,
    created_by_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email_sent: false,
    push_sent: false,
    participants: [],
  },
];

const buildHook = (overrides?: Partial<Parameters<typeof useDashboardEvents>[0]>) =>
  renderHook(() =>
    useDashboardEvents({
      permissions: { canManageUsers: true, canCreateCoaches: true },
      athletesQuery: { isError: false, isLoading: false },
      teamsQuery: { isError: false, isLoading: false },
      athletes: baseAthletes,
      teams: baseTeams,
      athleteById: new Map(baseAthletes.map((athlete) => [athlete.id, athlete])),
      teamNameById: { 5: "Team A" },
      summaryLabels,
      currentUserId: 1,
      currentUserRole: "admin",
      currentUserAthleteId: null,
      availableCoaches: [],
      selectedTeamId: 5,
      setSelectedTeamId: vi.fn(),
      clearLabel: "Clear",
      ...overrides,
    }),
  );

beforeEach(() => {
  mockUseEvents.mockReturnValue({ data: baseEvents, isError: false });
  mockUseMyEvents.mockReturnValue({ data: baseEvents, isError: false });
  mockUseCreateEvent.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mockUseConfirmEventAttendance.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mockUseDeleteEvent.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mockUseDashboardEventData.mockReturnValue({
    eventsByDate: new Map<string, Event[]>([[baseEvents[0].event_date, baseEvents]]),
    upcomingEvents: baseEvents,
    eventsOnSelectedDate: baseEvents,
    eventAvailabilityData: [],
    availabilityPages: [],
  });
  mockUseInviteeFilters.mockReturnValue({
    athleteFilterTeam: null,
    setAthleteFilterTeam: vi.fn(),
    athleteFilterAge: "",
    setAthleteFilterAge: vi.fn(),
    athleteFilterGender: "",
    setAthleteFilterGender: vi.fn(),
    filteredEventAthletes: baseAthletes,
  });
});

describe("useDashboardEvents", () => {
  it("returns athlete load error when athletes query fails", () => {
    const { result } = buildHook({
      athletesQuery: { isError: true, isLoading: false },
    });
    expect(result.current.loadErrorMessage).toBe("Unable to load athletes right now.");
  });

  it("opens event modal with default date and team when openEventFormPanel is called", () => {
    const { result } = buildHook();

    act(() => {
      result.current.openEventFormPanel();
    });

    const todayKey = formatDateKey(new Date());
    expect(result.current.eventModalProps.isOpen).toBe(true);
    expect(result.current.eventModalProps.eventForm.date).toBe(todayKey);
    expect(result.current.eventModalProps.eventForm.teamIds).toEqual([5]);
  });
});
