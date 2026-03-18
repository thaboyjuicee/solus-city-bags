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
        // Mirror the React Native app's color palette
        background: "#0a0a0a",
        surface: "#111111",
        accent: "#9945FF",
        "accent-dim": "#6B2FBF",
        border: "#222222",
        "text-primary": "#FFFFFF",
        "text-secondary": "#AAAAAA",
        "text-dim": "#555555",
        success: "#00C853",
        danger: "#FF3D3D",
        warning: "#FFB300",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
