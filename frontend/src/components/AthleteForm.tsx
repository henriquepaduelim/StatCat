import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../i18n/useTranslation";
import type { AthletePayload } from "../types/athlete";

type FormState = {
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  birth_date: string;
  height_cm: string;
  weight_kg: string;
};

type ClientOption = {
  value: string;
  label: string;
};

type AthleteFormProps = {
  initialValues?: Partial<AthletePayload>;
  clientOptions: ClientOption[];
  allowClientSelection: boolean;
  defaultClientId?: string;
  submitLabel: string;
  onSubmit: (payload: AthletePayload) => Promise<void> | void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onPhotoChange?: (file: File | null) => void;
  initialPhotoUrl?: string | null;
};

const DEFAULT_BIRTH_DATE = "2000-01-01";

const INITIAL_STATE: FormState = {
  client_id: "",
  first_name: "",
  last_name: "",
  email: "",
  gender: "male",
  birth_date: DEFAULT_BIRTH_DATE,
  height_cm: "",
  weight_kg: "",
};

const AthleteForm = ({
  initialValues,
  clientOptions,
  allowClientSelection,
  defaultClientId,
  submitLabel,
  onSubmit,
  isSubmitting,
  errorMessage,
  onPhotoChange,
  initialPhotoUrl,
}: AthleteFormProps) => {
  const t = useTranslation();
  const [formState, setFormState] = useState<FormState>(() => populateState(initialValues, defaultClientId));
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const objectUrlRef = useRef<string | null>(null);

  const resolvedClientName = useMemo(() => {
    const targetClientId = formState.client_id || defaultClientId;
    if (!targetClientId) {
      return null;
    }
    return clientOptions.find((option) => option.value === targetClientId)?.label ?? null;
  }, [clientOptions, defaultClientId, formState.client_id]);

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
    setFormState((prev) => ({ ...prev, [name]: value }));
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
    const resolveClientId = () => {
      if (formState.client_id) {
        return Number(formState.client_id);
      }
      if (defaultClientId) {
        return Number(defaultClientId);
      }
      return undefined;
    };

    return {
      client_id: resolveClientId(),
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
      photo_url: initialValues?.photo_url,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(toPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="max-w-3xl space-y-4">
        {allowClientSelection ? (
          <label className="block text-sm font-medium text-muted">
            {t.newAthlete.client}
            <select
              name="client_id"
              required
              value={formState.client_id}
              onChange={handleChange}
              className="mt-1 w-full max-w-lg rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            >
              <option value="">{t.common.select}</option>
              {clientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : resolvedClientName ? (
          <div className="text-sm text-muted">
            <p className="font-medium text-container-foreground">{t.newAthlete.client}</p>
            <p>{resolvedClientName}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-muted">
            {t.newAthlete.firstName}
            <input
              required
              type="text"
              name="first_name"
              value={formState.first_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          <label className="block text-sm font-medium text-muted">
            {t.newAthlete.lastName}
            <input
              required
              type="text"
              name="last_name"
              value={formState.last_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-muted">
            {t.newAthlete.gender}
            <select
              required
              name="gender"
              value={formState.gender}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            >
              <option value="male">{t.newAthlete.genderOptions.male}</option>
              <option value="female">{t.newAthlete.genderOptions.female}</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-muted">
            {t.newAthlete.email}
            <input
              required
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-muted">
            {t.newAthlete.birthDate}
            <input
              required
              type="date"
              name="birth_date"
              value={formState.birth_date}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-muted">
          {t.newAthlete.photo}
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif"
            capture="environment"
            onChange={handlePhotoInput}
            className="mt-1 w-full max-w-md rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <span className="mt-1 block text-xs text-muted">{t.newAthlete.photoHint}</span>
        </label>
        {photoPreview ? (
          <div>
            <img
              src={photoPreview}
              alt="Athlete preview"
              className="h-40 w-40 rounded-lg border border-black/10 object-cover"
            />
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        className="w-full max-w-md rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? `${t.common.loading}...` : submitLabel}
      </button>
    </form>
  );
};

const populateState = (
  initialValues?: Partial<AthletePayload>,
  defaultClientId?: string
): FormState => {
  if (!initialValues) {
    return {
      ...INITIAL_STATE,
      client_id: defaultClientId ?? "",
    };
  }

  return {
    client_id:
      initialValues.client_id != null
        ? String(initialValues.client_id)
        : defaultClientId ?? "",
    first_name: initialValues.first_name ?? "",
    last_name: initialValues.last_name ?? "",
    email: initialValues.email ?? "",
    gender: initialValues.gender ?? "male",
    birth_date: initialValues.birth_date ?? DEFAULT_BIRTH_DATE,
    height_cm:
      initialValues.height_cm != null ? String(initialValues.height_cm) : "",
    weight_kg:
      initialValues.weight_kg != null ? String(initialValues.weight_kg) : "",
  };
};

export default AthleteForm;
