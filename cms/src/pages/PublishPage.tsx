import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  useDryRunCatalog,
  usePublishCatalog,
  usePublishRuns,
  useRollbackCatalog,
  useValidationReport,
} from "../api/publish";
import { useAuth } from "../auth/AuthContext";
import { CatalogDiffView } from "../components/CatalogDiffView";
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
  const dryRun = useDryRunCatalog();
  const rollback = useRollbackCatalog();
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

  async function handleDryRun() {
    try {
      await dryRun.mutateAsync();
    } catch {
      // ApiError is rendered below via dryRun.error
    }
  }

  async function handleRollback(run: { id: number; show_count: number; episode_count: number }) {
    const confirmed = window.confirm(
      `Roll back the live catalog to run #${run.id} (${run.show_count} show(s), ${run.episode_count} episode(s))? ` +
        "This will overwrite the currently published catalog.",
    );
    if (!confirmed) return;
    try {
      await rollback.mutateAsync(run.id);
    } catch {
      // ApiError is rendered below via rollback.error
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

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Validation report</h2>

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
              <p style={{ color: "var(--color-success)" }}>Nothing is blocking publish.</p>
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
                <pre style={{ fontSize: 12, overflowX: "auto", background: "var(--color-surface)", padding: 12 }}>
                  {JSON.stringify(report.data.seed_issues, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Preview changes</h2>
        <p style={{ color: "var(--color-muted)", marginTop: 0 }}>
          Builds the catalogue a publish would write, without writing it, and compares it against what's live now.
        </p>

        <button type="button" disabled={dryRun.isPending} onClick={handleDryRun}>
          {dryRun.isPending ? "Building preview…" : "Preview changes"}
        </button>

        {dryRun.error && (
          <div style={{ marginTop: 8 }}>
            <FormError
              message={dryRun.error instanceof ApiError ? dryRun.error.message : "Failed to build preview."}
            />
          </div>
        )}

        {dryRun.data && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 12px" }}>
              This publish would produce <strong>{dryRun.data.show_count}</strong> show(s) and{" "}
              <strong>{dryRun.data.episode_count}</strong> episode(s).
            </p>
            <CatalogDiffView diff={dryRun.data.diff} />
          </div>
        )}
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Publish</h2>

        {role !== "admin" && (
          <PermissionDeniedState message={`Publishing requires the admin role. You're signed in as ${role}.`} />
        )}

        {role === "admin" && (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={totalBlocking > 0 || publish.isPending || report.isLoading}
              onClick={handlePublish}
            >
              {publish.isPending ? "Publishing…" : "Publish catalog"}
            </button>
            {totalBlocking > 0 && (
              <p style={{ color: "var(--color-muted)", margin: "8px 0 0" }}>
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
              <p style={{ color: "var(--color-success)", margin: "8px 0 0" }}>
                Published — {lastResult.show_count} show(s), {lastResult.episode_count} episode(s).
              </p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Run history</h2>

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
            {rollback.error && (
              <div style={{ marginBottom: 12 }}>
                <FormError
                  message={rollback.error instanceof ApiError ? rollback.error.message : "Failed to roll back catalog."}
                />
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Outcome</th>
                  <th>Shows</th>
                  <th>Episodes</th>
                  <th>Detail</th>
                  {role === "admin" && <th>Rollback</th>}
                </tr>
              </thead>
              <tbody>
                {runs.data.items.map((run) => (
                  <tr key={run.id}>
                    <td>{formatTimestamp(run.started_at)}</td>
                    <td>{formatTimestamp(run.finished_at)}</td>
                    <td
                      style={{
                        color:
                          run.outcome === "failed"
                            ? "var(--color-danger)"
                            : run.outcome === "rolled_back"
                              ? "var(--color-warning-text)"
                              : undefined,
                      }}
                    >
                      {run.outcome}
                      {run.rolled_back_from_id != null && ` (from run #${run.rolled_back_from_id})`}
                    </td>
                    <td>{run.show_count}</td>
                    <td>{run.episode_count}</td>
                    <td>{run.detail ?? "—"}</td>
                    {role === "admin" && (
                      <td>
                        {run.has_snapshot ? (
                          <button
                            type="button"
                            disabled={rollback.isPending}
                            onClick={() => handleRollback(run)}
                          >
                            {rollback.isPending && rollback.variables === run.id ? "Rolling back…" : "Roll back"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
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
