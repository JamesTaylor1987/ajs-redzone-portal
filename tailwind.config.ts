import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ajs: {
          primary: "#1886a1",
          dark: "#05618e",
          darker: "#03415f",
          light: "#e6ebed",
          text: "#0f1f2e",
          muted: "#5a7080",
          success: "#16a34a",
          warn: "#d97706",
          danger: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        mono: ["'Courier New'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
