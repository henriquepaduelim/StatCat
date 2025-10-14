import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAthlete, uploadAthletePhoto } from "../api/athletes";
import AthleteForm from "../components/AthleteForm";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";
import type { AthletePayload } from "../types/athlete";

const NewAthlete = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, themes } = useThemeStore((state) => ({
    theme: state.theme,
    themes: state.themes,
  }));
  const t = useTranslation();
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const clientOptions = useMemo(
    () =>
      themes
        .filter((item) => item.clientId)
        .map((item) => ({ value: String(item.clientId), label: item.name })),
    [themes]
  );
  const hasMultipleClients = clientOptions.length > 1;

  const mutation = useMutation({
    mutationFn: async (payload: AthletePayload) => {
      const athlete = await createAthlete(payload);
      if (photoFile) {
        await uploadAthletePhoto(athlete.id, photoFile);
      }
      return athlete;
    },
    onSuccess: (athlete) => {
      queryClient.invalidateQueries({ queryKey: ["athletes", theme.clientId ?? "all"] });
      queryClient.invalidateQueries({ queryKey: ["athletes", "all"] });
      queryClient.removeQueries({ queryKey: ["athlete", athlete.id], exact: true });
      queryClient.removeQueries({ queryKey: ["athlete-report", athlete.id], exact: true });
      setPhotoFile(null);
      navigate(`/athletes/${athlete.id}`);
    },
  });

  const errorMessage =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
      ? t.newAthlete.error
      : null;

  const handleSubmit = async (payload: AthletePayload) => {
    try {
      await mutation.mutateAsync(payload);
    } catch (error) {
      console.error("Failed to save athlete", error);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-on-surface">{t.newAthlete.title}</h1>
        <p className="text-sm text-muted">{t.newAthlete.subtitle}</p>
      </header>

      <AthleteForm
        clientOptions={clientOptions}
        allowClientSelection={hasMultipleClients}
        defaultClientId={theme.clientId ? String(theme.clientId) : undefined}
        submitLabel={t.newAthlete.submit}
        onSubmit={handleSubmit}
        isSubmitting={mutation.isPending}
        errorMessage={errorMessage}
        onPhotoChange={setPhotoFile}
      />
    </div>
  );
};

export default NewAthlete;
