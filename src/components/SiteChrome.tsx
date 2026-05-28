import { Link, NavLink, Outlet } from "react-router-dom";
import { COHORT10_URL } from "../lib/triAiBrand";
import { TriAiLogo } from "./TriAiLogo";

export function SiteChrome() {
  return (
    <div className="min-h-screen bg-tri-sand">
      <header className="sticky top-0 z-[1000] w-full border-b border-black/8 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-w-0 flex-shrink items-center gap-3 no-underline">
            <TriAiLogo height={40} showTagline />
            <span className="hidden h-4 w-px bg-black/15 sm:block" aria-hidden />
            <span className="hidden font-sans text-sm font-medium text-tri-ink/55 sm:inline">
              Saturdays League
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 font-sans text-sm sm:gap-0">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-tri px-3 py-2 no-underline transition-colors hover:bg-black/5 hover:text-tri-ink ${
                  isActive ? "font-semibold text-tri-leaf" : "font-medium text-tri-ink/60"
                }`
              }
              end
            >
              Students
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-tri px-3 py-2 no-underline transition-colors hover:bg-black/5 hover:text-tri-ink ${
                  isActive ? "font-semibold text-tri-leaf" : "font-medium text-tri-ink/60"
                }`
              }
            >
              Mentors
            </NavLink>
            <a
              className="rounded-tri px-3 py-2 font-medium text-tri-ink/60 no-underline transition-colors hover:bg-black/5 hover:text-tri-ink"
              href={COHORT10_URL}
              target="_blank"
              rel="noreferrer"
            >
              Cohort 10
            </a>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
