import CollapsibleSection from "../../components/CollapsibleSection";
import { usePlayerProfileContext } from "./context";
import { useTranslation } from "../../i18n/useTranslation";

const ReportCardsPage = () => {
  const { currentAthlete, reportCards, reportCardsLoading, reportCardsError } =
    usePlayerProfileContext();
  const t = useTranslation();

  return (
    <CollapsibleSection
      title={t.playerProfile.reportCardsTitle}
      subtitle={t.playerProfile.reportCardsSubtitle}
    >
      {!currentAthlete && <p className="mt-4 text-sm text-muted">{t.playerProfile.noAthlete}</p>}

      {currentAthlete && reportCardsLoading && (
        <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsLoading}</p>
      )}

      {currentAthlete && reportCardsError && (
        <p className="mt-4 text-sm text-red-500">{t.playerProfile.error}</p>
      )}

      {currentAthlete && !reportCardsLoading && !reportCardsError && reportCards.length === 0 && (
        <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsEmpty}</p>
      )}

      {currentAthlete && reportCards.length > 0 && (
        <div className="mt-6 space-y-4">
          {reportCards.map((submission) => {
            const ratingCards = [
              { label: t.playerProfile.ratings.technical, value: submission.technical_rating },
              { label: t.playerProfile.ratings.physical, value: submission.physical_rating },
              { label: t.playerProfile.ratings.training, value: submission.training_rating },
              { label: t.playerProfile.ratings.match, value: submission.match_rating },
            ];
            return (
              <article
                key={submission.id}
                className="rounded-lg border border-black/10 bg-container/80 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-container-foreground">
                      {submission.team_name ?? t.playerProfile.reportCardIndividual}
                    </p>
                    <p className="text-xs text-muted">
                      {t.playerProfile.reportCardSubmittedBy(
                        submission.submitted_by,
                        submission.created_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  {ratingCards.map((item) => (
                    <div key={item.label} className="rounded-lg bg-container px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {item.label}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-container-foreground">
                        {item.value ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
};

export default ReportCardsPage;
