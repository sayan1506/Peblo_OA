import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FormError } from "../components/FormError";

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <h1>Peblo TV Mini CMS</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <FormError message={error} />}
        <button type="submit" disabled={submitting} style={{ padding: "8px 16px" }}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
