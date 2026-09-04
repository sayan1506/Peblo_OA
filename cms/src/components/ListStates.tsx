import type { ReactNode } from "react";

export function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={i} aria-hidden="true">
          <td colSpan={5}>
            <div
              style={{
                height: 16,
                width: `${60 + ((i * 13) % 30)}%`,
                background: "var(--skeleton-bg, #e5e4e7)",
                borderRadius: 4,
              }}
            />
          </td>
        </tr>
      ))}
    </>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: 16, border: "1px solid crimson", borderRadius: 4 }}>
      <p style={{ margin: "0 0 8px", color: "crimson" }}>{message}</p>
      <button type="button" onClick={onRetry} style={{ padding: "6px 12px" }}>
        Retry
      </button>
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#6b6375" }}>
      <p style={{ margin: "0 0 8px" }}>{message}</p>
      {action}
    </div>
  );
}

export function PermissionDeniedState({ message }: { message: string }) {
  return (
    <div
      role="status"
      style={{ padding: 16, border: "1px solid #d9a34a", borderRadius: 4, background: "#fdf6e8" }}
    >
      <p style={{ margin: 0, color: "#8a6116" }}>{message}</p>
    </div>
  );
}
