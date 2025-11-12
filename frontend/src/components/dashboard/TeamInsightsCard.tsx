import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import type { Athlete } from "../../types/athlete";
import type { Team } from "../../api/teams";

type TeamInsightsCardProps = {
  teams: Team[];
  athletes: Athlete[];
  athletesByTeamId: Record<number, Athlete[]>;
  onNewReportCard?: () => void;
  onGameReport?: () => void;
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const TeamInsightsCard = ({
  teams,
  athletes,
  athletesByTeamId,
  onNewReportCard,
  onGameReport,
}: TeamInsightsCardProps) => {
  const totalTeams = teams.length;
  const assignedAthletes = athletes.filter((athlete) => typeof athlete.team_id === "number").length;
  const unassignedAthletes = Math.max(athletes.length - assignedAthletes, 0);
  const averageRosterSize = totalTeams ? (assignedAthletes / totalTeams).toFixed(1) : "0.0";
  const assignmentRate = athletes.length ? Math.round((assignedAthletes / athletes.length) * 100) : 0;

  const topTeams = teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      category: team.age_category || "—",
      athleteCount: athletesByTeamId[team.id]?.length ?? 0,
    }))
    .sort((a, b) => b.athleteCount - a.athleteCount)
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-action-primary/20 bg-white/80 p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-container-foreground">Report Cards</h2>
            <p className="text-sm text-muted">Report cards to be approved</p>
          </div>
          <div className="flex w-full flex-row flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={onGameReport}
              className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 sm:px-4"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span className="whitespace-nowrap">Game Report</span>
            </button>
            <button
              type="button"
              onClick={onNewReportCard}
              className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 sm:px-4"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span className="whitespace-nowrap">New Report Card</span>
            </button>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-black/5 bg-white/80 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Total Teams</dt>
            <dd className="text-2xl font-semibold text-container-foreground">{formatNumber(totalTeams)}</dd>
          </div>
          <div className="rounded-lg border border-black/5 bg-white/80 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Athletes Assigned</dt>
            <dd className="text-2xl font-semibold text-container-foreground">
              {formatNumber(assignedAthletes)} <span className="text-sm font-normal text-muted">({assignmentRate}%)</span>
            </dd>
          </div>
          <div className="rounded-lg border border-black/5 bg-white/80 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Awaiting Team</dt>
            <dd className="text-2xl font-semibold text-container-foreground">{formatNumber(unassignedAthletes)}</dd>
          </div>
          <div className="rounded-lg border border-black/5 bg-white/80 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Avg. Roster Size</dt>
            <dd className="text-2xl font-semibold text-container-foreground">{averageRosterSize}</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            <span>Most Active Teams</span>
            <span>Roster</span>
          </div>
          {topTeams.length ? (
            <ul className="divide-y divide-black/5 rounded-lg border border-black/5 bg-white/70">
              {topTeams.map((team) => (
                <li key={team.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-container-foreground">{team.name}</p>
                    <p className="text-xs text-muted">{team.category}</p>
                  </div>
                  <span className="text-base font-semibold text-action-primary">{team.athleteCount}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No team activity to highlight yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamInsightsCard;
