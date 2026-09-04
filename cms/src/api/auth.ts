const TOKEN_KEY = "peblo_token";

export type Role = "editor" | "admin";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeRole(token: string): Role | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<Role | null> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Incorrect email or password" }));
    throw new Error(body.detail ?? "Incorrect email or password");
  }
  const data = await res.json();
  setToken(data.access_token);
  return decodeRole(data.access_token);
}
