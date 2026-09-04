export function FormError({ message }: { message: string }) {
  return (
    <p role="alert" style={{ color: "crimson", margin: "0 0 12px" }}>
      {message}
    </p>
  );
}
