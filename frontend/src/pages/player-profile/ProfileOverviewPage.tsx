import AthleteReportCard from "../../components/AthleteReportCard";
import CollapsibleSection from "../../components/CollapsibleSection";
import { useTranslation } from "../../i18n/useTranslation";
import { usePlayerProfileContext } from "./context";

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
    <CollapsibleSection title={t.playerProfile.profileSection}>
      {!currentAthlete && <p className="text-sm text-muted">{t.playerProfile.noAthlete}</p>}

      {currentAthlete && reportLoading && (
        <p className="text-sm text-muted">{t.playerProfile.loading}</p>
      )}

      {currentAthlete && reportError && (
        <p className="text-sm text-red-500">{t.playerProfile.error}</p>
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
    </CollapsibleSection>
  );
};

export default ProfileOverviewPage;
