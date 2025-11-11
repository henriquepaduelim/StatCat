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
  return (
    <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-container-foreground">Teams</h2>
            <p className="text-sm text-muted">Manage team rosters and assignments</p>
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
        <div className="space-y-3">
          {notice ? (
            <div
              className={`rounded-md border px-3 py-2 text-xs font-medium ${
                notice.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted">{statusCopy.loading}</p>
          ) : isError ? (
            <p className="text-sm text-red-500">{statusCopy.error}</p>
          ) : !teams.length ? (
            <p className="text-sm text-muted">{statusCopy.empty}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/90">
              <div className="hidden grid-cols-[auto_1fr_80px_60px_minmax(60px,110px)] gap-3 border-b border-black/10 bg-container/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                <FontAwesomeIcon icon={faUsers} className="self-center text-action-primary" />
                <span>Team Name</span>
                <span className="text-center">Category</span>
                <span className="text-center">Athletes</span>
                <span className="text-center">Actions</span>
              </div>

              {teams.map((team) => {
                const teamAthletes = athletesByTeamId[team.id] ?? [];
                const teamAthleteCount = teamAthletes.length;

                return (
                  <div
                    key={team.id}
                    className="grid grid-cols-1 items-start gap-3 border-b border-black/5 px-3 py-3 text-sm hover:bg-white/50 last:border-b-0 sm:grid-cols-[auto_1fr_80px_60px_minmax(60px,110px)] sm:items-center sm:px-4"
                  >
                    <div className="flex items-center gap-3 sm:contents">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-primary/10">
                        <FontAwesomeIcon icon={faUsers} className="text-xs text-action-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-container-foreground">{team.name}</p>
                        <p className="text-xs text-muted sm:hidden">
                          {team.age_category || "—"} • {teamAthleteCount} players
                        </p>
                      </div>
                    </div>
                    <div className="hidden text-center text-muted sm:block">
                      {team.age_category || "—"}
                    </div>
                    <div className="hidden text-center text-muted sm:block">{teamAthleteCount}</div>
                    <div className="flex gap-2 sm:justify-center">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamListCard;
