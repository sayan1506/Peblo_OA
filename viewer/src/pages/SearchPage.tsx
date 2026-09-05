import { useState } from "react";
import { useSearch } from "../api/queries";
import { CatalogError } from "../api/catalog";
import type { SearchParams } from "../api/types";

export function SearchPage() {
  const [params, setParams] = useState<SearchParams>({});
  const [submitted, setSubmitted] = useState<SearchParams | null>(null);

  const { data, isLoading, isError, error } = useSearch(submitted ?? {}, submitted !== null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(params);
  }

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
      <h1>Search</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="search"
          placeholder="q"
          value={params.q ?? ""}
          onChange={(e) => setParams({ ...params, q: e.target.value })}
        />
        <input
          placeholder="category"
          value={params.category ?? ""}
          onChange={(e) => setParams({ ...params, category: e.target.value })}
        />
        <input
          placeholder="language"
          value={params.language ?? ""}
          onChange={(e) => setParams({ ...params, language: e.target.value })}
        />
        <input
          placeholder="section"
          value={params.section ?? ""}
          onChange={(e) => setParams({ ...params, section: e.target.value })}
        />
        <button type="submit">Search</button>
      </form>

      {isLoading && <p>Loading…</p>}
      {isError && <p>{error instanceof CatalogError ? error.message : "Search failed."}</p>}
      {data && (
        <pre style={{ overflowX: "auto", background: "#f6f5f7", padding: 12 }}>
          {JSON.stringify(data.items, null, 2)}
        </pre>
      )}
    </main>
  );
}
