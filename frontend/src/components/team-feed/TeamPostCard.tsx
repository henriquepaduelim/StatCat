import type { TeamPost } from "../../types/teamPost";

type Props = {
  post: TeamPost;
  currentUserId?: number | null;
};

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
};

const TeamPostCard = ({ post, currentUserId }: Props) => {
  const isMine = currentUserId === post.author_id;
  const mediaSrc = resolveMediaUrl(post.media_url);
  const initials = (post.author_name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const timestamp = new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <article
      className={`flex items-start gap-3 ${isMine ? "flex-row-reverse text-right" : ""}`}
      aria-label={`Post by ${post.author_name}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-action-primary/10 text-sm font-semibold text-action-primary">
        {initials}
      </div>
      <div
        className={`max-w-[75%] space-y-2 rounded-2xl border border-black/5 p-3 shadow-sm ${
          isMine
            ? "bg-action-primary text-action-primary-foreground border-action-primary/30"
            : "bg-container text-container-foreground"
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className={`text-sm font-semibold ${isMine ? "text-action-primary-foreground" : "text-container-foreground"}`}>
              {post.author_name}
            </p>
            <p className={`text-[11px] uppercase tracking-wide ${isMine ? "text-action-primary-foreground/80" : "text-muted"}`}>
              {post.author_role}
            </p>
          </div>
          <span className={`text-[11px] ${isMine ? "text-action-primary-foreground/80" : "text-muted"}`}>{timestamp}</span>
        </div>
        {post.content ? (
          <p className={`text-sm leading-relaxed ${isMine ? "text-action-primary-foreground" : "text-container-foreground"}`}>
            {post.content}
          </p>
        ) : null}
        {mediaSrc ? (
          <div className="overflow-hidden rounded-lg border border-black/10">
            <img src={mediaSrc} alt="Team post upload" className="max-h-64 w-full object-cover" />
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default TeamPostCard;
