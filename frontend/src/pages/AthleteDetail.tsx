import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useAthlete } from "../hooks/useAthlete";

const AthleteDetail = () => {
  const params = useParams<{ id: string }>();
  const athleteId = useMemo(() => Number(params.id), [params.id]);
  const { data, isLoading, isError } = useAthlete(athleteId);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando atleta...</p>;
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
        <h1 className="text-3xl font-semibold text-slate-900">
          {data.first_name} {data.last_name}
        </h1>
        <p className="text-sm text-slate-500">
          Perfil do atleta e resultados consolidados para relatórios personalizados.
        </p>
        <Link to="/athletes" className="text-sm font-semibold text-primary hover:underline">
          Voltar para a lista
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Informações gerais</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-500">E-mail</dt>
              <dd>{data.email ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-500">Clube</dt>
              <dd>{data.club_affiliation ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-500">Altura</dt>
              <dd>{data.height_cm ? `${data.height_cm} cm` : "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-500">Peso</dt>
              <dd>{data.weight_kg ? `${data.weight_kg} kg` : "-"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-500">Pé dominante</dt>
              <dd>{data.dominant_foot ?? "-"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Último relatório</h2>
          <p className="mt-3 text-sm text-slate-500">
            Aqui serão exibidos os resultados consolidados do último combine, com gráficos e
            comparações com a média da equipe.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AthleteDetail;
