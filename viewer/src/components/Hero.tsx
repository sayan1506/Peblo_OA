import { Link } from "react-router-dom";
import type { CatalogShow } from "../api/types";
import { ArtworkImage } from "./ArtworkImage";

export function Hero({ show }: { show: CatalogShow }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <ArtworkImage src={show.artwork.banner} alt={show.title} aspectRatio="16 / 9" />
      <div style={{ marginTop: 12 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>{show.title}</h1>
        {show.synopsis && <p style={{ margin: "0 0 12px", color: "#4a4650", maxWidth: 640 }}>{show.synopsis}</p>}
        <Link to={`/shows/${show.slug}`} style={{ fontWeight: 600 }}>
          View show →
        </Link>
      </div>
    </section>
  );
}
