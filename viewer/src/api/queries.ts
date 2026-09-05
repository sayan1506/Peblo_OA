import { useQuery } from "@tanstack/react-query";
import { fetchCatalog, searchCatalog } from "./catalog";
import type { SearchParams } from "./types";

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog });
}

export function useSearch(params: SearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => searchCatalog(params),
    enabled,
  });
}
