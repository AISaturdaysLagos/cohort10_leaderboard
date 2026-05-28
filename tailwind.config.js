/** @type {import('tailwindcss').Config} */
/** Palette & type from https://aisaturdayslagos.github.io/cohort_structure/cohort10/ */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        tri: {
          /** page chrome, headings, footer */
          forest: "#0a0a0a",
          /** primary accent (orange) */
          leaf: "#e05508",
          /** primary hover */
          mint: "#c94d07",
          /** card / panel fill */
          mist: "#fdf6eb",
          sand: "#ffffff",
          /** body copy */
          ink: "#0a0a0a",
          /** logo “AI” gold */
          gold: "#D4A017",
          /** bright orange (dark UI, dots) */
          orange: "#FE6612",
          /** footer strip */
          night: "#0a0a0a",
          /** elevated surface */
          surface: "#fdf6eb",
          /** cohort10 success green */
          green: "#16a34a",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "-apple-system", "sans-serif"],
        body: ['"Plus Jakarta Sans"', "Inter", "system-ui", "-apple-system", "sans-serif"],
        nav: ['"Plus Jakarta Sans"', "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "tri-hero": ["3.6rem", { lineHeight: "1.02", letterSpacing: "-0.04em" }],
        "tri-section": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "tri-lead": ["1rem", { lineHeight: "1.65" }],
        "tri-nav": ["0.9rem", { lineHeight: "1.5" }],
      },
      borderRadius: {
        tri: "0.4375rem",
      },
      boxShadow: {
        tri: "0 1px 2px rgba(10, 10, 10, 0.08)",
        card: "0 1px 3px rgba(10, 10, 10, 0.06)",
      },
    },
  },
  plugins: [],
};
