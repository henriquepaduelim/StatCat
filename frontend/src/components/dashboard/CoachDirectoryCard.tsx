import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUserTie, faPenToSquare, faUserXmark } from "@fortawesome/free-solid-svg-icons";

import type { TeamCoach } from "../../api/teams";

type CoachDirectoryCardProps = {
  canCreateCoaches: boolean;
  isCreatePending: boolean;
  notice: { variant: "success" | "error"; message: string } | null;
  coaches: TeamCoach[];
  isLoading: boolean;
  isError: boolean;
  onAddCoach: () => void;
  onEditCoach: (coach: TeamCoach) => void;
  onDeleteCoach: (coachId: number, coachName: string) => void;
};

const CoachDirectoryCard = ({
  canCreateCoaches,
  isCreatePending,
  notice,
  coaches,
  isLoading,
  isError,
  onAddCoach,
  onEditCoach,
  onDeleteCoach,
}: CoachDirectoryCardProps) => {
  return (
    <section className="print-hidden">
      <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-container-foreground">Coaches</h2>
            </div>
            {canCreateCoaches ? (
              <button
                type="button"
                onClick={onAddCoach}
                disabled={isCreatePending}
                className="flex items-center justify-center gap-2 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span className="hidden sm:inline">Add Coach</span>
                <span className="sm:hidden">Add</span>
                <FontAwesomeIcon icon={faUserTie} className="text-xs" />
              </button>
            ) : null}
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
              <p className="text-sm text-muted">Loading...</p>
            ) : isError ? (
              <p className="text-sm text-red-500">Unable to load coaches.</p>
            ) : !coaches.length ? (
              <p className="text-sm text-muted">No coaches registered yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/10 bg-white/90">
                <div className="hidden grid-cols-[auto_1fr_120px_minmax(60px,110px)] gap-3 border-b border-black/10 bg-container/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                  <FontAwesomeIcon icon={faUserTie} className="self-center text-action-primary" />
                  <span>Coach Name</span>
                  <span className="text-center">Contact</span>
                  <span className="text-center">Actions</span>
                </div>
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="grid grid-cols-1 items-start gap-3 border-b border-black/5 px-3 py-3 text-sm hover:bg-white/50 last:border-b-0 sm:grid-cols-[auto_1fr_120px_minmax(60px,110px)] sm:items-center sm:px-4"
                  >
                    <div className="flex items-center gap-3 sm:contents">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-primary/10">
                        <FontAwesomeIcon icon={faUserTie} className="text-xs text-action-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-container-foreground">{coach.full_name}</p>
                        <p className="truncate text-xs text-muted">{coach.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted sm:contents">
                      <span className="sm:hidden">Phone: {coach.phone ?? "Not set"}</span>
                      <span className="hidden text-center sm:block">
                        {coach.phone ?? "Not set"}
                      </span>
                      <div className="flex items-center gap-[0.275rem] sm:justify-center">
                        <button
                          type="button"
                          onClick={() => onEditCoach(coach)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-action-primary/10 hover:text-action-primary"
                          aria-label={`Edit ${coach.full_name}`}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-base" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCoach(coach.id, coach.full_name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-rose-100"
                          aria-label={`Delete ${coach.full_name}`}
                        >
                          <FontAwesomeIcon icon={faUserXmark} className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoachDirectoryCard;
