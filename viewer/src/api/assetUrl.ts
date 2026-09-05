const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8010";

export function assetUrl(path: string | undefined): string | undefined {
  return path ? `${BASE_URL}${path}` : undefined;
}
