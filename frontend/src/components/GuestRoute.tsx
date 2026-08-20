import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/useAuth";

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
