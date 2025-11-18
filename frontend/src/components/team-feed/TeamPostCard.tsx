import type { TeamPost } from "../../types/teamPost";

type Props = {
  post: TeamPost;
};

const TeamPostCard = ({ post }: Props) => {
  return (
    <article className="rounded-xl border border-black/5 bg-container p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-container-foreground">{post.author_name}</p>
          <p className="text-xs uppercase tracking-wide text-muted">{post.author_role}</p>
        </div>
        <span className="text-xs text-muted">
          {new Date(post.created_at).toLocaleString()}
        </span>
      </div>
      {post.content && <p className="text-sm text-container-foreground">{post.content}</p>}
      {post.media_url && (
        <div className="overflow-hidden rounded-lg border border-black/10">
          <img src={post.media_url} alt="" className="w-full" />
        </div>
      )}
    </article>
  );
};

export default TeamPostCard;
