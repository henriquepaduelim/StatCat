import { useMemo } from "react";

import { useAthletes } from "../../hooks/useAthletes";
import { useTeams } from "../../hooks/useTeams";
import { useTranslation } from "../../i18n/useTranslation";
import ReadOnlyAthleteTable from "./ReadOnlyAthleteTable";

const ReadOnlyAthletesView = () => {
  const { data, isLoading, isError } = useAthletes();
  const teamsQuery = useTeams();
  const t = useTranslation();

  const teamsById = useMemo(() => {
    const map = new Map<number, { name: string; coach: string | null }>();
    (teamsQuery.data ?? []).forEach((team) => {
      map.set(team.id, { name: team.name, coach: team.coach_name ?? null });
    });
    return map;
  }, [teamsQuery.data]);

  const readonlyAthletes = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data].filter((athlete) => {
      if (athlete.user_athlete_status) {
        const status = athlete.user_athlete_status.toUpperCase();
        if (["PENDING", "REJECTED", "INCOMPLETE"].includes(status)) {
          return false;
        }
      }
      return true;
    });
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold text-container-foreground">{t.athletes.title}</h1>
        <p className="text-sm text-muted">{t.athletes.description}</p>
      </section>
      <ReadOnlyAthleteTable
        athletes={readonlyAthletes}
        teamsById={teamsById}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
};

export default ReadOnlyAthletesView;
