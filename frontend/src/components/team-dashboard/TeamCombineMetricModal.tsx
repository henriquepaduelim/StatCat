import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import type { Athlete } from "../../types/athlete";
import { createTeamCombineMetric, type TeamCombineMetricPayload } from "../../api/teamMetrics";

type TeamCombineMetricModalProps = {
  isOpen: boolean;
  teamId: number | null;
  teamName?: string | null;
  onClose: () => void;
  athletes: Athlete[];
  onCreated?: () => void;
};

type FormState = {
  athleteId: string;
  sittingHeight: string;
  standingHeight: string;
  weight: string;
  split10: string;
  split20: string;
  split35: string;
  yoyo: string;
  jump: string;
  maxPower: string;
  recordedAt: string;
};

const emptyForm: FormState = {
  athleteId: "",
  sittingHeight: "",
  standingHeight: "",
  weight: "",
  split10: "",
  split20: "",
  split35: "",
  yoyo: "",
  jump: "",
  maxPower: "",
  recordedAt: "",
};

const parseFloatOrNull = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const TeamCombineMetricModal = ({
  isOpen,
  teamId,
  teamName,
  onClose,
  athletes,
  onCreated,
}: TeamCombineMetricModalProps) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const sortedAthletes = useMemo(
    () =>
      [...athletes].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }),
    [athletes],
  );

  const mutation = useMutation({
    mutationFn: (payload: TeamCombineMetricPayload) => {
      if (!teamId) {
        throw new Error("Missing team identifier");
      }
      return createTeamCombineMetric(teamId, payload);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      onCreated?.();
      onClose();
    },
    onError: (mutationError) => {
      const detail =
        (mutationError as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to save metrics.");
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !teamId) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: TeamCombineMetricPayload = {
      athlete_id: form.athleteId ? Number(form.athleteId) : null,
      sitting_height_cm: parseFloatOrNull(form.sittingHeight),
      standing_height_cm: parseFloatOrNull(form.standingHeight),
      weight_kg: parseFloatOrNull(form.weight),
      split_10m_s: parseFloatOrNull(form.split10),
      split_20m_s: parseFloatOrNull(form.split20),
      split_35m_s: parseFloatOrNull(form.split35),
      yoyo_distance_m: parseFloatOrNull(form.yoyo),
      jump_cm: parseFloatOrNull(form.jump),
      max_power_kmh: parseFloatOrNull(form.maxPower),
      recorded_at: form.recordedAt || null,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay px-4 py-6">
      <div className="modal-surface w-full max-w-3xl rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-container-foreground">Record combine entry</h2>
            <p className="text-sm text-muted">
              {teamName ? `Team: ${teamName}` : "Select a team to attach these metrics."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 px-3 py-1 text-sm font-semibold text-muted transition hover:border-black/30 hover:text-container-foreground"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted">
              Athlete (optional)
              <select
                value={form.athleteId}
                onChange={(event) => setForm((prev) => ({ ...prev, athleteId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">Unassigned</option>
                {sortedAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.first_name} {athlete.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              Recorded at (optional)
              <input
                type="datetime-local"
                value={form.recordedAt}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    recordedAt: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-muted">
              Sitting height (cm)
              <input
                type="number"
                step="0.1"
                value={form.sittingHeight}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sittingHeight: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-sm text-muted">
              Standing height (cm)
              <input
                type="number"
                step="0.1"
                value={form.standingHeight}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, standingHeight: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-sm text-muted">
              Weight (kg)
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-muted">
              10m split (s)
              <input
                type="number"
                step="0.01"
                value={form.split10}
                onChange={(event) => setForm((prev) => ({ ...prev, split10: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-sm text-muted">
              20m split (s)
              <input
                type="number"
                step="0.01"
                value={form.split20}
                onChange={(event) => setForm((prev) => ({ ...prev, split20: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-sm text-muted">
              35m split (s)
              <input
                type="number"
                step="0.01"
                value={form.split35}
                onChange={(event) => setForm((prev) => ({ ...prev, split35: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-muted">
              YoYo distance (m)
              <input
                type="number"
                step="1"
                value={form.yoyo}
                onChange={(event) => setForm((prev) => ({ ...prev, yoyo: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-sm text-muted">
              Jump (cm)
              <input
                type="number"
                step="0.1"
                value={form.jump}
                onChange={(event) => setForm((prev) => ({ ...prev, jump: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
            <label className="text-sm text-muted">
              Max power (km/h)
              <input
                type="number"
                step="0.1"
                value={form.maxPower}
                onChange={(event) => setForm((prev) => ({ ...prev, maxPower: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-border-muted bg-container px-3 py-2 text-sm text-container-foreground focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted transition hover:border-black/30 hover:text-container-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? "Saving..." : "Save metrics"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamCombineMetricModal;
