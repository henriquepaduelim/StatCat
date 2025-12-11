import AthleteReportCard from "../../components/AthleteReportCard";
import { useTranslation } from "../../i18n/useTranslation";
import { usePlayerProfileContext } from "./context";
import Spinner from "../../components/Spinner";

const ProfileOverviewPage = () => {
  const {
    currentAthlete,
    report,
    reportLoading,
    reportError,
    tests,
    athleteDetail,
  } = usePlayerProfileContext();
  const t = useTranslation();

  return (
    <section className="rounded-xl bg-container/40 shadow-sm print:bg-white">
      <div className="px-4 pt-4 pb-4 space-y-6 sm:px-6 sm:pt-6 sm:pb-6">
        {!currentAthlete && <p className="text-sm text-muted">{t.playerProfile.noAthlete}</p>}

        {currentAthlete && reportLoading ? <Spinner className="py-6" /> : null}

        {currentAthlete && reportError && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t.playerProfile.error}
          </div>
        )}

        {currentAthlete && (
          <AthleteReportCard
            athlete={currentAthlete}
            detailedAthlete={athleteDetail}
            report={report}
            tests={tests}
            hideRecentSessions
          />
        )}
      </div>
    </section>
  );
};

export default ProfileOverviewPage;
