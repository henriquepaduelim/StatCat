import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUsers, faPenToSquare, faTrash } from "@fortawesome/free-solid-svg-icons";

import type { Athlete } from "../../types/athlete";
import type { Team } from "../../api/teams";

type NoticeState = { variant: "success" | "error"; message: string } | null;

type TeamListCardProps = {
  teams: Team[];
  athletesByTeamId: Record<number, Athlete[]>;
  notice: NoticeState;
  isLoading: boolean;
  isError: boolean;
  canManageUsers: boolean;
  isCreatePending: boolean;
  isDeletePending: boolean;
  onAddTeam: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: number, teamName: string) => void;
  addButtonLabel: string;
  statusCopy: {
    loading: string;
    error: string;
    empty: string;
  };
};

type TeamActionButtonsProps = {
  team: Team;
  canManageUsers: boolean;
  isDeletePending: boolean;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: number, teamName: string) => void;
  className?: string;
};

const TeamActionButtons = ({
  team,
  canManageUsers,
  isDeletePending,
  onEditTeam,
  onDeleteTeam,
  className = "",
}: TeamActionButtonsProps) => {
  const containerClassName = ["flex items-center gap-2", className].filter(Boolean).join(" ").trim();

  return (
    <div className={containerClassName}>
      <button
        type="button"
        onClick={() => onEditTeam(team)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-action-primary/10 hover:text-action-primary"
        aria-label={`Edit ${team.name}`}
      >
        <FontAwesomeIcon icon={faPenToSquare} className="text-lg" />
      </button>
      {canManageUsers ? (
        <button
          type="button"
          onClick={() => onDeleteTeam(team.id, team.name)}
          disabled={isDeletePending}
          className="flex h-8 w-8 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
          aria-label={`Delete ${team.name}`}
        >
          <FontAwesomeIcon icon={faTrash} className="text-sm" />
        </button>
      ) : null}
    </div>
  );
};

const TeamListCard = ({
  teams,
  athletesByTeamId,
  notice,
  isLoading,
  isError,
  canManageUsers,
  isCreatePending,
  isDeletePending,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  addButtonLabel,
  statusCopy,
}: TeamListCardProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTeams = useMemo(() => {
    if (!normalizedSearch) {
      return teams;
    }
    return teams.filter((team) => {
      const teamMatches = team.name.toLowerCase().includes(normalizedSearch);
      if (teamMatches) {
        return true;
      }
      const teamAthletes = athletesByTeamId[team.id] ?? [];
      return teamAthletes.some((athlete) => {
        const fullName = `${athlete.first_name} ${athlete.last_name}`.trim().toLowerCase();
        return fullName.includes(normalizedSearch);
      });
    });
  }, [teams, athletesByTeamId, normalizedSearch]);

  const showEmptyState = !teams.length;
  const showNoMatches = Boolean(teams.length && normalizedSearch && !filteredTeams.length);

  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-3 shadow-xl backdrop-blur">
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <h2 className="text-lg font-semibold text-container-foreground">Teams</h2>
            <label className="mt-2 block text-xs font-semibold uppercase tracking-wide text-muted">
              Search
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Team or athlete name"
                className="mt-1 w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-container-foreground shadow-sm transition focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={onAddTeam}
            disabled={isCreatePending}
            className="flex items-center justify-center gap-2 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span className="hidden sm:inline">{addButtonLabel}</span>
            <span className="sm:hidden">Add</span>
            <FontAwesomeIcon icon={faUsers} className="text-xs" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {notice ? (
            <div
              className={`flex-shrink-0 rounded-md border px-3 py-2 text-xs font-medium ${
                notice.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <p className="text-sm text-muted">{statusCopy.loading}</p>
            ) : isError ? (
              <p className="text-sm text-red-500">{statusCopy.error}</p>
            ) : showEmptyState ? (
              <p className="text-sm text-muted">{statusCopy.empty}</p>
            ) : showNoMatches ? (
              <p className="text-sm text-muted">No teams match your search.</p>
            ) : (
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/90">
                <div className="hidden grid-cols-[minmax(60px,0.6fr)_minmax(140px,0.9fr)_90px_90px_minmax(100px,0.8fr)] gap-3 border-b border-black/10 bg-container/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                  <span className="text-left">Team Name</span>
                  <span className="text-center">Coach</span>
                  <span className="text-center">Age Group</span>
                  <span className="text-center">Roster Size</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredTeams.map((team) => {
                    const teamAthletes = athletesByTeamId[team.id] ?? [];
                    const teamAthleteCount = teamAthletes.length;
                    const coachName = team.coach_name?.trim() || "—";

                    return (
                      <div
                        key={team.id}
                        className="grid grid-cols-1 items-center gap-2 border-b border-black/5 px-3 py-3 text-sm hover:bg-white/50 last:border-b-0 sm:grid-cols-[minmax(60px,0.6fr)_minmax(140px,0.9fr)_90px_90px_minmax(100px,0.8fr)] sm:px-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-primary/10 text-action-primary">
                            <FontAwesomeIcon icon={faUsers} className="text-xs" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-container-foreground">{team.name}</p>
                            <p className="text-xs text-muted sm:hidden">
                              Coach: {coachName} • {team.age_category || "—"} • {teamAthleteCount} players
                            </p>
                          </div>
                          <TeamActionButtons
                            team={team}
                            canManageUsers={canManageUsers}
                            isDeletePending={isDeletePending}
                            onEditTeam={onEditTeam}
                            onDeleteTeam={onDeleteTeam}
                            className="ml-auto sm:hidden"
                          />
                        </div>
                        <div className="hidden text-muted sm:flex sm:items-center sm:justify-center">
                          {coachName}
                        </div>
                        <div className="hidden text-muted sm:flex sm:items-center sm:justify-center">
                          {team.age_category || "—"}
                        </div>
                        <div className="hidden text-muted sm:flex sm:items-center sm:justify-center">
                          {teamAthleteCount}
                        </div>
                        <TeamActionButtons
                          team={team}
                          canManageUsers={canManageUsers}
                          isDeletePending={isDeletePending}
                          onEditTeam={onEditTeam}
                          onDeleteTeam={onDeleteTeam}
                          className="hidden sm:flex sm:items-center sm:justify-end"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamListCard;
