export {
  AuthFlowProvider,
  useAuthFlow,
  useUser,
  withAuthRequired,
} from "./AuthFlowContext";

export type {
  AuthFlowProviderProps,
  AuthFlowContextValue,
} from "./AuthFlowContext";

export { useAuthCallback } from "./useAuthCallback";
export type { UseAuthCallbackResult, CallbackStatus } from "./useAuthCallback";

// Re-export core types so consumers don't need to import from @authflow/js directly
export type {
  AuthFlowUser,
  AuthFlowConfig,
  TokenSet,
  AuthFlowError,
} from "@meet_patel_03/authflow-js";
