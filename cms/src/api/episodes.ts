import { useQuery } from "@tanstack/react-query";
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

export function useEpisodes(filters: EpisodeFilters) {
  const { status, ...rest } = filters;
  const query = buildQuery({ ...rest, status_: status });
  return useQuery({
    queryKey: ["episodes", filters],
    queryFn: () => apiFetch(`/episodes?${query}`) as Promise<Page<Episode>>,
    enabled: filters.show_id === undefined || Number.isFinite(filters.show_id),
  });
}
