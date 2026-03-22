/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        primary: {
          50: "rgba(99,102,241,0.05)",
          100: "rgba(99,102,241,0.1)",
          200: "rgba(99,102,241,0.2)",
          300: "rgba(99,102,241,0.3)",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
        "slide-up": "slideUp 0.35s ease",
        "spin-slow": "spin 20s linear infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
        gradient: "gradient-shift 6s ease infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "gradient-shift": { "0%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" }, "100%": { backgroundPosition: "0% 50%" } },
      },
      boxShadow: {
        glow: "0 0 20px rgba(99,102,241,0.3)",
        "glow-lg": "0 0 40px rgba(99,102,241,0.3)",
        "glow-success": "0 0 20px rgba(16,185,129,0.3)",
        "glow-danger": "0 0 20px rgba(244,63,94,0.3)",
      },
    },
  },
  plugins: [],
};