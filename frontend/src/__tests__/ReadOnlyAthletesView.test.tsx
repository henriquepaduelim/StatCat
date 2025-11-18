import { render, screen } from "@testing-library/react";

import ReadOnlyAthletesView from "../components/athletes/ReadOnlyAthletesView";
import type { Athlete } from "../types/athlete";

const mockUseAthletes = vi.fn();
const mockUseTeams = vi.fn();
const mockUseTranslation = vi.fn();

vi.mock("../hooks/useAthletes", () => ({
  useAthletes: () => mockUseAthletes(),
}));

vi.mock("../hooks/useTeams", () => ({
  useTeams: () => mockUseTeams(),
}));

vi.mock("../i18n/useTranslation", () => ({
  useTranslation: () => mockUseTranslation(),
}));

const translationStub = {
  athletes: {
    title: "Athletes",
    description: "Athlete list",
    error: "Unable to load athletes",
    empty: "No athletes yet.",
    table: {
      name: "Name",
      team: "Team",
      gender: "Gender",
      status: "Status",
      teamUnknown: "Unassigned",
    },
    filters: {
      genderFemale: "Female",
      genderMale: "Male",
    },
  },
  common: {
    loading: "Loading...",
  },
};

describe("ReadOnlyAthletesView", () => {
  beforeEach(() => {
    mockUseTranslation.mockReturnValue(translationStub);
    mockUseTeams.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    mockUseAthletes.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<ReadOnlyAthletesView />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseAthletes.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<ReadOnlyAthletesView />);
    expect(screen.getByText(/Unable to load athletes/)).toBeInTheDocument();
  });

  it("shows approved athletes and hides pending ones", () => {
    const athletes: Athlete[] = [
      {
        id: 1,
        first_name: "Alice",
        last_name: "Anderson",
        email: "alice@example.com",
        birth_date: "2005-01-01",
        gender: "female",
        primary_position: "Forward",
        status: "active",
        team_id: 10,
        user_athlete_status: "APPROVED",
      } as Athlete,
      {
        id: 2,
        first_name: "Bob",
        last_name: "Pending",
        email: "bob@example.com",
        birth_date: "2005-01-01",
        gender: "male",
        primary_position: "Midfielder",
        status: "active",
        team_id: null,
        user_athlete_status: "PENDING",
      } as Athlete,
    ];

    mockUseAthletes.mockReturnValue({ data: athletes, isLoading: false, isError: false });
    mockUseTeams.mockReturnValue({
      data: [{ id: 10, name: "Team A", coach_name: "Coach Z" }],
      isLoading: false,
      isError: false,
    });

    render(<ReadOnlyAthletesView />);

    expect(screen.getByText(/Alice Anderson/)).toBeInTheDocument();
    expect(screen.queryByText(/Bob Pending/)).not.toBeInTheDocument();
    expect(screen.getByText(/Team A/)).toBeInTheDocument();
  });
});
