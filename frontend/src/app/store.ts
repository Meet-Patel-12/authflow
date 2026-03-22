import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import uiReducer from "./uiSlice";
import organizationReducer from "../features/organizations/organizationSlice";
import organizationMembersReducer from "../features/organizations/organizationMembersSlice";
import auditLogsReducer from "../features/auditLogs/auditLogsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    organizations: organizationReducer,
    organizationMembers: organizationMembersReducer,
    auditLogs: auditLogsReducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

/* ---------------------------- */
/* Types */
/* ---------------------------- */

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
