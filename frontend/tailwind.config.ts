import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: {
          950: "#02070d",
          900: "#04101c",
          800: "#071a2c",
          700: "#0b2740",
        },
        glow: {
          400: "#7dd3fc",
          500: "#38bdf8",
          600: "#0ea5e9",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(125, 211, 252, 0.35), 0 0 28px rgba(56, 189, 248, 0.25)",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-14px) translateX(8px)" },
        },
      },
      animation: {
        drift: "drift 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
