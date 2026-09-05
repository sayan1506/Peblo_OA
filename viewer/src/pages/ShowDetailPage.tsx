import { useParams } from "react-router-dom";
import { useCatalog } from "../api/queries";
import { CatalogError } from "../api/catalog";
import { ArtworkImage } from "../components/ArtworkImage";
import { EpisodeRow } from "../components/EpisodeRow";

export function ShowDetailPage() {
  const { slug } = useParams();
  const { data, isLoading, isError, error } = useCatalog();

  if (isLoading) return <p>Loading…</p>;
  if (isError) {
    return <p>{error instanceof CatalogError ? error.message : "Failed to load the catalog."}</p>;
  }

  const show = data?.sections.flatMap((s) => s.shows).find((s) => s.slug === slug);

  if (!show) return <p>Show not found.</p>;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ width: 160, flexShrink: 0 }}>
          <ArtworkImage src={show.artwork.poster} alt={show.title} aspectRatio="2 / 3" />
        </div>
        <div>
          <h1 style={{ margin: "0 0 8px" }}>{show.title}</h1>
          {show.synopsis && <p style={{ margin: "0 0 8px", color: "#4a4650" }}>{show.synopsis}</p>}
          {show.categories.length > 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "#6b6375" }}>{show.categories.join(", ")}</p>
          )}
        </div>
      </div>

      {show.seasons.map((season) => (
        <section key={season.season_number} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Season {season.season_number}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {season.episodes.map((ep) => (
              <EpisodeRow key={ep.content_group} episode={ep} />
            ))}
          </ul>
        </section>
      ))}

      {show.trailers.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Trailers</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {show.trailers.map((ep) => (
              <EpisodeRow key={ep.content_group} episode={ep} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
