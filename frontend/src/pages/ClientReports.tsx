import { Link, useParams } from "react-router-dom";

import { useClients } from "../hooks/useClients";
import { useTranslation } from "../i18n/useTranslation";

const ClientReports = () => {
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
        <h1 className="text-2xl font-semibold text-container-foreground">{client.name} — Reports</h1>
        <p className="text-sm text-muted">
          Export consolidated metrics for this client or schedule automated deliveries.
        </p>
      </header>

      <section className="space-y-4 rounded-xl bg-container-gradient p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-container-foreground">PDF exports</p>
          <p className="text-xs text-muted">Configure cover pages, language and delivery cadence.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-container-foreground">Data warehouse</p>
          <p className="text-xs text-muted">Send raw metrics to BI tools or external partners.</p>
        </div>
      </section>

      <Link
        to={`/clients/${client.id}`}
        className="inline-flex items-center rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent"
      >
        {t.common.back}
      </Link>
    </div>
  );
};

export default ClientReports;
