import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../stores/useAuthStore";
import { useTeams } from "../hooks/useTeams";
import { getTeamPosts, createTeamPost } from "../api/teamPosts";
import type { TeamPost } from "../types/teamPost";
import TeamPostCard from "../components/team-feed/TeamPostCard";
import type { Team } from "../api/teams";

const TeamFeed = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const teamsQuery = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const role = (currentUser?.role || "").toLowerCase();
  const athleteTeamId = currentUser?.team_id ?? null;

  const availableTeams: Team[] = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    if (role === "athlete" && athleteTeamId) {
      return teams.filter((team) => team.id === athleteTeamId);
    }
    return teams;
  }, [teamsQuery.data, role, athleteTeamId]);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  const formDisabled = !selectedTeamId || createPostMutation.isPending;

  const noTeamsMessage =
    availableTeams.length === 0
      ? role === "athlete"
        ? t.teamFeed?.noTeams ?? "No teams available"
        : teamsQuery.isLoading
        ? t.teamFeed?.loading ?? "Loading..."
        : t.teamFeed?.noTeams ?? "No teams available"
      : null;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-container-foreground">
            {t.teamFeed?.title ?? "Team Feed"}
          </h1>
          <p className="text-sm text-muted">
            {t.teamFeed?.description ?? "Share updates and media with teammates."}
          </p>
        </div>
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

      {noTeamsMessage ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          {noTeamsMessage}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-black/5 bg-container p-4 shadow-sm"
        >
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t.teamFeed?.placeholder ?? "Type a message..."}
            rows={3}
            className="w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
            className="text-sm text-muted"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setContent("");
                setMediaFile(null);
              }}
              className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted transition hover:border-action-primary hover:text-accent"
            >
              {t.teamFeed?.clear ?? "Clear"}
            </button>
            <button
              type="submit"
              disabled={formDisabled}
              className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createPostMutation.isPending
                ? t.teamFeed?.posting ?? "Posting..."
                : t.teamFeed?.post ?? "Post"}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-4">
        {postsQuery.isLoading && (
          <p className="text-sm text-muted">{t.teamFeed?.loading ?? "Loading posts..."}</p>
        )}
        {postsQuery.isError && (
          <p className="text-sm text-red-500">{t.teamFeed?.error ?? "Unable to load posts."}</p>
        )}
        {!postsQuery.isLoading && postsQuery.data?.length === 0 && (
          <p className="text-sm text-muted">{t.teamFeed?.empty ?? "No posts yet."}</p>
        )}
        {postsQuery.data?.map((post) => (
          <TeamPostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
};

export default TeamFeed;
