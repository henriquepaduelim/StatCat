import type { Athlete } from "../../types/athlete";
import type { AthleteReport } from "../../types/athlete";
import type { ReportSubmissionSummary } from "../../api/reportSubmissions";
import type { TestDefinition } from "../../types/test";

import { useOutletContext } from "react-router-dom";

export type PlayerProfileContextValue = {
  athletes: Athlete[] | undefined;
  currentAthleteId: number | undefined;
  setCurrentAthleteId: (id: number) => void;
  currentAthlete: Athlete | undefined;
  report: AthleteReport | undefined;
  reportLoading: boolean;
  reportError: boolean;
  tests: TestDefinition[];
  athleteDetail: Athlete | undefined;
  reportCards: ReportSubmissionSummary[];
  reportCardsLoading: boolean;
  reportCardsError: boolean;
};

export const usePlayerProfileContext = (): PlayerProfileContextValue =>
  useOutletContext<PlayerProfileContextValue>();
