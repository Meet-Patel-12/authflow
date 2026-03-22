import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ─── Role option type ─── */
interface DropOption {
  value: string;
  label: string;
  desc: string;
}

/* ─── DropItem — module level ─── */
export const DropItem = ({
  label,
  desc,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-3 py-2.5 transition-colors"
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
    <span className="text-sm font-medium block">{label}</span>
    <span
      className="text-xs block mt-0.5"
      style={{
        color: active ? "var(--accent)" : "var(--text-muted)",
        opacity: 0.85,
      }}>
      {desc}
    </span>
  </button>
);

/* ── DarkDropdown at module level ── */
export const DarkDropdown = ({
  value,
  onChange,
  options,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropOption[];
  compact?: boolean;
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
      className="relative"
      style={{ width: compact ? 110 : "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-dark w-full flex items-center justify-between gap-2 cursor-pointer text-left"
        style={{
          background: "rgba(255,255,255,0.04)",
          fontSize: compact ? "0.75rem" : "0.875rem",
          paddingTop: compact ? "0.375rem" : undefined,
          paddingBottom: compact ? "0.375rem" : undefined,
        }}>
        <span style={{ color: "var(--text-primary)" }}>
          {selected?.label ?? "Select…"}
        </span>
        <ChevronDown
          style={{
            width: compact ? 12 : 14,
            height: compact ? 12 : 14,
            color: "var(--text-muted)",
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl overflow-hidden animate-slide-up"
          style={{
            left: compact ? "auto" : 0,
            right: compact ? 0 : "auto",
            minWidth: compact ? 180 : "100%",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
          }}>
          {options.map((opt) => (
            <DropItem
              key={opt.value}
              label={opt.label}
              desc={opt.desc}
              active={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
