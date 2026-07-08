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
          rail: "#0c0c0e",
        },
        chip: {
          video: { bg: "#f6d3de", text: "#7a2540" },
          audio: { bg: "#cfe6fb", text: "#1f4e78" },
          text: { bg: "#cdeede", text: "#1f5c40" },
          effect: { bg: "#e0d6fb", text: "#4b2f8f" },
          default: { bg: "#dcdce2", text: "#3a3a42" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
