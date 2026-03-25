import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { authService } from "./api/auth.api";
import { mfaService } from "../mfa/api/mfa.api";

import type {
  AuthState,
  User,
  LoginCredentials,
  RegisterData,
  Organization,
} from "../../shared/types/global.types";

/* ------------------------------------------------ */
/* Initial State                                    */
/* ------------------------------------------------ */

const initialState: AuthState = {
  user: null,
  organization: null,
  accessToken: localStorage.getItem("accessToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  loading: false,
  error: null,
  rateLimited: false,
  cooldown: 0,
  mfaRequired: false,
  mfaUserId: null,
  mfaOrganizationId: null, // ✅ ADD
};

/* ------------------------------------------------ */
/* LOGIN                                            */
/* ------------------------------------------------ */

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);

      // ✅ Backend returns mfaRequired when user has MFA enabled
      if (response.data?.mfaRequired) {
        return {
          mfaRequired: true,
          mfaUserId: response.data.userId as string,
          mfaOrganizationId: response.data.organizationId as string,
          user: null,
          organization: null,
          accessToken: null,
        };
      }

      const { accessToken, refreshToken } = response.data;

      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      const userResponse = await authService.getCurrentUser();
      const { user, organization } = userResponse.data || {};

      if (organization?.id) {
        localStorage.setItem("organizationId", organization.id);
      }

      return {
        mfaRequired: false,
        mfaUserId: null,
        mfaOrganizationId: null, // ✅ ADD
        user,
        organization,
        accessToken,
      };
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 429) {
        return rejectWithValue({
          message: "Too many login attempts. Please wait before trying again.",
          rateLimited: true,
        });
      }
      return rejectWithValue({
        message: err.response?.data?.message || "Login failed",
        rateLimited: false,
      });
    }
  },
);

/* ------------------------------------------------ */
/* COMPLETE MFA LOGIN                               */
/* ------------------------------------------------ */

export const completeMFALogin = createAsyncThunk(
  "auth/completeMFALogin",
  async (
    {
      userId,
      organizationId, // ✅ ADD
      token,
      useBackupCode,
    }: {
      userId: string;
      organizationId: string; // ✅ ADD
      token: string;
      useBackupCode: boolean;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await mfaService.validateMFA(
        userId,
        organizationId, // ✅ ADD
        token,
        useBackupCode,
      );

      const { accessToken, refreshToken } = response.data;

      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      const userResponse = await authService.getCurrentUser();
      const { user, organization } = userResponse.data || {};

      if (organization?.id) {
        localStorage.setItem("organizationId", organization.id);
      }

      return { user, organization, accessToken };
    } catch (error) {
      const err = error as any;
      return rejectWithValue(
        err.response?.data?.message || "MFA verification failed",
      );
    }
  },
);

/* ------------------------------------------------ */
/* REGISTER                                         */
/* ------------------------------------------------ */

export const register = createAsyncThunk(
  "auth/register",
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      const { accessToken, refreshToken } = response.data;

      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      const userResponse = await authService.getCurrentUser();
      const { user, organization } = userResponse.data || {};

      if (organization?.id) {
        localStorage.setItem("organizationId", organization.id);
      }

      return { user, organization, accessToken };
    } catch (error) {
      const err = error as any;
      return rejectWithValue(
        err.response?.data?.message || "Registration failed",
      );
    }
  },
);

/* ------------------------------------------------ */
/* GET CURRENT USER                                 */
/* ------------------------------------------------ */

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const userResponse = await authService.getCurrentUser();
      const user = userResponse.data?.user;
      const organization = user?.organizationId
        ? ({ id: user.organizationId } as Organization)
        : null;
      return { user, organization };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get user";
      return rejectWithValue(errorMessage);
    }
  },
);

/* ------------------------------------------------ */
/* LOGOUT                                           */
/* ------------------------------------------------ */

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error("Logout error:", error);
  }

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("organizationId");
});

/* ------------------------------------------------ */
/* SLICE                                            */
/* ------------------------------------------------ */

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        organization: Organization | null;
        accessToken: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.organization = action.payload.organization;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;

      localStorage.setItem("accessToken", action.payload.accessToken);

      if (action.payload.organization?.id) {
        localStorage.setItem("organizationId", action.payload.organization.id);
      }
    },

    clearError: (state) => {
      state.error = null;
    },

    setUserFromToken: (
      state,
      action: PayloadAction<{
        userId: string;
        email: string;
        role: "admin" | "owner" | "user" | "member";
        organizationId: string;
      }>,
    ) => {
      // Set user from JWT token (fast, no API call needed)
      if (!state.user) {
        state.user = {
          id: action.payload.userId,
          email: action.payload.email,
          role: action.payload.role,
          organizationId: action.payload.organizationId,
          mfaEnabled: false,
          emailVerified: false,
          // Other fields will be populated by getCurrentUser API call
        } as User;
        state.organization = {
          id: action.payload.organizationId,
        } as Organization;
      }
    },
  },

  extraReducers: (builder) => {
    /* ---------------- LOGIN ---------------- */
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;

      if (action.payload.mfaRequired) {
        state.mfaRequired = true;
        state.mfaUserId = action.payload.mfaUserId;
        state.mfaOrganizationId = action.payload.mfaOrganizationId; // ✅ ADD
        return;
      }

      state.mfaRequired = false;
      state.mfaUserId = null;
      state.mfaOrganizationId = null; // ✅ ADD
      state.user = action.payload.user || null;
      state.organization = action.payload.organization || null;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    });

    builder.addCase(login.rejected, (state, action: any) => {
      state.loading = false;
      state.error = action.payload?.message || "Login failed";
      if (action.payload?.rateLimited) {
        state.rateLimited = true;
        state.cooldown = 30;
      }
    });

    /* ---------------- REGISTER ---------------- */
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user || null;
      state.organization = action.payload.organization || null;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
    });

    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });

    /* ---------------- GET CURRENT USER ---------------- */
    builder.addCase(getCurrentUser.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(getCurrentUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user || null;
      state.organization = action.payload.organization || null;
      state.isAuthenticated = true;
    });

    builder.addCase(getCurrentUser.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.organization = null;
      state.accessToken = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("organizationId");
    });

    /* ---------------- LOGOUT ---------------- */
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.organization = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.mfaRequired = false;
      state.mfaUserId = null;
      state.mfaOrganizationId = null; // ✅ ADD
    });

    /* ---------------- COMPLETE MFA LOGIN ---------------- */
    builder.addCase(completeMFALogin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(completeMFALogin.fulfilled, (state, action) => {
      state.loading = false;
      state.mfaRequired = false;
      state.mfaUserId = null;
      state.mfaOrganizationId = null; // ✅ ADD
      state.user = action.payload.user || null;
      state.organization = action.payload.organization || null;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
    });

    builder.addCase(completeMFALogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setCredentials, clearError, setUserFromToken } =
  authSlice.actions;
export default authSlice.reducer;
