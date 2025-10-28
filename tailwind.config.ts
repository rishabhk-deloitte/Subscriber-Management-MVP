import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5FAEB",
          100: "#E9F4D2",
          200: "#D3E9A5",
          300: "#BBDD73",
          400: "#A6CF5B",
          500: "#86BC25",
          600: "#6EA61B",
          700: "#5E8E16",
          800: "#4C7211",
          900: "#39540C",
          DEFAULT: "#86BC25"
        }
      }
    }
  },
  plugins: []
};

export default config;
