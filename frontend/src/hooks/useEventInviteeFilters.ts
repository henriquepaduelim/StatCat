import { useMemo, useState } from "react";

import type { Athlete } from "../types/athlete";
import { calculateAge } from "../utils/athletes";

export type AthleteTeamFilter = number | "unassigned" | null;

export const useEventInviteeFilters = (athletes: Athlete[]) => {
  const [athleteFilterTeam, setAthleteFilterTeam] = useState<AthleteTeamFilter>(null);
  const [athleteFilterAge, setAthleteFilterAge] = useState<string>("");
  const [athleteFilterGender, setAthleteFilterGender] = useState<string>("");

  const filteredEventAthletes = useMemo(() => {
    let filtered = [...athletes];

    if (athleteFilterTeam !== null) {
      if (athleteFilterTeam === "unassigned") {
        filtered = filtered.filter((athlete) => athlete.team_id == null);
      } else {
        filtered = filtered.filter((athlete) => athlete.team_id === athleteFilterTeam);
      }
    }

    if (athleteFilterAge) {
      filtered = filtered.filter((athlete) => {
        if (!athlete.birth_date) return false;
        const age = calculateAge(athlete.birth_date);

        if (athleteFilterAge === "U8" && age < 8) return true;
        if (athleteFilterAge === "U9" && age >= 8 && age < 9) return true;
        if (athleteFilterAge === "U10" && age >= 9 && age < 10) return true;
        if (athleteFilterAge === "U11" && age >= 10 && age < 11) return true;
        if (athleteFilterAge === "U12" && age >= 11 && age < 12) return true;
        if (athleteFilterAge === "U13" && age >= 12 && age < 13) return true;
        if (athleteFilterAge === "U14" && age >= 13 && age < 14) return true;
        if (athleteFilterAge === "U15" && age >= 14 && age < 15) return true;
        if (athleteFilterAge === "U16" && age >= 14 && age < 16) return true;
        if (athleteFilterAge === "U17" && age >= 16 && age < 17) return true;
        if (athleteFilterAge === "U18" && age >= 16 && age < 18) return true;
        if (athleteFilterAge === "U19" && age >= 18 && age < 19) return true;
        if (athleteFilterAge === "U20" && age >= 19 && age < 20) return true;
        if (athleteFilterAge === "U21" && age >= 20 && age < 21) return true;
        if (athleteFilterAge === "Senior" && age >= 21) return true;
        return false;
      });
    }

    if (athleteFilterGender) {
      filtered = filtered.filter((athlete) => athlete.gender === athleteFilterGender);
    }

    return filtered;
  }, [athletes, athleteFilterTeam, athleteFilterAge, athleteFilterGender]);

  return {
    athleteFilterTeam,
    setAthleteFilterTeam,
    athleteFilterAge,
    setAthleteFilterAge,
    athleteFilterGender,
    setAthleteFilterGender,
    filteredEventAthletes,
  };
};
