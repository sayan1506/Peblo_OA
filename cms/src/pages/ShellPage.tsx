import { useAuth } from "../auth/AuthContext";

export function ShellPage() {
  const { role, logout } = useAuth();

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <h1>Peblo TV Mini CMS</h1>
      <p>
        Logged in as <strong>{role}</strong>.
      </p>
      <button type="button" onClick={logout} style={{ padding: "8px 16px" }}>
        Log out
      </button>
    </main>
  );
}
