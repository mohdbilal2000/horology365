import type { Config } from "tailwindcss";

/**
 * Horology365 — "The Showroom", gold & black edition.
 * Palette blends with the brand logo: champagne gold accent, warm near-black
 * dark bands, soft cream light bands. (Accent token kept under the `gold` key.)
 * Display: Sora. Body/UI: Manrope.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  future: {
    // Compile `hover:` to @media (hover: hover). On touch screens a tap
    // otherwise leaves the hover state stuck on (a tapped "Add to bag" stayed
    // filled gold, and cards stayed lifted) until you tapped somewhere else.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // Champagne gold accent (matches the logo).
        gold: {
          DEFAULT: "#C9A24A",
          50: "#FBF6E9",
          100: "#F4E8C5",
          200: "#E9D295",
          300: "#DDBE68",
          400: "#CFA94B",
          500: "#C9A24A",
          600: "#A6822F",
          700: "#826423",
          800: "#5D4819",
          900: "#3B2E10",
        },
        // Warm near-black darks (match the logo's black).
        ink: {
          DEFAULT: "#0D0B08",
          900: "#0D0B08",
          800: "#17140E",
          700: "#221E15",
          600: "#2F2A1E",
          500: "#46402F",
        },
        // Soft warm cream for the light bands.
        bone: {
          DEFAULT: "#F7F3EA",
          100: "#FFFFFF",
          200: "#F7F3EA",
          300: "#EBE3D2",
          400: "#DBD0B8",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.22em",
      },
      boxShadow: {
        product: "0 18px 50px -28px rgba(13, 11, 8, 0.5)",
        "product-hover": "0 30px 70px -30px rgba(13, 11, 8, 0.55)",
        gold: "0 12px 34px -12px rgba(201, 162, 74, 0.5)",
        glass: "0 8px 32px -12px rgba(13, 11, 8, 0.2)",
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

