import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Header() {
  const { logout, role } = useAuth();

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: 24,
      }}
    >
      <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Link to="/shows" style={{ fontWeight: 700, color: "var(--color-text)" }}>
          Peblo CMS
        </Link>
        <Link to="/shows">Shows</Link>
        <Link to="/publish">Publish</Link>
        {role === "admin" && <Link to="/audit-log">Audit log</Link>}
      </nav>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ color: "var(--color-muted)", fontSize: 14 }}>
          Logged in as <strong>{role}</strong>
        </span>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
