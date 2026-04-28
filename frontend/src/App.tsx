import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { useAppDispatch, useAppSelector } from "./store/hooks";
import { getCurrentUser, setUserFromToken, logout } from "./store/authSlice";
import { getUserFromToken, isTokenExpired } from "./app/jwtUtils";
import { fetchOrganizations } from "./store/organizationSlice";

import ProtectedRoute from "./app/ProtectedRoute";
import DashboardLayout from "./components/layouts/DashboardLayout";

/* Pages */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import MFALogin from "./pages/mfa/MFALogin";
import OAuthCallback from "./pages/auth/OAuthCallback";
import MagicLinkVerify from "./pages/auth/MagicLinkVerify";

import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/settings/Profile";
import Settings from "./pages/settings/Settings";
import Security from "./pages/settings/Security";
import Sessions from "./pages/settings/Sessions";
import Organizations from "./pages/organizations/Organizations";
import ApiKeys from "./pages/apiKey/ApiKeys";
import MFASetup from "./pages/mfa/MFASetup";
import AuditLogs from "./pages/auditLogs/AuditLogs";
import SDKAnalytics from "./pages/sdkAnalytics/SDKAnalytics";
import Members from "./pages/organizations/Members";
import AcceptInvite from "./pages/organizations/AcceptInvite";
import DeveloperIntegration from "./pages/developers/DeveloperIntegration";
import Webhooks from "./pages/webhooks/Webhooks";
import Applications from "./pages/application/Application";
import ApplicationDetail from "./pages/application/ApplicationDetail";

// ── Universal Login (OAuth2 hosted pages — standalone, no DashboardLayout)
import UniversalLogin from "./pages/universalLogin/UniversalLogin";
import HomePage from "./pages/home/HomePage";
import UniversalSignup from "./pages/universalLogin/UniversalSignup";
import LoginCallback from "./pages/universalLogin/LoginCallback";

/* Admin */
import AdminDashboard from "./pages/admin/Dashboard";
import SDKEndUsers from "./pages/admin/SDKEndUsers";

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

  // ✅ Check for token expiration
  useEffect(() => {
    const checkTokenValidity = () => {
      const storedToken = localStorage.getItem("accessToken");

      // If token is expired, logout
      if (storedToken && isTokenExpired(storedToken)) {
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
