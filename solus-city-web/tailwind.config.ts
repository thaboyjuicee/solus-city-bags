import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "solus-black": "#0a0a0a",
        "solus-card": "#141414",
        "solus-border": "#1e1e1e",
        "solus-muted": "#555555",
        "solus-purple": "#9945FF",
        "solus-green": "#14F195",
        "solus-red": "#ef5350",
        "solus-blue": "#42a5f5",
        "solus-orange": "#ff9800",
        "solus-yellow": "#fdd835",
        "solus-cyan": "#26c6da",
        "solus-cash": "#66bb6a",
      },
      fontFamily: {
        game: ["Inter", "system-ui", "sans-serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
