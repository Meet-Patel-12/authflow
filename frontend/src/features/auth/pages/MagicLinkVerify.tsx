import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch } from "../../../app/hooks";
import api from "../../../app/apiClient";
import { getCurrentUser } from "../authSlice";

const MagicLinkVerify = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleMagicLink = async () => {
      const token = searchParams.get("token");

      if (!token) {
        toast.error("Invalid magic link. Please request a new one.");
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await api.post("/auth/magic-link/verify", { token });
        const data = response.data;

        if (!data.success) {
          toast.error(
            data.message || "Magic link expired. Please request a new one.",
          );
          navigate("/login", { replace: true });
          return;
        }

        const { accessToken, refreshToken } = data.data;
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

        const result = await dispatch(getCurrentUser()).unwrap();
        if (result.organization?.id) {
          localStorage.setItem("organizationId", result.organization.id);
        }

        toast.success("Welcome! You're now signed in.");
        navigate("/dashboard", { replace: true });
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        toast.error("Something went wrong. Please request a new magic link.");
        navigate("/login", { replace: true });
      }
    };

    handleMagicLink();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(99,102,241,0.10), transparent)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 text-center animate-fade-in">
        {/* Icon */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 animate-glow"
          style={{
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            boxShadow: "0 0 40px rgba(99,102,241,0.45)",
          }}>
          <Mail className="w-8 h-8 text-white" />
        </div>

        {/* Spinner ring */}
        <div className="flex justify-center mb-5">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "rgba(99,102,241,0.3)",
              borderTopColor: "var(--accent)",
            }}
          />
        </div>

        {/* Text */}
        <p
          className="text-base font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}>
          Verifying your magic link…
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)" }}>
          Please wait, this only takes a moment
        </p>

        {/* Subtle progress dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background: "var(--accent)",
                opacity: 0.6,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MagicLinkVerify;
