import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          500: "#10b981",
          600: "#059669"
        },
        slate: {
          700: "#334155",
          800: "#1e293b"
        },
        brand: {
          DEFAULT: "#10b981",
          500: "#10b981",
          600: "#059669"
        }
      },
      fontSize: {
        sm: ["0.8125rem", "1.4"],
        base: ["0.9375rem", "1.6"],
        lg: ["1.0625rem", "1.6"],
        xl: ["1.25rem", "1.4"],
        "2xl": ["1.5rem", "1.3"],
        "3xl": ["1.75rem", "1.2"]
      }
    }
  },
  plugins: []
};

export default config;
