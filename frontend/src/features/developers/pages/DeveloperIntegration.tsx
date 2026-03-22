import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Terminal,
  Shield,
  Zap,
  AppWindow,
  Key,
  RefreshCw,
  LogOut,
  User,
  Lock,
  AlertTriangle,
  Code2,
  BookOpen,
} from "lucide-react";
import api from "../../../app/apiClient";
import { CopyButton, Alert } from "../../../components/ui";

/* ─── Types ─── */
type AppType = "spa" | "regular_web" | "native" | "machine_to_machine";

interface Application {
  id: string;
  name: string;
  type: AppType;
  clientId: string;
}

/* ─── Method badge styles (same as AuditLogs) ─── */
const METHOD_STYLE: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  GET: {
    bg: "var(--accent-dim)",
    color: "var(--accent)",
    border: "rgba(99,102,241,0.25)",
  },
  POST: {
    bg: "var(--success-dim)",
    color: "var(--success)",
    border: "rgba(16,185,129,0.25)",
  },
  PUT: {
    bg: "var(--warning-dim)",
    color: "var(--warning)",
    border: "rgba(245,158,11,0.25)",
  },
  DELETE: {
    bg: "var(--danger-dim)",
    color: "var(--danger)",
    border: "rgba(244,63,94,0.25)",
  },
};

/* ─── Code block ─── */
const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="relative group rounded-xl overflow-hidden"
      style={{ background: "#08090f" }}>
      <pre
        className="p-4 text-xs leading-relaxed overflow-x-auto"
        style={{
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: "#a5f3fc",
        }}>
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all opacity-0 group-hover:opacity-100"
        style={{
          background: copied ? "var(--success-dim)" : "rgba(255,255,255,0.08)",
          color: copied ? "var(--success)" : "var(--text-muted)",
          border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
        }}>
        {copied ? (
          <>
            <Check className="w-3 h-3" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" /> Copy
          </>
        )}
      </button>
    </div>
  );
};

/* ─── Collapsible section ─── */
const Section = ({
  icon: Icon,
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  icon?: React.ElementType;
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${open ? "rgba(99,102,241,0.2)" : "var(--border)"}`,
        transition: "border-color 0.2s",
      }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{
          background: open ? "rgba(99,102,241,0.04)" : "var(--bg-elevated)",
        }}
        onMouseOver={(e) =>
          !open &&
          ((e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.02)")
        }
        onMouseOut={(e) =>
          !open &&
          ((e.currentTarget as HTMLElement).style.background =
            "var(--bg-elevated)")
        }>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              className="w-4 h-4 flex-shrink-0"
              style={{ color: open ? "var(--accent)" : "var(--text-muted)" }}
            />
          )}
          <span
            className="text-sm font-semibold"
            style={{
              color: open ? "var(--text-primary)" : "var(--text-secondary)",
            }}>
            {title}
          </span>
          {badge && (
            <span className="badge badge-accent text-[10px]">{badge}</span>
          )}
        </div>
        {open ? (
          <ChevronUp
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "var(--accent)" }}
          />
        ) : (
          <ChevronDown
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
        )}
      </button>
      {open && (
        <div
          className="px-5 pb-5 space-y-4"
          style={{
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--border)",
          }}>
          {children}
        </div>
      )}
    </div>
  );
};

/* ─── App selector dropdown ─── */
interface DropOpt {
  value: string;
  label: string;
}

const DropItem = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-3 py-2.5 text-sm transition-colors truncate"
    style={{
      background: active ? "var(--accent-dim)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-secondary)",
    }}
    onMouseOver={(e) =>
      !active &&
      ((e.currentTarget as HTMLElement).style.background =
        "rgba(255,255,255,0.04)")
    }
    onMouseOut={(e) =>
      !active &&
      ((e.currentTarget as HTMLElement).style.background = "transparent")
    }>
    {label}
  </button>
);

const AppDropdown = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropOpt[];
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      ref={ref}
      className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-dark w-full flex items-center justify-between gap-2 cursor-pointer text-sm text-left"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <span
          style={{
            color: selected ? "var(--text-primary)" : "var(--text-muted)",
          }}>
          {selected?.label ?? "Select application…"}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            maxHeight: 200,
            overflowY: "auto",
          }}>
          {options.map((o) => (
            <DropItem
              key={o.value}
              label={o.label}
              active={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Code generators ─── */
const genRegister = (base: string, cid: string) =>
  `// POST /api/sdk/auth/register
// Register a new user in your application (call from your backend)

const response = await fetch('${base}/api/sdk/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id:     '${cid}',
    client_secret: process.env.AUTHFLOW_CLIENT_SECRET, // ← server-side only
    email:         'user@example.com',
    password:      'SecurePassword1',
    name:          'Jane Doe',
    metadata: {    // optional — store any custom fields
      plan: 'free',
      signupSource: 'web'
    }
  })
});

const { data } = await response.json();
// data.accessToken  — short-lived JWT    → use for API calls
// data.refreshToken — long-lived token   → store in httpOnly cookie
// data.user         — { id, email, name, createdAt, metadata }`;

const genLogin = (base: string, cid: string) =>
  `// POST /api/sdk/auth/login
// Authenticate an existing user

const response = await fetch('${base}/api/sdk/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id:     '${cid}',
    client_secret: process.env.AUTHFLOW_CLIENT_SECRET,
    email:         'user@example.com',
    password:      'SecurePassword1'
  })
});

const { data } = await response.json();

// ⚠️  Token storage best practices:
//   accessToken  → memory (variable) or short-lived httpOnly cookie
//   refreshToken → httpOnly cookie ONLY  (never localStorage / never exposed to JS)`;

const genMe = (base: string, cid: string) =>
  `// GET /api/sdk/auth/me
// Fetch the current authenticated user's profile

const response = await fetch(
  '${base}/api/sdk/auth/me' +
    '?client_id=${cid}' +
    '&client_secret=' + process.env.AUTHFLOW_CLIENT_SECRET,
  {
    headers: {
      Authorization: \`Bearer \${accessToken}\`  // pass the user's token
    }
  }
);

const { data } = await response.json();
// data.user — { id, email, name, isEmailVerified, metadata, organizationId }`;

const genRefresh = (base: string, cid: string) =>
  `// POST /api/sdk/auth/refresh
// Exchange a refresh token for a new access token

const response = await fetch('${base}/api/sdk/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id:     '${cid}',
    client_secret: process.env.AUTHFLOW_CLIENT_SECRET,
    refreshToken:  storedRefreshToken  // read from httpOnly cookie
  })
});

const { data } = await response.json();
// data.accessToken  — fresh token, replace the old one in memory
// data.refreshToken — may also be rotated (check your token policy)`;

const genVerify = (base: string, cid: string) =>
  `// GET /api/sdk/token/verify
// Verify a user's JWT on your backend before serving protected data
// Fastest way to protect your API — no JWT library needed

const response = await fetch(
  '${base}/api/sdk/token/verify' +
    '?client_id=${cid}' +
    '&client_secret=' + process.env.AUTHFLOW_CLIENT_SECRET,
  {
    headers: {
      Authorization: req.headers.authorization  // forward from incoming request
    }
  }
);

const { data } = await response.json();

if (!data.valid) {
  return res.status(401).json({ error: data.reason ?? 'Unauthorized' });
}

// ✅ Token is valid — user info is available
// data.user — { id, email, name, organizationId, metadata }
// data.expiresAt — Unix timestamp when this token expires`;

const genLogout = (base: string, cid: string) =>
  `// POST /api/sdk/auth/logout
// Revoke the user's current session (invalidates the refreshToken)

const response = await fetch('${base}/api/sdk/auth/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id:     '${cid}',
    client_secret: process.env.AUTHFLOW_CLIENT_SECRET,
    // Include the refreshToken to ensure the session is fully revoked:
    refreshToken:  refreshTokenFromCookie
  })
});

// After logout:
// 1. Delete the accessToken from memory
// 2. Clear the httpOnly refreshToken cookie from your server
// 3. Redirect the user to your login page`;

const genMiddleware = (base: string, cid: string) =>
  `// Express middleware — protect any route with AuthFlow
// Drop this into middleware/authflow.js and require it on any route

const verifyAuthFlowToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const response = await fetch(
      '${base}/api/sdk/token/verify' +
        '?client_id=${cid}' +
        '&client_secret=' + process.env.AUTHFLOW_CLIENT_SECRET,
      { headers: { Authorization: authHeader } }
    );

    const { data } = await response.json();

    if (!data.valid) {
      return res.status(401).json({ error: data.reason ?? 'Unauthorized' });
    }

    req.user = data.user;  // { id, email, name, organizationId, metadata }
    next();

  } catch (err) {
    console.error('[AuthFlow] Token verification failed:', err);
    return res.status(500).json({ error: 'Auth service unavailable' });
  }
};

// ─── Usage ───────────────────────────────────────────────
app.get('/api/profile',  verifyAuthFlowToken, (req, res) => res.json({ user: req.user }));
app.get('/api/orders',   verifyAuthFlowToken, (req, res) => { /* ... */ });
app.post('/api/orders',  verifyAuthFlowToken, (req, res) => { /* ... */ });`;

const genEnvExample = (cid: string) =>
  `# .env — server-side only, never commit this file

AUTHFLOW_CLIENT_ID=${cid}
AUTHFLOW_CLIENT_SECRET=your_client_secret_here

# The base URL of your AuthFlow instance:
AUTHFLOW_BASE_URL=${window.location.origin}`;

/* ─── Endpoint reference data ─── */
const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/sdk/auth/register",
    desc: "Register a new end-user",
    auth: "client_id + client_secret",
  },
  {
    method: "POST",
    path: "/api/sdk/auth/login",
    desc: "Authenticate user, receive tokens",
    auth: "client_id + client_secret",
  },
  {
    method: "GET",
    path: "/api/sdk/auth/me",
    desc: "Get current user profile",
    auth: "client credentials + Bearer token",
  },
  {
    method: "POST",
    path: "/api/sdk/auth/refresh",
    desc: "Refresh expired access token",
    auth: "client_id + client_secret",
  },
  {
    method: "POST",
    path: "/api/sdk/auth/logout",
    desc: "Revoke session and refresh token",
    auth: "client_id + client_secret",
  },
  {
    method: "GET",
    path: "/api/sdk/token/verify",
    desc: "Verify a user JWT on your backend",
    auth: "client credentials + Bearer token",
  },
];

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
const DeveloperIntegration = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const baseUrl = window.location.origin;
  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const clientId = selectedApp?.clientId ?? "YOUR_CLIENT_ID";

  useEffect(() => {
    api
      .get("/applications")
      .then((res) => {
        const apps: Application[] = res.data?.data?.applications ?? [];
        setApplications(apps);
        if (apps.length > 0) setSelectedAppId(apps[0].id);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => setLoading(false));
  }, []);

  const appOptions = applications.map((a) => ({
    value: a.id,
    label: `${a.name} — ${a.clientId}`,
  }));

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-7">
      {/* ── Header ── */}
      <div>
        <h1 className="page-title">Developer Integration</h1>
        <p className="page-subtitle">
          Use AuthFlow as the authentication backend for your own applications —
          no auth code to write
        </p>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: AppWindow,
            step: "01",
            title: "Create Application",
            desc: "Register your app in the Applications section to get a client_id and client_secret.",
            color: "var(--accent-dim)",
            glow: "var(--accent)",
          },
          {
            icon: Terminal,
            step: "02",
            title: "Call SDK Endpoints",
            desc: "Your backend calls /api/sdk/* with client credentials to register, login, and manage your users.",
            color: "var(--success-dim)",
            glow: "var(--success)",
          },
          {
            icon: Shield,
            step: "03",
            title: "Verify & Protect",
            desc: "Use /api/sdk/token/verify as drop-in middleware — no JWT library or secret management needed.",
            color: "var(--cyan-dim)",
            glow: "var(--cyan)",
          },
        ].map(({ icon: Icon, step, title, desc, color, glow }) => (
          <div
            key={step}
            className="rounded-xl p-5 animate-slide-up"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}>
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: color }}>
                <Icon
                  className="w-4 h-4"
                  style={{ color: glow }}
                />
              </div>
              <span
                className="text-[10px] font-bold mt-2.5 font-mono"
                style={{ color: "var(--text-muted)" }}>
                {step}
              </span>
            </div>
            <p
              className="text-sm font-semibold mb-1.5"
              style={{ color: "var(--text-primary)" }}>
              {title}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              {desc}
            </p>
          </div>
        ))}
      </div>

      {/* ── App selector + credentials ── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        <div className="flex items-center gap-2 mb-1">
          <Code2
            className="w-4 h-4"
            style={{ color: "var(--accent)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Select Application
          </h2>
          <span className="badge badge-muted text-[10px]">
            examples auto-populate
          </span>
        </div>

        {loading ? (
          <div className="h-10 rounded-xl skeleton" />
        ) : applications.length === 0 ? (
          <Alert variant="warning">
            No applications found.{" "}
            <a
              href="/applications"
              className="underline font-medium"
              style={{ color: "var(--warning)" }}>
              Create one first
            </a>{" "}
            to see your client_id in the code examples.
          </Alert>
        ) : (
          <AppDropdown
            value={selectedAppId}
            onChange={setSelectedAppId}
            options={appOptions}
          />
        )}

        {selectedApp && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-dark">Client ID</label>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                }}>
                <code
                  className="flex-1 text-xs font-mono truncate"
                  style={{ color: "#a5f3fc" }}>
                  {selectedApp.clientId}
                </code>
                <CopyButton
                  text={selectedApp.clientId}
                  size={13}
                />
              </div>
              <p
                className="text-[10px] mt-1"
                style={{ color: "var(--text-muted)" }}>
                Safe to use in frontend / public code
              </p>
            </div>
            <div>
              <label className="label-dark">Client Secret</label>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                }}>
                <code
                  className="flex-1 text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}>
                  process.env.AUTHFLOW_CLIENT_SECRET
                </code>
              </div>
              <p
                className="text-[10px] mt-1"
                style={{ color: "var(--danger)", opacity: 0.8 }}>
                Server-side only — never expose to clients
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Security warning ── */}
      <Alert variant="warning">
        <p className="font-semibold text-xs mb-1">
          Keep client_secret server-side only
        </p>
        <p className="text-xs font-normal leading-relaxed">
          Never embed client_secret in frontend JavaScript, mobile apps, or
          version control. Store it as an environment variable on your server.
          The client_id is public and safe to share.
        </p>
      </Alert>

      {/* ── Environment setup ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        <div className="flex items-center gap-2 mb-3">
          <Key
            className="w-4 h-4"
            style={{ color: "var(--warning)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Environment Setup
          </h2>
        </div>
        <p
          className="text-xs mb-3"
          style={{ color: "var(--text-muted)" }}>
          Add these variables to your server's{" "}
          <code
            className="font-mono"
            style={{ color: "var(--accent)" }}>
            .env
          </code>{" "}
          file:
        </p>
        <CodeBlock code={genEnvExample(clientId)} />
      </div>

      {/* ── Code examples ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen
            className="w-4 h-4"
            style={{ color: "var(--accent)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Code Examples
          </h2>
          <span className="badge badge-muted text-[10px]">
            Node.js / fetch API
          </span>
        </div>

        <div className="space-y-2">
          <Section
            icon={User}
            title="Register User"
            defaultOpen>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Create a new user in your application. Always called from your
              backend — never directly from a browser.
            </p>
            <CodeBlock code={genRegister(baseUrl, clientId)} />
          </Section>

          <Section
            icon={Lock}
            title="Login User">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Authenticate an existing user and receive short-lived access +
              long-lived refresh tokens.
            </p>
            <CodeBlock code={genLogin(baseUrl, clientId)} />
          </Section>

          <Section
            icon={User}
            title="Get User Profile">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Fetch the currently authenticated user's profile. Requires the
              user's access token.
            </p>
            <CodeBlock code={genMe(baseUrl, clientId)} />
          </Section>

          <Section
            icon={RefreshCw}
            title="Refresh Access Token">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Access tokens expire after a configured TTL. Use the refresh token
              to issue a new one without re-login.
            </p>
            <CodeBlock code={genRefresh(baseUrl, clientId)} />
          </Section>

          <Section
            icon={Shield}
            title="Verify Token"
            badge="protect your API">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Validate a user's JWT on your backend before serving protected
              resources. No JWT library or shared secret needed.
            </p>
            <CodeBlock code={genVerify(baseUrl, clientId)} />
          </Section>

          <Section
            icon={LogOut}
            title="Logout User">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Revoke the user's session and invalidate their refresh token.
              Always clear tokens client-side after calling this.
            </p>
            <CodeBlock code={genLogout(baseUrl, clientId)} />
          </Section>

          <Section
            icon={Terminal}
            title="Express Middleware"
            badge="recommended">
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Drop-in middleware for Express. Wraps the verify endpoint to
              protect any route with one line. Includes error handling for auth
              service downtime.
            </p>
            <CodeBlock code={genMiddleware(baseUrl, clientId)} />
          </Section>
        </div>
      </div>

      {/* ── Endpoint reference ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap
            className="w-4 h-4"
            style={{ color: "var(--accent)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Endpoint Reference
          </h2>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
          <table className="table-dark">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
                <th>Auth</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => {
                const ms = METHOD_STYLE[ep.method] ?? METHOD_STYLE.GET;
                return (
                  <tr key={ep.path}>
                    <td>
                      <span
                        className="badge text-[10px] font-bold"
                        style={{
                          background: ms.bg,
                          color: ms.color,
                          border: `1px solid ${ms.border}`,
                        }}>
                        {ep.method}
                      </span>
                    </td>
                    <td>
                      <code
                        className="text-xs font-mono"
                        style={{ color: "#a5f3fc" }}>
                        {ep.path}
                      </code>
                    </td>
                    <td>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}>
                        {ep.desc}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--text-muted)" }}>
                        {ep.auth}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Token lifecycle diagram ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw
            className="w-4 h-4"
            style={{ color: "var(--cyan)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Token Lifecycle
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Access Token",
              ttl: "Short-lived (15m – 24h)",
              usage:
                "Pass in Authorization: Bearer header on every API request",
              store: "Memory or short-lived httpOnly cookie",
              color: "var(--accent)",
              dim: "var(--accent-dim)",
            },
            {
              label: "Refresh Token",
              ttl: "Long-lived (7d – 1yr)",
              usage:
                "Exchange for a new access token when the current one expires",
              store: "httpOnly cookie only — never localStorage",
              color: "var(--success)",
              dim: "var(--success-dim)",
            },
            {
              label: "Client Secret",
              ttl: "Until rotated",
              usage: "Authenticate your backend with AuthFlow SDK endpoints",
              store: "Environment variable — never in code or frontend",
              color: "var(--warning)",
              dim: "var(--warning-dim)",
            },
          ].map(({ label, ttl, usage, store, color, dim }) => (
            <div
              key={label}
              className="rounded-xl p-4 space-y-2"
              style={{ background: dim, border: `1px solid ${color}33` }}>
              <p
                className="text-xs font-bold"
                style={{ color }}>
                {label}
              </p>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: "var(--text-muted)" }}>
                  TTL
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}>
                  {ttl}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: "var(--text-muted)" }}>
                  Usage
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}>
                  {usage}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: "var(--text-muted)" }}>
                  Store in
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}>
                  {store}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Security checklist ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle
            className="w-4 h-4"
            style={{ color: "var(--danger)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Security Checklist
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            {
              ok: true,
              text: "client_secret stored in environment variable only",
            },
            {
              ok: true,
              text: "refreshToken stored in httpOnly cookie (not localStorage)",
            },
            { ok: true, text: "accessToken never logged or exposed in URLs" },
            {
              ok: true,
              text: "All SDK calls made server-side, never from the browser",
            },
            {
              ok: true,
              text: "Token verify called on every protected request",
            },
            {
              ok: true,
              text: "client_secret rotated after any suspected exposure",
            },
          ].map(({ ok, text }) => (
            <div
              key={text}
              className="flex items-start gap-2.5 py-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: ok ? "var(--success-dim)" : "var(--danger-dim)",
                }}>
                <Check
                  className="w-2.5 h-2.5"
                  style={{ color: ok ? "var(--success)" : "var(--danger)" }}
                />
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{
          background: "var(--accent-dim)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Ready to integrate?
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-muted)" }}>
            Create your application to get credentials, then follow the examples
            above
          </p>
        </div>
        <a
          href="/applications"
          className="btn btn-primary gap-2 flex-shrink-0 text-sm">
          Go to Applications
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default DeveloperIntegration;
