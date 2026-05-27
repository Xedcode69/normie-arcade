import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#090712",
        panel: "#11101c",
        cyanGlow: "#25f4ee",
        magentaGlow: "#f846d8",
        acid: "#d6ff38",
        amberChip: "#ffb84d"
      },
      boxShadow: {
        neon: "0 0 24px rgba(37,244,238,.35)",
        magenta: "0 0 24px rgba(248,70,216,.35)"
      },
      fontFamily: {
        display: ["Orbitron", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
