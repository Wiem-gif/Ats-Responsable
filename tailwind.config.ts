import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette volontairement sobre : neutre + un accent unique.
        // Modifie ici plutôt que d'éparpiller des couleurs dans les composants.
        accent: {
          50: "#f2f5ff",
          100: "#e6ebff",
          500: "#4f5eff",
          600: "#3d4be0",
          700: "#2f3ab3",
        },
        status: {
          found: "#16a34a",
          notfound: "#94a3b8",
          uncertain: "#d97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
