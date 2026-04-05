import type React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "./hooks";
import { isTokenExpired } from "./jwtUtils";
import { logout } from "../features/auth/authSlice";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  // protected route should not require admin by default
  requireAdmin = false,
}) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, user, accessToken } = useAppSelector(
    (state) => state.auth,
  );

  // ✅ Check if token is expired
  if (accessToken && isTokenExpired(accessToken)) {
    dispatch(logout());
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // Show loader while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // Logged in but not admin → block
  if (requireAdmin) {
    if (!user)
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    const isAdmin = user.role === "admin" || user.role === "owner";
    if (!isAdmin) {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
