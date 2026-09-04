import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export type ShowCreatePayload = {
  title: string;
  slug: string;
  synopsis?: string;
  section?: string;
  categories: string[];
  status: string;
};

export type ShowUpdatePayload = {
  title?: string;
  synopsis?: string;
  section?: string | null;
  categories?: string[];
  status?: string;
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
    enabled: Number.isFinite(showId),
  });
}

export function useSeasons(showId: number) {
  return useQuery({
    queryKey: ["seasons", showId],
    queryFn: () => apiFetch(`/shows/${showId}/seasons`) as Promise<Season[]>,
    enabled: Number.isFinite(showId),
  });
}

export function useCreateShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShowCreatePayload) =>
      apiFetch("/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as Promise<Show>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shows"] }),
  });
}

export function useUpdateShow(showId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShowUpdatePayload) =>
      apiFetch(`/shows/${showId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as Promise<Show>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shows"] });
      qc.invalidateQueries({ queryKey: ["show", showId] });
    },
  });
}

export function useCreateSeason(showId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { season_number: number }) =>
      apiFetch(`/shows/${showId}/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as Promise<Season>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seasons", showId] }),
  });
}
