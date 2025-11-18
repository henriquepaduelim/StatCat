import CollapsibleSection from "../../components/CollapsibleSection";
import { usePlayerProfileContext } from "./context";
import { useTranslation } from "../../i18n/useTranslation";

const CombineResultsPage = () => {
  const { report } = usePlayerProfileContext();
  const t = useTranslation();

  if (!report) {
    return (
      <div className="rounded-xl border border-black/10 bg-container p-4 text-sm text-muted">
        {t.playerProfile.noReportData}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted">{t.playerProfile.summarySessions(report.sessions.length)}</p>
        <div className="rounded-lg bg-action-primary/10 px-4 py-2 text-sm text-accent">
          {t.playerProfile.summary}
        </div>
      </div>

      <div className="space-y-4">
        {report.sessions.map((session) => (
          <CollapsibleSection
            key={session.session_id}
            title={session.session_name}
            subtitle={`${t.playerProfile.sessionDate(session.scheduled_at ?? null)}${
              session.location ? ` • ${session.location}` : ""
            }`}
            defaultOpen={false}
          >
            <div className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {session.results.map((metric) => (
                <div
                  key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`}
                  className="rounded-lg bg-container px-4 py-3 text-sm flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-container-foreground">{metric.test_name}</p>
                  </div>
                  <p className="text-lg font-semibold text-container-foreground">
                    {metric.value}
                    {metric.unit ? <span className="text-sm text-muted"> {metric.unit}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
};

export default CombineResultsPage;
