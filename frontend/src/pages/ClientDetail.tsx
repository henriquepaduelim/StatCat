import { Link, useParams } from "react-router-dom";

import { useClients } from "../hooks/useClients";
import { useTranslation } from "../i18n/useTranslation";

const ClientDetail = () => {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const { data: clients, isLoading } = useClients();
  const t = useTranslation();

  if (isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  const client = clients?.find((item) => item.id === clientId);

  if (!client) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">Client not found.</p>
        <Link to="/dashboard" className="text-sm font-semibold text-accent hover:underline">
          {t.common.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-container-foreground">{client.name}</h1>
        <p className="text-sm text-muted">{client.description ?? "No description provided."}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-container-gradient p-4">
          <p className="mt-2 text-lg font-semibold text-container-foreground">{client.slug}</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-container-gradient p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Primary colour</p>
          <div className="mt-2 h-10 rounded-md" style={{ backgroundColor: client.branding.primary_color }} />
        </div>
      </section>

      <Link
        to="/dashboard"
        className="inline-flex items-center rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent"
      >
        {t.common.back}
      </Link>
    </div>
  );
};

export default ClientDetail;
