import { useMemo, useState } from "react";

import type { Athlete } from "../../types/athlete";
import { useTranslation } from "../../i18n/useTranslation";
import { useAthletes } from "../../hooks/useAthletes";
import Spinner from "../Spinner";

type TeamMeta = Map<number, { name: string; coach: string | null }>;

type ReadOnlyAthleteTableProps = {
  athletes: Athlete[];
  teamsById: TeamMeta;
  isLoading: boolean;
  isError: boolean;
  athletesQuery: ReturnType<typeof useAthletes>;
};

const ReadOnlyAthleteTable = ({ athletes, teamsById, isLoading, isError, athletesQuery }: ReadOnlyAthleteTableProps) => {
  const t = useTranslation();
  const [query, setQuery] = useState("");

  const filteredAthletes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((athlete) => {
      const name = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
      const email = (athlete.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [athletes, query]);

  if (isLoading && !athletes.length) {
    return <Spinner className="py-8" />;
  }

  if (isError) {
    return <p className="text-sm text-red-500">{t.athletes.error}</p>;
  }

  if (!athletes.length) {
    return <p className="text-sm text-muted">{t.athletes.empty}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.athletes.filters.searchPlaceholder}
          className="w-full max-w-md rounded-lg border border-border bg-container px-3 py-2 text-sm text-container-foreground placeholder:text-muted focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/30 bg-container shadow">
        <table className="min-w-full divide-y divide-border/50 text-sm">
          <thead className="bg-header text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 text-left">{t.athletes.table.name}</th>
            <th className="px-4 py-3 text-left">{t.athletes.table.team}</th>
            <th className="px-4 py-3 text-left">{t.athletes.table.gender}</th>
            <th className="px-4 py-3 text-left">{t.athletes.table.status}</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-border/40 bg-container">
            {filteredAthletes.map((athlete) => {
            const teamName = athlete.team_id && teamsById.get(athlete.team_id)
              ? teamsById.get(athlete.team_id)?.name
              : t.athletes.table.teamUnknown;
            const genderLabel = (athlete.gender ?? "male").toLowerCase() === "female"
              ? t.athletes.filters.genderFemale
              : t.athletes.filters.genderMale;

            return (
              <tr key={athlete.id} className="hover:bg-action-primary/5">
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
          <tfoot>
            <tr>
              <td colSpan={4}>
                <div className="p-4 text-center">
                  <button
                    onClick={() => athletesQuery.fetchNextPage()}
                    disabled={!athletesQuery.hasNextPage || athletesQuery.isFetchingNextPage}
                    className="w-full max-w-xs rounded-md bg-action-primary/10 px-3 py-2 text-sm font-semibold text-action-primary transition hover:bg-action-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {athletesQuery.isFetchingNextPage
                      ? 'Loading more...'
                      : athletesQuery.hasNextPage
                      ? 'Load More Athletes'
                      : 'Nothing more to load'}
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReadOnlyAthleteTable;
