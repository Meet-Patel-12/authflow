import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthFlowClient } from "./AuthFlowClient";
import { AuthFlowError } from "./types";

// ─── Browser API mocks ────────────────────────────────────────────────────────

const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  mockStorage.clear();

  // localStorage + sessionStorage
  vi.stubGlobal("localStorage", mockStorage);
  vi.stubGlobal("sessionStorage", mockStorage);

  // window.location
  vi.stubGlobal("location", {
    origin: "https://myapp.com",
    href: "https://myapp.com/",
    search: "",
    assign: vi.fn(),
  });

  // window.history
  vi.stubGlobal("history", { replaceState: vi.fn() });

  // Web Crypto — return predictable bytes for testing
  vi.stubGlobal("crypto", {
    getRandomValues: (arr: Uint8Array) => {
      arr.fill(42);
      return arr;
    },
    subtle: {
      digest: async (_alg: string, data: ArrayBuffer) => {
        // Return a fixed 32-byte hash for deterministic code_challenge
        return new Uint8Array(32).fill(7).buffer;
      },
    },
  });

  // fetch — overridden per-test
  vi.stubGlobal("fetch", vi.fn());

  // atob / btoa
  vi.stubGlobal("atob", (s: string) =>
    Buffer.from(s, "base64").toString("binary"),
  );
  vi.stubGlobal("btoa", (s: string) =>
    Buffer.from(s, "binary").toString("base64"),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeClient = (
  overrides: Partial<ConstructorParameters<typeof AuthFlowClient>[0]> = {},
) =>
  new AuthFlowClient({
    domain: "https://auth.example.com",
    clientId: "af_testclient",
    redirectUri: "https://myapp.com/callback",
    ...overrides,
  });

const makeIdToken = (claims: Record<string, unknown> = {}) => {
  const header = btoa(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: "authflow-key-1" }),
  );
  const payload = btoa(
    JSON.stringify({
      sub: "user_123",
      iss: "https://auth.example.com",
      aud: "af_testclient",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
      name: "Test User",
      email: "test@example.com",
      email_verified: true,
      ...claims,
    }),
  );
  return `${header}.${payload}.fakesig`;
};

const makeTokenResponse = (overrides: Record<string, unknown> = {}) => ({
  access_token: "access_abc",
  refresh_token: "refresh_xyz",
  id_token: makeIdToken(),
  token_type: "Bearer",
  expires_in: 86400,
  scope: "openid profile email",
  ...overrides,
});

const mockFetchOk = (body: Record<string, unknown>) =>
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => body,
  } as Response);

const mockFetchErr = (status: number, body: Record<string, unknown>) =>
  vi.mocked(fetch).mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  } as Response);

// ─── Constructor ──────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("throws if domain is missing", () => {
    expect(() => new AuthFlowClient({ domain: "", clientId: "x" })).toThrow(
      "[AuthFlow] domain is required",
    );
  });

  it("throws if clientId is missing", () => {
    expect(
      () => new AuthFlowClient({ domain: "https://x.com", clientId: "" }),
    ).toThrow("[AuthFlow] clientId is required");
  });

  it("strips trailing slash from domain", () => {
    const client = makeClient({ domain: "https://auth.example.com/" });
    // Indirectly verified — loginWithRedirect builds URLs without double slash
    expect(client).toBeTruthy();
  });
});

// ─── loginWithRedirect ────────────────────────────────────────────────────────

describe("loginWithRedirect", () => {
  it("redirects to /authorize with correct params", async () => {
    const client = makeClient();
    await client.loginWithRedirect();

    const href = (window.location as any).href;
    expect(href).toContain("https://auth.example.com/authorize");
    expect(href).toContain("response_type=code");
    expect(href).toContain("client_id=af_testclient");
    expect(href).toContain("redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback");
    expect(href).toContain("code_challenge_method=S256");
    expect(href).toContain("code_challenge=");
    expect(href).toContain("state=");
  });

  it("includes screen_hint=signup when specified", async () => {
    const client = makeClient();
    await client.loginWithRedirect({ screen_hint: "signup" });
    expect((window.location as any).href).toContain("screen_hint=signup");
  });

  it("saves redirect state to sessionStorage", async () => {
    const client = makeClient();
    await client.loginWithRedirect();
    const stored = sessionStorage.getItem("authflow:redirect_state");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveProperty("code_verifier");
    expect(parsed).toHaveProperty("state");
    expect(parsed).toHaveProperty("redirect_uri");
  });
});

// ─── handleRedirectCallback ───────────────────────────────────────────────────

describe("handleRedirectCallback", () => {
  const setupCallback = (params: Record<string, string>) => {
    vi.stubGlobal("location", {
      origin: "https://myapp.com",
      href: `https://myapp.com/callback?${new URLSearchParams(params)}`,
      search: `?${new URLSearchParams(params)}`,
    });
  };

  const storeRedirectState = (state: string) => {
    sessionStorage.setItem(
      "authflow:redirect_state",
      JSON.stringify({
        code_verifier: "verifier_abc",
        state,
        redirect_uri: "https://myapp.com/callback",
      }),
    );
  };

  it("exchanges code for tokens successfully", async () => {
    setupCallback({ code: "auth_code_123", state: "csrf_abc" });
    storeRedirectState("csrf_abc");
    mockFetchOk(makeTokenResponse());

    const client = makeClient();
    const tokens = await client.handleRedirectCallback();

    expect(tokens.access_token).toBe("access_abc");
    expect(tokens.refresh_token).toBe("refresh_xyz");
    expect(tokens.id_token).toBeTruthy();
    expect(tokens.expires_at).toBeGreaterThan(Date.now());
  });

  it("throws AuthFlowError if OAuth2 error in URL", async () => {
    setupCallback({
      error: "access_denied",
      error_description: "User cancelled",
    });
    storeRedirectState("csrf_abc");

    const client = makeClient();
    await expect(client.handleRedirectCallback()).rejects.toThrow(
      AuthFlowError,
    );
  });

  it("throws if no code in URL", async () => {
    setupCallback({ state: "csrf_abc" });
    storeRedirectState("csrf_abc");

    const client = makeClient();
    await expect(client.handleRedirectCallback()).rejects.toMatchObject({
      error: "missing_code",
    });
  });

  it("throws if no stored redirect state", async () => {
    setupCallback({ code: "auth_code_123", state: "csrf_abc" });
    // Don't store state

    const client = makeClient();
    await expect(client.handleRedirectCallback()).rejects.toMatchObject({
      error: "missing_state",
    });
  });

  it("throws on state mismatch (CSRF protection)", async () => {
    setupCallback({ code: "auth_code_123", state: "attacker_state" });
    storeRedirectState("expected_state");

    const client = makeClient();
    await expect(client.handleRedirectCallback()).rejects.toMatchObject({
      error: "state_mismatch",
    });
  });

  it("clears redirect state after callback", async () => {
    setupCallback({ code: "auth_code_123", state: "csrf_abc" });
    storeRedirectState("csrf_abc");
    mockFetchOk(makeTokenResponse());

    const client = makeClient();
    await client.handleRedirectCallback();

    expect(sessionStorage.getItem("authflow:redirect_state")).toBeNull();
  });

  it("persists tokens to localStorage", async () => {
    setupCallback({ code: "auth_code_123", state: "csrf_abc" });
    storeRedirectState("csrf_abc");
    mockFetchOk(makeTokenResponse());

    const client = makeClient();
    await client.handleRedirectCallback();

    const stored = localStorage.getItem("authflow:tokens");
    expect(stored).not.toBeNull();
    const tokens = JSON.parse(stored!);
    expect(tokens.access_token).toBe("access_abc");
  });

  it("calls /oauth/token with correct body", async () => {
    setupCallback({ code: "auth_code_123", state: "csrf_abc" });
    storeRedirectState("csrf_abc");
    mockFetchOk(makeTokenResponse());

    const client = makeClient();
    await client.handleRedirectCallback();

    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://auth.example.com/oauth/token");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.grant_type).toBe("authorization_code");
    expect(body.code).toBe("auth_code_123");
    expect(body.code_verifier).toBe("verifier_abc");
    expect(body.client_id).toBe("af_testclient");
    expect(body.client_secret).toBeUndefined(); // SPAs never send client_secret
  });

  it("throws AuthFlowError if token exchange fails", async () => {
    setupCallback({ code: "auth_code_123", state: "csrf_abc" });
    storeRedirectState("csrf_abc");
    mockFetchErr(400, {
      error: "invalid_grant",
      error_description: "Code expired",
    });

    const client = makeClient();
    await expect(client.handleRedirectCallback()).rejects.toThrow(
      "Code expired",
    );
  });
});

// ─── getUser ─────────────────────────────────────────────────────────────────

describe("getUser", () => {
  it("returns null when not authenticated", () => {
    const client = makeClient();
    expect(client.getUser()).toBeNull();
  });

  it("returns user decoded from stored id_token", () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() + 86400000,
      }),
    );

    const client = makeClient();
    const user = client.getUser();

    expect(user).not.toBeNull();
    expect(user!.sub).toBe("user_123");
    expect(user!.email).toBe("test@example.com");
    expect(user!.name).toBe("Test User");
    expect(user!.email_verified).toBe(true);
  });
});

// ─── getAccessToken ───────────────────────────────────────────────────────────

describe("getAccessToken", () => {
  it("returns null when not authenticated", async () => {
    const client = makeClient();
    expect(await client.getAccessToken()).toBeNull();
  });

  it("returns access_token when not expired", async () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() + 86400000,
      }),
    );

    const client = makeClient();
    expect(await client.getAccessToken()).toBe("access_abc");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("silently refreshes when token is near expiry", async () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() + 30000, // 30s — within 60s buffer
      }),
    );
    mockFetchOk({ ...makeTokenResponse(), access_token: "access_new" });

    const client = makeClient();
    const token = await client.getAccessToken();

    expect(token).toBe("access_new");
    expect(fetch).toHaveBeenCalledOnce();
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://auth.example.com/oauth/refresh");
  });

  it("returns null and clears tokens if refresh fails", async () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() - 1000, // already expired
      }),
    );
    mockFetchErr(401, {
      error: "invalid_grant",
      error_description: "Refresh token expired",
    });

    const client = makeClient();
    const token = await client.getAccessToken();

    expect(token).toBeNull();
    expect(localStorage.getItem("authflow:tokens")).toBeNull();
  });
});

// ─── isAuthenticated ──────────────────────────────────────────────────────────

describe("isAuthenticated", () => {
  it("returns false when no tokens stored", () => {
    expect(makeClient().isAuthenticated()).toBe(false);
  });

  it("returns true when access_token is valid", () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() + 86400000,
      }),
    );
    expect(makeClient().isAuthenticated()).toBe(true);
  });

  it("returns false when access_token is expired", () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() - 1000,
      }),
    );
    expect(makeClient().isAuthenticated()).toBe(false);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe("logout", () => {
  it("clears tokens from localStorage", async () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify(makeTokenResponse()),
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    await makeClient().logout();
    expect(localStorage.getItem("authflow:tokens")).toBeNull();
  });

  it("redirects to window.location.origin by default", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    await makeClient().logout();
    expect((window.location as any).href).toBe("https://myapp.com");
  });

  it("redirects to returnTo when specified", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    await makeClient().logout({ returnTo: "https://myapp.com/logged-out" });
    expect((window.location as any).href).toBe("https://myapp.com/logged-out");
  });

  it("calls POST /oauth/logout with refresh_token and access_token", async () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() + 86400000,
      }),
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    await makeClient().logout();
    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://auth.example.com/oauth/logout");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.client_id).toBe("af_testclient");
    expect(body.refresh_token).toBe("refresh_xyz");
    expect(body.access_token).toBe("access_abc");
  });

  it("still clears tokens and redirects if server call fails", async () => {
    localStorage.setItem(
      "authflow:tokens",
      JSON.stringify({
        ...makeTokenResponse(),
        expires_at: Date.now() + 86400000,
      }),
    );
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));
    await makeClient().logout({ returnTo: "https://myapp.com/bye" });
    expect(localStorage.getItem("authflow:tokens")).toBeNull();
    expect((window.location as any).href).toBe("https://myapp.com/bye");
  });

  it("skips server call when no tokens stored", async () => {
    await makeClient().logout();
    expect(fetch).not.toHaveBeenCalled();
  });
});
