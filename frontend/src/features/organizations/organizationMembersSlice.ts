import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  organizationMembersService,
  type Member,
} from "./api/organizationMembers.api";

interface OrganizationMembersState {
  members: Member[];
  loading: boolean;
  error: string | null;
}

const initialState: OrganizationMembersState = {
  members: [],
  loading: false,
  error: null,
};

export const fetchMembers = createAsyncThunk(
  "organizationMembers/fetchMembers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await organizationMembersService.getMembers();
      // Backend returns { success, data: { organization, members } }
      return response.data?.members;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch members",
      );
    }
  },
);

export const inviteMember = createAsyncThunk(
  "organizationMembers/inviteMember",
  async (
    { email, role }: { email: string; role: "admin" | "member" },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await organizationMembersService.inviteMember(email, role);
      dispatch(fetchMembers()); // refresh list
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to invite member",
      );
    }
  },
);

export const removeMember = createAsyncThunk(
  "organizationMembers/removeMember",
  async (memberId: string, { dispatch, rejectWithValue }) => {
    try {
      await organizationMembersService.removeMember(memberId);
      dispatch(fetchMembers()); // refresh list
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove member",
      );
    }
  },
);

const organizationMembersSlice = createSlice({
  name: "organizationMembers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default organizationMembersSlice.reducer;
