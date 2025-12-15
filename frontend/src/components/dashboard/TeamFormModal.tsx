import { FormEvent, Dispatch, SetStateAction } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";

import type { TeamCoach } from "../../types/coach";
import type { Athlete } from "../../types/athlete";
import type { AthleteFilter, NewTeamFormState } from "../../types/dashboard";
import { calculateAge } from "../../utils/athletes";
import { createTeamLabels, genderOptions } from "../../constants/dashboard";

type EditingTeam = { id: number; name: string } | null;
type TeamFormLabels = typeof createTeamLabels;

const MAX_TEAM_COACHES = 2;

type TeamFormModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  editingTeam: EditingTeam;
  labels: TeamFormLabels;
  teamForm: NewTeamFormState;
  teamFormError: string | null;
  teamAgeOptions: readonly string[];
  availableCoaches: TeamCoach[];
  teamBuilderCandidates: Athlete[];
  remainingAthleteCount: number;
  teamNameById?: Record<number, string>;
  athleteById: Map<number, Athlete>;
  draggedAthleteId: number | null;
  athleteFilter: AthleteFilter;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onFieldChange: <T extends keyof NewTeamFormState>(field: T, value: NewTeamFormState[T]) => void;
  setTeamForm: Dispatch<SetStateAction<NewTeamFormState>>;
  setDraggedAthleteId: (id: number | null) => void;
  setAthleteFilter: Dispatch<SetStateAction<AthleteFilter>>;
};

const TeamFormModal = ({
  isOpen,
  isSubmitting,
  editingTeam,
  labels,
  teamForm,
  teamFormError,
  teamAgeOptions,
  availableCoaches,
  teamBuilderCandidates,
  remainingAthleteCount,
  athleteById,
  draggedAthleteId,
  athleteFilter,
  onSubmit,
  onClose,
  onFieldChange,
  setTeamForm,
  setDraggedAthleteId,
  setAthleteFilter,
}: TeamFormModalProps) => {
  if (!isOpen) {
    return null;
  }

  const selectedCoaches = teamForm.coachIds
    .map((coachId) => availableCoaches.find((coach) => coach.id === coachId))
    .filter((coach): coach is TeamCoach => Boolean(coach));
  const remainingCoaches = availableCoaches.filter(
    (coach) => !teamForm.coachIds.includes(coach.id)
  );
  const canAddMoreCoaches = teamForm.coachIds.length < MAX_TEAM_COACHES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center modal-overlay px-2 py-4 sm:items-center sm:px-4 sm:py-8"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="modal-surface relative w-full max-w-lg max-h-[90vh] space-y-4 overflow-y-auto rounded-2xl p-4 shadow-2xl sm:max-w-7xl sm:max-h-[98vh] sm:p-6 md:px-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted shadow-sm transition hover:text-accent focus-visible:ring-2 focus-visible:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <h3 className="text-lg font-semibold text-container-foreground">
              {editingTeam ? `Edit ${editingTeam.name}` : labels.modalTitle}
            </h3>
            <p className="text-sm text-muted">{labels.helper}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs font-medium text-muted md:col-span-3">
              {labels.nameLabel}
              <input
                type="text"
                value={teamForm.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                disabled={isSubmitting} 
                className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                placeholder="U14 National"
                required
              />
            </label>
            <label className="text-xs font-medium text-muted">
              {labels.ageLabel}
              <select
                value={teamForm.ageCategory}
                onChange={(event) => onFieldChange("ageCategory", event.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
              >
                {teamAgeOptions.map((option) => (
                  <option key={`team-age-${option}`} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              {labels.genderLabel}
              <select
                value={teamForm.gender}
                onChange={(event) =>
                  onFieldChange("gender", event.target.value as NewTeamFormState["gender"])
                }
                disabled={isSubmitting}
                className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
              >
                {genderOptions.map((option) => (
                  <option key={`team-gender-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted md:col-span-3">
              {labels.descriptionLabel}
              <textarea
                value={teamForm.description}
                onChange={(event) => onFieldChange("description", event.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                rows={2}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-container-foreground">{labels.coachesSection}</p>
              <p className="text-xs text-muted">{labels.coachesHelper}</p>
              <p className="text-xs text-muted">{labels.coachesLimitHelper}</p>
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted">{labels.coachesAssignedLabel}</p>
                <div className="modal-card min-h-[120px] rounded-lg bg-container p-2">
                  {selectedCoaches.length ? (
                    <div className="space-y-1">
                      {selectedCoaches.map((coach) => (
                        <div
                          key={`selected-coach-${coach.id}`}
                          className="modal-card flex items-center justify-between gap-2 rounded-md bg-container px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-container-foreground">{coach.full_name}</p>
                            <p className="truncate text-xs text-muted">{coach.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setTeamForm((prev) => ({
                                ...prev,
                                coachIds: prev.coachIds.filter((id) => id !== coach.id),
                              }))
                            }
                            disabled={isSubmitting}
                            aria-label={`Remove ${coach.full_name}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FontAwesomeIcon icon={faMinus} className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-xs text-muted">
                      {labels.coachesAssignedEmpty}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted">{labels.coachesAvailableLabel}</p>
                <div className="modal-card min-h-[120px] max-h-[220px] overflow-y-auto rounded-lg bg-container p-2">
                  {remainingCoaches.length ? (
                    <div className="space-y-1">
                      {remainingCoaches.map((coach) => (
                        <div
                          key={`available-coach-${coach.id}`}
                          className="modal-card flex items-center justify-between gap-2 rounded-md bg-container px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-container-foreground">{coach.full_name}</p>
                            <p className="truncate text-xs text-muted">{coach.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setTeamForm((prev) => {
                                if (prev.coachIds.includes(coach.id) || prev.coachIds.length >= MAX_TEAM_COACHES) {
                                  return prev;
                                }
                                return { ...prev, coachIds: [...prev.coachIds, coach.id] };
                              })
                            }
                            disabled={isSubmitting || !canAddMoreCoaches}
                            aria-label={`Add ${coach.full_name}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-action-primary transition hover:bg-action-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-xs text-muted">
                      {availableCoaches.length
                        ? labels.coachesAvailableEmpty
                        : labels.noCoaches}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-container-foreground">Team Roster</p>
              <p className="text-xs text-muted">Athletes currently on this team</p>
              <div
                className="min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg border-2 border-dashed border-action-primary/30 bg-[var(--bg-soft-blue)] p-2 dark:border-[var(--border-table-dark)]/60 dark:bg-container"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.currentTarget.classList.add("border-action-primary", "bg-blue-100/50");
                }}
                onDragLeave={(event) => {
                  event.currentTarget.classList.remove("border-action-primary", "bg-blue-100/50");
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.currentTarget.classList.remove("border-action-primary", "bg-blue-100/50");
                  if (draggedAthleteId && !teamForm.athleteIds.includes(draggedAthleteId)) {
                    setTeamForm((prev) => ({
                      ...prev,
                      athleteIds: [...prev.athleteIds, draggedAthleteId],
                    }));
                  }
                  setDraggedAthleteId(null);
                }}
              >
                {teamForm.athleteIds.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-xs text-muted">
                    Drag athletes here to add them to the team
                  </div>
                ) : (
                  <div className="space-y-1">
                    {teamForm.athleteIds.map((athleteId) => {
                      const athlete = athleteById.get(athleteId);
                      if (!athlete) return null;
                      return (
                        <div
                          key={`roster-athlete-${athlete.id}`}
                          draggable
                          onDragStart={() => setDraggedAthleteId(athlete.id)}
                          className="modal-card flex items-center justify-between gap-2 rounded-md bg-container px-3 py-2 text-sm transition hover:bg-container/80"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-container-foreground">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {athlete.birth_date ? `Age: ${calculateAge(athlete.birth_date)}` : ""}
                              {athlete.gender ? ` • ${athlete.gender === "male" ? "Boys" : "Girls"}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setTeamForm((prev) => ({
                                ...prev,
                                athleteIds: prev.athleteIds.filter((id) => id !== athlete.id),
                              }))
                            }
                            aria-label={`Remove ${athlete.first_name} ${athlete.last_name}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          >
                            <FontAwesomeIcon icon={faMinus} className="text-xs" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted">
                Total: {teamForm.athleteIds.length}{" "}
                {teamForm.athleteIds.length === 1 ? "athlete" : "athletes"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-container-foreground">Available Athletes</p>
              <p className="text-xs text-muted">Filter by age or group to find athletes faster.</p>
              <div className="modal-card rounded-lg bg-container p-2 text-xs text-muted">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2">
                    <span className="text-[0.65rem] uppercase">Search</span>
                    <input
                      type="text"
                      value={athleteFilter.query}
                      onChange={(event) =>
                        setAthleteFilter((prev) => ({ ...prev, query: event.target.value }))
                      }
                      placeholder="e.g., 16, U18, Alice, female"
                      className="w-32 rounded border border-black/10 bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none dark:border-[var(--border-table-dark)]/30"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-[0.65rem] uppercase">Age</span>
                    <select
                      value={athleteFilter.age}
                      onChange={(event) =>
                        setAthleteFilter((prev) => ({ ...prev, age: event.target.value }))
                      }
                      className="rounded border border-black/10 bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none dark:border-[var(--border-table-dark)]/30"
                    >
                      <option value="">All</option>
                      <option value="U14">U14</option>
                      <option value="U16">U16</option>
                      <option value="U18">U18</option>
                      <option value="U21">U21</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-[0.65rem] uppercase">Gender</span>
                    <select
                      value={athleteFilter.gender}
                      onChange={(event) =>
                        setAthleteFilter((prev) => ({ ...prev, gender: event.target.value }))
                      }
                      className="rounded border border-black/10 bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
                    >
                      <option value="">All</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-[0.65rem] uppercase">Status</span>
                    <select
                      value={athleteFilter.teamStatus}
                      onChange={(event) =>
                        setAthleteFilter((prev) => ({
                          ...prev,
                          teamStatus: event.target.value as AthleteFilter["teamStatus"],
                        }))
                      }
                      className="rounded border border-black/10 bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="assigned">Assigned</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAthleteFilter({ age: "", gender: "", query: "", teamStatus: "all" })}
                    className="ml-auto text-[0.65rem] uppercase text-action-primary hover:text-action-primary/80"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="modal-card min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg bg-container p-2">
                {teamBuilderCandidates.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-xs text-muted">
                    No athletes available with selected filters
                  </div>
                ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {teamBuilderCandidates.map((athlete) => {
                    return (
                        <div
                          key={`available-athlete-${athlete.id}`}
                          draggable
                          onDragStart={() => setDraggedAthleteId(athlete.id)}
                          className="modal-card flex items-center justify-between gap-2 rounded-md bg-container px-3 py-2 text-sm transition hover:bg-container/80"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-container-foreground">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {athlete.birth_date ? `U${calculateAge(athlete.birth_date) + 1}` : ""}
                              {athlete.gender ? ` • ${athlete.gender === "male" ? "Boys" : "Girls"}` : ""}
                            </p>  
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!teamForm.athleteIds.includes(athlete.id)) {
                                setTeamForm((prev) => ({
                                  ...prev,
                                  athleteIds: [...prev.athleteIds, athlete.id],
                                }));
                              }
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-action-primary hover:bg-action-primary/20 transition"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted">{remainingAthleteCount} athletes available</p>
            </div>
          </div>

          {teamFormError ? <p className="text-xs text-red-500">{teamFormError}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {editingTeam ? "Save" : labels.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamFormModal;
