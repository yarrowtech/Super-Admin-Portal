/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        'xs': '481px',
        'tb': '769px',
        'lap': '1025px',
      },
      colors: {
        "primary": "#135bec",
        "primary-hover": "#0f4bcc",
        "background-light": "#f6f6f8",
        "background-dark": "#101622",
        "card-dark": "#151d2d",
        "neutral-100": "#f0f2f4",
        "neutral-200": "#dbdfe6",
        "neutral-600": "#616f89",
        "neutral-800": "#111318",
        "text-light": "#0f172a",
        "text-dark": "#f1f5f9",
        "subtext-light": "#5b6478",
        "subtext-dark": "#94a3b8",
        "success": "#07883b",
        "danger": "#e73908",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "1rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
