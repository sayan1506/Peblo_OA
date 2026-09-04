import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { ArtworkKind } from "../constants/reference";

export type UploadTarget = { showId: number } | { episodeId: number };

export type UploadedArtwork = {
  id: number;
  kind: string;
  width: number;
  height: number;
  url: string;
};

export function useUploadArtwork() {
  return useMutation({
    mutationFn: ({ kind, target, file }: { kind: ArtworkKind; target: UploadTarget; file: File }) => {
      const params = new URLSearchParams({ kind });
      if ("showId" in target) params.set("show_id", String(target.showId));
      else params.set("episode_id", String(target.episodeId));

      const form = new FormData();
      form.append("file", file);

      return apiFetch(`/artwork?${params}`, { method: "POST", body: form }) as Promise<UploadedArtwork>;
    },
  });
}
