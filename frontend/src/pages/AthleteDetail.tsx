import { ChangeEvent, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAthlete } from "../hooks/useAthlete";
import api from "../api/client";
import type { Athlete } from "../types/athlete";

const AthleteDetail = () => {
  const params = useParams<{ id: string }>();
  const athleteId = useMemo(() => Number(params.id), [params.id]);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useAthlete(athleteId);

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
    return <p className="text-sm text-muted">Carregando atleta...</p>;
  }

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">Não foi possível carregar o atleta.</p>
        <Link to="/athletes" className="text-sm font-semibold text-primary hover:underline">
          Voltar para a lista
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
        <p className="text-sm text-muted">
          Perfil do atleta e resultados consolidados para relatórios personalizados.
        </p>
        <Link to="/athletes" className="text-sm font-semibold text-primary hover:underline">
          Voltar para a lista
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
                  {data.first_name.charAt(0)}{data.last_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted">
              <p className="font-semibold text-on-surface">Identidade visual</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-xs font-medium text-muted hover:border-primary">
                <span>{uploadMutation.isPending ? "Enviando..." : "Atualizar foto"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploadMutation.isPending}
                />
              </label>
              {uploadMutation.isError && (
                <p className="text-xs text-red-500">Não foi possível enviar a foto.</p>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-surface p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold text-on-surface">Informações gerais</h2>
          <dl className="mt-4 space-y-3 text-sm text-muted">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">E-mail</dt>
              <dd>{data.email ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">Clube</dt>
              <dd>{data.club_affiliation ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">Altura</dt>
              <dd>{data.height_cm ? `${data.height_cm} cm` : "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">Peso</dt>
              <dd>{data.weight_kg ? `${data.weight_kg} kg` : "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-muted">Pé dominante</dt>
              <dd>{data.dominant_foot ?? "-"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl bg-surface p-6 shadow-sm md:col-span-3">
          <h2 className="text-lg font-semibold text-on-surface">Último relatório</h2>
          <p className="mt-3 text-sm text-muted">
            Aqui serão exibidos os resultados consolidados do último combine, com gráficos e
            comparações com a média da equipe.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AthleteDetail;
