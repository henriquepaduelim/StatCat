import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../i18n/useTranslation";
import type { AthletePayload } from "../types/athlete";
import { useTeams } from "../hooks/useTeams";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  birth_date: string;
  height_cm: string;
  weight_kg: string;
  team_id: string;
  primary_position: string;
  secondary_position: string;
};

type AthleteFormProps = {
  initialValues?: Partial<AthletePayload>;
  submitLabel: string;
  onSubmit: (payload: AthletePayload) => Promise<void> | void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onPhotoChange?: (file: File | null) => void;
  initialPhotoUrl?: string | null;
};

const DEFAULT_BIRTH_DATE = "2000-01-01";
const POSITION_OPTIONS = [
  "Goalkeeper",
  "Right Back",
  "Center Back",
  "Left Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Right Winger",
  "Left Winger",
  "Striker",
  "Center Forward",
];

const INITIAL_STATE: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  gender: "male",
  birth_date: DEFAULT_BIRTH_DATE,
  height_cm: "",
  weight_kg: "",
  team_id: "",
  primary_position: "",
  secondary_position: "",
};

const AthleteForm = ({
  initialValues,
  submitLabel,
  onSubmit,
  isSubmitting,
  errorMessage,
  onPhotoChange,
  initialPhotoUrl,
}: AthleteFormProps) => {
  const t = useTranslation();
  const [formState, setFormState] = useState<FormState>(() => populateState(initialValues));
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const objectUrlRef = useRef<string | null>(null);
  const teamsQuery = useTeams();

  const teamOptions = useMemo(
    () =>
      (teamsQuery.data ?? []).map((team) => ({
        value: String(team.id),
        label: `${team.age_category} • ${team.name}`,
      })),
    [teamsQuery.data]
  );

  useEffect(() => {
    setFormState((prev) => {
      if (prev.secondary_position && prev.secondary_position === prev.primary_position) {
        return { ...prev, secondary_position: "" };
      }
      return prev;
    });
  }, [formState.primary_position]);

  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhotoPreview(initialPhotoUrl ?? null);
  }, [initialPhotoUrl]);

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const handleChange = (event: FormEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.currentTarget;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoInput = (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      objectUrlRef.current = previewUrl;
      onPhotoChange?.(file);
    } else {
      setPhotoPreview(initialPhotoUrl ?? null);
      onPhotoChange?.(null);
    }
  };

  const toPayload = (): AthletePayload => {
    return {
      first_name: formState.first_name.trim(),
      last_name: formState.last_name.trim(),
      email: formState.email.trim(),
      gender: formState.gender as AthletePayload["gender"],
      birth_date: formState.birth_date || DEFAULT_BIRTH_DATE,
      height_cm: formState.height_cm ? Number(formState.height_cm) : initialValues?.height_cm,
      weight_kg: formState.weight_kg ? Number(formState.weight_kg) : initialValues?.weight_kg,
      status: initialValues?.status ?? "active",
      dominant_foot: initialValues?.dominant_foot,
      club_affiliation: initialValues?.club_affiliation,
      team_id: formState.team_id ? Number(formState.team_id) : undefined,
      primary_position: formState.primary_position || undefined,
      secondary_position: formState.secondary_position ? formState.secondary_position : undefined,
      photo_url: initialValues?.photo_url,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(toPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-black/5 bg-container p-6 shadow-sm dark:border-white/10">
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.firstName}*
                <input
                  required
                  type="text"
                  name="first_name"
                  value={formState.first_name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-[rgb(var(--color-input-background))] text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.lastName}*
                <input
                  required
                  type="text"
                  name="last_name"
                  value={formState.last_name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-[rgb(var(--color-input-background))] text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.team}
                <select
                  name="team_id"
                  value={formState.team_id}
                  onChange={handleChange}
                  disabled={teamsQuery.isLoading}
                  className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{t.common.select}</option>
                  {teamOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {teamsQuery.isError ? (
                  <span className="mt-1 block text-xs text-red-500">Unable to load teams.</span>
                ) : null}
              </label>
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.primaryPosition}*
                <select
                  name="primary_position"
                  value={formState.primary_position}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                >
                  <option value="">{t.common.select}</option>
                  {POSITION_OPTIONS.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-muted">
              {t.newAthlete.secondaryPosition}
              <select
                name="secondary_position"
                value={formState.secondary_position}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">None</option>
                {POSITION_OPTIONS.filter((position) => position !== formState.primary_position).map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">{t.newAthlete.secondaryPositionHint}</span>
            </label>
          </section>

          <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.gender}*
                <select
                  required
                  name="gender"
                  value={formState.gender}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                >
                  <option value="male">{t.newAthlete.genderOptions.male}</option>
                  <option value="female">{t.newAthlete.genderOptions.female}</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.email}*
                <input
                  required
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-[rgb(var(--color-input-background))] text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.birthDate}*
                <input
                  required
                  type="date"
                  name="birth_date"
                  value={formState.birth_date}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-[rgb(var(--color-input-background))] text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.height}
                <input
                  type="number"
                  step="0.1"
                  name="height_cm"
                  value={formState.height_cm}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-[rgb(var(--color-input-background))] text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
              <label className="block text-sm font-medium text-muted">
                {t.newAthlete.weight}
                <input
                  type="number"
                  step="0.1"
                  name="weight_kg"
                  value={formState.weight_kg}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-[rgb(var(--color-input-background))] text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:w-72">
          <div className="space-y-3 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
            <label className="block text-sm font-medium text-muted">
              {t.newAthlete.photo}
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif"
                capture="environment"
                onChange={handlePhotoInput}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-sm text-[rgb(var(--color-input-foreground))] shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
              <span className="mt-1 block text-xs text-muted">{t.newAthlete.photoHint}</span>
            </label>
            {photoPreview ? (
              <div className="flex justify-center">
                <img
                  src={photoPreview}
                  alt="Athlete preview"
                  className="h-40 w-40 rounded-lg border border-black/10 object-cover"
                />
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? `${t.common.loading}...` : submitLabel}
        </button>
      </div>
    </form>
  );
};

const populateState = (
  initialValues?: Partial<AthletePayload>
): FormState => {
  if (!initialValues) {
    return {
      ...INITIAL_STATE,
    };
  }

  return {
    first_name: initialValues.first_name ?? "",
    last_name: initialValues.last_name ?? "",
    email: initialValues.email ?? "",
    gender: initialValues.gender ?? "male",
    birth_date: initialValues.birth_date ?? DEFAULT_BIRTH_DATE,
    height_cm:
      initialValues.height_cm != null ? String(initialValues.height_cm) : "",
    weight_kg:
      initialValues.weight_kg != null ? String(initialValues.weight_kg) : "",
    team_id: initialValues.team_id != null ? String(initialValues.team_id) : "",
    primary_position: initialValues.primary_position ?? "",
    secondary_position: initialValues.secondary_position ?? "",
  };
};

export default AthleteForm;
