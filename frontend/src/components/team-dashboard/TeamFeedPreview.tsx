import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

import type { TeamPost } from "../../types/teamPost";

type TeamFeedPreviewProps = {
  posts: TeamPost[];
  isLoading: boolean;
  isError: boolean;
  teamName?: string;
};

const truncate = (value: string, max = 140) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const TeamFeedPreview = ({ posts, isLoading, isError, teamName }: TeamFeedPreviewProps) => {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
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
              {post.content ? (
                <p className="mt-2 text-sm text-container-foreground">{truncate(post.content)}</p>
              ) : null}
              {post.media_url ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-black/5">
                  <img
                    src={post.media_url}
                    alt="Team upload"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamFeedPreview;
