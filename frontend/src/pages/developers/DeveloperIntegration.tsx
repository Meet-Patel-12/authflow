import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Terminal,
  Shield,
  RefreshCw,
  LogOut,
  User,
  Lock,
} from "lucide-react";
import api from "../../app/apiClient";
import { CopyButton, Alert } from "../../components/ui";

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
  `# Backend .env file
AUTHFLOW_CLIENT_ID=${cid}
AUTHFLOW_CLIENT_SECRET=your_secret_from_dashboard
AUTHFLOW_BASE_URL=${window.location.origin}
NODE_ENV=development`;

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          Integration Guide
        </h1>
        <p className="text-gray-400 text-lg">
          Quick start with AuthFlow. Select your application and integrate our
          SDK.
        </p>
      </div>

      {/* App Selector */}
      <div className="mb-8 max-w-md">
        <label className="text-sm font-semibold text-white block mb-2">
          Select Application
        </label>
        {loading ? (
          <div className="h-10 rounded-lg skeleton" />
        ) : applications.length === 0 ? (
          <Alert variant="warning">
            <a
              href="/applications"
              className="underline font-medium">
              Create an application first
            </a>{" "}
            to get started
          </Alert>
        ) : (
          <AppDropdown
            value={selectedAppId}
            onChange={setSelectedAppId}
            options={appOptions}
          />
        )}
      </div>

      {/* Credentials */}
      {selectedApp && (
        <div className="grid grid-cols-2 gap-4 mb-12 max-w-2xl">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Client ID
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <code className="flex-1 text-sm font-mono text-cyan-300 truncate">
                {selectedApp.clientId}
              </code>
              <CopyButton
                text={selectedApp.clientId}
                size={13}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Client Secret
            </p>
            <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <code className="text-sm font-mono text-yellow-300">
                See .env file →
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Quick Setup */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              num: "1",
              title: "Get Credentials",
              desc: "Copy your Client ID and Secret from above",
            },
            {
              num: "2",
              title: "Setup Environment",
              desc: "Add variables to your .env file",
            },
            {
              num: "3",
              title: "Integrate SDK",
              desc: "Follow code examples below",
            },
          ].map(({ num, title, desc }) => (
            <div
              key={num}
              className="p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 transition">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-400">{num}</span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{title}</p>
                  <p className="text-xs text-gray-400 mt-1">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Environment Setup */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">
          Environment Variables
        </h2>
        <CodeBlock code={genEnvExample(clientId)} />
      </div>

      {/* Code Examples */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Code Examples</h2>
        <div className="space-y-3">
          <Section
            icon={User}
            title="Register User"
            defaultOpen>
            <CodeBlock code={genRegister(baseUrl, clientId)} />
          </Section>
          <Section
            icon={Lock}
            title="Login User">
            <CodeBlock code={genLogin(baseUrl, clientId)} />
          </Section>
          <Section
            icon={User}
            title="Get User Profile">
            <CodeBlock code={genMe(baseUrl, clientId)} />
          </Section>
          <Section
            icon={RefreshCw}
            title="Refresh Access Token">
            <CodeBlock code={genRefresh(baseUrl, clientId)} />
          </Section>
          <Section
            icon={Shield}
            title="Verify Token (Backend)">
            <CodeBlock code={genVerify(baseUrl, clientId)} />
          </Section>
          <Section
            icon={LogOut}
            title="Logout User">
            <CodeBlock code={genLogout(baseUrl, clientId)} />
          </Section>
          <Section
            icon={Terminal}
            title="Express.js Middleware"
            badge="recommended">
            <CodeBlock code={genMiddleware(baseUrl, clientId)} />
          </Section>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">API Endpoints</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead
              style={{
                background: "rgba(15,23,42,0.8)",
                borderBottom: "1px solid rgb(55,65,81)",
              }}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Method
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Path
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep, i) => {
                const ms = METHOD_STYLE[ep.method] ?? METHOD_STYLE.GET;
                return (
                  <tr
                    key={ep.path}
                    style={{
                      background:
                        i % 2 === 0 ? "rgba(30,41,59,0.4)" : "transparent",
                      borderBottom: "1px solid rgb(30,41,59)",
                    }}>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded"
                        style={{
                          background: ms.bg,
                          color: ms.color,
                          border: `1px solid ${ms.border}`,
                        }}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-cyan-300 font-mono text-xs">
                        {ep.path}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {ep.desc}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Reminder */}
      <Alert
        variant="warning"
        className="mb-12">
        <p className="font-semibold text-sm mb-1">🔒 Security Best Practices</p>
        <ul className="text-xs space-y-1 text-gray-300">
          <li>
            • Never expose{" "}
            <code className="bg-slate-800 px-1 rounded">client_secret</code> in
            frontend code
          </li>
          <li>• Store tokens in httpOnly cookies on the backend</li>
          <li>• Always verify tokens on protected routes</li>
          <li>• Rotate credentials immediately if exposed</li>
        </ul>
      </Alert>

      {/* CTA */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">Ready to integrate?</p>
          <p className="text-sm text-gray-400">
            Check the code examples above and start building
          </p>
        </div>
        <a
          href="https://github.com/auth0/auth0-react"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary gap-2 flex-shrink-0">
          View GitHub
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default DeveloperIntegration;
