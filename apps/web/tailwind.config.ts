import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#050816",
        panel: "#0d1327",
        line: "#21314f",
        glow: "#66f5d2",
        ember: "#ff8f5c",
        signal: "#8bb8ff"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.32)"
      },
      animation: {
        pulseLine: "pulseLine 2s ease-in-out infinite",
        rise: "rise 400ms ease-out both"
      },
      keyframes: {
        pulseLine: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" }
        },
        rise: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
