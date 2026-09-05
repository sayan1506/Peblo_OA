import { Link } from "react-router-dom";
import type { CatalogShow } from "../api/types";
import { ArtworkImage } from "./ArtworkImage";

export function Hero({ show }: { show: CatalogShow }) {
  return (
    <section style={{ marginBottom: 32, position: "relative" }}>
      <ArtworkImage src={show.artwork.banner} alt={show.title} aspectRatio="16 / 9" />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 8,
          background: "linear-gradient(to top, rgba(11,11,15,0.92) 0%, rgba(11,11,15,0.35) 45%, transparent 75%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 24 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 36, fontWeight: 700, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {show.title}
        </h1>
        {show.synopsis && (
          <p style={{ margin: "0 0 16px", color: "var(--color-muted)", maxWidth: 640, fontSize: 15 }}>
            {show.synopsis}
          </p>
        )}
        <Link to={`/shows/${show.slug}`}>
          <button type="button" style={{ background: "var(--color-accent)", borderColor: "var(--color-accent)" }}>
            View show →
          </button>
        </Link>
      </div>
    </section>
  );
}
