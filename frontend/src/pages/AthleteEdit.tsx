import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import AthleteForm from "../components/AthleteForm";
import NewAthleteStepTwoForm from "../components/NewAthleteStepTwoForm";
import { updateAthlete, uploadAthletePhoto } from "../api/athletes";
import { useAthlete } from "../hooks/useAthlete";
import { useTranslation } from "../i18n/useTranslation";
import type { AthletePayload } from "../types/athlete";

const AthleteEdit = () => {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const rawId = Number(params.id);
  const athleteId = Number.isFinite(rawId) ? rawId : undefined;

  const { data: athlete, isLoading, isError } = useAthlete(athleteId ?? -1);
  const t = useTranslation();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [additionalInfoMessage, setAdditionalInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPhotoUrl(athlete?.photo_url ?? null);
  }, [athlete?.photo_url]);

  useEffect(() => {
    if (!profileMessage) return;
    const timeout = window.setTimeout(() => setProfileMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [profileMessage]);

  useEffect(() => {
    if (!additionalInfoMessage) return;
    const timeout = window.setTimeout(() => setAdditionalInfoMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [additionalInfoMessage]);

  const mutation = useMutation({
    mutationFn: (payload: AthletePayload) => updateAthlete(athleteId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["athlete", athleteId!] });
      queryClient.invalidateQueries({ queryKey: ["athlete-report", athleteId!] });
      setProfileMessage(t.athleteAssessment.profileSaved);
    },
  });

  const errorMessage =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
      ? t.newAthlete.error
      : null;

  const handleProfileSubmit = async (payload: AthletePayload) => {
    setProfilePending(true);
    try {
      await mutation.mutateAsync(payload);
      if (photoFile) {
        const updated = await uploadAthletePhoto(athleteId!, photoFile);
        setCurrentPhotoUrl(updated.photo_url ?? null);
        queryClient.invalidateQueries({ queryKey: ["athlete", athleteId!] });
        queryClient.invalidateQueries({ queryKey: ["athletes"] });
        setPhotoFile(null);
      }
    } finally {
      setProfilePending(false);
    }
  };

  const handleAdditionalInfoSuccess = () => {
    setAdditionalInfoMessage("Additional information updated successfully!");
    queryClient.invalidateQueries({ queryKey: ["athlete", athleteId!] });
    queryClient.invalidateQueries({ queryKey: ["athletes"] });
  };

  if (athleteId == null) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-accent hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  if (isError || !athlete) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-accent hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  const initialValues: Partial<AthletePayload> = {
    first_name: athlete.first_name,
    last_name: athlete.last_name,
    email: athlete.email,
    birth_date: athlete.birth_date,
    dominant_foot: athlete.dominant_foot ?? undefined,
    club_affiliation: athlete.club_affiliation ?? undefined,
    height_cm: athlete.height_cm ?? undefined,
    weight_kg: athlete.weight_kg ?? undefined,
    status: athlete.status,
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm text-muted">
          <Link to="/athletes" className="font-semibold text-accent hover:underline">
            {t.athleteDetail.backToList}
          </Link>
          <span>/</span>
          <span>{athlete.first_name} {athlete.last_name}</span>
        </div>
        <h1 className="text-3xl font-semibold text-container-foreground">
          {t.athleteAssessment.title}
        </h1>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-container-foreground">
            {t.athleteAssessment.profileSectionTitle}
          </h2>
          <p className="text-sm text-muted">{t.athleteDetail.profileSubtitle}</p>
        </div>
        {profileMessage && (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            {profileMessage}
          </div>
        )}
        <AthleteForm
          initialValues={initialValues}
          submitLabel={t.common.save}
          onSubmit={handleProfileSubmit}
          isSubmitting={mutation.isPending || profilePending}
          errorMessage={errorMessage}
          onPhotoChange={setPhotoFile}
          initialPhotoUrl={currentPhotoUrl}
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-container-foreground">
            Additional Information
          </h2>
          <p className="text-sm text-muted">Manage additional athlete details, contact information, and medical records</p>
        </div>
        {additionalInfoMessage && (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            {additionalInfoMessage}
          </div>
        )}
        <div className="rounded-lg border border-black/5 bg-white p-6 shadow-sm">
          <NewAthleteStepTwoForm
            athlete={athlete}
            onSuccess={handleAdditionalInfoSuccess}
            onClose={() => {}} // onClose is unused here because the content is inline, not a modal
            isEditMode={true}
          />
        </div>
      </section>
    </div>
  );
};

export default AthleteEdit;
