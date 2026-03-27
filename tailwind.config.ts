import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // YoAi tasarim dili — koyu tema, yesil/turkuaz vurgular
        brand: {
          50: "#edfff8",
          100: "#d5ffed",
          200: "#aeffdc",
          300: "#70ffc3",
          400: "#2bfda2",
          500: "#00e683",
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
    },
  },
  plugins: [],
}

export default config
