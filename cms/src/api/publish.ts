import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { DryRunResult, Page, PublishRun, ValidationReport } from "./types";

export function useValidationReport() {
  return useQuery({
    queryKey: ["validation-report"],
    queryFn: () => apiFetch("/admin/validation-report") as Promise<ValidationReport>,
  });
}

export function usePublishRuns(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ["publish-runs", page],
    queryFn: () =>
      apiFetch(`/admin/publish-runs?page=${page}&page_size=${pageSize}`) as Promise<Page<PublishRun>>,
  });
}

export function useDryRunCatalog() {
  return useMutation({
    mutationFn: () => apiFetch("/admin/catalog/dry-run") as Promise<DryRunResult>,
  });
}

export function usePublishCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/admin/catalog/publish", { method: "POST" }) as Promise<{
        run_id: number;
        outcome: string;
        show_count: number;
        episode_count: number;
      }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publish-runs"] });
      qc.invalidateQueries({ queryKey: ["validation-report"] });
    },
  });
}
