/* =========================================================
   USER TYPES
========================================================= */

export interface User {
  organizationId: string;
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "owner" | "admin" | "member"; // ✅ WEEK 1 FIX: was "user" | "admin" | "owner"
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

/* =========================================================
   AUTH TYPES
========================================================= */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
  inviteToken?: string;
}

/* =========================================================
   ORGANIZATION TYPES
========================================================= */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  plan: "free" | "pro" | "enterprise";
  role: "owner" | "admin" | "member";
  memberCount: number;
  createdAt: string;
}

/* =========================================================
   AUTH API RESPONSE
========================================================= */

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    organization: Organization | null;
    accessToken: string;
    refreshToken?: string;
    // MFA flow — present when mfaRequired is true
    mfaRequired?: boolean;
    userId?: string;
    organizationId?: string;
  };
}

/* =========================================================
   AUTH REDUX STATE
========================================================= */

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  cooldown: number;
  mfaRequired: boolean;
  mfaUserId: string | null;
  mfaOrganizationId: string | null;
}

/* =========================================================
   GENERIC API RESPONSE
========================================================= */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/* =========================================================
   PAGINATED RESPONSE
========================================================= */

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/* =========================================================
   API KEY TYPES
========================================================= */

export interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only returned once on creation
  permissions: string[];
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
}

/* =========================================================
   SESSION TYPES
========================================================= */

export interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: string;
  createdAt: string;
}

/* =========================================================
   APPLICATION TYPES
   ✅ WEEK 1 ADDITION
   Auth0 equivalent: Applications (formerly "Clients") inside a tenant.
   Developers register their apps here to get client_id / client_secret.
========================================================= */

export type ApplicationType =
  | "spa" // Single Page App — React, Vue, Angular
  | "regular_web" // Server-rendered — Next.js, Express, Laravel
  | "native" // Mobile/Desktop — React Native, Flutter, Electron
  | "machine_to_machine"; // Backend service — cron jobs, internal APIs

export interface Application {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  type: ApplicationType;
  clientId: string; // public — safe to use in frontend code
  clientSecret?: string; // private — only present ONCE on create or rotate
  allowedCallbacks: string[];
  allowedLogoutUrls: string[];
  allowedOrigins: string[];
  allowedWebOrigins: string[];
  tokenExpiry: {
    accessTokenTTL: number; // seconds
    refreshTokenTTL: number; // seconds
  };
  createdAt: string;
  updatedAt?: string;
}

export interface SessionsResponse {
  sessions: Session[];
  currentSessionId: string | null;
}
