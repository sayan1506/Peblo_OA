import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSearch } from "../api/queries";
import { CatalogError } from "../api/catalog";
import type { SearchResultRow } from "../api/types";
import { CATEGORIES, LANGUAGES, SECTIONS } from "../constants/reference";
import { SearchResultItem } from "../components/SearchResultItem";

function groupByShow(items: SearchResultRow[]) {
  const groups = new Map<string, { show_title: string; show_slug: string; items: SearchResultRow[] }>();
  for (const item of items) {
    if (!groups.has(item.show_slug)) {
      groups.set(item.show_slug, { show_title: item.show_title, show_slug: item.show_slug, items: [] });
    }
    groups.get(item.show_slug)!.items.push(item);
  }
  return [...groups.values()];
}

export function SearchPage() {
  const [urlParams, setUrlParams] = useSearchParams();
  const q = urlParams.get("q") ?? "";
  const category = urlParams.get("category") ?? "";
  const language = urlParams.get("language") ?? "";
  const section = urlParams.get("section") ?? "";

  const [qInput, setQInput] = useState(q);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (qInput !== q) updateParam("q", qInput);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(urlParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setUrlParams(next, { replace: true });
  }

  const { data, isLoading, isError, error } = useSearch(
    { q: q || undefined, category: category || undefined, language: language || undefined, section: section || undefined },
    true,
  );

  const groups = data ? groupByShow(data.items) : [];

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 22 }}>Search</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 24px" }}>
        <input
          type="search"
          placeholder="Search titles, episodes, categories…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          style={{ padding: 6, minWidth: 220 }}
        />
        <select value={section} onChange={(e) => updateParam("section", e.target.value)}>
          <option value="">All sections</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => updateParam("category", e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={language} onChange={(e) => updateParam("language", e.target.value)}>
          <option value="">All languages</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <p>
          {error instanceof CatalogError && error.status === 404
            ? "Nothing has been published yet."
            : error instanceof CatalogError
              ? error.message
              : "Search failed."}
        </p>
      )}

      {isLoading && <p>Loading…</p>}

      {!isLoading && !isError && data && data.total === 0 && <p>No results for these filters.</p>}

      {!isLoading &&
        !isError &&
        groups.map((group) => (
          <section key={group.show_slug} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>
              <Link to={`/shows/${group.show_slug}`}>{group.show_title}</Link>
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {group.items.map((item) => (
                <SearchResultItem key={item.content_group} item={item} />
              ))}
            </ul>
          </section>
        ))}
    </main>
  );
}
