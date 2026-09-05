import { useEffect, useState } from "react";
import { useUploadArtwork, type UploadTarget } from "../api/artwork";
import { ApiError } from "../api/client";
import { ARTWORK_SPECS, type ArtworkKind } from "../constants/reference";
import { FormError } from "./FormError";

export function ArtworkSlot({
  kind,
  target,
  existingUrl,
}: {
  kind: ArtworkKind;
  target: UploadTarget;
  existingUrl?: string;
}) {
  const spec = ARTWORK_SPECS[kind];
  const upload = useUploadArtwork();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setUploaded(null);
    upload.reset();
  }

  async function handleUpload() {
    if (!file) return;
    const result = await upload.mutateAsync({ kind, target, file }).catch(() => null);
    if (result) setUploaded({ width: result.width, height: result.height });
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <strong style={{ display: "block", textTransform: "capitalize" }}>{kind}</strong>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "2px 0 8px" }}>
        {spec.aspect}, ~{spec.targetPx[0]}x{spec.targetPx[1]}px, max {spec.maxKb}KB
      </p>

      {(previewUrl ?? existingUrl) && (
        <img
          src={previewUrl ?? existingUrl}
          alt={`${kind} preview`}
          style={{ display: "block", maxWidth: "100%", maxHeight: 160, marginBottom: 8 }}
        />
      )}

      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "block", marginBottom: 8 }} />

      <button type="button" onClick={handleUpload} disabled={!file || upload.isPending}>
        {upload.isPending ? "Uploading…" : "Upload"}
      </button>

      {uploaded && (
        <p style={{ fontSize: 13, color: "var(--color-success)", margin: "8px 0 0" }}>
          Uploaded — {uploaded.width}x{uploaded.height}
        </p>
      )}
      {upload.error && (
        <div style={{ marginTop: 8 }}>
          <FormError message={upload.error instanceof ApiError ? upload.error.message : "Upload failed."} />
        </div>
      )}
    </div>
  );
}
