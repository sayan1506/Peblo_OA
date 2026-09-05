import { useParams } from "react-router-dom";
import { useCatalog } from "../api/queries";
import { CatalogError } from "../api/catalog";

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
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
      <h1>{show.title}</h1>
      <pre style={{ overflowX: "auto", background: "#f6f5f7", padding: 12 }}>
        {JSON.stringify(show, null, 2)}
      </pre>
    </main>
  );
}
