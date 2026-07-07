import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#151517",
          surface: "#1e1e21",
          "surface-raised": "#26262a",
          border: "#333338",
          text: "#e4e4e7",
          "text-muted": "#8b8b93",
          accent: "#5b8cff",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
