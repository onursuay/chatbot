import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // YoChat Primary — Kommo-inspired muted professional green
        primary: {
          DEFAULT: "#2BB673",
          light: "#34c97f",
          hover: "#25a366",
          50: "#edfff8",
          100: "#d5ffed",
          200: "#aeffdc",
          300: "#70ffc3",
          400: "#2bfda2",
          500: "#2BB673",
          600: "#25a366",
          700: "#009656",
          800: "#067547",
          900: "#07603c",
          950: "#003720",
        },
        // Brand alias
        brand: {
          50: "#edfff8", 100: "#d5ffed", 200: "#aeffdc", 300: "#70ffc3",
          400: "#2BB673", 500: "#2BB673", 600: "#00c06a", 700: "#009656",
          800: "#067547", 900: "#07603c", 950: "#003720",
        },
        // Kommo-inspired neutral palette (warmer than pure gray)
        ink: {
          DEFAULT: "#363b44",  // onyx — primary text
          secondary: "#6b6d72", // dark-silver
          tertiary: "#92989b",  // spanish-gray
          muted: "#aaaaaa",     // dark-gray
          placeholder: "#b5b5b5", // philippine-silver
        },
        surface: {
          DEFAULT: "#f5f5f5",   // cultured — page bg
          50: "#fcfcfc",        // lotion
          100: "#f5f5f5",       // cultured
          150: "#f1f1f1",       // white-smoke
          200: "#ededed",       // bright-gray
          250: "#e8eaeb",       // platinum-mist
          300: "#e3e3e3",       // platinum — primary border
          350: "#dfdfdf",       // light-grey
          400: "#cdcdcd",       // very-light-gray
          500: "#c5c5c5",       // silver-sand — border default
          600: "#b5b5b5",       // philippine-silver
          700: "#aaaaaa",       // dark-gray
          800: "#92989b",       // spanish-gray
        },
        // Semantic accents (Kommo-inspired)
        accent: {
          blue: "#4c8bf7",       // blueberry — active elements
          "blue-hover": "#4d85e6", // azure-blue
          "blue-border": "#4077d6", // cerulean-blue
          "blue-deep": "#0057a9",  // cobalt-blue — links
          yellow: "#e5b023",     // mustard-yellow — success/attention
          "yellow-hover": "#d2a01a", // goldenrod
          red: "#f37575",        // froly — error
          "red-hover": "#e67d7d", // deep-blush
          "red-deep": "#c55f62",  // indian-red
          violet: "#a294da",     // dreams-violet
          lavender: "#e5eeff",   // hover surface tint
        },
        // Callout backgrounds (Kommo)
        callout: {
          error: "#fde1e1",      // misty-rose
          warning: "#fef7ec",    // orange-white
          info: "#e5eeff",       // zumthor
          success: "#edf7f1",    // panache
        },
        // Dark theme (Kommo alternative)
        dark: {
          50: "#f6f6f9", 100: "#ececf2", 200: "#d5d5e2", 300: "#b1b1c9",
          400: "#8686ab", 500: "#676792", 600: "#525178", 700: "#434263",
          800: "#3a3953", 900: "#1a1a2e", 950: "#0f0f1a",
        },
      },
      fontFamily: {
        sans: ["'PT Sans'", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Kommo-inspired scale (base 15px)
        "page-title": ["1.4rem", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.01em" }],
        "section-title": ["0.9375rem", { lineHeight: "1.35", fontWeight: "700" }],
        "section-label": ["0.6875rem", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "0.05em" }],
        "body": ["0.9375rem", { lineHeight: "1.55", fontWeight: "400" }],
        "body-medium": ["0.9375rem", { lineHeight: "1.55", fontWeight: "700" }],
        "ui": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "ui-medium": ["0.875rem", { lineHeight: "1.5", fontWeight: "700" }],
        "caption": ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }],
        "caption-medium": ["0.8125rem", { lineHeight: "1.4", fontWeight: "700" }],
        "kpi": ["1.875rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
        "kpi-sm": ["1.375rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
        "micro": ["0.75rem", { lineHeight: "1.3", fontWeight: "700" }],
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
        // Kommo uses very tight radius (4px default)
        "card": "6px",
        "card-sm": "4px",
        "btn": "4px",
        "badge": "4px",
        "input": "4px",
        "avatar": "50%",
      },
      boxShadow: {
        // Kommo-style minimal shadows
        "card": "0 2px 1px 0 rgba(0,0,0,0.04)",
        "card-hover": "0 4px 8px -2px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
        "card-active": "0 0 0 2px rgba(43,182,115,0.2)",
        "elevated": "0 4px 6px -2px rgba(16,24,40,0.03), 0 12px 16px -4px rgba(16,24,40,0.08)",
        "accordion": "0 1px 6px 2px rgba(0,19,45,0.06)",
        "nav": "0 1px 2px rgba(0,0,0,0.04)",
        "input-focus": "0 0 0 2px rgba(43,182,115,0.15)",
        "button": "none",
        "button-primary": "none",
        "dropdown": "0 4px 6px -2px rgba(16,24,40,0.03), 0 12px 16px -4px rgba(16,24,40,0.08)",
      },
      keyframes: {
        "card-enter": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "border-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "risk-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(243,117,117,0)" },
          "50%": { boxShadow: "0 0 16px 3px rgba(243,117,117,0.2)" },
        },
        "ai-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(43,182,115,0)" },
          "50%": { boxShadow: "0 0 12px 2px rgba(43,182,115,0.12)" },
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
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "70%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-particle": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-20px) translateX(10px)" },
          "50%": { transform: "translateY(-10px) translateX(-10px)" },
          "75%": { transform: "translateY(-30px) translateX(5px)" },
        },
        "popup-scale": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "card-enter": "card-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
        "border-glow": "border-glow 3s ease infinite",
        "risk-pulse": "risk-pulse 2s ease-in-out infinite",
        "ai-glow": "ai-glow 3s ease-in-out infinite",
        "scan-sweep": "scan-sweep 2s ease-in-out infinite",
        "light-sweep": "light-sweep 3s ease-in-out",
        "shimmer-sweep": "shimmer-sweep 1.4s infinite",
        "stat-pop": "stat-pop 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
        "float-particle": "float-particle 6s ease-in-out infinite",
        "popup-scale": "popup-scale 0.2s cubic-bezier(0.22,1,0.36,1) forwards",
        "glow-spin": "glow-spin 3s linear infinite",
        "fade-in": "fade-in 0.25s ease forwards",
        "slide-up": "slide-up 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
