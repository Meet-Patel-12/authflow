import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { useAppDispatch, useAppSelector } from "./app/hooks";
import { getCurrentUser, setUserFromToken, logout } from "./features/auth/authSlice";
import { getUserFromToken, isTokenExpired } from "./app/jwtUtils";
import { fetchOrganizations } from "./features/organizations/organizationSlice";

import ProtectedRoute from "./app/ProtectedRoute";
import DashboardLayout from "./components/layouts/DashboardLayout";

/* Pages */
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import VerifyEmail from "./features/auth/pages/VerifyEmail";
import MFALogin from "./features/mfa/pages/MFALogin";
import OAuthCallback from "./features/auth/pages/OAuthCallback";
import MagicLinkVerify from "./features/auth/pages/MagicLinkVerify";

import Dashboard from "./features/dashboard/pages/Dashboard";
import Profile from "./features/settings/pages/Profile";
import Settings from "./features/settings/pages/Settings";
import Security from "./features/settings/pages/Security";
import Sessions from "./features/settings/pages/Sessions";
import Organizations from "./features/organizations/pages/Organizations";
import ApiKeys from "./features/apiKeys/pages/ApiKeys";
import MFASetup from "./features/mfa/pages/MFASetup";
import AuditLogs from "./features/auditLogs/pages/AuditLogs";
import SDKAnalytics from "./features/sdkAnalytics/pages/SDKAnalytics";
import Members from "./features/organizations/pages/Members";
import AcceptInvite from "./features/organizations/pages/AcceptInvite";
import DeveloperIntegration from "./features/developers/pages/DeveloperIntegration";
import Webhooks from "./features/webhooks/pages/Webhooks";
import Applications from "./features/application/pages/Application";
import ApplicationDetail from "./features/application/pages/ApplicationDetail";

// ── Universal Login (OAuth2 hosted pages — standalone, no DashboardLayout)
import UniversalLogin from "./features/universalLogin/pages/UniversalLogin";
import HomePage from "./features/home/HomePage";
import UniversalSignup from "./features/universalLogin/pages/UniversalSignup";
import LoginCallback from "./features/universalLogin/pages/LoginCallback";

/* Admin */
import AdminDashboard from "./features/admin/pages/Dashboard";
import SDKEndUsers from "./features/admin/pages/SDKEndUsers";

function App() {
  const dispatch = useAppDispatch();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const { organizations } = useAppSelector((state) => state.organizations);

  useEffect(() => {
    if (accessToken) {
      // ✅ First: Decode JWT and set user immediately (no API call needed)
      const userFromToken = getUserFromToken(accessToken);
      if (userFromToken && !user) {
        dispatch(setUserFromToken(userFromToken));
      }

      // Then: Fetch full user data + organizations
      if (!user) dispatch(getCurrentUser());
      if (organizations.length === 0) dispatch(fetchOrganizations());
    }
  }, [accessToken]);

  // ✅ Check for token expiration and force logout
  useEffect(() => {
    const checkTokenValidity = () => {
      const storedToken = localStorage.getItem("accessToken");
      const forceLogout = localStorage.getItem("forceLogout");

      // Clear forceLogout flag after reading it
      if (forceLogout) {
        localStorage.removeItem("forceLogout");
      }

      // If token is expired or forceLogout flag is set, logout
      if ((storedToken && isTokenExpired(storedToken)) || forceLogout) {
        dispatch(logout());
      }
    };

    checkTokenValidity();

    // Check token validity every minute
    const interval = setInterval(checkTokenValidity, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <>
      <Toaster
        position="top-right"
        expand={false}
        visibleToasts={4}
        toastOptions={{
          style: {
            background: "#161b27",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "#f0f2f8",
            fontFamily: "Sora, sans-serif",
            fontSize: "13px",
            fontWeight: "500",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            padding: "12px 16px",
            gap: "10px",
          },
          classNames: {
            toast: "items-start",
            title: "text-[13px] font-semibold",
            description: "text-[12px] opacity-70 mt-0.5",
            actionButton:
              "bg-white/10 text-white hover:bg-white/20 rounded-lg px-3 py-1.5 text-xs font-medium",
            cancelButton:
              "bg-white/5 text-white/60 hover:bg-white/10 rounded-lg px-3 py-1.5 text-xs",
            closeButton:
              "text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors",
            success: "border-l-2 !border-l-[#10b981]",
            error: "border-l-2 !border-l-[#f43f5e]",
            warning: "border-l-2 !border-l-[#f59e0b]",
            info: "border-l-2 !border-l-[#6366f1]",
          },
        }}
        icons={{
          success: (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.2)" }}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none">
                <path
                  d="M2 5L4 7L8 3"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ),
          error: (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(244,63,94,0.2)" }}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none">
                <path
                  d="M3 3L7 7M7 3L3 7"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ),
          warning: (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.2)" }}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none">
                <path
                  d="M5 3V5.5M5 7H5.01"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ),
          info: (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(99,102,241,0.2)" }}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none">
                <path
                  d="M5 4.5V7M5 3H5.01"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ),
        }}
      />

      <Routes>
        {/* ── PUBLIC ROUTES ── */}
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />
        <Route
          path="/invite"
          element={<AcceptInvite />}
        />
        <Route
          path="/mfa-login"
          element={<MFALogin />}
        />
        <Route
          path="/auth/callback"
          element={<OAuthCallback />}
        />
        <Route
          path="/magic-link"
          element={<MagicLinkVerify />}
        />

        {/* ── UNIVERSAL LOGIN (OAuth2 hosted pages) ── */}
        {/* Standalone — no DashboardLayout, no auth required */}
        {/* These are what developer apps redirect to via GET /authorize */}
        <Route
          path="/universal/login"
          element={<UniversalLogin />}
        />
        <Route
          path="/universal/signup"
          element={<UniversalSignup />}
        />
        <Route
          path="/universal/callback"
          element={<LoginCallback />}
        />

        {/* ── PROTECTED ROUTES ── */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />
          <Route
            path="/profile"
            element={<Profile />}
          />
          <Route
            path="/settings"
            element={<Settings />}
          />
          <Route
            path="/security"
            element={<Security />}
          />
          <Route
            path="/sessions"
            element={<Sessions />}
          />
          <Route
            path="/organizations"
            element={<Organizations />}
          />
          <Route
            path="/organization/members"
            element={<Members />}
          />
          <Route
            path="/api-keys"
            element={<ApiKeys />}
          />
          <Route
            path="/developers"
            element={<DeveloperIntegration />}
          />
          <Route
            path="/webhooks"
            element={<Webhooks />}
          />
          <Route
            path="/applications"
            element={<Applications />}
          />
          <Route
            path="/applications/:id"
            element={<ApplicationDetail />}
          />

          <Route
            path="/mfa-setup"
            element={
              user?.mfaEnabled ? (
                <Navigate
                  to="/settings"
                  replace
                />
              ) : (
                <MFASetup />
              )
            }
          />

          {/* ── Admin only ── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requireAdmin>
                <SDKEndUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute requireAdmin>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sdk-analytics"
            element={
              <ProtectedRoute requireAdmin>
                <SDKAnalytics />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ── HOME ── */}
        <Route
          path="/"
          element={<HomePage />}
        />
        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;
