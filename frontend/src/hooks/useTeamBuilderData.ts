import { useMemo } from "react";

import type { Athlete } from "../types/athlete";
import type { NewTeamFormState } from "../types/dashboard";

type Args = {
  athletes: Athlete[];
  teamForm: NewTeamFormState;
  athleteFilter: {
    age: string;
    gender: string;
    teamStatus: "all" | "assigned" | "unassigned";
  };
};

export const useTeamBuilderData = ({ athletes, teamForm, athleteFilter }: Args) => {
  const candidates = useMemo(() => {
    const { age, gender, teamStatus } = athleteFilter;
    return athletes
      .filter((athlete) => !teamForm.athleteIds.includes(athlete.id))
      .filter((athlete) => {
        if (gender && athlete.gender !== gender) {
          return false;
        }
        if (teamStatus === "assigned" && !athlete.team_id) {
          return false;
        }
        if (teamStatus === "unassigned" && athlete.team_id) {
          return false;
        }
        if (age) {
          if (!athlete.birth_date) {
            return false;
          }
          const ageLimit = parseInt(age.replace(/\D/g, ""), 10);
          if (Number.isFinite(ageLimit)) {
            const birthDate = new Date(athlete.birth_date);
            const today = new Date();
            let currentAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              currentAge -= 1;
            }
            if (currentAge >= ageLimit) {
              return false;
            }
          }
        }
        return true;
      });
  }, [athletes, athleteFilter, teamForm.athleteIds]);

  const remainingAthleteCount = useMemo(() => {
    return athletes.filter((athlete) => !teamForm.athleteIds.includes(athlete.id)).length;
  }, [athletes, teamForm.athleteIds]);

  return { candidates, remainingAthleteCount };
};
