export function LoadFailedState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: 32, textAlign: "center" }}>
      <p style={{ margin: "0 0 12px", color: "var(--color-danger)" }}>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
