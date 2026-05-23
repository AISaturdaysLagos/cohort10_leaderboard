/** @type {import('tailwindcss').Config} */
/** Palette & type from https://tri-ai.org (Mobirise theme — assets/mobirise/css/mbr-additional.css) */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        tri: {
          /** headings, hero, dark UI */
          forest: "#2b282c",
          /** primary “text-primary” / buttons */
          leaf: "#dba738",
          /** primary hover */
          mint: "#be8c22",
          /** card / subtle fills (contacts card-wrapper) */
          mist: "#fafafa",
          sand: "#ffffff",
          /** body copy */
          ink: "#232323",
          /** same as primary — badge accents */
          gold: "#dba738",
          /** Bootstrap “success” on tri-ai template */
          teal: "#40b0bf",
          /** footer strip .cid-s48P1Icc8J */
          night: "#232323",
        },
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
        display: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
        body: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
        nav: ["Arial Narrow", "system-ui", "sans-serif"],
      },
      fontSize: {
        /** Mobirise .display-1 */
        "tri-hero": ["3.5rem", { lineHeight: "1.1" }],
        /** .display-2 */
        "tri-section": ["2.5rem", { lineHeight: "1.1" }],
        /** .display-7 */
        "tri-lead": ["1.2rem", { lineHeight: "1.5" }],
        /** .display-4 — nav */
        "tri-nav": ["1.1rem", { lineHeight: "1.5" }],
      },
      boxShadow: {
        /** Mobirise .btn primary */
        tri: "0 2px 2px 0 rgba(0, 0, 0, 0.2)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
