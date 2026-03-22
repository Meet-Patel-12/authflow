import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { organizationService } from "./api/organization.api";
import type { Organization } from "../../shared/types/global.types";

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
}

const initialState: OrganizationState = {
  organizations: [],
  currentOrganization: null,
  loading: false,
};

export const fetchOrganizations = createAsyncThunk(
  "organizations/fetchOrganizations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await organizationService.getOrganizations();
      const orgs = Array.isArray(response.data) ? response.data : [];
      return orgs;
    } catch {
      return rejectWithValue("Failed to fetch organizations");
    }
  },
);

// ✅ Separate thunk for switching org — no loop risk
export const switchToValidOrg = createAsyncThunk(
  "organizations/switchToValidOrg",
  async (orgId: string, { rejectWithValue }) => {
    try {
      const { default: api } = await import("../../app/apiClient");
      const res = await api.post("/organizations/switch", {
        organizationId: orgId,
      });
      const { accessToken, refreshToken } = res.data.data;
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("organizationId", orgId);
      return orgId;
    } catch {
      return rejectWithValue("Failed to switch organization");
    }
  },
);

const organizationSlice = createSlice({
  name: "organizations",
  initialState,
  reducers: {
    setCurrentOrganization: (state, action) => {
      state.currentOrganization = action.payload;
      localStorage.setItem("organizationId", action.payload.id);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchOrganizations.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchOrganizations.fulfilled, (state, action) => {
      state.loading = false;

      const orgs = Array.isArray(action.payload) ? action.payload : [];
      state.organizations = orgs;

      // ✅ Handle empty state (all orgs deleted)
      if (orgs.length === 0) {
        state.currentOrganization = null;
        localStorage.removeItem("organizationId");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return;
      }

      const storedOrgId = localStorage.getItem("organizationId");
      const existing = orgs.find((org) => org.id === storedOrgId);

      if (existing) {
        // ✅ Stored org is valid — use it, do NOT switch
        state.currentOrganization = existing;
      } else {
        // ✅ Stored org was deleted — update state and localStorage
        state.currentOrganization = orgs[0];
        localStorage.setItem("organizationId", orgs[0].id);
      }
    });

    builder.addCase(fetchOrganizations.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(switchToValidOrg.fulfilled, (state, action) => {
      const org = state.organizations.find((o) => o.id === action.payload);
      if (org) state.currentOrganization = org;
    });
  },
});

export const { setCurrentOrganization } = organizationSlice.actions;
export default organizationSlice.reducer;
