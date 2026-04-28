import api from "../app/apiClient";
import { type ApiResponse } from "../types/global.types";

interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export const mfaService = {
  // Setup MFA - Generate QR code
  setupMFA: async (): Promise<ApiResponse<MFASetupResponse>> => {
    const response = await api.post("/mfa/setup");
    return response.data;
  },

  // Verify MFA Token
  verifyMFA: async (
    token: string,
  ): Promise<ApiResponse<{ verified: boolean }>> => {
    const response = await api.post("/mfa/verify", { token });
    return response.data;
  },

  // Activate MFA (final step after verification)
  activateMFA: async (): Promise<ApiResponse> => {
    const response = await api.post("/mfa/activate");
    return response.data;
  },

  // Validate MFA code during login
  validateMFA: async (
    userId: string,
    organizationId: string, // ✅ ADD
    token: string,
    useBackupCode: boolean,
  ) => {
    const response = await api.post("/mfa/validate", {
      userId,
      organizationId, // ✅ ADD
      token,
      useBackupCode,
    });
    return response.data;
  },

  // Disable MFA
  disableMFA: async (token: string): Promise<ApiResponse> => {
    const response = await api.post("/mfa/disable", { token });
    return response.data;
  },

  // Regenerate backup codes
  regenerateBackupCodes: async (
    token: string,
  ): Promise<ApiResponse<{ backupCodes: string[] }>> => {
    const response = await api.post("/mfa/backup-codes", { token });
    return response.data;
  },
};
