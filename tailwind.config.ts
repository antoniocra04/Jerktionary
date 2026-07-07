import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "rgb(var(--bg-primary) / <alpha-value>)",
          900: "rgb(var(--bg-secondary) / <alpha-value>)",
          850: "rgb(var(--bg-tertiary) / <alpha-value>)",
          800: "rgb(var(--bg-quaternary) / <alpha-value>)"
        },
        ink: {
          900: "rgb(var(--ink-primary) / <alpha-value>)",
          700: "rgb(var(--ink-secondary) / <alpha-value>)",
          600: "rgb(var(--ink-muted) / <alpha-value>)",
          500: "rgb(var(--ink-tertiary) / <alpha-value>)",
          400: "rgb(var(--ink-hint) / <alpha-value>)",
          300: "rgb(var(--ink-disabled) / <alpha-value>)"
        },
        line: "rgb(var(--line) / <alpha-value>)",
        accent: {
          300: "rgb(var(--accent-subtle) / <alpha-value>)",
          400: "rgb(var(--accent-hover) / <alpha-value>)",
          500: "rgb(var(--accent) / <alpha-value>)",
          600: "rgb(var(--accent-deep) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ["Corbel", "Seravek", "'Segoe UI'", "system-ui", "sans-serif"],
        display: ["Constantia", "Georgia", "Cambria", "'Times New Roman'", "serif"]
      },
      boxShadow: {
        popover: "var(--shadow-popover)"
      }
    }
  },
  plugins: []
} satisfies Config;
