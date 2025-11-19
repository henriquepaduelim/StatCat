import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

import type { TeamPost } from "../../types/teamPost";

type TeamFeedPreviewProps = {
  posts: TeamPost[];
  isLoading: boolean;
  isError: boolean;
  teamName?: string;
  showMaintenance?: boolean;
  maintenanceTitle?: string;
  maintenanceDescription?: string;
  maintenancePrimaryLabel?: string;
  maintenanceSecondaryLabel?: string;
  onMaintenanceAction?: (deleteAfter: boolean) => void;
  maintenancePending?: boolean;
};

const truncate = (value: string, max = 140) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const TeamFeedPreview = ({
  posts,
  isLoading,
  isError,
  teamName,
  showMaintenance = false,
  maintenanceTitle,
  maintenanceDescription,
  maintenancePrimaryLabel,
  maintenanceSecondaryLabel,
  onMaintenanceAction,
  maintenancePending = false,
}: TeamFeedPreviewProps) => {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow-lg sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-container-foreground">
            {teamName ? `${teamName} Feed` : "Team Feed"}
          </h3>
          <p className="text-sm text-muted">Latest posts shared by your roster.</p>
        </div>
        <Link
          to="/team-feed"
          className="flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-action-primary transition hover:border-action-primary"
        >
          View all
          <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
        </Link>
      </div>

      <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
        {isLoading ? (
          <p className="text-sm text-muted">Loading feed...</p>
        ) : isError ? (
          <p className="text-sm text-red-500">Unable to load recent posts.</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted">
            No posts recorded yet. Share match recaps and training photos to keep everyone aligned.
          </p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl border border-black/5 bg-container-gradient px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-semibold text-container-foreground">{post.author_name}</span>
                <time>{new Date(post.created_at).toLocaleString()}</time>
              </div>
              {(post.content || post.media_url) ? (
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
                  {post.content ? (
                    <p className="flex-1 text-sm text-container-foreground">
                      {truncate(post.content)}
                    </p>
                  ) : null}
                  {post.media_url ? (
                    <div className="overflow-hidden rounded-lg border border-black/5 sm:w-32 sm:flex-shrink-0">
                      <img
                        src={post.media_url}
                        alt="Team upload"
                        className="h-32 w-full object-cover sm:h-32"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
      {showMaintenance ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-white/90 p-3 text-xs text-muted shadow-sm">
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-muted">
            {maintenanceTitle}
          </p>
          <p className="mt-1 text-[0.85rem] leading-relaxed">{maintenanceDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMaintenanceAction?.(false)}
              disabled={maintenancePending}
              className="rounded-md border border-black/20 px-2.5 py-1 text-[0.7rem] font-semibold text-muted transition hover:text-container-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {maintenancePending ? "Preparing..." : maintenancePrimaryLabel}
            </button>
            <button
              type="button"
              onClick={() => onMaintenanceAction?.(true)}
              disabled={maintenancePending}
              className="rounded-md border border-black/20 px-2.5 py-1 text-[0.7rem] font-semibold text-muted transition hover:text-container-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {maintenancePending ? "Preparing..." : maintenanceSecondaryLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TeamFeedPreview;
