import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0d14",
        panel: "#111826",
        panelSoft: "#151d2d",
        line: "#25314a",
        text: "#e8eefc",
        muted: "#97a3bd",
        ok: "#1ec28b",
        warn: "#f4b640",
        bad: "#f36c6c",
        info: "#67a7ff",
      },
      boxShadow: {
        panel: "0 20px 40px rgba(0,0,0,0.28)",
      },
      backgroundImage: {
        halo:
          "radial-gradient(circle at top left, rgba(103,167,255,0.18), transparent 28%), radial-gradient(circle at top right, rgba(30,194,139,0.12), transparent 22%)",
      },
    },
  },
  plugins: [],
};

export default config;
