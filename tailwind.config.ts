import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#0e1116",
          900: "#151a22",
          850: "#1a202a",
          800: "#222a36"
        },
        accent: {
          400: "#5eead4",
          500: "#14b8a6",
          600: "#0d9488"
        }
      },
      boxShadow: {
        popover: "0 18px 60px rgba(0, 0, 0, 0.36)"
      }
    }
  },
  plugins: []
} satisfies Config;
