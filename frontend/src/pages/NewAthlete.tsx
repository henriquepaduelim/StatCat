import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  completeAthleteRegistration,
  uploadAthleteDocument,
} from "../api/athletes";
import { useAthlete } from "../hooks/useAthlete";
import { useTranslation } from "../i18n/useTranslation";
import type {
  AthleteDocumentMetadata,
  AthleteRegistrationCompletionPayload,
} from "../types/athlete";
import Spinner from "../components/Spinner";

const todayIso = () => new Date().toISOString().slice(0, 10);

const NewAthlete = () => {
  const { id } = useParams<{ id: string }>();
  const athleteId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useTranslation();

  const athleteQuery = useAthlete(Number.isFinite(athleteId) ? athleteId : Number.NaN);

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
  const [documents, setDocuments] = useState<Array<{
    label: string;
    file?: File | null;
    file_url?: string;
    uploading?: boolean;
    error?: string | null;
  }>>([]);

  const [payment, setPayment] = useState({
    amount: "",
    currency: "",
    method: "",
    reference: "",
    paid_at: todayIso(),
    receipt_url: "",
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: AthleteRegistrationCompletionPayload) =>
      completeAthleteRegistration(athleteId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["athlete-report", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setStatusMessage(t.newAthlete.stepTwoSuccess);
    },
  });

  const athleteName = useMemo(() => {
    const athlete = athleteQuery.data;
    if (!athlete) return "";
    return `${athlete.first_name} ${athlete.last_name}`.trim();
  }, [athleteQuery.data]);

  useEffect(() => {
    const athlete = athleteQuery.data;
    if (!athlete) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || athlete.email || "",
      phone: prev.phone || athlete.phone || "",
    }));
  }, [athleteQuery.data]);

  const handleFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setPayment((prev) => ({ ...prev, [name]: value }));
  };

  const addDocumentRow = () => {
    setDocuments((prev) => [...prev, { label: "", file: null, file_url: "" }]);
  };

  const updateDocumentField = (
    index: number,
    field: "label" | "file_url",
    value: string
  ) => {
    setDocuments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDocumentFileChange = async (
    index: number,
    file: File | null
  ) => {
    if (!file) {
      setDocuments((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], file: null };
        return next;
      });
      return;
    }

    const currentLabel = documents[index]?.label?.trim() || file.name;

    setDocuments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], uploading: true, error: null };
      return next;
    });

    try {
      const response = await uploadAthleteDocument(athleteId, currentLabel, file);
      setDocuments((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          label: response.label,
          file_url: response.file_url,
          uploading: false,
          error: null,
        };
        return next;
      });
    } catch (error) {
      setDocuments((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          uploading: false,
          error: t.newAthlete.documentUploadError,
        };
        return next;
      });
    }
  };

  const handleReceiptUpload = async (file: File | null) => {
    if (!file) {
      setPayment((prev) => ({ ...prev, receipt_url: "" }));
      return;
    }
    try {
      const response = await uploadAthleteDocument(athleteId, "payment_receipt", file);
      setPayment((prev) => ({ ...prev, receipt_url: response.file_url }));
    } catch (error) {
      setStatusMessage(t.newAthlete.documentUploadError);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!athleteId || Number.isNaN(athleteId)) {
      return;
    }

    const docsToSend: AthleteDocumentMetadata[] | undefined = documents
      .filter((doc) => doc.label.trim().length > 0 && doc.file_url)
      .map((doc) => ({ label: doc.label.trim(), file_url: doc.file_url ?? "" }));

    const hasPaymentInformation =
      payment.amount.trim() !== "" ||
      payment.method.trim() !== "" ||
      payment.reference.trim() !== "" ||
      payment.receipt_url.trim() !== "";

    const payload: AthleteRegistrationCompletionPayload = {
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim(),
      province: form.province.trim(),
      postal_code: form.postal_code.trim(),
      country: form.country.trim(),
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
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_relationship: form.emergency_contact_relationship.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      medical_allergies: form.medical_allergies.trim() || undefined,
      medical_conditions: form.medical_conditions.trim() || undefined,
      physician_name: form.physician_name.trim() || undefined,
      physician_phone: form.physician_phone.trim() || undefined,
      documents: docsToSend?.length ? docsToSend : undefined,
      payment: hasPaymentInformation
        ? {
            amount:
              payment.amount.trim() !== ""
                ? Number.parseFloat(payment.amount)
                : undefined,
            currency: payment.currency.trim() || undefined,
            method: payment.method.trim() || undefined,
            reference: payment.reference.trim() || undefined,
            receipt_url: payment.receipt_url.trim() || undefined,
            paid_at: payment.paid_at ? `${payment.paid_at}T00:00:00Z` : undefined,
          }
        : undefined,
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        navigate(`/athletes/${athleteId}`);
      },
    });
  };

  if (!Number.isFinite(athleteId)) {
    return <p className="text-sm text-red-600">{t.athletes.error}</p>;
  }

  if (athleteQuery.isLoading) {
    return <Spinner className="py-10" />;
  }

  if (athleteQuery.isError) {
    return <p className="text-sm text-red-600">{t.athletes.error}</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-accent hover:underline"
        >
          {t.common.back}
        </button>
        <h1 className="text-2xl font-semibold text-container-foreground">
          {t.newAthlete.stepTwoTitle}
        </h1>
        <p className="text-sm text-muted">
          {athleteName
            ? t.newAthlete.stepTwoSubtitle(athleteName)
            : t.newAthlete.stepTwoDefaultSubtitle}
        </p>
      </header>

      {statusMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border-muted bg-container p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-container-foreground">
            {t.newAthlete.contactSection}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.email}
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.phone}
              <input
                required
                name="phone"
                value={form.phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-muted bg-container p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-container-foreground">
            {t.newAthlete.addressSection}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.addressStreet}
              <input
                required
                name="address_line1"
                value={form.address_line1}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.addressNumber}
              <input
                name="address_line2"
                value={form.address_line2}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.addressCity}
              <input
                required
                name="city"
                value={form.city}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.addressProvince}
              <input
                required
                name="province"
                value={form.province}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.addressPostal}
              <input
                required
                name="postal_code"
                value={form.postal_code}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.addressCountry}
              <input
                required
                name="country"
                value={form.country}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-muted bg-container p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-container-foreground">
              {t.newAthlete.guardianSection}
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={showSecondaryGuardian}
                onChange={(event) => setShowSecondaryGuardian(event.target.checked)}
              />
              {t.newAthlete.enableSecondGuardian}
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.guardianName}
              <input
                name="guardian_name"
                value={form.guardian_name}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.guardianRelationship}
              <input
                name="guardian_relationship"
                value={form.guardian_relationship}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.guardianEmail}
              <input
                type="email"
                name="guardian_email"
                value={form.guardian_email}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.guardianPhone}
              <input
                name="guardian_phone"
                value={form.guardian_phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>

          {showSecondaryGuardian ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-muted">
                {t.newAthlete.secondGuardianName}
                <input
                  name="secondary_guardian_name"
                  value={form.secondary_guardian_name}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium text-muted">
                {t.newAthlete.secondGuardianRelationship}
                <input
                  name="secondary_guardian_relationship"
                  value={form.secondary_guardian_relationship}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium text-muted">
                {t.newAthlete.secondGuardianEmail}
                <input
                  type="email"
                  name="secondary_guardian_email"
                  value={form.secondary_guardian_email}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium text-muted">
                {t.newAthlete.secondGuardianPhone}
                <input
                  name="secondary_guardian_phone"
                  value={form.secondary_guardian_phone}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-xl border border-border-muted bg-container p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-container-foreground">
            {t.newAthlete.emergencySection}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.emergencyName}
              <input
                required
                name="emergency_contact_name"
                value={form.emergency_contact_name}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.emergencyRelationship}
              <input
                required
                name="emergency_contact_relationship"
                value={form.emergency_contact_relationship}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.emergencyPhone}
              <input
                required
                name="emergency_contact_phone"
                value={form.emergency_contact_phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-muted bg-container p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-container-foreground">
            {t.newAthlete.medicalSection}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.medicalAllergies}
              <textarea
                name="medical_allergies"
                value={form.medical_allergies}
                onChange={handleFieldChange}
                rows={3}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.medicalConditions}
              <textarea
                name="medical_conditions"
                value={form.medical_conditions}
                onChange={handleFieldChange}
                rows={3}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.physicianName}
              <input
                name="physician_name"
                value={form.physician_name}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.physicianPhone}
              <input
                name="physician_phone"
                value={form.physician_phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-muted bg-container p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-container-foreground">
              {t.newAthlete.documentsSection}
            </h2>
            <button
              type="button"
              onClick={addDocumentRow}
              className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold text-muted hover:border-action-primary hover:text-accent"
            >
              {t.newAthlete.addDocument}
            </button>
          </div>
          {documents.length === 0 ? (
            <p className="text-sm text-muted">{t.newAthlete.noDocuments}</p>
          ) : (
            <div className="space-y-3">
              {documents.map((document, index) => (
                <div
                  key={`doc-${index}`}
                  className="grid gap-2 rounded-lg border border-black/10 bg-container/30 p-3 md:grid-cols-3"
                >
                  <label className="text-xs font-medium text-muted">
                    {t.newAthlete.documentLabel}
                    <input
                      required
                      value={document.label}
                      onChange={(event) =>
                        updateDocumentField(index, "label", event.target.value)
                      }
                      className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    {t.newAthlete.documentFile}
                    <input
                      type="file"
                      onChange={(event) =>
                        handleDocumentFileChange(index, event.target.files?.[0] ?? null)
                      }
                      className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                    />
                    {document.uploading ? (
                      <span className="mt-1 block text-xs text-muted">
                        {t.common.loading}...
                      </span>
                    ) : null}
                    {document.error ? (
                      <span className="mt-1 block text-xs text-red-600">
                        {document.error}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-xs font-medium text-muted">
                    {t.newAthlete.documentLink}
                    <input
                      value={document.file_url ?? ""}
                      onChange={(event) =>
                        updateDocumentField(index, "file_url", event.target.value)
                      }
                      className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-container-foreground">
            {t.newAthlete.paymentSection}
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.paymentAmount}
              <input
                name="amount"
                value={payment.amount}
                onChange={handlePaymentChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.paymentCurrency}
              <input
                name="currency"
                value={payment.currency}
                onChange={handlePaymentChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.paymentMethod}
              <input
                name="method"
                value={payment.method}
                onChange={handlePaymentChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.paymentReference}
              <input
                name="reference"
                value={payment.reference}
                onChange={handlePaymentChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.paymentDate}
              <input
                type="date"
                name="paid_at"
                value={payment.paid_at}
                onChange={handlePaymentChange}
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.newAthlete.paymentReceipt}
              <input
                type="file"
                onChange={(event) =>
                  handleReceiptUpload(event.target.files?.[0] ?? null)
                }
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
              />
              {payment.receipt_url ? (
                <span className="mt-1 block text-xs text-muted">
                  {t.newAthlete.fileSaved}
                </span>
              ) : null}
            </label>
          </div>
        </section>

        {mutation.isError ? (
          <p className="text-sm text-red-600">{t.newAthlete.error}</p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted hover:border-action-primary hover:text-accent"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? `${t.common.loading}...` : t.newAthlete.stepTwoSubmit}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewAthlete;
