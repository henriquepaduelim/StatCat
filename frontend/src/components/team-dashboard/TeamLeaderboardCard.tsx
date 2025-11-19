import type { LeaderboardEntry, LeaderboardType } from "../../api/leaderboards";

type TeamLeaderboardCardProps = {
  title: string;
  description: string;
  entries: LeaderboardEntry[];
  isLoading: boolean;
  isError: boolean;
  type: LeaderboardType;
};

const TeamLeaderboardCard = ({
  title,
  description,
  entries,
  isLoading,
  isError,
  type,
}: TeamLeaderboardCardProps) => {
  return (
    <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-container-foreground">{title}</h3>
            <p className="text-sm text-muted">{description}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/90 p-4 shadow-inner">
          {isLoading ? (
            <p className="text-sm text-muted">Loading leaderboard...</p>
          ) : isError ? (
            <p className="text-sm text-red-500">Unable to load leaderboard. Try refreshing.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted">No statistics available yet.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, index) => {
                const position = index + 1;
                const accentClass =
                  position === 1
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : position === 2
                    ? "bg-slate-50 text-slate-900 border-slate-200"
                    : position === 3
                    ? "bg-orange-50 text-orange-900 border-orange-200"
                    : "bg-white text-muted border-black/5";

                const medalStyles: Record<number, React.CSSProperties> = {
                  1: { backgroundColor: "#D4AF37", color: "#1f2937" },
                  2: { backgroundColor: "#C0C0C0", color: "#1f2937" },
                  3: { backgroundColor: "#CD7F32", color: "#fff" },
                };

                return (
                  <li
                    key={entry.athlete_id}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm ${accentClass}`}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shadow-sm"
                      style={medalStyles[position] ?? { backgroundColor: "#EEF2FF", color: "#1f2937" }}
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
                        {type === "clean_sheets" ? entry.clean_sheets : entry.goals}
                      </p>
                      {type === "clean_sheets" ? (
                        <p className="text-[0.65rem] text-muted">
                          Games: {entry.games_played} • Avg:{" "}
                          {entry.games_played
                            ? (entry.goals_conceded / entry.games_played).toFixed(2)
                            : "0.00"}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamLeaderboardCard;
