import { Link, useSearchParams } from "react-router-dom";
import { useShows } from "../api/shows";
import { CATEGORIES, SECTIONS, STATUSES } from "../constants/reference";
import { EmptyState, ErrorState, SkeletonRows } from "../components/ListStates";
import { Pagination } from "../components/Pagination";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE = 20;

export function ShowsListPage() {
  const [params, setParams] = useSearchParams();
  const { logout, role } = useAuth();

  const q = params.get("q") ?? "";
  const section = params.get("section") ?? "";
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const filters = { q, section, status, category, page, page_size: PAGE_SIZE };
  const { data, isLoading, isError, error, refetch } = useShows(filters);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }

  function clearFilters() {
    setParams(new URLSearchParams());
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  const hasFilters = Boolean(q || section || status || category);

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Shows</h1>
        <div>
          <span style={{ marginRight: 12, color: "#6b6375" }}>
            Logged in as <strong>{role}</strong>
          </span>
          <Link to="/shows/new" style={{ marginRight: 12 }}>
            New show
          </Link>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <input
          type="search"
          placeholder="Search title…"
          value={q}
          onChange={(e) => updateFilter("q", e.target.value)}
          style={{ padding: 6, minWidth: 200 }}
        />
        <select value={section} onChange={(e) => updateFilter("section", e.target.value)}>
          <option value="">All sections</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => updateFilter("category", e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Failed to load shows."}
          onRetry={() => refetch()}
        />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e4e7" }}>
              <th>Title</th>
              <th>Section</th>
              <th>Categories</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows count={PAGE_SIZE} />
            ) : data && data.items.length > 0 ? (
              data.items.map((show) => (
                <tr key={show.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td>{show.title}</td>
                  <td>{show.section ?? "—"}</td>
                  <td>{show.categories.join(", ") || "—"}</td>
                  <td>{show.status}</td>
                  <td>
                    <Link to={`/shows/${show.id}`} style={{ marginRight: 12 }}>
                      View episodes
                    </Link>
                    <Link to={`/shows/${show.id}/edit`}>Edit</Link>
                  </td>
                </tr>
              ))
            ) : null}
          </tbody>
        </table>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          message="No shows match these filters."
          action={
            hasFilters ? (
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : undefined
          }
        />
      )}

      {!isError && data && data.items.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
    </main>
  );
}
