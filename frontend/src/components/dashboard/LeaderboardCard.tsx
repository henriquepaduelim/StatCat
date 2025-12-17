import type { CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal } from "@fortawesome/free-solid-svg-icons";

import { useScoringLeaderboard } from "../../hooks/useScoringLeaderboard";
import type { LeaderboardEntry, LeaderboardType } from "../../api/leaderboards";
import { chartPalette } from "../../theme/chartPalette";
import { getMediaUrl } from "../../utils/media";

type LeaderboardCardProps = {
  limit?: number;
  presetType?: LeaderboardType | null;
  title?: string;
  description?: string;
  teamId?: number | null;
};

const LeaderboardRow = ({
  position,
  entry,
  leaderboardType,
}: {
  position: number;
  entry: LeaderboardEntry;
  leaderboardType: LeaderboardType;
}) => {
  const medalCircleStyles: Record<number, CSSProperties> = {
    1: { backgroundColor: chartPalette.podium.gold, color: chartPalette.podium.textDark },
    2: { backgroundColor: chartPalette.podium.silver, color: chartPalette.podium.textDark },
    3: { backgroundColor: chartPalette.podium.bronze, color: chartPalette.podium.textLight },
  };
  const primaryValue = leaderboardType === "scorers" ? entry.goals : entry.clean_sheets;
  const avatarSrc = entry.photo_url ? getMediaUrl(entry.photo_url) : null;
  const initials = entry.full_name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <li
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
      style={{
        backgroundColor: "rgb(var(--color-container-background))",
        borderColor: "rgb(var(--color-border))",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-action-primary/10 text-sm font-semibold text-action-primary">
          {avatarSrc ? (
            <img src={avatarSrc} alt={entry.full_name} className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold shadow-sm"
              style={medalCircleStyles[position] ?? undefined}
            >
              {initials || position}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-container-foreground leading-tight">{entry.full_name}</p>
        </div>
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

const LeaderboardCard = ({
  limit = 5,
  presetType = null,
  title,
  description,
  teamId = null,
}: LeaderboardCardProps) => {
  const activeTab: LeaderboardType = presetType ?? "scorers";
  const leaderboardQuery = useScoringLeaderboard({
    leaderboard_type: activeTab,
    limit,
    team_id: teamId ?? undefined,
  });
  const entries = leaderboardQuery.data?.entries ?? [];

  return (
    <div className="card-base w-full p-3 sm:p-4 border border-border-muted shadow-none">
      <div className="space-y-3">
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

        <div className="space-y-2">
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
