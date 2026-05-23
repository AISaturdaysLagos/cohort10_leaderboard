import { Link, NavLink, Outlet } from "react-router-dom";
import { TRI_AI_LOGO_URL } from "../lib/triAiBrand";

export function SiteChrome() {
  return (
    <div className="min-h-screen bg-tri-sand">
      <div className="sticky top-0 z-[1000] w-full border-b border-neutral-200 bg-tri-sand">
        <div className="mx-auto flex min-h-[60px] max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link to="/" className="flex flex-shrink-0 items-center gap-3 no-underline">
            <img
              src={TRI_AI_LOGO_URL}
              alt="TRI AI"
              className="h-[3.05rem] w-auto sm:h-[3.8rem]"
              height="121"
              width="121"
              loading="lazy"
              decoding="async"
            />
            <span className="font-nav text-tri-nav text-tri-leaf">TRI AI</span>
            <span className="hidden font-body text-sm text-tri-ink/80 sm:inline">Saturdays League</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 font-nav text-tri-nav sm:gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-black no-underline transition-colors hover:text-tri-leaf ${isActive ? "font-medium text-tri-leaf" : "font-normal text-tri-ink"}`
              }
              end
            >
              Students
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-black no-underline transition-colors hover:text-tri-leaf ${isActive ? "font-medium text-tri-leaf" : "font-normal text-tri-ink"}`
              }
            >
              Mentors
            </NavLink>
            <a
              className="text-black no-underline transition-colors hover:text-tri-leaf"
              href="https://tri-ai.org"
              target="_blank"
              rel="noreferrer"
            >
              tri-ai.org
            </a>
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
