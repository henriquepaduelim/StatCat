import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../i18n/useTranslation";
import type { AthletePayload } from "../types/athlete";

type FormState = {
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  dominant_foot: string;
  club_affiliation: string;
  height_cm: string;
  weight_kg: string;
  status: string;
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

const INITIAL_STATE: FormState = {
  client_id: "",
  first_name: "",
  last_name: "",
  email: "",
  birth_date: "",
  dominant_foot: "",
  club_affiliation: "",
  height_cm: "",
  weight_kg: "",
  status: "active",
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
    // If the club name resolves asynchronously, make sure the affiliation field reflects it.
    if (resolvedClientName) {
      setFormState(prev => ({ ...prev, club_affiliation: resolvedClientName }));
    }
  }, [resolvedClientName]);

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
      birth_date: formState.birth_date,
      dominant_foot: formState.dominant_foot || undefined,
      club_affiliation: formState.club_affiliation.trim() || undefined,
      height_cm: formState.height_cm ? Number(formState.height_cm) : undefined,
      weight_kg: formState.weight_kg ? Number(formState.weight_kg) : undefined,
      status: (formState.status || "active") as AthletePayload["status"],
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(toPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {errorMessage}
        </div>
      ) : null}

      {allowClientSelection ? (
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.client}
          <select
            name="client_id"
            required
            value={formState.client_id}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <p className="font-medium text-on-surface">{t.newAthlete.client}</p>
          <p>{resolvedClientName}</p>
          <input type="hidden" name="client_id" value={formState.client_id || defaultClientId || ""} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.firstName}
          <input
            required
            type="text"
            name="first_name"
            value={formState.first_name}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.lastName}
          <input
            required
            type="text"
            name="last_name"
            value={formState.last_name}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.email}
          <input
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.club}
          <input
            type="text"
            name="club_affiliation"
            value={formState.club_affiliation}
            onChange={handleChange}
            disabled // O campo continua travado
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-muted md:col-span-3">
          {t.newAthlete.photo}
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif"
            capture="environment"
            onChange={handlePhotoInput}
            className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="mt-1 block text-xs text-muted">{t.newAthlete.photoHint}</span>
        </label>
        {photoPreview ? (
          <div className="md:col-span-3">
            <img
              src={photoPreview}
              alt="Athlete preview"
              className="h-40 w-40 rounded-lg border border-black/10 object-cover"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.birthDate}
          <input
            type="date"
            name="birth_date"
            value={formState.birth_date}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.height}
          <input
            type="number"
            step="0.1"
            name="height_cm"
            value={formState.height_cm}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="text-sm font-medium text-muted">
          {t.newAthlete.weight}
          <input
            type="number"
            step="0.1"
            name="weight_kg"
            value={formState.weight_kg}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      <label className="text-sm font-medium text-muted">
        {t.newAthlete.dominantFoot}
        <select
          name="dominant_foot"
          value={formState.dominant_foot}
          onChange={handleChange}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
      focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t.newAthlete.dominantFootOptions.default}</option>
          <option value="right">{t.newAthlete.dominantFootOptions.right}</option>
          <option value="left">{t.newAthlete.dominantFootOptions.left}</option>
          <option value="both">{t.newAthlete.dominantFootOptions.both}</option>
        </select>
      </label>

      <label className="text-sm font-medium text-muted">
        {t.newAthlete.status}
        <select
          name="status"
          value={formState.status}
          onChange={handleChange}
          required
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 bg-white text-gray-900 shadow-sm 
       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="active">{t.newAthlete.statusOptions.active}</option>
          <option value="inactive">{t.newAthlete.statusOptions.inactive}</option>
        </select>
      </label>

      <button
        type="submit"
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition 
       disabled:cursor-not-allowed disabled:opacity-60"
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
    birth_date: initialValues.birth_date ?? "",
    dominant_foot: initialValues.dominant_foot ?? "",
    club_affiliation: initialValues.club_affiliation ?? "",
    height_cm:
      initialValues.height_cm != null ? String(initialValues.height_cm) : "",
    weight_kg:
      initialValues.weight_kg != null ? String(initialValues.weight_kg) : "",
    status: initialValues.status ?? "active",
  };
};

export default AthleteForm;
