export function LoadFailedState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: 32, textAlign: "center" }}>
      <p style={{ margin: "0 0 12px", color: "#c0392b" }}>{message}</p>
      <button type="button" onClick={onRetry} style={{ padding: "8px 16px" }}>
        Try again
      </button>
    </div>
  );
}
