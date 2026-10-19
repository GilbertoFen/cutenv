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
        pos: {
          navy: "#14144f",
          dark: "#0d0d33",
          light: "#f8fafc",
          primary: "#4f46e5",
          accent: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
