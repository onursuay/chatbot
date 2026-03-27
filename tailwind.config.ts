import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2BB673",
          light: "#2FBF9B",
          50: "#edfff8",
          100: "#d5ffed",
          200: "#aeffdc",
          300: "#70ffc3",
          400: "#2bfda2",
          500: "#2BB673",
          600: "#00c06a",
          700: "#009656",
          800: "#067547",
          900: "#07603c",
          950: "#003720",
        },
        // Eski brand aliasi (geriye uyumluluk)
        brand: {
          50: "#edfff8",
          100: "#d5ffed",
          200: "#aeffdc",
          300: "#70ffc3",
          400: "#2BB673",
          500: "#2BB673",
          600: "#00c06a",
          700: "#009656",
          800: "#067547",
          900: "#07603c",
          950: "#003720",
        },
        dark: {
          50: "#f6f6f9",
          100: "#ececf2",
          200: "#d5d5e2",
          300: "#b1b1c9",
          400: "#8686ab",
          500: "#676792",
          600: "#525178",
          700: "#434263",
          800: "#3a3953",
          900: "#1a1a2e",
          950: "#0f0f1a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "page-title": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        "section-title": ["0.875rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "ui": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "caption": ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
        "kpi": ["1.4rem", { lineHeight: "1.2", fontWeight: "700" }],
      },
      spacing: {
        "card": "14px",
        "btn-h": "30px",
        "btn-h-sm": "26px",
        "chip-h": "26px",
        "row-h": "34px",
      },
      borderRadius: {
        "card": "12px",
      },
      keyframes: {
        "card-enter": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "border-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "risk-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(239,68,68,0.3)" },
        },
        "ai-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(139,92,246,0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(139,92,246,0.3)" },
        },
        "scan-sweep": {
          "0%, 100%": { transform: "translateY(-100%)" },
          "50%": { transform: "translateY(100%)" },
        },
        "light-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "shimmer-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "stat-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "70%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-particle": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-20px) translateX(10px)" },
          "50%": { transform: "translateY(-10px) translateX(-10px)" },
          "75%": { transform: "translateY(-30px) translateX(5px)" },
        },
        "popup-scale": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "card-enter": "card-enter 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
        "border-glow": "border-glow 3s ease infinite",
        "risk-pulse": "risk-pulse 2s ease-in-out infinite",
        "ai-glow": "ai-glow 2.5s ease-in-out infinite",
        "scan-sweep": "scan-sweep 2s ease-in-out infinite",
        "light-sweep": "light-sweep 3s ease-in-out",
        "shimmer-sweep": "shimmer-sweep 1.4s infinite",
        "stat-pop": "stat-pop 0.4s forwards",
        "float-particle": "float-particle 6s ease-in-out infinite",
        "popup-scale": "popup-scale 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
        "glow-spin": "glow-spin 3s linear infinite",
      },
    },
  },
  plugins: [],
}

export default config
