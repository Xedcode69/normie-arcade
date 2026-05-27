import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#050505",
        panel: "#101010",
        paper: "#f4f1e8",
        ink: "#080808",
        pixel: "#d7d2c6",
        cyanGlow: "#27f6e7",
        magentaGlow: "#ff43cf",
        acid: "#d7ff35",
        amberChip: "#f3efe2"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(244,241,232,.85), 0 0 18px rgba(39,246,231,.28)",
        magenta: "0 0 0 1px rgba(244,241,232,.85), 0 0 18px rgba(255,67,207,.24)"
      },
      fontFamily: {
        display: ["Orbitron", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
