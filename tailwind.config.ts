import type { Config } from "tailwindcss";

/**
 * Horology365 — "The Showroom", white & blue edition.
 * One accent across the whole site: electric blue (token still named `gold`
 * for backwards-compat with existing class names — its value is now blue).
 * Minimal, translucent, Apple/Google-style glass surfaces.
 * Display: Sora. Body/UI: Manrope.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Accent (blue). Kept under the `gold` key so all existing
        // text-gold/bg-gold/ring-gold/btn-gold usages recolor at once.
        gold: {
          DEFAULT: "#2563EB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Deep blue-tinted darks for the dark bands.
        ink: {
          DEFAULT: "#0A1326",
          900: "#0A1326",
          800: "#0F1C36",
          700: "#16263F",
          600: "#22344F",
          500: "#33496A",
        },
        // Cool near-white for the light bands.
        bone: {
          DEFAULT: "#F4F7FB",
          100: "#FFFFFF",
          200: "#F4F7FB",
          300: "#E6ECF4",
          400: "#D3DDEA",
        },
      },
      fontFamily: {
        // `serif` token now points at the Sora display face.
        serif: ["var(--font-serif)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.22em",
      },
      boxShadow: {
        product: "0 18px 50px -28px rgba(10, 19, 38, 0.45)",
        "product-hover": "0 30px 70px -30px rgba(10, 19, 38, 0.5)",
        gold: "0 12px 34px -12px rgba(37, 99, 235, 0.5)",
        glass: "0 8px 32px -12px rgba(10, 19, 38, 0.18)",
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

