import { useEffect, useMemo, useState } from "react";

import { useAthletes } from "../hooks/useAthletes";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useThemeStore } from "../theme/useThemeStore";

const Reports = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: athletes } = useAthletes(clientId);
  const [currentAthleteId, setCurrentAthleteId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (athletes && athletes.length && !currentAthleteId) {
      setCurrentAthleteId(athletes[0].id);
    }
  }, [athletes, currentAthleteId]);

  const reportQuery = useAthleteReport(currentAthleteId);

  const currentAthlete = useMemo(
    () => athletes?.find((athlete) => athlete.id === currentAthleteId),
    [athletes, currentAthleteId]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-on-surface">Relatórios</h1>
        <p className="text-sm text-muted">
          Escolha um atleta para visualizar os destaques e preparar o PDF personalizado com a
          identidade visual do cliente.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <label className="flex-1 text-sm font-medium text-muted">
          Selecionar atleta
          <select
            value={currentAthleteId ?? ""}
            onChange={(event) => setCurrentAthleteId(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Escolha um atleta</option>
            {athletes?.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.first_name} {athlete.last_name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary shadow-sm"
          disabled
        >
          Exportar PDF (em breve)
        </button>
      </div>

      <section className="rounded-xl bg-surface p-6 shadow-sm">
        {!currentAthlete && <p className="text-sm text-muted">Selecione um atleta para ver o relatório.</p>}

        {currentAthlete && reportQuery.isLoading && (
          <p className="text-sm text-muted">Carregando dados do relatório...</p>
        )}

        {reportQuery.isError && (
          <p className="text-sm text-red-500">
            Não foi possível carregar o relatório deste atleta. Tente novamente.
          </p>
        )}

        {currentAthlete && reportQuery.data && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-on-surface">
                  {currentAthlete.first_name} {currentAthlete.last_name}
                </h2>
                <p className="text-sm text-muted">
                  Relatório consolidado com {reportQuery.data.sessions.length} sessões avaliadas.
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary">
                Média de resultados registrada automaticamente após cada teste.
              </div>
            </div>

            <div className="space-y-4">
              {reportQuery.data.sessions.map((session) => (
                <div key={session.session_id} className="rounded-lg border border-black/10 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-on-surface">{session.session_name}</h3>
                      <p className="text-xs text-muted">
                        {session.scheduled_at
                          ? new Date(session.scheduled_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Data não informada"}
                        {session.location ? ` • ${session.location}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                      {session.results.length} métricas
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {session.results.map((metric) => (
                      <div key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`} className="rounded-lg bg-background px-4 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {metric.category ?? "Métrica"}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-on-surface">
                          {metric.value}
                          {metric.unit ? <span className="text-sm text-muted"> {metric.unit}</span> : null}
                        </p>
                        <p className="text-xs text-muted">{metric.test_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Reports;
