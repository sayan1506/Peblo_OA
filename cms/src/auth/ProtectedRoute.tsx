import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return (
    <>
      <Header />
      {children}
    </>
  );
}
