import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        ember: "#e5484d",
        citrus: "#f5a524",
        mint: "#22c55e",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(229,72,77,0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
