import { FormEvent, Dispatch, SetStateAction, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";

import type { Team } from "../../api/teams";
import type { Athlete } from "../../types/athlete";
import type { GameReportFormState } from "../../types/dashboard";

type GameReportModalProps = {
  isOpen: boolean;
  teams: Team[];
  athletes: Athlete[];
  form: GameReportFormState;
  athleteFilterTeam: number | null;
  setAthleteFilterTeam: Dispatch<SetStateAction<number | null>>;
  onInputChange: <T extends keyof GameReportFormState>(field: T, value: GameReportFormState[T]) => void;
  onAddScorer: (athleteId: number) => void;
  onRemoveScorer: (athleteId: number) => void;
  onUpdateScorerGoals: (athleteId: number, goals: number) => void;
  onUpdateScorerShootoutGoals: (athleteId: number, goals: number) => void;
  onToggleGoalkeeper: (athleteId: number) => void;
  onToggleGoalkeeperConceded: (athleteId: number) => void;
  onUpdateGoalkeeperConceded: (athleteId: number, goals: number) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const GameReportModal = ({
  isOpen,
  teams,
  athletes,
  form,
  athleteFilterTeam,
  setAthleteFilterTeam,
  onInputChange,
  onAddScorer,
  onRemoveScorer,
  onUpdateScorerGoals,
  onUpdateScorerShootoutGoals,
  onToggleGoalkeeper,
  onToggleGoalkeeperConceded,
  onUpdateGoalkeeperConceded,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: GameReportModalProps) => {
  const athleteMap = useMemo(() => {
    const map = new Map<number, Athlete>();
    athletes.forEach((athlete) => {
      map.set(athlete.id, athlete);
    });
    return map;
  }, [athletes]);

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    teams.forEach((team) => map.set(team.id, team.name));
    return map;
  }, [teams]);

  const filteredAthletes = useMemo(() => {
    if (athleteFilterTeam == null) {
      return athletes;
    }
    return athletes.filter((athlete) => athlete.team_id === athleteFilterTeam);
  }, [athletes, athleteFilterTeam]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 modal-overlay backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-center justify-center px-3 py-4 sm:px-6 sm:py-10" onClick={onCancel}>
        <div
          className="modal-surface max-h-[95vh] w-full max-w-screen-xl space-y-5 overflow-y-auto rounded-2xl p-4 shadow-2xl sm:p-6 lg:p-8"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-container-foreground">Game Report</h2>
              <p className="text-sm text-muted">
                Register match results, goal scorers, and goalkeeper details for analytics.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted transition hover:text-accent"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-xs font-semibold text-muted md:col-span-2">
              Team
              <select
                value={form.teamId ?? ""}
                onChange={(event) => onInputChange("teamId", event.target.value ? Number(event.target.value) : null)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                required
              >
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) => onInputChange("date", event.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Location
              <input
                type="text"
                value={form.location}
                onChange={(event) => onInputChange("location", event.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="Home / Away / Venue"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs font-semibold text-muted md:col-span-2">
              Opponent
              <input
                type="text"
                value={form.opponent}
                onChange={(event) => onInputChange("opponent", event.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="Opponent team"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-muted">
                Goals For
                <input
                  type="number"
                  min="0"
                  value={form.goalsFor}
                  onChange={(event) => onInputChange("goalsFor", event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  placeholder="0"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Goals Against
                <input
                  type="number"
                  min="0"
                  value={form.goalsAgainst}
                  onChange={(event) => onInputChange("goalsAgainst", event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  placeholder="0"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-container-foreground">Goal Scorers</p>
                <p className="text-xs text-muted">Use the + button to add scorers and set their goal count.</p>
              </div>
              <label className="text-xs font-semibold text-muted">
                Filter by team
                <select
                  value={athleteFilterTeam ?? ""}
                  onChange={(event) =>
                    setAthleteFilterTeam(event.target.value ? Number(event.target.value) : null)
                  }
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary md:w-48"
                >
                  <option value="">All teams</option>
                  {teams.map((team) => (
                    <option key={`filter-team-${team.id}`} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-black/10 bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase text-muted">Selected scorers</p>
                {form.goalScorers.length ? (
                  <ul className="space-y-2">
                    {form.goalScorers.map((entry) => {
                      const athlete = athleteMap.get(entry.athleteId);
                      if (!athlete) return null;
                      return (
                        <li
                          key={`goal-scorer-${entry.athleteId}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-container-foreground">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            <p className="text-xs text-muted">
                              {athlete.team_id ? teamNameById.get(athlete.team_id) ?? "Assigned" : "Unassigned"}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <label className="text-xs font-semibold text-muted">
                              Goals
                              <input
                                type="number"
                                min={1}
                                value={entry.goals}
                                onChange={(event) =>
                                  onUpdateScorerGoals(entry.athleteId, Number(event.target.value) || 1)
                                }
                                className="mt-1 w-20 rounded-md border border-black/10 px-2 py-1 text-sm focus:border-action-primary focus:outline-none"
                              />
                            </label>
                            <label className="text-xs font-semibold text-muted">
                              SO Goals
                              <input
                                type="number"
                                min={0}
                                value={entry.shootoutGoals}
                                onChange={(event) =>
                                  onUpdateScorerShootoutGoals(entry.athleteId, Number(event.target.value) || 0)
                                }
                                className="mt-1 w-20 rounded-md border border-black/10 px-2 py-1 text-sm focus:border-action-primary focus:outline-none"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => onRemoveScorer(entry.athleteId)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                              aria-label="Remove scorer"
                            >
                              <FontAwesomeIcon icon={faMinus} className="text-xs" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">No goal scorers selected yet.</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-black/10 bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase text-muted">Available athletes</p>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredAthletes.length ? (
                    filteredAthletes.map((athlete) => {
                      const alreadySelected = form.goalScorers.some((entry) => entry.athleteId === athlete.id);
                      return (
                        <div
                          key={`available-scorer-${athlete.id}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-container-foreground">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            <p className="text-xs text-muted">
                              {athlete.team_id ? teamNameById.get(athlete.team_id) ?? "Assigned" : "Unassigned"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddScorer(athlete.id)}
                            disabled={alreadySelected}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-action-primary transition hover:bg-action-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Add goal scorer"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted">No athletes available for the selected team.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-container-foreground">Goalkeepers</p>
            <p className="text-xs text-muted">
              Add the goalkeepers who played. Use the badge to mark who conceded goals.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-black/10 bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase text-muted">Goalkeepers who played</p>
                {form.goalkeepersPlayed.length ? (
                  <ul className="space-y-2">
                    {form.goalkeepersPlayed.map((athleteId) => {
                      const athlete = athleteMap.get(athleteId);
                      if (!athlete) return null;
                      const concededEntry = form.goalkeeperConceded.find((entry) => entry.athleteId === athleteId);
                      const concededGoals = concededEntry?.conceded ?? 0;
                      return (
                        <li
                          key={`keeper-${athleteId}`}
                          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-container-foreground">
                                {athlete.first_name} {athlete.last_name}
                              </p>
                              <p className="text-xs text-muted">
                                {athlete.team_id ? teamNameById.get(athlete.team_id) ?? "Assigned" : "Unassigned"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-muted">
                                  Goals conceded
                                  <input
                                    type="number"
                                    min={0}
                                    value={concededGoals}
                                    onChange={(event) =>
                                      onUpdateGoalkeeperConceded(athleteId, Number(event.target.value) || 0)
                                    }
                                    className="mt-1 w-20 rounded-md border border-black/10 px-2 py-1 text-sm focus:border-action-primary focus:outline-none"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => onToggleGoalkeeperConceded(athleteId)}
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    concededEntry ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                                  }`}
                                >
                                  {concededEntry ? "Tracked" : "No goals"}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => onToggleGoalkeeper(athleteId)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                aria-label="Remove goalkeeper"
                              >
                                <FontAwesomeIcon icon={faMinus} className="text-xs" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">No goalkeepers selected yet.</p>
                )}
              </div>
              <div className="space-y-2 rounded-lg border border-black/10 bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase text-muted">Available athletes</p>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredAthletes.length ? (
                    filteredAthletes.map((athlete) => {
                      const alreadySelected = form.goalkeepersPlayed.includes(athlete.id);
                      return (
                        <div
                          key={`available-keeper-${athlete.id}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-container-foreground">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            <p className="text-xs text-muted">
                              {athlete.team_id ? teamNameById.get(athlete.team_id) ?? "Assigned" : "Unassigned"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleGoalkeeper(athlete.id)}
                            disabled={alreadySelected}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-action-primary transition hover:bg-action-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Add goalkeeper"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted">No athletes available for this filter.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <label className="text-xs font-semibold text-muted">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => onInputChange("notes", event.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              rows={3}
              placeholder="Add tactical notes, key moments or incidents."
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-container-foreground hover:bg-white sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "Saving..." : "Save report"}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GameReportModal;
