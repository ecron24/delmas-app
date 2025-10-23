import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette Delmas Piscine
        primary: {
          DEFAULT: '#0E2C54', // Bleu foncé principal
          light: '#1a3d6f',
          dark: '#0a1f3d',
        },
        secondary: {
          DEFAULT: '#2599FB', // Bleu clair boutons
          light: '#4daeff',
          dark: '#1a7ad8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
