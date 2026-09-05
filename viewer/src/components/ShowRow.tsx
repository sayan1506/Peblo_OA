import { Link } from "react-router-dom";
import type { CatalogShow } from "../api/types";
import { ArtworkImage } from "./ArtworkImage";

export function ShowRow({ title, shows }: { title: string; shows: CatalogShow[] }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, margin: "0 0 10px", textTransform: "capitalize" }}>{title}</h2>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {shows.map((show) => (
          <Link
            key={show.slug}
            to={`/shows/${show.slug}`}
            className="show-tile"
            style={{ flex: "0 0 140px" }}
          >
            <ArtworkImage src={show.artwork.poster} alt={show.title} aspectRatio="2 / 3" />
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.3 }}>{show.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
