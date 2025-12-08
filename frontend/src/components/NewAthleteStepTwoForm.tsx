import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  updateAthlete,
  completeAthleteRegistration,
  completeAthleteRegistrationPublic,
} from "../api/athletes";
import type {
  Athlete,
  AthletePayload,
  AthleteRegistrationCompletionPayload,
} from "../types/athlete";

type StepTwoFormState = {
  email: string;
  phone: string;
  birth_date: string;
  gender: "male" | "female" | "";
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_email: string;
  guardian_phone: string;
  secondary_guardian_name: string;
  secondary_guardian_relationship: string;
  secondary_guardian_email: string;
  secondary_guardian_phone: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  medical_allergies: string;
  medical_conditions: string;
  physician_name: string;
  physician_phone: string;
};

type AthleteWithDetails = Athlete & Partial<Record<keyof Omit<StepTwoFormState, "birth_date" | "gender">, string | null>>;

const requiredFieldDefinitions: Array<{ name: keyof StepTwoFormState; label: string }> = [
  { name: "birth_date", label: "Birth Date" },
  { name: "gender", label: "Gender" },
  { name: "address_line1", label: "Address line 1" },
  { name: "city", label: "City" },
  { name: "province", label: "Province / State" },
  { name: "postal_code", label: "Postal code" },
  { name: "country", label: "Country" },
  { name: "emergency_contact_name", label: "Emergency contact name" },
  { name: "emergency_contact_relationship", label: "Emergency contact relationship" },
  { name: "emergency_contact_phone", label: "Emergency contact phone" },
];

interface NewAthleteStepTwoFormProps {
  athlete: Athlete;
  signupToken?: string | null;
  onSuccess?: () => void;
  onClose?: () => void;
  isEditMode?: boolean;
}

const NewAthleteStepTwoForm = ({
  athlete,
  signupToken = null,
  onSuccess,
  onClose,
  isEditMode = false,
}: NewAthleteStepTwoFormProps) => {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<StepTwoFormState>({
    email: "",
    phone: "",
    birth_date: "",
    gender: "",
    address_line1: "",
    address_line2: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    guardian_name: "",
    guardian_relationship: "",
    guardian_email: "",
    guardian_phone: "",
    secondary_guardian_name: "",
    secondary_guardian_relationship: "",
    secondary_guardian_email: "",
    secondary_guardian_phone: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    medical_allergies: "",
    medical_conditions: "",
    physician_name: "",
    physician_phone: "",
  });

  const [showSecondaryGuardian, setShowSecondaryGuardian] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (formData: StepTwoFormState) => {
      // Step 1: Update the core athlete details
      const corePayload: Partial<AthletePayload> = {
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        birth_date: formData.birth_date,
        gender: formData.gender || undefined,
      };
      await updateAthlete(athlete.id, corePayload);

      // Step 2: Update the detailed athlete information
      const detailsPayload: AthleteRegistrationCompletionPayload = {
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim() || undefined,
        city: formData.city.trim(),
        province: formData.province.trim(),
        postal_code: formData.postal_code.trim(),
        country: formData.country.trim(),
        guardian_name: formData.guardian_name.trim() || undefined,
        guardian_relationship: formData.guardian_relationship.trim() || undefined,
        guardian_email: formData.guardian_email.trim() || undefined,
        guardian_phone: formData.guardian_phone.trim() || undefined,
        secondary_guardian_name: showSecondaryGuardian ? formData.secondary_guardian_name.trim() || undefined : undefined,
        secondary_guardian_relationship: showSecondaryGuardian ? formData.secondary_guardian_relationship.trim() || undefined : undefined,
        secondary_guardian_email: showSecondaryGuardian ? formData.secondary_guardian_email.trim() || undefined : undefined,
        secondary_guardian_phone: showSecondaryGuardian ? formData.secondary_guardian_phone.trim() || undefined : undefined,
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_relationship: formData.emergency_contact_relationship.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        medical_allergies: formData.medical_allergies.trim() || undefined,
        medical_conditions: formData.medical_conditions.trim() || undefined,
        physician_name: formData.physician_name.trim() || undefined,
        physician_phone: formData.physician_phone.trim() || undefined,
      };
      if (signupToken) {
        return completeAthleteRegistrationPublic(athlete.id, detailsPayload, signupToken);
      }
      return completeAthleteRegistration(athlete.id, detailsPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", athlete.id] });
      queryClient.invalidateQueries({ queryKey: ["athlete-report", athlete.id] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setStatusMessage(isEditMode ? "Information updated successfully!" : "Registration completed successfully!");
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  useEffect(() => {
    const details = athlete as AthleteWithDetails;
    setForm((prev) => ({
      ...prev,
      email: prev.email || details.email || "",
      phone: prev.phone || details.phone || "",
      birth_date: prev.birth_date || details.birth_date?.split("T")[0] || "",
      gender: prev.gender || details.gender || "",
      address_line1: prev.address_line1 || details.address_line1 || "",
      address_line2: prev.address_line2 || details.address_line2 || "",
      city: prev.city || details.city || "",
      province: prev.province || details.province || "",
      postal_code: prev.postal_code || details.postal_code || "",
      country: prev.country || details.country || "",
      guardian_name: prev.guardian_name || details.guardian_name || "",
      guardian_relationship: prev.guardian_relationship || details.guardian_relationship || "",
      guardian_email: prev.guardian_email || details.guardian_email || "",
      guardian_phone: prev.guardian_phone || details.guardian_phone || "",
      secondary_guardian_name: prev.secondary_guardian_name || details.secondary_guardian_name || "",
      secondary_guardian_relationship:
        prev.secondary_guardian_relationship || details.secondary_guardian_relationship || "",
      secondary_guardian_email: prev.secondary_guardian_email || details.secondary_guardian_email || "",
      secondary_guardian_phone: prev.secondary_guardian_phone || details.secondary_guardian_phone || "",
      emergency_contact_name: prev.emergency_contact_name || details.emergency_contact_name || "",
      emergency_contact_relationship:
        prev.emergency_contact_relationship || details.emergency_contact_relationship || "",
      emergency_contact_phone: prev.emergency_contact_phone || details.emergency_contact_phone || "",
      medical_allergies: prev.medical_allergies || details.medical_allergies || "",
      medical_conditions: prev.medical_conditions || details.medical_conditions || "",
      physician_name: prev.physician_name || details.physician_name || "",
      physician_phone: prev.physician_phone || details.physician_phone || "",
    }));
    
    if (details.secondary_guardian_name || details.secondary_guardian_email) {
      setShowSecondaryGuardian(true);
    }
  }, [athlete]);

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors.length) {
      setFormErrors([]);
    }
    if (statusMessage) {
      setStatusMessage(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missingFields = requiredFieldDefinitions.filter(
      ({ name }) => !form[name] || !String(form[name]).trim()
    );

    if (missingFields.length > 0) {
      setFormErrors(missingFields.map(({ label }) => `${label} is required.`));
      setStatusMessage(null);
      return;
    }

    setFormErrors([]);
    mutation.mutate(form);
  };

  const athleteName = `${athlete.first_name} ${athlete.last_name}`.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-full overflow-y-auto">
      <header className="space-y-1 border-b border-black/5 pb-4">
        <h2 className="text-xl font-semibold text-container-foreground">
          {isEditMode ? "Additional Information" : "Complete Athlete Registration"}
        </h2>
        <p className="text-sm text-muted">
          {isEditMode 
            ? `Update additional details for ${athleteName} (all fields are optional)`
            : `Additional information for ${athleteName}`
          }
        </p>
      </header>

      {statusMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}

      {formErrors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">Please complete the required fields before continuing:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contact Information */}
      <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
        <h3 className="text-sm font-semibold text-container-foreground">
          Athlete Details
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-muted">
            Email
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Phone
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Birth Date
            <input
              required
              type="date"
              id="birth_date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Gender
            <select
              required
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            >
              <option value="" disabled>Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
        <h3 className="text-sm font-semibold text-container-foreground">
          Address
        </h3>
        <div className="space-y-4">
          <label className="text-sm font-medium text-muted">
            Address (Street/Avenue)
            <input
              required
              type="text"
              id="address_line1"
              name="address_line1"
              value={form.address_line1}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Complement (Number, Apartment, etc.)
            <input
              type="text"
              id="address_line2"
              name="address_line2"
              value={form.address_line2}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="text-sm font-medium text-muted">
              City
              <input
                required
                type="text"
                id="city"
                name="city"
                value={form.city}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              State/Province
              <input
                required
                type="text"
                id="province"
                name="province"
                value={form.province}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Postal Code
              <input
                required
                type="text"
                id="postal_code"
                name="postal_code"
                value={form.postal_code}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Country
              <input
                required
                type="text"
                id="country"
                name="country"
                value={form.country}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Guardian/Responsible */}
      <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-container-foreground">
            Guardian/Responsible
          </h3>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={showSecondaryGuardian}
              onChange={(event) => setShowSecondaryGuardian(event.target.checked)}
              className="h-3 w-3 text-blue-600 focus:ring-blue-500"
            />
            Add second guardian
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-muted">
            Guardian Name
            <input
              type="text"
              id="guardian_name"
              name="guardian_name"
              value={form.guardian_name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Relationship
            <input
              type="text"
              id="guardian_relationship"
              name="guardian_relationship"
              value={form.guardian_relationship}
              onChange={handleFieldChange}
              placeholder="e.g. Father, Mother, Guardian"
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Guardian Email
            <input
              type="email"
              id="guardian_email"
              name="guardian_email"
              value={form.guardian_email}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Guardian Phone
            <input
              type="tel"
              id="guardian_phone"
              name="guardian_phone"
              value={form.guardian_phone}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
        </div>

        {showSecondaryGuardian && (
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-black/5">
            <label className="text-sm font-medium text-muted">
              Second Guardian Name
              <input
                type="text"
                id="secondary_guardian_name"
                name="secondary_guardian_name"
                value={form.secondary_guardian_name}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Relationship
              <input
                type="text"
                id="secondary_guardian_relationship"
                name="secondary_guardian_relationship"
                value={form.secondary_guardian_relationship}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Second Guardian Email
              <input
                type="email"
                id="secondary_guardian_email"
                name="secondary_guardian_email"
                value={form.secondary_guardian_email}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Second Guardian Phone
              <input
                type="tel"
                id="secondary_guardian_phone"
                name="secondary_guardian_phone"
                value={form.secondary_guardian_phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
          </div>
        )}
      </section>

      {/* Emergency Contact */}
      <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
        <h3 className="text-sm font-semibold text-container-foreground">
          Emergency Contact
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            Name
            <input
              required
              type="text"
              id="emergency_contact_name"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Relationship
            <input
              required
              type="text"
              id="emergency_contact_relationship"
              name="emergency_contact_relationship"
              value={form.emergency_contact_relationship}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Phone
            <input
              required
              type="tel"
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
            />
          </label>
        </div>
      </section>

      {/* Medical Information */}
      <section className="space-y-4 rounded-lg border border-black/10 bg-container p-4 shadow-sm dark:border-white/10">
        <h3 className="text-sm font-semibold text-container-foreground">
          Medical Information
        </h3>
        <div className="space-y-4">
          <label className="text-sm font-medium text-muted">
            Allergies
            <textarea
              id="medical_allergies"
              name="medical_allergies"
              rows={3}
              value={form.medical_allergies}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              placeholder="Describe any known allergies..."
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Medical Conditions
            <textarea
              id="medical_conditions"
              name="medical_conditions"
              rows={3}
              value={form.medical_conditions}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              placeholder="Describe any relevant medical conditions..."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              Physician Name
              <input
                type="text"
                id="physician_name"
                name="physician_name"
                value={form.physician_name}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Physician Phone
              <input
                type="tel"
                id="physician_phone"
                name="physician_phone"
                value={form.physician_phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 bg-[rgb(var(--color-input-background))] px-3 py-2 text-[rgb(var(--color-input-foreground))]"
              />
            </label>
          </div>
        </div>
      </section>

      {mutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Error saving information. Please try again.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end border-t border-black/5 pt-6">
        {!isEditMode && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted hover:border-action-primary hover:text-accent"
          >
            Skip and Finish
          </button>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? "Saving..." : isEditMode ? "Save Changes" : "Complete Registration"}
        </button>
      </div>
    </form>
  );
};

export default NewAthleteStepTwoForm;
