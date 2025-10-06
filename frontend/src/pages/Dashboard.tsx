import { Link } from "react-router-dom";

import { useAthletes } from "../hooks/useAthletes";
import { useSessions } from "../hooks/useSessions";
import { useTests } from "../hooks/useTests";
import { useThemeStore } from "../theme/useThemeStore";

const Dashboard = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: athletes } = useAthletes(clientId);
  const { data: sessions } = useSessions(clientId);
  const { data: tests } = useTests(clientId);

  const statCards = [
    {
      label: "Atletas cadastrados",
      value: athletes?.length ?? 0,
      description: "Total de atletas ativos no evento",
    },
    {
      label: "Testes configurados",
      value: tests?.length ?? 0,
      description: "Quantidade de provas disponíveis para este cliente",
    },
    {
      label: "Sessões registradas",
      value: sessions?.length ?? 0,
      description: "Eventos de combine armazenados com resultados",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold text-on-surface">Painel Geral</h1>
        <p className="mt-2 text-muted">
          Acompanhe os principais indicadores do combine e personalize o layout para cada
          clube parceiro.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-medium text-muted">{card.label}</h2>
            <p className="mt-4 text-3xl font-semibold text-primary">{card.value}</p>
            <p className="mt-2 text-sm text-muted">{card.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">Próximos passos</h2>
            <p className="text-sm text-muted">
              Cadastre atletas, configure baterias de testes e gere relatórios personalizados.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/athletes/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm"
            >
              Cadastrar atleta
            </Link>
            <Link
              to="/sessions/new"
              className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary"
            >
              Criar sessão de testes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
