import { Link } from "react-router-dom";

const statCards = [
  {
    label: "Atletas cadastrados",
    value: "--",
    description: "Total de atletas ativos no evento",
  },
  {
    label: "Testes concluídos",
    value: "--",
    description: "Soma dos testes registrados",
  },
  {
    label: "Média de avaliações",
    value: "--",
    description: "Pontuação média nas últimas sessões",
  },
];

const Dashboard = () => (
  <div className="space-y-8">
    <section>
      <h1 className="text-3xl font-semibold text-slate-900">Painel Geral</h1>
      <p className="mt-2 text-slate-600">
        Acompanhe os principais indicadores do combine e personalize o layout para cada
        clube parceiro.
      </p>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      {statCards.map((card) => (
        <div key={card.label} className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">{card.label}</h2>
          <p className="mt-4 text-3xl font-semibold text-primary">{card.value}</p>
          <p className="mt-2 text-sm text-slate-500">{card.description}</p>
        </div>
      ))}
    </section>

    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Próximos passos</h2>
          <p className="text-sm text-slate-500">
            Cadastre atletas, configure baterias de testes e gere relatórios personalizados.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/athletes/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
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

export default Dashboard;
