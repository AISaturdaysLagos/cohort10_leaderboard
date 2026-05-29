/** @type {import('tailwindcss').Config} */
/** Theme tokens from https://aisaturdayslagos.github.io/cohort_structure/cohort10/ */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        tri: {
          sand: "var(--bg)",
          surface: "var(--bg-1)",
          mist: "var(--bg-2)",
          panel: "var(--bg-3)",
          ink: "var(--text)",
          muted: "var(--text-2)",
          faint: "var(--hero-crumb)",
          leaf: "var(--orange)",
          mint: "var(--orange)",
          orange: "var(--orange)",
          forest: "var(--text)",
          gold: "#D4A017",
          green: "var(--green)",
          chrome: "var(--chrome-bg)",
          border: "var(--border)",
          "border-md": "var(--border-md)",
          night: "var(--chrome-bg)",
          "nav-link": "var(--nav-link)",
          "nav-hover": "var(--nav-hover-bg)",
          "footer-text": "var(--footer-text)",
          "input-bg": "var(--input-bg)",
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
