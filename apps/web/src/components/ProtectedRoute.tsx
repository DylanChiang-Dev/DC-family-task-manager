import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
