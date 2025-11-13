import { useTranslation } from "../../i18n/useTranslation";
import AthleteApprovalList from "../AthleteApprovalList";

interface AthletesHeaderProps {
  canCreateAthletes: boolean;
  onAddAthlete: () => void;
}

const AthletesHeader = ({ canCreateAthletes, onAddAthlete }: AthletesHeaderProps) => {
  const t = useTranslation();

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-container-foreground">{t.athletes.title}</h1>
        <p className="text-sm text-muted">{t.athletes.description}</p>
      </div>
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
