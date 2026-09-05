import { useParams } from "react-router-dom";
import { useCatalog } from "../api/queries";
import { CatalogError } from "../api/catalog";
import { ArtworkImage } from "../components/ArtworkImage";
import { EpisodeRow } from "../components/EpisodeRow";
import { ShowHeaderSkeleton, EpisodeRowSkeleton } from "../components/ViewerSkeleton";
import { NotPublishedState } from "../components/NotPublishedState";
import { LoadFailedState } from "../components/LoadFailedState";

export function ShowDetailPage() {
  const { slug } = useParams();
  const { data, isLoading, isError, error, refetch } = useCatalog();

  if (isLoading) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <ShowHeaderSkeleton />
        <EpisodeRowSkeleton />
      </main>
    );
  }

  if (isError) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        {error instanceof CatalogError && error.status === 404 ? (
          <NotPublishedState />
        ) : (
          <LoadFailedState
            message={error instanceof CatalogError ? error.message : "Failed to load the catalog."}
            onRetry={() => refetch()}
          />
        )}
      </main>
    );
  }

  const show = data?.sections.flatMap((s) => s.shows).find((s) => s.slug === slug);

  if (!show) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <p>Show not found.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ width: 160, flexShrink: 0 }}>
          <ArtworkImage src={show.artwork.poster} alt={show.title} aspectRatio="2 / 3" />
        </div>
        <div>
          <h1 style={{ margin: "0 0 8px" }}>{show.title}</h1>
          {show.synopsis && <p style={{ margin: "0 0 8px", color: "var(--color-muted)" }}>{show.synopsis}</p>}
          {show.categories.length > 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)" }}>{show.categories.join(", ")}</p>
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
