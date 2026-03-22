import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { switchToValidOrg } from "../../features/organizations/organizationSlice";
import { toast } from "sonner";

export default function OrganizationSwitcher() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { organizations, currentOrganization } = useAppSelector(
    (s) => s.organizations,
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrganization?.id) {
      setOpen(false);
      return;
    }
    try {
      await dispatch(switchToValidOrg(orgId)).unwrap();
      toast.success("Organization switched");
      setOpen(false);
    } catch {
      toast.error("Failed to switch organization");
    }
  };

  if (!currentOrganization) return null;

  return (
    <div
      className="relative"
      ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
        style={{ color: "var(--text-secondary)" }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
        }
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}>
          {currentOrganization.name?.charAt(0).toUpperCase()}
        </div>
        <span
          className="text-xs font-medium max-w-[140px] truncate hidden sm:block"
          style={{ color: "var(--text-primary)" }}>
          {currentOrganization.name}
        </span>
        {currentOrganization.plan && (
          <span className="badge badge-accent text-[10px] hidden sm:flex">
            {currentOrganization.plan}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-60 rounded-xl overflow-hidden animate-slide-up z-50"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}>
          <div
            className="px-3 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>
              Organizations
            </p>
          </div>
          <div className="p-1.5 max-h-56 overflow-y-auto">
            {organizations.map((org) => {
              const active = org.id === currentOrganization?.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left"
                  style={{
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                  }}
                  onMouseOver={(e) =>
                    !active &&
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.04)")
                  }
                  onMouseOut={(e) =>
                    !active &&
                    (e.currentTarget.style.background = "transparent")
                  }>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{
                      background: active
                        ? "var(--accent)"
                        : "rgba(255,255,255,0.1)",
                    }}>
                    {org.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{
                        color: active ? "var(--accent)" : "var(--text-primary)",
                      }}>
                      {org.name}
                    </p>
                    <p
                      className="text-[10px] capitalize"
                      style={{ color: "var(--text-muted)" }}>
                      {org.role}
                    </p>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div
            className="p-1.5"
            style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => {
                navigate("/organizations");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "transparent")
              }>
              <Plus className="w-3.5 h-3.5" />
              Manage organizations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
