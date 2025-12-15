import { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";

import type { Team } from "../../types/team";
import type { CoachFormState } from "../../types/dashboard";

type EditingCoach = { id: number; fullName: string; email: string; phone: string } | null;

type CoachFormModalProps = {
  isOpen: boolean;
  editingCoach: EditingCoach;
  coachForm: CoachFormState;
  coachFormError: string | null;
  coachFormSuccess: string | null;
  coachTeams: Team[];
  isCreatePending: boolean;
  isUpdatePending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: <T extends keyof CoachFormState>(field: T, value: CoachFormState[T]) => void;
  onGeneratePassword: () => void;
};

const CoachFormModal = ({
  isOpen,
  editingCoach,
  coachForm,
  coachFormError,
  coachFormSuccess,
  coachTeams,
  isCreatePending,
  isUpdatePending,
  onClose,
  onSubmit,
  onFieldChange,
  onGeneratePassword,
}: CoachFormModalProps) => {
  if (!isOpen) {
    return null;
  }

  const isSubmitting = isCreatePending || isUpdatePending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay px-3 py-4 sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-surface relative w-full max-w-lg max-h-[90vh] space-y-5 overflow-y-auto rounded-2xl p-4 shadow-2xl sm:p-6 md:px-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-container-foreground">
              {editingCoach ? `Edit ${editingCoach.fullName}` : "Add New Coach"}
            </h3>
            <p className="text-sm text-muted">
              {editingCoach
                ? "Update coach information and manage team assignments"
                : "Create a new coach account"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted shadow-sm transition hover:text-accent focus-visible:ring-2 focus-visible:ring-action-primary"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {coachFormError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {coachFormError}
          </div>
        ) : null}
        {coachFormSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {coachFormSuccess}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="text-xs font-medium text-muted">
            Full Name *
            <input
              type="text"
              value={coachForm.fullName}
              onChange={(event) => onFieldChange("fullName", event.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              placeholder="Sam Carter"
              required
            />
          </label>

          <label className="text-xs font-medium text-muted">
            Email *
            <input
              type="email"
              value={coachForm.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              placeholder="coach@club.dev"
              required
            />
          </label>

          <label className="text-xs font-medium text-muted">
            Phone
            <input
              type="tel"
              value={coachForm.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              placeholder="(+1) 555-1234"
            />
          </label>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted">
              Password {!editingCoach && "*"}
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={coachForm.password}
                  onChange={(event) => onFieldChange("password", event.target.value)}
                  className="flex-1 rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  placeholder={
                    editingCoach ? "Leave blank to keep current password" : "Enter password"
                  }
                  required={!editingCoach}
                />
                <button
                  type="button"
                  onClick={onGeneratePassword}
                  className="rounded-md border border-action-primary/40 bg-action-primary px-3 py-2 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
                >
                  Generate
                </button>
              </div>
            </label>
            {coachForm.password && (
              <p className="text-xs text-muted">
                Save this password securely.{" "}
                {editingCoach
                  ? "This will update the coach's password."
                  : "The coach will use this to log in."}
              </p>
            )}
          </div>

          {editingCoach && coachTeams.length > 0 && (
            <div className="modal-card space-y-2 rounded-lg bg-container p-3">
              <p className="text-xs font-semibold text-container-foreground">Assigned Teams</p>
              <ul className="space-y-1">
                {coachTeams.map((team) => (
                  <li key={team.id} className="flex items-center gap-2 text-xs text-muted">
                    <FontAwesomeIcon icon={faUsers} className="text-action-primary" />
                    <span>{team.name}</span>
                    <span className="text-[0.65rem]">({team.age_category})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-container-foreground transition hover:bg-container/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              {editingCoach ? "Save Changes" : "Create Coach"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoachFormModal;
