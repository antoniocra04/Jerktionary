import type { Config } from "tailwindcss";

// Editorial "paper & ink" light theme: warm cream surfaces, near-black ink text,
// terracotta accent, serif display type. Deliberately not the dark-purple-gradient
// look of typical AI apps.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#f2ede3",
          900: "#fbf9f4",
          850: "#f5f0e6",
          800: "#ece5d6"
        },
        ink: {
          900: "#292218",
          700: "#4e4536",
          600: "#5f5546",
          500: "#7d7260",
          400: "#a59a88",
          300: "#c7bda9"
        },
        line: "#e0d7c4",
        accent: {
          300: "#8f4b1e",
          400: "#a34f1f",
          500: "#b65a24",
          600: "#8f4318"
        }
      },
      fontFamily: {
        sans: ["Corbel", "Seravek", "'Segoe UI'", "system-ui", "sans-serif"],
        display: ["Constantia", "Georgia", "Cambria", "'Times New Roman'", "serif"]
      },
      boxShadow: {
        popover: "0 16px 44px rgba(88, 66, 38, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
