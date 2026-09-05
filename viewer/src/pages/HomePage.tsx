import { useCatalog } from "../api/queries";
import { CatalogError } from "../api/catalog";

export function HomePage() {
  const { data, isLoading, isError, error } = useCatalog();

  if (isLoading) return <p>Loading…</p>;
  if (isError) {
    return <p>{error instanceof CatalogError ? error.message : "Failed to load the catalog."}</p>;
  }

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
      <h1>Peblo TV Mini</h1>
      <pre style={{ overflowX: "auto", background: "#f6f5f7", padding: 12 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
