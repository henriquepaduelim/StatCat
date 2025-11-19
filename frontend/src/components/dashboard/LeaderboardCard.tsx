import { useState } from "react";
import type { CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";

import { useScoringLeaderboard } from "../../hooks/useScoringLeaderboard";
import type { LeaderboardEntry, LeaderboardType } from "../../api/leaderboards";

type LeaderboardCardProps = {
  limit?: number;
  presetType?: LeaderboardType | null;
  title?: string;
  description?: string;
};

const tabOptions: Array<{ id: LeaderboardType; label: string }> = [
  { id: "scorers", label: "Goals" },
  { id: "clean_sheets", label: "Clean sheets" },
];

const LeaderboardRow = ({
  position,
  entry,
  leaderboardType,
}: {
  position: number;
  entry: LeaderboardEntry;
  leaderboardType: LeaderboardType;
}) => {
  const accentClass =
    position === 1
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : position === 2
      ? "bg-slate-50 text-slate-900 border-slate-200"
      : position === 3
      ? "bg-orange-50 text-orange-900 border-orange-200"
      : "bg-white text-muted border-black/5";

  const medalCircleStyles: Record<number, CSSProperties> = {
    1: { backgroundColor: "#D4AF37", color: "#1f2937" },
    2: { backgroundColor: "#C0C0C0", color: "#1f2937" },
    3: { backgroundColor: "#CD7F32", color: "#fff" },
  };

  const primaryValue = leaderboardType === "scorers" ? entry.goals : entry.clean_sheets;

  return (
    <li
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm ${accentClass}`}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shadow-sm"
        style={medalCircleStyles[position] ?? undefined}
      >
        {position}
      </span>
      <div>
        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
        <p className="text-xs text-muted">
          {entry.team || "Unassigned"} • {entry.age_category || "N/A"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-action-primary">
          {leaderboardType === "clean_sheets"
            ? entry.goals_conceded
            : primaryValue}
        </p>
        {leaderboardType === "clean_sheets" ? (
          <p className="text-[0.65rem] text-muted">
            Games: {entry.games_played} • Avg:{" "}
            {entry.games_played ? (entry.goals_conceded / entry.games_played).toFixed(2) : "0.00"}
          </p>
        ) : null}
      </div>
    </li>
  );
};

const LeaderboardCard = ({ limit = 5, presetType = null, title, description }: LeaderboardCardProps) => {
  const [activeTab, setActiveTab] = useState<LeaderboardType>(presetType ?? "scorers");
  const leaderboardQuery = useScoringLeaderboard({
    leaderboard_type: activeTab,
    limit,
  });
  const entries = leaderboardQuery.data?.entries ?? [];

  return (
    <div className="w-full rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-container-foreground">
              {title ?? (presetType === "clean_sheets" ? "Clean Sheets" : "Goals Leaderboard")}
            </h2>
            <p className="text-sm text-muted">
              {description ?? "Live ranking across recorded sessions."}
            </p>
          </div>
        </div>


        <div className="rounded-2xl border border-white/10 bg-white/90 p-4 shadow-inner">
          {leaderboardQuery.isLoading ? (
            <p className="text-sm text-muted">Loading leaderboard...</p>
          ) : leaderboardQuery.isError ? (
            <p className="text-sm text-red-500">
              Unable to load leaderboard. Try refreshing.
            </p>
          ) : !entries.length ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted">
              <FontAwesomeIcon icon={faMedal} className="text-2xl text-action-primary" />
              <p>Leaderboard data is not available yet.</p>
              <p className="text-xs">
                Once athletes record sessions, their scores will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, index) => (
                <LeaderboardRow
                  key={`${entry.athlete_id}-${entry.full_name}`}
                  position={index + 1}
                  entry={entry}
                  leaderboardType={activeTab}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardCard;
