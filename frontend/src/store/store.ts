import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../store/authSlice";
import uiReducer from "./uiSlice";
import organizationReducer from "./organizationSlice";
import organizationMembersReducer from "./organizationMembersSlice";
import auditLogsReducer from "./auditLogsSlice";

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
