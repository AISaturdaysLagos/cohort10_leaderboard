import { LOGO_TAGLINE } from "../lib/triAiBrand";

type TriAiLogoProps = {
  /** SVG height in px (width scales from viewBox). */
  height?: number;
  className?: string;
  /** Show “Teaching · Research · Innovation” like cohort10 header. */
  showTagline?: boolean;
};

/** Wordmark from https://aisaturdayslagos.github.io/cohort_structure/cohort10/ */
export function TriAiLogo({ height = 40, className = "", showTagline = false }: TriAiLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <svg
        viewBox="0 0 200 88"
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="triAI"
        className="block shrink-0"
        role="img"
      >
        <text
          x="100"
          y="52"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif"
          fontSize="52"
        >
          <tspan fontWeight="500" letterSpacing="2" style={{ fill: "var(--logo-tri-fill)" }}>
            tri
          </tspan>
          <tspan fontWeight="800" letterSpacing="3" fill="#D4A017">
            AI
          </tspan>
        </text>
        <circle cx="86" cy="74" r="4" fill="#FE6612" />
        <circle cx="100" cy="74" r="4" fill="#4A7CC9" />
        <circle cx="114" cy="74" r="4" fill="#2ECDB8" />
      </svg>
      {showTagline && (
        <span className="hidden font-sans text-[0.8rem] font-medium leading-snug sm:inline" style={{ color: "var(--logo-sub-c)" }}>
          {LOGO_TAGLINE}
        </span>
      )}
    </span>
  );
}
