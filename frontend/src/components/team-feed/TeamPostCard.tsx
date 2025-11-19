import type { TeamPost } from "../../types/teamPost";

type Props = {
  post: TeamPost;
};

const TeamPostCard = ({ post }: Props) => {
  return (
    <article className="space-y-3 rounded-xl border border-black/5 bg-container p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-container-foreground">{post.author_name}</p>
          <p className="text-xs uppercase tracking-wide text-muted">{post.author_role}</p>
        </div>
        <span className="text-xs text-muted">
          {new Date(post.created_at).toLocaleString()}
        </span>
      </div>
      {(post.content || post.media_url) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {post.content ? (
            <p className="flex-1 text-sm text-container-foreground">{post.content}</p>
          ) : null}
          {post.media_url ? (
            <div className="overflow-hidden rounded-lg border border-black/10 sm:w-40 sm:flex-shrink-0">
              <img src={post.media_url} alt="Team post upload" className="h-40 w-full object-cover" />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

export default TeamPostCard;
