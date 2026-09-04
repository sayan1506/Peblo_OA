import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearToken, decodeRole, getToken, login as apiLogin, type Role } from "../api/auth";

type AuthContextValue = {
  token: string | null;
  role: Role | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [role, setRole] = useState<Role | null>(() => {
    const existing = getToken();
    return existing ? decodeRole(existing) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      login: async (email, password) => {
        const nextRole = await apiLogin(email, password);
        setTokenState(getToken());
        setRole(nextRole);
      },
      logout: () => {
        clearToken();
        setTokenState(null);
        setRole(null);
      },
    }),
    [token, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
