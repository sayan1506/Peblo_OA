import type { Catalog, SearchParams, SearchResults } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8010";

export class CatalogError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function catalogFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new CatalogError(res.status, body.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function fetchCatalog(): Promise<Catalog> {
  return catalogFetch<Catalog>("/catalog");
}

export function searchCatalog(params: SearchParams): Promise<SearchResults> {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value);
  }
  return catalogFetch<SearchResults>(`/catalog/search?${usp}`);
}
