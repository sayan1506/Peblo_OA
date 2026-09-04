import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { usePublishCatalog, usePublishRuns, useValidationReport } from "../api/publish";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, PermissionDeniedState } from "../components/ListStates";
import { FormError } from "../components/FormError";
import { Pagination } from "../components/Pagination";

const RUNS_PAGE_SIZE = 10;

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function PublishPage() {
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const runsPage = Number(params.get("runsPage") ?? "1") || 1;

  const report = useValidationReport();
  const runs = usePublishRuns(runsPage, RUNS_PAGE_SIZE);
  const publish = usePublishCatalog();
  const [lastResult, setLastResult] = useState<{ outcome: string; show_count: number; episode_count: number } | null>(
    null,
  );

  function setRunsPage(next: number) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("runsPage", String(next));
    setParams(nextParams);
  }

  async function handlePublish() {
    setLastResult(null);
    try {
      const result = await publish.mutateAsync();
      setLastResult(result);
    } catch {
      // ApiError is rendered below via publish.error
    }
  }

  const blockingShows = report.data?.blocking.shows ?? [];
  const blockingEpisodes = report.data?.blocking.episodes ?? [];
  const totalBlocking = (report.data?.summary.blocking_shows ?? 0) + (report.data?.summary.blocking_episodes ?? 0);
  const seedIssueCount = report.data?.summary.seed_issues ?? 0;

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link to="/shows">&larr; Back to shows</Link>
      </p>
      <h1>Publish</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Validation report</h2>

        {report.isLoading && <p>Loading validation report…</p>}

        {report.isError && (
          <ErrorState
            message={report.error instanceof ApiError ? report.error.message : "Failed to load validation report."}
            onRetry={() => report.refetch()}
          />
        )}

        {report.data && (
          <>
            {totalBlocking === 0 ? (
              <p style={{ color: "#1a7f37" }}>Nothing is blocking publish.</p>
            ) : (
              <p>
                <strong>{report.data.summary.blocking_shows}</strong> show(s) and{" "}
                <strong>{report.data.summary.blocking_episodes}</strong> episode(s) are blocking publish.
              </p>
            )}

            {blockingShows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15 }}>Shows</h3>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {blockingShows.map((show) => (
                    <li key={show.id}>
                      <Link to={`/shows/${show.id}/edit`}>{show.title}</Link> — needs {show.problems.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockingEpisodes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15 }}>Episodes</h3>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {blockingEpisodes.map((ep) => (
                    <li key={ep.id}>
                      {ep.title} ({ep.show_slug}) — needs {ep.problems.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {seedIssueCount > 0 && (
              <details>
                <summary>{seedIssueCount} informational seed data issue(s) (not blocking)</summary>
                <pre style={{ fontSize: 12, overflowX: "auto", background: "#f6f5f7", padding: 12 }}>
                  {JSON.stringify(report.data.seed_issues, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Publish</h2>

        {role !== "admin" && (
          <PermissionDeniedState message={`Publishing requires the admin role. You're signed in as ${role}.`} />
        )}

        {role === "admin" && (
          <>
            <button
              type="button"
              disabled={totalBlocking > 0 || publish.isPending || report.isLoading}
              onClick={handlePublish}
              style={{ padding: "8px 16px" }}
            >
              {publish.isPending ? "Publishing…" : "Publish catalog"}
            </button>
            {totalBlocking > 0 && (
              <p style={{ color: "#6b6375", margin: "8px 0 0" }}>
                Resolve {totalBlocking} blocking issue(s) above before publishing.
              </p>
            )}
            {publish.error &&
              (publish.error instanceof ApiError && publish.error.status === 403 ? (
                <div style={{ marginTop: 8 }}>
                  <PermissionDeniedState message={publish.error.message} />
                </div>
              ) : (
                <FormError
                  message={publish.error instanceof ApiError ? publish.error.message : "Failed to publish catalog."}
                />
              ))}
            {lastResult && (
              <p style={{ color: "#1a7f37", margin: "8px 0 0" }}>
                Published — {lastResult.show_count} show(s), {lastResult.episode_count} episode(s).
              </p>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Run history</h2>

        {runs.isLoading && <p>Loading run history…</p>}

        {runs.isError && (
          <ErrorState
            message={runs.error instanceof ApiError ? runs.error.message : "Failed to load run history."}
            onRetry={() => runs.refetch()}
          />
        )}

        {runs.data && runs.data.items.length === 0 && <EmptyState message="No publishes yet." />}

        {runs.data && runs.data.items.length > 0 && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e4e7" }}>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Outcome</th>
                  <th>Shows</th>
                  <th>Episodes</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.items.map((run) => (
                  <tr key={run.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td>{formatTimestamp(run.started_at)}</td>
                    <td>{formatTimestamp(run.finished_at)}</td>
                    <td style={{ color: run.outcome === "failed" ? "crimson" : undefined }}>{run.outcome}</td>
                    <td>{run.show_count}</td>
                    <td>{run.episode_count}</td>
                    <td>{run.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={runsPage} pageSize={RUNS_PAGE_SIZE} total={runs.data.total} onPageChange={setRunsPage} />
          </>
        )}
      </section>
    </main>
  );
}
