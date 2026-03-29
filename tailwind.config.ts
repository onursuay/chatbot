import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — Mint green accent
        primary: {
          DEFAULT: "#4AEDC4",
          light: "#6FF2D2",
          hover: "#2DBFA0",
          deep: "#0A2E24",    // text on primary buttons
          50: "#E6FBF5",
          100: "#d1faf0",
          200: "#a7f3e1",
          300: "#6ee7cd",
          400: "#4AEDC4",
          500: "#2DBFA0",
          600: "#099575",
          700: "#0b7760",
          800: "#0d5e4d",
          900: "#0f4d41",
          950: "#012d25",
        },
        // Ink — Text colors (dark on light)
        ink: {
          DEFAULT: "#111827",
          secondary: "#6B7280",
          tertiary: "#9CA3AF",
          muted: "#D1D5DB",
          placeholder: "#9CA3AF",
        },
        // Surface — Backgrounds (light theme)
        surface: {
          DEFAULT: "#F7F8FA",     // page bg
          50: "#FAFBFC",
          100: "#F7F8FA",
          150: "#F3F4F6",
          200: "#FFFFFF",         // cards, panels
          250: "#F9FAFB",
          300: "#E5E7EB",         // borders
          350: "#D1D5DB",
          400: "#D1D5DB",
          500: "#9CA3AF",
          600: "#6B7280",
          700: "#4B5563",
          800: "#374151",
        },
        // Sidebar — Dark navy
        sidebar: {
          DEFAULT: "#1A1D2E",
          hover: "#252840",
          active: "#2F3352",
          border: "#2A2D42",
          text: "#A8ABBE",
          "text-active": "#FFFFFF",
        },
        // Accents
        accent: {
          blue: "#3B82F6",
          "blue-hover": "#2563EB",
          "blue-deep": "#1D4ED8",
          yellow: "#F59E0B",
          "yellow-hover": "#D97706",
          red: "#EF4444",
          "red-hover": "#DC2626",
          "red-deep": "#B91C1C",
          violet: "#8B5CF6",
          lavender: "#EDE9FE",
        },
        // Callout backgrounds
        callout: {
          error: "#FEF2F2",
          warning: "#FFFBEB",
          info: "#EFF6FF",
          success: "#E6FBF5",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "'PT Sans'", "system-ui", "sans-serif"],
      },
      fontSize: {
        "page-title": ["1.5rem", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.02em" }],
        "section-title": ["0.9375rem", { lineHeight: "1.35", fontWeight: "600" }],
        "section-label": ["0.6875rem", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.04em" }],
        "body": ["0.875rem", { lineHeight: "1.55", fontWeight: "400" }],
        "body-medium": ["0.875rem", { lineHeight: "1.55", fontWeight: "600" }],
        "ui": ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],
        "ui-medium": ["0.8125rem", { lineHeight: "1.5", fontWeight: "600" }],
        "caption": ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
        "caption-medium": ["0.75rem", { lineHeight: "1.4", fontWeight: "600" }],
        "kpi": ["1.875rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
        "kpi-sm": ["1.375rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
        "micro": ["0.6875rem", { lineHeight: "1.3", fontWeight: "600" }],
      },
      spacing: {
        "card": "16px",
        "card-lg": "20px",
        "btn-h": "36px",
        "btn-h-sm": "30px",
        "chip-h": "26px",
        "row-h": "42px",
        "section-gap": "24px",
        "page-x": "28px",
        "page-y": "24px",
      },
      borderRadius: {
        "card": "12px",
        "card-sm": "8px",
        "btn": "8px",
        "badge": "6px",
        "input": "8px",
        "avatar": "50%",
      },
      boxShadow: {
        "card": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
        "card-active": "0 0 0 2px rgba(74,237,196,0.3)",
        "elevated": "0 4px 6px -2px rgba(0,0,0,0.03), 0 12px 16px -4px rgba(0,0,0,0.08)",
        "nav": "0 1px 2px rgba(0,0,0,0.04)",
        "input-focus": "0 0 0 3px rgba(74,237,196,0.2)",
        "button": "0 1px 2px rgba(0,0,0,0.05)",
        "button-primary": "0 1px 3px rgba(74,237,196,0.3)",
        "dropdown": "0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)",
        "modal": "0 20px 60px -12px rgba(0,0,0,0.15)",
        "sidebar": "2px 0 8px rgba(0,0,0,0.1)",
      },
      keyframes: {
        "card-enter": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "popup-scale": { "0%": { transform: "scale(0.96)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        "ai-glow": { "0%, 100%": { boxShadow: "0 0 0 0 rgba(74,237,196,0)" }, "50%": { boxShadow: "0 0 12px 2px rgba(74,237,196,0.15)" } },
      },
      animation: {
        "card-enter": "card-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
        "popup-scale": "popup-scale 0.2s cubic-bezier(0.22,1,0.36,1) forwards",
        "fade-in": "fade-in 0.25s ease forwards",
        "slide-up": "slide-up 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "ai-glow": "ai-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
