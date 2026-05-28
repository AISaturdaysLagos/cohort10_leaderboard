import { Link, NavLink, Outlet } from "react-router-dom";
import { COHORT10_URL } from "../lib/triAiBrand";
import { TriAiLogo } from "./TriAiLogo";

export function SiteChrome() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-tri-sand">
      <header className="sticky top-0 z-[1000] w-full shrink-0 border-b border-black/8 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex min-w-0 flex-shrink items-center gap-2.5 no-underline">
            <TriAiLogo height={40} showTagline />
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
              Admin
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
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
