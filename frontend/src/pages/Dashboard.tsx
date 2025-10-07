import { Link } from "react-router-dom";

import { useAthletes } from "../hooks/useAthletes";
import { useSessions } from "../hooks/useSessions";
import { useTests } from "../hooks/useTests";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";

const Dashboard = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: athletes } = useAthletes(clientId);
  const { data: sessions } = useSessions(clientId);
  const { data: tests } = useTests(clientId);
  const t = useTranslation();

  const statCards = [
    {
      label: t.dashboard.cards[0].label,
      value: athletes?.length ?? 0,
      description: t.dashboard.cards[0].description,
    },
    {
      label: t.dashboard.cards[1].label,
      value: tests?.length ?? 0,
      description: t.dashboard.cards[1].description,
    },
    {
      label: t.dashboard.cards[2].label,
      value: sessions?.length ?? 0,
      description: t.dashboard.cards[2].description,
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold text-on-surface">{t.dashboard.title}</h1>
        <p className="mt-2 text-muted">{t.dashboard.description}</p>
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
            <h2 className="text-xl font-semibold text-on-surface">{t.dashboard.nextStepsTitle}</h2>
            <p className="text-sm text-muted">{t.dashboard.nextStepsDescription}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/athletes/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm"
            >
              {t.dashboard.actionNewAthlete}
            </Link>
            <Link
              to="/sessions/new"
              className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary"
            >
              {t.dashboard.actionNewSession}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
