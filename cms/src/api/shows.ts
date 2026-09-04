import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { buildQuery } from "./query";
import type { Page, Season, Show } from "./types";

export type ShowFilters = {
  q?: string;
  section?: string;
  status?: string;
  category?: string;
  page?: number;
  page_size?: number;
};

export function useShows(filters: ShowFilters) {
  const { status, ...rest } = filters;
  const query = buildQuery({ ...rest, status_: status });
  return useQuery({
    queryKey: ["shows", filters],
    queryFn: () => apiFetch(`/shows?${query}`) as Promise<Page<Show>>,
  });
}

export function useShow(showId: number) {
  return useQuery({
    queryKey: ["show", showId],
    queryFn: () => apiFetch(`/shows/${showId}`) as Promise<Show>,
  });
}

export function useSeasons(showId: number) {
  return useQuery({
    queryKey: ["seasons", showId],
    queryFn: () => apiFetch(`/shows/${showId}/seasons`) as Promise<Season[]>,
    enabled: Number.isFinite(showId),
  });
}
