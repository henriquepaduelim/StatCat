import { Link } from "react-router-dom";

import { useSessions } from "../hooks/useSessions";
import { useThemeStore } from "../theme/useThemeStore";

const Sessions = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: sessions, isLoading } = useSessions(clientId);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-on-surface">Sessões de testes</h1>
        <p className="text-sm text-muted">
          Planeje as baterias de avaliações com métricas personalizadas para cada cliente e
          acompanhe o histórico de desempenho dos atletas.
        </p>
      </header>

      <section className="rounded-xl bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Próximas sessões</h2>
            <p className="text-xs text-muted">
              Dados sincronizados com o módulo de resultados. Registre novas avaliações direto no campo.
            </p>
          </div>
          <Link
            to="/sessions/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm"
          >
            Nova sessão (em breve)
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted">Carregando sessões...</p>}
          {!isLoading && (!sessions || sessions.length === 0) && (
            <p className="text-sm text-muted">
              Nenhuma sessão encontrada para este cliente. Programe uma avaliação para ver os resultados aqui.
            </p>
          )}
          {sessions?.map((session) => (
            <div key={session.id} className="rounded-lg border border-black/10 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">{session.name}</h3>
                  <p className="text-xs text-muted">
                    {session.scheduled_at
                      ? new Date(session.scheduled_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Data a definir"}
                    {session.location ? ` • ${session.location}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted">{session.notes ?? "Sem observações"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Sessions;
