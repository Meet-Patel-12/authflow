import { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  onComplete?: () => void;
}

/**
 * Individual-box OTP input.
 * Declared at module level — never inside a render function.
 */
export const OtpInput = ({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  onComplete,
}: OtpInputProps) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = digit;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (digit && i < length - 1) focus(i + 1);
    if (next.length === length) onComplete?.();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (value[i]) {
        const arr = value.split("");
        arr[i] = "";
        onChange(arr.join(""));
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      focus(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted);
    const nextFocus = Math.min(pasted.length, length - 1);
    focus(nextFocus);
    if (pasted.length === length) onComplete?.();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const current = i === value.length && value.length < length;
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ""}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className="text-center text-lg font-bold font-mono rounded-xl outline-none transition-all"
            style={{
              width: 44,
              height: 52,
              background: filled
                ? "rgba(99,102,241,0.12)"
                : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${
                current
                  ? "var(--accent)"
                  : filled
                    ? "rgba(99,102,241,0.4)"
                    : "var(--border)"
              }`,
              color: "var(--text-primary)",
              boxShadow: current ? "0 0 0 3px var(--accent-dim)" : "none",
              caretColor: "var(--accent)",
            }}
          />
        );
      })}
    </div>
  );
};
