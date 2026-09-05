import { useSearchParams } from "react-router-dom";
import { useAuditLog } from "../api/audit";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, PermissionDeniedState, SkeletonRows } from "../components/ListStates";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 20;

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function AuditLogPage() {
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1") || 1;

  const { data, isLoading, isError, error, refetch } = useAuditLog(page, PAGE_SIZE);

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  if (role !== "admin") {
    return (
      <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
        <h1>Audit log</h1>
        <PermissionDeniedState message={`Viewing the audit log requires the admin role. You're signed in as ${role}.`} />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
      <h1>Audit log</h1>

      {isError ? (
        <ErrorState
          message={error instanceof ApiError ? error.message : "Failed to load audit log."}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th style={{ padding: "10px 16px" }}>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows count={PAGE_SIZE} />
              ) : data && data.items.length > 0 ? (
                data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: "10px 16px" }}>{formatTimestamp(entry.created_at)}</td>
                    <td>{entry.actor_email}</td>
                    <td>{entry.action}</td>
                    <td>
                      {entry.resource_type} #{entry.resource_id}
                    </td>
                    <td>{entry.summary}</td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState message="No changes recorded yet." />
      )}

      {!isError && data && data.items.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}
    </main>
  );
}
