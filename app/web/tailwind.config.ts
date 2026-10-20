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
          accent: "#10b981",
          canvas: "#f8fafc",
          surface: "#ffffff",
          subtle: "#f1f5f9",
          border: "#e2e8f0",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        'soft-xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'soft-sm': '0 2px 8px -1px rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'soft-md': '0 6px 18px -2px rgba(15, 23, 42, 0.07), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        'soft-lg': '0 12px 28px -4px rgba(15, 23, 42, 0.09), 0 4px 10px -4px rgba(15, 23, 42, 0.03)',
        'soft-xl': '0 20px 38px -6px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.04)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
export default config;
