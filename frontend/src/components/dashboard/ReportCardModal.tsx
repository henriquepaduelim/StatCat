import { FormEvent } from "react";

import type { Athlete } from "../../types/athlete";
import type { Team } from "../../api/teams";

type ReportCardModalProps = {
  isOpen: boolean;
  athletes: Athlete[];
  teams: Team[];
  selectedAthleteId: number | null;
  selectedTeamId: number | null;
  notes: string;
  ratings: {
    technical: number;
    physical: number;
    training: number;
    match: number;
  };
  isSubmitting: boolean;
  errorMessage: string | null;
  onAthleteSelect: (athleteId: number | null) => void;
  onTeamSelect: (teamId: number | null) => void;
  onNotesChange: (notes: string) => void;
  onRatingChange: (field: keyof ReportCardModalProps["ratings"], value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const ReportCardModal = ({
  isOpen,
  athletes,
  teams,
  selectedAthleteId,
  selectedTeamId,
  notes,
  ratings,
  isSubmitting,
  errorMessage,
  onAthleteSelect,
  onTeamSelect,
  onNotesChange,
  onRatingChange,
  onSubmit,
  onCancel,
}: ReportCardModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 modal-overlay backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-start justify-center px-3 py-4 sm:items-center sm:px-6 sm:py-8" onClick={onCancel}>
        <div
          className="modal-surface w-full max-w-lg max-h-[90vh] space-y-4 overflow-y-auto rounded-2xl p-4 shadow-2xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-container-foreground">Request Report Card</h2>
              <p className="text-sm text-muted">Select an athlete and add context for the analysts.</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted hover:text-accent"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="text-xs font-semibold text-muted">
              Athlete
              <select
                value={selectedAthleteId ?? ""}
                onChange={(event) =>
                  onAthleteSelect(event.target.value ? Number(event.target.value) : null)
                }
                required
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">Select athlete</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.first_name} {athlete.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-muted">
              Team (optional)
              <select
                value={selectedTeamId ?? ""}
                onChange={(event) =>
                  onTeamSelect(event.target.value ? Number(event.target.value) : null)
                }
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">No specific team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-muted">
              Notes
              <textarea
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="Add context, deadlines, or focus areas…"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                Technical
                <select
                  value={ratings.technical}
                  onChange={(event) => onRatingChange("technical", Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-action-primary focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`tech-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                Physical
                <select
                  value={ratings.physical}
                  onChange={(event) => onRatingChange("physical", Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-action-primary focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`physical-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                Training performance
                <select
                  value={ratings.training}
                  onChange={(event) => onRatingChange("training", Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-action-primary focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`training-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                Match performance
                <select
                  value={ratings.match}
                  onChange={(event) => onRatingChange("match", Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-action-primary focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={`match-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                {isSubmitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportCardModal;
