import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../stores/useAuthStore";
import { useTeams } from "../hooks/useTeams";
import { getTeamPosts, createTeamPost } from "../api/teamPosts";
import type { TeamPost } from "../types/teamPost";
import TeamPostCard from "../components/team-feed/TeamPostCard";
import type { Team } from "../types/team";
import PageTitle from "../components/PageTitle";

const TeamFeed = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const teamsQuery = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const role = (currentUser?.role || "").toLowerCase();
  const athleteTeamId = currentUser?.team_id ?? null;
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const availableTeams: Team[] = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    if (role === "athlete" && athleteTeamId) {
      return teams.filter((team) => team.id === athleteTeamId);
    }
    return teams;
  }, [teamsQuery.data, role, athleteTeamId]);
  const loadErrorMessage =
    teamsQuery.isError && availableTeams.length === 0
      ? t.teamFeed?.error ?? "Unable to load teams right now."
      : null;

  useEffect(() => {
    if (!selectedTeamId && availableTeams.length > 0) {
      setSelectedTeamId(availableTeams[0].id);
    }
  }, [selectedTeamId, availableTeams]);

  const postsQuery = useQuery({
    queryKey: ["teamPosts", selectedTeamId],
    enabled: Boolean(selectedTeamId),
    queryFn: () => {
      if (!selectedTeamId) {
        return Promise.resolve<TeamPost[]>([]);
      }
      return getTeamPosts(selectedTeamId);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (!selectedTeamId) {
        throw new Error("No team selected");
      }
      return createTeamPost(selectedTeamId, formData);
    },
    onSuccess: () => {
      setContent("");
      setMediaFile(null);
      queryClient.invalidateQueries({ queryKey: ["teamPosts", selectedTeamId] });
    },
  });

  const submitMessage = () => {
    if (!selectedTeamId) {
      return;
    }
    if (!content.trim() && !mediaFile) {
      return;
    }
    const formData = new FormData();
    formData.append("content", content);
    if (mediaFile) {
      formData.append("media", mediaFile);
    }
    createPostMutation.mutate(formData);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage();
  };

  const formDisabled = !selectedTeamId || createPostMutation.isPending;

  const noTeamsMessage =
    availableTeams.length === 0
      ? role === "athlete"
        ? t.teamFeed?.noTeams ?? "No teams available"
        : teamsQuery.isLoading
        ? t.teamFeed?.loading ?? "Loading..."
        : t.teamFeed?.noTeams ?? "No teams available"
      : null;

  const chatDisabled = formDisabled || Boolean(noTeamsMessage) || Boolean(loadErrorMessage);
  const orderedPosts = useMemo(() => {
    if (!postsQuery.data) return [];
    return [...postsQuery.data].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [postsQuery.data]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [orderedPosts.length]);

  useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      setMediaPreview(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setMediaPreview(null);
    return undefined;
  }, [mediaFile]);

  return (
    <div className="flex flex-col gap-4 pb-2">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <PageTitle
          title={t.teamFeed?.title ?? "Team Feed"}
          description={t.teamFeed?.description ?? "Share updates and media with teammates."}
          className="pb-0"
        />
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t.teamFeed?.teamSelect ?? "Team"}
            <select
              value={selectedTeamId ?? ""}
              onChange={(event) => setSelectedTeamId(Number(event.target.value))}
              disabled={role === "athlete" || availableTeams.length === 0}
              className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableTeams.length === 0 ? (
                <option value="">{t.teamFeed?.noTeams ?? "No teams available"}</option>
              ) : (
                availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </header>

      {loadErrorMessage ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadErrorMessage}
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["teams"] })}
            className="ml-3 rounded-md border border-amber-400 px-3 py-1 text-xs font-semibold hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {noTeamsMessage ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          {noTeamsMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-container shadow-sm">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm text-muted">
            <span>{availableTeams.find((team) => team.id === selectedTeamId)?.name ?? t.teamFeed?.title ?? "Team Feed"}</span>
            <span className="text-xs">
              {postsQuery.data?.length ? `${postsQuery.data.length} ${t.teamFeed?.messages ?? "messages"}` : t.teamFeed?.empty ?? "No messages yet"}
            </span>
          </div>

          <section
            ref={messagesRef}
            className="space-y-3 overflow-y-auto bg-gradient-to-b from-container/60 to-container px-4 py-3 max-h-[60vh]"
          >
            {postsQuery.isLoading && (
              <p className="text-sm text-muted">{t.teamFeed?.loading ?? "Loading posts..."}</p>
            )}
            {postsQuery.isError && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t.teamFeed?.error ?? "Unable to load posts."}
                <button
                  type="button"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["teamPosts", selectedTeamId] })}
                  className="ml-3 rounded-md border border-amber-400 px-3 py-1 text-xs font-semibold hover:bg-amber-100"
                >
                  Retry
                </button>
              </div>
            )}
            {!postsQuery.isLoading && postsQuery.data?.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-black/10 bg-container/60 p-6 text-sm text-muted">
                {t.teamFeed?.empty ?? "No posts yet. Start the conversation!"}
              </div>
            )}
            {orderedPosts.map((post) => (
              <TeamPostCard key={post.id} post={post} currentUserId={currentUser?.id ?? null} />
            ))}
          </section>

          <div className="border-t border-black/5 bg-container/95 px-4 py-4 backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex gap-2">
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage();
                    }
                  }}
                  placeholder={t.teamFeed?.placeholder ?? "Type a message..."}
                  rows={2}
                  className="min-h-[64px] flex-1 rounded-xl border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  disabled={chatDisabled}
                />
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent">
                    {t.teamFeed?.addMedia ?? "Media"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
                      className="hidden"
                      disabled={chatDisabled}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={chatDisabled}
                    className="rounded-lg bg-action-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {createPostMutation.isPending
                      ? t.teamFeed?.posting ?? "Posting..."
                      : t.teamFeed?.post ?? "Post"}
                  </button>
                </div>
              </div>
              {mediaPreview ? (
                <div className="flex items-center justify-between rounded-lg border border-black/10 bg-container/80 px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img
                      src={mediaPreview}
                      alt="Selected upload preview"
                      className="h-16 w-16 rounded-md border border-black/10 object-cover"
                    />
                    <div className="text-xs text-muted break-all">{mediaFile?.name ?? "Selected media"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaFile(null)}
                    className="rounded-md border border-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted transition hover:border-action-primary hover:text-accent"
                    disabled={chatDisabled}
                  >
                    {t.teamFeed?.clear ?? "Clear"}
                  </button>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-xs text-muted">
                {createPostMutation.isPending ? t.teamFeed?.posting ?? "Posting..." : t.teamFeed?.hint ?? "Press Enter to send. Attach images if needed."}
                <button
                  type="button"
                  onClick={() => {
                    setContent("");
                    setMediaFile(null);
                  }}
                  disabled={chatDisabled}
                  className="rounded-md border border-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted transition hover:border-action-primary hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.teamFeed?.clear ?? "Clear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamFeed;
