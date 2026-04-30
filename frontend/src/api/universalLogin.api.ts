import axios from "axios";

// Use a plain axios instance — NOT the main api client.
// The main api client attaches Authorization headers and org headers
// which would interfere with this public OAuth2 flow.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 8000,
});

// ─── App Info ─────────────────────────────────────────────────────────────────

export interface AppInfo {
  name: string;
  logo?: string;
  type: string;
}

export const fetchAppInfo = async (clientId: string): Promise<AppInfo> => {
  try {
    const res = await publicApi.get("/oauth2/app-info", {
      params: { client_id: clientId },
    });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error("Application not found. Check your client_id.");
    }
    throw new Error("Unable to load application info. Please try again.");
  }
};

// ─── Complete Login ───────────────────────────────────────────────────────────

export interface CompleteLoginParams {
  email: string;
  password: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface CompleteLoginResult {
  redirectUrl: string;
}

export const completeLogin = async (
  params: CompleteLoginParams,
): Promise<CompleteLoginResult> => {
  const res = await publicApi.post("/oauth2/complete-login", params);
  return res.data;
};

// ─── Complete Register ────────────────────────────────────────────────────────

export interface CompleteRegisterParams extends CompleteLoginParams {
  name: string;
}

export const completeRegister = async (
  params: CompleteRegisterParams,
): Promise<CompleteLoginResult> => {
  const res = await publicApi.post("/oauth2/complete-register", params);
  return res.data;
};
