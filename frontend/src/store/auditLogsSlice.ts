import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { auditLogsService, type AuditLogFilters } from "../api/auditLogs.api";

interface AuditLogsState {
  logs: unknown[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
}

const initialState: AuditLogsState = {
  logs: [],
  loading: false,
  page: 1,
  totalPages: 1,
  total: 0,
};

export const fetchAuditLogs = createAsyncThunk(
  "auditLogs/fetchAuditLogs",
  async (filters: AuditLogFilters = {}) => {
    const response = await auditLogsService.getAuditLogs(filters);
    return response.data;
  },
);

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchAuditLogs.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchAuditLogs.fulfilled, (state, action) => {
      state.loading = false;
      state.logs = action.payload?.items || [];
      state.page = action.payload?.pagination.page || 1;
      state.totalPages = action.payload?.pagination.totalPages || 1;
      state.total = action.payload?.pagination.total || 0;
    });

    builder.addCase(fetchAuditLogs.rejected, (state) => {
      state.loading = false;
    });
  },
});

export default auditLogsSlice.reducer;
