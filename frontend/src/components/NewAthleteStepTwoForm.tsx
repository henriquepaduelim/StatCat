import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  completeAthleteRegistration,
  uploadAthleteDocument,
} from "../api/athletes";
import { useTranslation } from "../i18n/useTranslation";
import type {
  Athlete,
  AthleteDocumentMetadata,
  AthleteRegistrationCompletionPayload,
} from "../types/athlete";

const todayIso = () => new Date().toISOString().slice(0, 10);

interface NewAthleteStepTwoFormProps {
  athlete: Athlete;
  onSuccess?: () => void;
  onClose?: () => void;
  isEditMode?: boolean;
}

const NewAthleteStepTwoForm = ({ athlete, onSuccess, onClose, isEditMode = false }: NewAthleteStepTwoFormProps) => {
  const queryClient = useQueryClient();
  const t = useTranslation();

  const [form, setForm] = useState({
    email: "",
    phone: "",
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

  const mutation = useMutation({
    mutationFn: (payload: AthleteRegistrationCompletionPayload) =>
      completeAthleteRegistration(athlete.id, payload),
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
    setForm((prev) => ({
      ...prev,
      email: prev.email || athlete.email || "",
      phone: prev.phone || athlete.phone || "",
      // Pré-popular outros campos se estiverem disponíveis no objeto athlete
      address_line1: prev.address_line1 || (athlete as any).address_line1 || "",
      address_line2: prev.address_line2 || (athlete as any).address_line2 || "",
      city: prev.city || (athlete as any).city || "",
      province: prev.province || (athlete as any).province || "",
      postal_code: prev.postal_code || (athlete as any).postal_code || "",
      country: prev.country || (athlete as any).country || "",
      guardian_name: prev.guardian_name || (athlete as any).guardian_name || "",
      guardian_relationship: prev.guardian_relationship || (athlete as any).guardian_relationship || "",
      guardian_email: prev.guardian_email || (athlete as any).guardian_email || "",
      guardian_phone: prev.guardian_phone || (athlete as any).guardian_phone || "",
      secondary_guardian_name: prev.secondary_guardian_name || (athlete as any).secondary_guardian_name || "",
      secondary_guardian_relationship: prev.secondary_guardian_relationship || (athlete as any).secondary_guardian_relationship || "",
      secondary_guardian_email: prev.secondary_guardian_email || (athlete as any).secondary_guardian_email || "",
      secondary_guardian_phone: prev.secondary_guardian_phone || (athlete as any).secondary_guardian_phone || "",
      emergency_contact_name: prev.emergency_contact_name || (athlete as any).emergency_contact_name || "",
      emergency_contact_relationship: prev.emergency_contact_relationship || (athlete as any).emergency_contact_relationship || "",
      emergency_contact_phone: prev.emergency_contact_phone || (athlete as any).emergency_contact_phone || "",
      medical_allergies: prev.medical_allergies || (athlete as any).medical_allergies || "",
      medical_conditions: prev.medical_conditions || (athlete as any).medical_conditions || "",
      physician_name: prev.physician_name || (athlete as any).physician_name || "",
      physician_phone: prev.physician_phone || (athlete as any).physician_phone || "",
    }));
    
    // Se houver segundo responsável, mostrar a seção
    if ((athlete as any).secondary_guardian_name || (athlete as any).secondary_guardian_email) {
      setShowSecondaryGuardian(true);
    }
  }, [athlete]);

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: AthleteRegistrationCompletionPayload = {
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address_line1: form.address_line1.trim() || undefined,
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim() || undefined,
      province: form.province.trim() || undefined,
      postal_code: form.postal_code.trim() || undefined,
      country: form.country.trim() || undefined,
      guardian_name: form.guardian_name.trim() || undefined,
      guardian_relationship: form.guardian_relationship.trim() || undefined,
      guardian_email: form.guardian_email.trim() || undefined,
      guardian_phone: form.guardian_phone.trim() || undefined,
      secondary_guardian_name: showSecondaryGuardian
        ? form.secondary_guardian_name.trim() || undefined
        : undefined,
      secondary_guardian_relationship: showSecondaryGuardian
        ? form.secondary_guardian_relationship.trim() || undefined
        : undefined,
      secondary_guardian_email: showSecondaryGuardian
        ? form.secondary_guardian_email.trim() || undefined
        : undefined,
      secondary_guardian_phone: showSecondaryGuardian
        ? form.secondary_guardian_phone.trim() || undefined
        : undefined,
      emergency_contact_name: form.emergency_contact_name.trim() || undefined,
      emergency_contact_relationship: form.emergency_contact_relationship.trim() || undefined,
      emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
      medical_allergies: form.medical_allergies.trim() || undefined,
      medical_conditions: form.medical_conditions.trim() || undefined,
      physician_name: form.physician_name.trim() || undefined,
      physician_phone: form.physician_phone.trim() || undefined,
    };

    mutation.mutate(payload);
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
            : `Additional information for ${athleteName} (all fields are optional)`
          }
        </p>
      </header>

      {statusMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {statusMessage}
        </div>
      )}

      {/* Contact Information */}
      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-container-foreground">
          Contact Information
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-container-foreground">
          Address
        </h3>
        <div className="space-y-4">
          <label className="text-sm font-medium text-muted">
            Address (Street/Avenue)
            <input
              type="text"
              id="address_line1"
              name="address_line1"
              value={form.address_line1}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="text-sm font-medium text-muted">
              City
              <input
                type="text"
                id="city"
                name="city"
                value={form.city}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              State/Province
              <input
                type="text"
                id="province"
                name="province"
                value={form.province}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Postal Code
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={form.postal_code}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              Country
              <input
                type="text"
                id="country"
                name="country"
                value={form.country}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Guardian/Responsible */}
      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
        )}
      </section>

      {/* Emergency Contact */}
      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-container-foreground">
          Emergency Contact
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            Name
            <input
              type="text"
              id="emergency_contact_name"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Relationship
            <input
              type="text"
              id="emergency_contact_relationship"
              name="emergency_contact_relationship"
              value={form.emergency_contact_relationship}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            Phone
            <input
              type="tel"
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
        </div>
      </section>

      {/* Medical Information */}
      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
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
