import { useTranslation } from "../../i18n/useTranslation";
import AthleteApprovalList from "../AthleteApprovalList";
import PageTitle from "../PageTitle";

interface AthletesHeaderProps {
  canCreateAthletes: boolean;
  onAddAthlete: () => void;
}

const AthletesHeader = ({ canCreateAthletes, onAddAthlete }: AthletesHeaderProps) => {
  const t = useTranslation();

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <PageTitle title={t.athletes.title} description={t.athletes.description} className="pb-0" />
      <div className="flex gap-3">
        {canCreateAthletes && <AthleteApprovalList />}
        {canCreateAthletes ? (
          <button
            type="button"
            onClick={onAddAthlete}
            className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
          >
            {t.athletes.add}
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default AthletesHeader;
