import { TriAiLogo } from "./TriAiLogo";
import {
  AISATURDAYS_GITHUB_URL,
  COHORT10_URL,
  TRI_AI_GITHUB_ORG_URL,
  TRI_AI_HELLO_EMAIL,
  TRI_AI_LINKEDIN_URL,
  TRI_AI_ORG_URL,
  TRI_AI_X_URL,
  TRI_AI_YOUTUBE_URL,
} from "../lib/triAiBrand";

const programmeLinks = [
  { label: "Curriculum", href: `${COHORT10_URL}#curriculum` },
  { label: "Capstone Project", href: `${COHORT10_URL}#capstone` },
  { label: "Challenges & Labs", href: `${COHORT10_URL}#challenges` },
  { label: "Certificate", href: `${COHORT10_URL}#cert` },
] as const;

const communityLinks = [
  { label: "GitHub", href: AISATURDAYS_GITHUB_URL },
  { label: "YouTube", href: TRI_AI_YOUTUBE_URL },
  { label: "LinkedIn", href: TRI_AI_LINKEDIN_URL },
  { label: "X / Twitter", href: TRI_AI_X_URL },
] as const;

const triAiLinks = [
  { label: "tri-ai.org", href: TRI_AI_ORG_URL },
  { label: "GitHub org", href: TRI_AI_GITHUB_ORG_URL },
  { label: TRI_AI_HELLO_EMAIL, href: `mailto:${TRI_AI_HELLO_EMAIL}` },
] as const;

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div className="tri-footer-col">
      <h5>{title}</h5>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              {...(link.href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noreferrer" })}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Site footer — matches cohort10 programme site */
export function SiteFooter() {
  return (
    <footer className="tri-site-footer mt-auto shrink-0">
      <div className="tri-footer-inner">
        <div className="tri-footer-brand">
          <div className="mb-2.5">
            <TriAiLogo height={38} />
          </div>
          <p>
            Teaching · Research · Innovation
            <br />
            Advancing AI education, research, and innovation across Africa. Since 2018.
          </p>
        </div>
        <FooterColumn title="Programme" links={programmeLinks} />
        <FooterColumn title="Community" links={communityLinks} />
        <FooterColumn title="TRI AI" links={triAiLinks} />
      </div>
      <div className="tri-footer-bottom">
        <span>
          © 2026 TRI AI — Artificial Intelligence Teaching Research and Innovation for Africa Ltd/Gte.
        </span>
        <span>
          <a href={AISATURDAYS_GITHUB_URL} target="_blank" rel="noreferrer">
            AISaturdaysLagos on GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}
