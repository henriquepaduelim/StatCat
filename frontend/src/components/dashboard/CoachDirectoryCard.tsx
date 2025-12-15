import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUserTie, faPenToSquare, faUserXmark } from "@fortawesome/free-solid-svg-icons";

import type { TeamCoach } from "../../types/coach";

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
    <section className="print-hidden h-full">
      <div className="card-base h-full flex flex-col p-4 sm:p-6 border-2 border-border-muted shadow-none">
        <div className="space-y-4 flex-1 flex flex-col">
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
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
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
              <div className="overflow-hidden rounded-lg border border-border-muted bg-container">
                <div className="hidden items-center gap-4 border-b border-border-muted bg-container/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid sm:grid-cols-[minmax(0,1.8fr)_220px_140px]">
                  <span>Coach Name</span>
                  <span className="text-right">Contact</span>
                  <span className="text-right">Actions</span>
                </div>
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="grid grid-cols-1 items-start gap-3 border border-border-muted px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1.8fr)_220px_140px] sm:items-center sm:px-4 sm:gap-4 bg-container"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-container-foreground">{coach.full_name}</p>
                        <p className="truncate text-xs text-muted">{coach.email}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted tabular-nums sm:text-right">
                      {coach.phone ?? "Not set"}
                    </div>
                    <div className="flex items-center justify-end gap-2">
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
