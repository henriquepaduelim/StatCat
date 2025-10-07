import { ChangeEvent, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAthlete } from "../hooks/useAthlete";
import api from "../api/client";
import type { Athlete } from "../types/athlete";
import { useTranslation } from "../i18n/useTranslation";

const AthleteDetail = () => {
  const params = useParams<{ id: string }>();
  const athleteId = useMemo(() => Number(params.id), [params.id]);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useAthlete(athleteId);
  const t = useTranslation();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data: updated } = await api.post<Athlete>(
        `/athletes/${athleteId}/photo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    uploadMutation.mutate(file);
    event.target.value = "";
  };

  if (isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-primary hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-on-surface">
          {data.first_name} {data.last_name}
        </h1>
        <p className="text-sm text-muted">{t.athleteDetail.profileSubtitle}</p>
        <Link to="/athletes" className="text-sm font-semibold text-primary hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-background shadow-inner">
              {data.photo_url ? (
                <img
                  src={data.photo_url}
                  alt={`${data.first_name} ${data.last_name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted">
                  {data.first_name.charAt(0)}
                  {data.last_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted">
              <p className="font-semibold text-on-surface">{t.athleteDetail.upload}</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-xs font-medium text-muted hover:border-primary">
                <span>{uploadMutation.isPending ? t.athleteDetail.uploadPending : t.athleteDetail.upload}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploadMutation.isPending}
                />
              </label>
              {uploadMutation.isError && (
                <p className="text-xs text-red-500">{t.athleteDetail.uploadError}</p>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-surface p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold text-on-surface">{t.athleteDetail.infoTitle}</h2>
          <dl className="mt-4 space-y-3 text-sm text-muted">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">{t.athleteDetail.metrics.email}</dt>
              <dd>{data.email ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">{t.athleteDetail.metrics.club}</dt>
              <dd>{data.club_affiliation ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">{t.athleteDetail.metrics.height}</dt>
              <dd>{data.height_cm ? `${data.height_cm} cm` : "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">{t.athleteDetail.metrics.weight}</dt>
              <dd>{data.weight_kg ? `${data.weight_kg} kg` : "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">{t.athleteDetail.metrics.dominantFoot}</dt>
              <dd>{data.dominant_foot ?? "-"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl bg-surface p-6 shadow-sm md:col-span-3">
          <h2 className="text-lg font-semibold text-on-surface">{t.athleteDetail.lastReportTitle}</h2>
          <p className="mt-3 text-sm text-muted">{t.reports.summary}</p>
        </div>
      </section>
    </div>
  );
};

export default AthleteDetail;
