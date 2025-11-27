import { useMemo } from "react";

import { useAthletes } from "../../hooks/useAthletes";
import { useTeams } from "../../hooks/useTeams";
import { useTranslation } from "../../i18n/useTranslation";
import ReadOnlyAthleteTable from "./ReadOnlyAthleteTable";
import PageTitle from "../PageTitle";

const ReadOnlyAthletesView = () => {
  const athletesQuery = useAthletes();
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
    const data = athletesQuery.data;
    const flatData = data?.pages
      ? data.pages.flatMap((page) => page.items ?? [])
      : Array.isArray(data)
        ? data
        : [];
    return flatData.filter((athlete) => {
      if (athlete.user_athlete_status) {
        const status = athlete.user_athlete_status.toUpperCase();
        if (["PENDING", "REJECTED", "INCOMPLETE"].includes(status)) {
          return false;
        }
      }
      return true;
    });
  }, [athletesQuery.data]);

  return (
    <div className="space-y-6">
      <PageTitle title={t.athletes.title} description={t.athletes.description} />
      <ReadOnlyAthleteTable
        athletes={readonlyAthletes}
        teamsById={teamsById}
        isLoading={athletesQuery.isLoading}
        isError={athletesQuery.isError}
        athletesQuery={athletesQuery}
      />
    </div>
  );
};

export default ReadOnlyAthletesView;
