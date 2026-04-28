import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Zap,
  Code2,
  Lock,
  Users,
  BarChart3,
  Webhook,
  Key,
  CheckCircle2,
  ArrowRight,
  Github,
  Terminal,
  Globe,
  Star,
} from "lucide-react";

const Counter = ({ end, suffix = "" }: { end: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = end / 60;
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else setCount(Math.floor(start));
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    highlight: false,
    description: "Perfect for side projects and early-stage startups.",
    features: [
      "Up to 1,000 MAU",
      "1 Application",
      "OAuth2 + OIDC",
      "Universal Login UI",
      "Email / Password auth",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    highlight: true,
    description: "For growing products that need more scale and customization.",
    features: [
      "Up to 50,000 MAU",
      "Unlimited applications",
      "All Starter features",
      "MFA / TOTP",
      "Webhooks",
      "Audit logs",
      "API keys",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    highlight: false,
    description: "Dedicated infrastructure, SLAs, and white-glove onboarding.",
    features: [
      "Unlimited MAU",
      "Custom domains",
      "SSO / SAML",
      "Advanced analytics",
      "99.99% SLA",
      "Dedicated support",
      "Custom contracts",
    ],
  },
];

const features = [
  {
    icon: Shield,
    title: "OAuth2 & OIDC",
    desc: "Industry-standard Authorization Code + PKCE flow. RS256-signed id_tokens. Full OIDC discovery document.",
    color: "#6366f1",
  },
  {
    icon: Lock,
    title: "Universal Login",
    desc: "A hosted, branded login page your users trust. Customise logo, colors, and copy — no code changes needed.",
    color: "#06b6d4",
  },
  {
    icon: Zap,
    title: "SDK in minutes",
    desc: "Drop-in React hooks, vanilla JS client, and server-side Node SDK. Working auth in under 10 minutes.",
    color: "#10b981",
  },
  {
    icon: Users,
    title: "User management",
    desc: "Every user who logs in is tracked, searchable, and manageable from your dashboard.",
    color: "#f59e0b",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Login activity, registration trends, MAU charts — all built in, no third-party tracking required.",
    color: "#8b5cf6",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    desc: "Get notified on every login, registration, and logout. Build event-driven workflows instantly.",
    color: "#f43f5e",
  },
  {
    icon: Key,
    title: "API keys",
    desc: "Machine-to-machine authentication with scoped API keys, rate limiting, and audit trails.",
    color: "#06b6d4",
  },
  {
    icon: Code2,
    title: "MFA / TOTP",
    desc: "Two-factor authentication with TOTP authenticator apps. One line to enable per application.",
    color: "#10b981",
  },
];

const steps = [
  {
    num: "01",
    title: "Create an application",
    desc: "Register your app in the AuthFlow dashboard. Get a client_id and configure your allowed callback URLs.",
  },
  {
    num: "02",
    title: "Install the SDK",
    desc: "One npm install. React, vanilla JS, or server-side Node — pick the SDK that fits your stack.",
  },
  {
    num: "03",
    title: "Add login to your app",
    desc: "Call loginWithRedirect(). AuthFlow handles the rest — Universal Login, tokens, sessions, everything.",
  },
  {
    num: "04",
    title: "Ship with confidence",
    desc: "Your users are authenticated. Monitor logins, manage users, and scale without auth complexity.",
  },
];

const sdkPackages = [
  {
    pkg: "@meet_patel_03/authflow-js",
    desc: "Vanilla JS / TypeScript — for any SPA",
  },
  {
    pkg: "@meet_patel_03/authflow-react",
    desc: "React hooks + Provider — drop-in",
  },
  {
    pkg: "@meet_patel_03/authflow-node",
    desc: "Next.js / Express — server-side",
  },
];

const HomePage = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? "bg-[rgba(6,8,18,0.85)] backdrop-blur-lg border-b border-[var(--border)]" : "bg-transparent border-b border-transparent"}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
            <Shield
              size={18}
              color="white"
            />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Auth<span className="text-primary-500">Flow</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {[
            ["Features", "#features"],
            ["How it works", "#how-it-works"],
            ["Pricing", "#pricing"],
            ["Developers", "#sdk"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-hover)] text-[var(--text-primary)] hover:border-primary-500 hover:text-primary-500 transition-all">
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-8 pt-32 pb-16 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-grid-pattern bg-grid pointer-events-none"
          style={{
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
          }}
        />
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[30%] left-[20%] w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[20%] right-[15%] w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(6,182,212,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-300 bg-primary-100 text-[#a5b4fc] text-xs font-medium mb-8">
          <Star
            size={12}
            fill="currentColor"
          />
          Authentication infrastructure for developers
        </div>

        <h1 className="animate-slide-up text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.05] max-w-3xl mb-6">
          Auth that just{" "}
          <span className="bg-gradient-to-r from-primary-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
            works.
          </span>
        </h1>

        <p className="animate-slide-up text-lg md:text-xl text-[var(--text-secondary)] max-w-xl leading-relaxed mb-12">
          AuthFlow gives your app production-ready OAuth2, OIDC, and Universal
          Login in minutes — not weeks. Open source. Self-hostable. No lock-in.
        </p>

        <div className="animate-slide-up flex flex-wrap gap-4 justify-center mb-20">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-base shadow-glow hover:shadow-glow-lg hover:-translate-y-px transition-all">
            Start for free <ArrowRight size={16} />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border-hover)] text-[var(--text-primary)] font-medium hover:border-primary-500 transition-all">
            <Globe size={16} /> See how it works
          </a>
        </div>

        <div className="animate-slide-up flex flex-wrap gap-16 justify-center">
          {[
            { val: 99.9, suffix: "% uptime", label: "SLA guarantee" },
            { val: 10, suffix: "min", label: "To first login" },
            { val: 100, suffix: "% open source", label: "No lock-in" },
          ].map((s, i) => (
            <div
              key={i}
              className="text-center">
              <div className="text-3xl font-extrabold tracking-tight">
                <Counter
                  end={s.val}
                  suffix={s.suffix}
                />
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 px-8 max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary-500 text-xs font-semibold tracking-[0.1em] uppercase mb-3">
            Everything you need
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Auth infrastructure, fully assembled
          </h2>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            Stop building auth from scratch. AuthFlow ships with every feature a
            production app needs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] rounded-2xl overflow-hidden border border-[var(--border)]">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-8 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18` }}>
                  <Icon
                    size={20}
                    color={f.color}
                  />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-24 px-8 bg-[var(--bg-surface)]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary-500 text-xs font-semibold tracking-[0.1em] uppercase mb-3">
              Simple by design
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Go from zero to authenticated in 4 steps
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="text-5xl font-black tracking-tight leading-none mb-4 text-primary-100 select-none">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-3">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK */}
      <section
        id="sdk"
        className="py-24 px-8 max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-primary-500 text-xs font-semibold tracking-[0.1em] uppercase mb-3">
              Developer first
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-6">
              Three SDKs.
              <br />
              Every stack covered.
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
              React hooks, vanilla JS browser client, and a server-side Node SDK
              for Next.js and Express. All published to npm. Full TypeScript
              support.
            </p>
            <div className="flex flex-col gap-3 mb-8">
              {sdkPackages.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <div>
                    <code className="text-xs text-primary-500">{p.pkg}</code>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {p.desc}
                    </p>
                  </div>
                  <Terminal
                    size={14}
                    className="text-[var(--text-muted)]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-all">
                Start building <ArrowRight size={14} />
              </Link>
              <a
                href="https://github.com/Meet-Patel-12/authflow"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border-hover)] text-[var(--text-secondary)] text-sm font-medium hover:border-primary-500 hover:text-[var(--text-primary)] transition-all">
                <Github size={14} /> View on GitHub
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[#0d1117]">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span className="text-xs text-[var(--text-muted)] ml-2 font-mono">
                App.tsx
              </span>
            </div>
            <pre className="p-6 text-xs leading-relaxed overflow-x-auto m-0 text-slate-200 font-mono whitespace-pre">
              {`<AuthFlowProvider config={{
  domain: "https://your.authflow.app",
  clientId: "af_your_client_id",
  redirectUri: window.location.origin,
}}>
  <App />
</AuthFlowProvider>

// In any component:
const { user, loginWithRedirect } = useAuthFlow();

if (!user) {
  return (
    <button onClick={loginWithRedirect}>
      Sign in
    </button>
  );
}

return <h1>Hello, {"{user.name}"}</h1>;`}
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="py-24 px-8 bg-[var(--bg-surface)]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary-500 text-xs font-semibold tracking-[0.1em] uppercase mb-3">
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Start free. Scale as you grow.
            </h2>
            <p className="text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              No credit card required to get started. Upgrade when you need
              more.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 ${p.highlight ? "border border-primary-500 shadow-glow-lg" : "border border-[var(--border)] bg-[var(--bg-elevated)]"}`}
                style={
                  p.highlight
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))",
                      }
                    : {}
                }>
                {p.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary-500 text-white text-xs font-semibold whitespace-nowrap">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    {p.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {p.price}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {p.period}
                    </span>
                  </div>
                </div>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-lg text-sm font-semibold mb-6 transition-all ${p.highlight ? "bg-primary-500 text-white hover:bg-primary-600" : "border border-[var(--border-hover)] text-[var(--text-primary)] hover:border-primary-500"}`}>
                  {p.price === "Custom" ? "Contact us" : "Get started"}
                </Link>
                <div className="flex flex-col gap-3">
                  {p.features.map((f, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-2.5">
                      <CheckCircle2
                        size={15}
                        color={p.highlight ? "#6366f1" : "#10b981"}
                        className="shrink-0"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8">
        <div
          className="max-w-2xl mx-auto text-center relative px-12 py-16 rounded-3xl border border-primary-300 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
          }}>
          <div
            className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[500px] h-72 pointer-events-none rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(99,102,241,0.12), transparent 70%)",
            }}
          />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Ready to ship auth today?
          </h2>
          <p className="text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto mb-8">
            Join developers who ship faster because they let AuthFlow handle
            authentication.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-500 text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-px transition-all">
              Create free account <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border-hover)] text-[var(--text-primary)] font-medium hover:border-primary-500 transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-8 bg-[var(--bg-surface)]">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-wrap justify-between gap-8 mb-12">
            <div className="max-w-[280px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                  <Shield
                    size={15}
                    color="white"
                  />
                </div>
                <span className="font-bold tracking-tight">
                  Auth<span className="text-primary-500">Flow</span>
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Authentication infrastructure for developers. OAuth2, OIDC, and
                Universal Login in minutes.
              </p>
            </div>
            <div className="flex gap-16 flex-wrap">
              {[
                {
                  title: "Product",
                  links: [
                    { label: "Features", href: "#features" },
                    { label: "Pricing", href: "#pricing" },
                    { label: "How it works", href: "#how-it-works" },
                  ],
                },
                {
                  title: "Developers",
                  links: [
                    { label: "Get started", href: "/register" },
                    { label: "Sign in", href: "/login" },
                    {
                      label: "GitHub",
                      href: "https://github.com/Meet-Patel-12/authflow",
                    },
                  ],
                },
              ].map((col, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-4 tracking-wide">
                    {col.title}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {col.links.map((l, j) => (
                      <a
                        key={j}
                        href={l.href}
                        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors no-underline">
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-[var(--border)] flex flex-wrap justify-between items-center gap-4">
            <p className="text-xs text-[var(--text-muted)]">
              © {new Date().getFullYear()} AuthFlow. Built for developers.
            </p>
            <a
              href="https://github.com/Meet-Patel-12/authflow"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <Github size={18} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
