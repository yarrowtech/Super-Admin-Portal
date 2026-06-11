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
        '3xl': '1921px',
      },
      colors: {
        // Brand
        primary: {
          DEFAULT: "#135bec",
          50:  "#eff4ff",
          100: "#dce8fd",
          200: "#c0d5fb",
          300: "#95b8f8",
          400: "#6391f3",
          500: "#3f6dee",
          600: "#135bec",
          700: "#1145c8",
          800: "#1438a3",
          900: "#153281",
          950: "#111f4f",
          hover: "#0f4bcc",
        },
        // Semantic
        success: {
          DEFAULT: "#16a34a",
          light: "#dcfce7",
          dark:  "#14532d",
        },
        warning: {
          DEFAULT: "#d97706",
          light: "#fef9c3",
          dark:  "#78350f",
        },
        danger: {
          DEFAULT: "#dc2626",
          light: "#fee2e2",
          dark:  "#7f1d1d",
        },
        info: {
          DEFAULT: "#0284c7",
          light: "#e0f2fe",
          dark:  "#0c4a6e",
        },
        // Surfaces
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
        display: ["Manrope", "sans-serif"],
        mono:    ["JetBrains Mono", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm:   "0.25rem",
        md:   "0.5rem",
        lg:   "0.75rem",
        xl:   "1rem",
        "2xl":"1.25rem",
        "3xl":"1.5rem",
        full: "9999px",
      },
      spacing: {
        sidebar:      "250px",
        "sidebar-sm": "64px",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.175, 0.885, 0.32, 1.1)",
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "toast-enter": {
          from: { opacity: "0", transform: "translateX(110%)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "toast-exit": {
          from: { opacity: "1", transform: "translateX(0)" },
          to:   { opacity: "0", transform: "translateX(110%)" },
        },
        "counter-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.5" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        "sidebar-collapse": {
          from: { width: "250px" },
          to:   { width: "64px" },
        },
        "sidebar-expand": {
          from: { width: "64px" },
          to:   { width: "250px" },
        },
      },
      animation: {
        "fade-in":        "fade-in 200ms ease-out both",
        "slide-up":       "slide-up 280ms ease-out both",
        "slide-down":     "slide-down 280ms ease-out both",
        "slide-in-right": "slide-in-right 280ms ease-out both",
        "scale-in":       "scale-in 200ms ease-out both",
        "toast-enter":    "toast-enter 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-exit":     "toast-exit 200ms ease-in both",
        "counter-up":     "counter-up 400ms ease-out both",
        "spin-slow":      "spin-slow 2s linear infinite",
        "pulse-soft":     "pulse-soft 2s ease-in-out infinite",
        "shimmer":        "shimmer 1.6s linear infinite",
      },
      boxShadow: {
        "card":       "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)",
        "sidebar":    "4px 0 20px rgba(0,0,0,0.06)",
        "modal":      "0 20px 60px rgba(0,0,0,0.18)",
        "toast":      "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        "inner-soft": "inset 0 1px 3px rgba(0,0,0,0.06)",
      },
      backgroundImage: {
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
        "shimmer-dark":     "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};
