import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  adminLogout,
  isAdminAuthed,
  isAdminPasswordConfigured,
  tryAdminLogin,
} from "../lib/adminAuth";

type Props = { children: ReactNode };

export function AdminGate({ children }: Props) {
  const [authed, setAuthed] = useState(() => isAdminAuthed());
  const [password, setPassword] = useState("");
  const [error, setLoginError] = useState<string | null>(null);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      if (tryAdminLogin(password)) {
        setAuthed(true);
        setPassword("");
        return;
      }
      setLoginError("Incorrect password.");
    },
    [password],
  );

  const onLogout = useCallback(() => {
    adminLogout();
    setAuthed(false);
    setPassword("");
    setLoginError(null);
  }, []);

  if (!isAdminPasswordConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded border border-neutral-200 bg-tri-sand p-8 text-center shadow-card">
          <h1 className="font-display text-2xl text-tri-forest">Mentor area unavailable</h1>
          <p className="mt-4 font-body text-tri-lead text-tri-ink/80">
            Scoreboard tools are not open right now. Head back to the team leaderboard.
          </p>
          <Link to="/" className="tri-btn-primary mt-8 inline-flex">
            Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded border border-neutral-200 bg-tri-sand p-8 shadow-card">
          <h1 className="font-display text-2xl text-tri-forest">Mentor sign-in</h1>
          <p className="mt-3 font-body text-tri-lead text-tri-ink/75">
            For mentors and organisers only.
          </p>
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 font-body text-tri-nav"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
            )}
            <button type="submit" className="tri-btn-primary w-full justify-center">
              Sign in
            </button>
          </form>
          <Link to="/" className="mt-6 inline-block font-body text-sm font-medium text-tri-leaf hover:underline">
            ← Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return <AdminAuthedShell onLogout={onLogout}>{children}</AdminAuthedShell>;
}

function AdminAuthedShell({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-tri-mist">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-2">
          <span className="font-body text-xs text-tri-ink/55">Signed in as mentor</span>
          <button type="button" className="tri-btn-muted py-1.5 text-sm" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
