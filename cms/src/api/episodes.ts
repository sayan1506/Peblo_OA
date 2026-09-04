import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { buildQuery } from "./query";
import type { Episode, Page } from "./types";

export type EpisodeFilters = {
  q?: string;
  language?: string;
  status?: string;
  section?: string;
  show_id?: number;
  page?: number;
  page_size?: number;
};

export type EpisodeCreatePayload = {
  episode_number: number;
  title: string;
  content_group: string;
  language: string;
  duration_seconds?: number;
  status: string;
};

export type EpisodeUpdatePayload = Partial<EpisodeCreatePayload>;

export function useEpisodes(filters: EpisodeFilters) {
  const { status, ...rest } = filters;
  const query = buildQuery({ ...rest, status_: status });
  return useQuery({
    queryKey: ["episodes", filters],
    queryFn: () => apiFetch(`/episodes?${query}`) as Promise<Page<Episode>>,
    enabled: filters.show_id === undefined || Number.isFinite(filters.show_id),
  });
}

export function useEpisode(episodeId: number) {
  return useQuery({
    queryKey: ["episode", episodeId],
    queryFn: () => apiFetch(`/episodes/${episodeId}`) as Promise<Episode>,
    enabled: Number.isFinite(episodeId),
  });
}

export function useCreateEpisode(showId: number, seasonId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EpisodeCreatePayload) =>
      apiFetch(`/shows/${showId}/seasons/${seasonId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as Promise<Episode>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodes"] }),
  });
}

export function useUpdateEpisode(episodeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EpisodeUpdatePayload) =>
      apiFetch(`/episodes/${episodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as Promise<Episode>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["episodes"] });
      qc.invalidateQueries({ queryKey: ["episode", episodeId] });
    },
  });
}
