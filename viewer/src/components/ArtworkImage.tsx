import { useState } from "react";
import { assetUrl } from "../api/assetUrl";

type Props = {
  src: string | undefined;
  alt: string;
  aspectRatio: string;
  className?: string;
};

export function ArtworkImage({ src, alt, aspectRatio, className }: Props) {
  const url = assetUrl(src);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={className}
      role={url ? undefined : "img"}
      aria-label={url ? undefined : alt}
      style={{
        aspectRatio,
        background: "#2a2830",
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        />
      ) : (
        <span style={{ color: "#6b6375", fontSize: 13 }} aria-hidden="true">
          No artwork
        </span>
      )}
    </div>
  );
}
