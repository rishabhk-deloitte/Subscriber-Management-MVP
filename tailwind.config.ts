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
        brand: {
          DEFAULT: "#86BC25",
          50: "#F5FAEB",
          100: "#E9F4D2",
          200: "#D3E9A5",
          300: "#BBDD73",
          400: "#A6CF5B",
          500: "#86BC25",
          600: "#6EA61B",
          700: "#5E8E16",
          800: "#4C7211",
          900: "#39540C"
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
