import type { Athlete } from "../../types/athlete";
import { useTranslation } from "../../i18n/useTranslation";

type TeamMeta = Map<number, { name: string; coach: string | null }>;

type ReadOnlyAthleteTableProps = {
  athletes: Athlete[];
  teamsById: TeamMeta;
  isLoading: boolean;
  isError: boolean;
};

const ReadOnlyAthleteTable = ({ athletes, teamsById, isLoading, isError }: ReadOnlyAthleteTableProps) => {
  const t = useTranslation();

  if (isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-500">{t.athletes.error}</p>;
  }

  if (!athletes.length) {
    return <p className="text-sm text-muted">{t.athletes.empty}</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-action-primary/15 bg-white/80 shadow">
      <table className="min-w-full divide-y divide-black/5 text-sm">
        <thead className="bg-gray-50/70 text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 text-left">{t.athletes.table.name}</th>
            <th className="px-4 py-3 text-left">{t.athletes.table.team}</th>
            <th className="px-4 py-3 text-left">{t.athletes.table.gender}</th>
            <th className="px-4 py-3 text-left">{t.athletes.table.status}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 bg-white/60">
          {athletes.map((athlete) => {
            const teamName = athlete.team_id && teamsById.get(athlete.team_id)
              ? teamsById.get(athlete.team_id)?.name
              : t.athletes.table.teamUnknown;
            const genderLabel = (athlete.gender ?? "male").toLowerCase() === "female"
              ? t.athletes.filters.genderFemale
              : t.athletes.filters.genderMale;

            return (
              <tr key={athlete.id}>
                <td className="px-4 py-3 font-semibold text-container-foreground">
                  {athlete.first_name} {athlete.last_name}
                  <p className="text-xs text-muted">{athlete.email ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-muted">{teamName}</td>
                <td className="px-4 py-3 text-muted">{genderLabel}</td>
                <td className="px-4 py-3 text-muted capitalize">{athlete.status ?? "active"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReadOnlyAthleteTable;
