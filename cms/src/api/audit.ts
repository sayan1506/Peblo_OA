import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { AuditLogEntry, Page } from "./types";

export function useAuditLog(page: number, pageSize = 20, resourceType?: string) {
  return useQuery({
    queryKey: ["audit-log", page, resourceType],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (resourceType) params.set("resource_type", resourceType);
      return apiFetch(`/admin/audit-log?${params}`) as Promise<Page<AuditLogEntry>>;
    },
  });
}
