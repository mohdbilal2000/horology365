import type { Config } from "tailwindcss";

/**
 * Horology365 — "The Showroom" design tokens.
 * One accent across the whole site: champagne gold.
 * Display serif headlines + clean grotesk sans for body/UI.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C8A55B",
          50: "#FBF7EE",
          100: "#F4EAD0",
          200: "#E7D3A2",
          300: "#D9BC73",
          400: "#C8A55B",
          500: "#B58E3F",
          600: "#947232",
          700: "#6F5526",
          800: "#4A391A",
          900: "#261D0D",
        },
        ink: {
          DEFAULT: "#0B0B0D",
          900: "#0B0B0D",
          800: "#141417",
          700: "#1C1C21",
          600: "#26262C",
          500: "#3A3A42",
        },
        bone: {
          DEFAULT: "#F7F5F0",
          100: "#FFFFFF",
          200: "#F7F5F0",
          300: "#EDE9E0",
          400: "#E2DCCF",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.22em",
      },
      boxShadow: {
        product: "0 18px 40px -22px rgba(11, 11, 13, 0.45)",
        "product-hover": "0 28px 60px -24px rgba(11, 11, 13, 0.55)",
        gold: "0 10px 30px -12px rgba(200, 165, 91, 0.55)",
      },
      maxWidth: {
        shell: "1440px",
      },
      transitionTimingFunction: {
        showroom: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 30s linear infinite",
        "fade-in": "fade-in 0.4s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
