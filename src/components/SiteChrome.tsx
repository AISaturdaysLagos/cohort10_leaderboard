import { Link, NavLink, Outlet } from "react-router-dom";
import { COHORT10_URL, TRI_AI_ORG_URL } from "../lib/triAiBrand";
import { ThemeToggle } from "./ThemeToggle";
import { SiteFooter } from "./SiteFooter";
import { TriAiLogo } from "./TriAiLogo";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-tri px-3 py-2 no-underline transition-colors hover:bg-tri-nav-hover hover:text-tri-ink ${
    isActive ? "font-semibold text-tri-leaf" : "font-medium text-tri-nav-link"
  }`;

export function SiteChrome() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-tri-sand">
      <header className="sticky top-0 z-[1000] w-full shrink-0 border-b border-[var(--chrome-border)] bg-tri-chrome transition-colors">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-w-0 flex-shrink items-center gap-2.5 no-underline">
            <TriAiLogo height={40} showTagline />
          </Link>
          <nav className="flex flex-wrap items-center gap-1 font-sans text-sm sm:gap-0">
            <NavLink to="/" className={navClass} end>
              About
            </NavLink>
            <NavLink to="/leaderboard" className={navClass}>
              Leaderboard
            </NavLink>
            <NavLink to="/my-team" className={navClass}>
              My team
            </NavLink>
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
            <a
              className="rounded-tri px-3 py-2 font-medium text-tri-nav-link no-underline transition-colors hover:bg-tri-nav-hover hover:text-tri-ink"
              href={TRI_AI_ORG_URL}
              target="_blank"
              rel="noreferrer"
            >
              TRI AI
            </a>
            <a
              className="rounded-tri px-3 py-2 font-medium text-tri-nav-link no-underline transition-colors hover:bg-tri-nav-hover hover:text-tri-ink"
              href={COHORT10_URL}
              target="_blank"
              rel="noreferrer"
            >
              Cohort 10
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}
