import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  adminAllowlistHint,
  adminLogout,
  currentAdminUser,
  hasAdminAllowlist,
  isAdminConfigured,
  subscribeAdminAuth,
  tryAdminGoogleLogin,
  tryAdminLogin,
} from "../lib/adminAuth";
import { usesFirebasePublished } from "../lib/published";

type Props = { children: ReactNode };

export function AdminGate({ children }: Props) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [error, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return subscribeAdminAuth((ok) => {
      setAuthed(ok);
      setSignedInEmail(ok ? (currentAdminUser()?.email ?? null) : null);
      setChecking(false);
    });
  }, []);

  const onGoogleSignIn = useCallback(async () => {
    setLoginError(null);
    setSubmitting(true);
    const err = await tryAdminGoogleLogin();
    setSubmitting(false);
    if (err) setLoginError(err);
  }, []);

  const onLogout = useCallback(async () => {
    await adminLogout();
    setLoginError(null);
    setSignedInEmail(null);
  }, []);

  if (!isAdminConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded border border-tri-border bg-tri-sand p-8 text-center shadow-card">
          <h1 className="font-display text-2xl text-tri-forest">Mentor area unavailable</h1>
          <p className="mt-4 font-body text-tri-lead text-tri-muted">
            Scoreboard tools are not configured yet. Set Firebase or a local admin password for development.
          </p>
          <Link to="/" className="tri-btn-primary mt-8 inline-flex">
            Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center font-body text-tri-lead text-tri-muted">
        Checking sign-in…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded border border-tri-border bg-tri-sand p-8 shadow-card">
          <h1 className="font-display text-2xl text-tri-forest">Mentor sign-in</h1>
          <p className="mt-3 font-body text-tri-lead text-tri-muted">
            {usesFirebasePublished()
              ? adminAllowlistHint()
                ? `Sign in with ${adminAllowlistHint()} to publish the leaderboard for all students.`
                : "Sign in with your authorised Google account to publish the leaderboard for all students."
              : "For mentors and organisers only (local development mode)."}
          </p>
          {usesFirebasePublished() ? (
            <div className="mt-8 space-y-4">
              <button
                type="button"
                className="tri-btn-primary w-full justify-center gap-2"
                disabled={submitting}
                onClick={() => void onGoogleSignIn()}
              >
                {submitting ? "Signing in…" : "Sign in with Google"}
              </button>
              {hasAdminAllowlist() && adminAllowlistHint() && (
                <p className="font-body text-xs text-tri-muted">Restricted to {adminAllowlistHint()}.</p>
              )}
            </div>
          ) : (
            <LegacyPasswordForm onError={setLoginError} error={error} />
          )}
          {error && (
            <p className="mt-4 rounded border tri-alert-error">{error}</p>
          )}
          <Link to="/" className="mt-6 inline-block font-body text-sm font-medium text-tri-leaf hover:underline">
            ← Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthedShell signedInEmail={signedInEmail} onLogout={() => void onLogout()}>
      {children}
    </AdminAuthedShell>
  );
}

function LegacyPasswordForm({
  error,
  onError,
}: {
  error: string | null;
  onError: (msg: string | null) => void;
}) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        setSubmitting(true);
        void tryAdminLogin("", password).then((err) => {
          setSubmitting(false);
          if (err) onError(err);
          else setPassword("");
        });
      }}
    >
      <label className="block font-body text-tri-nav">
        <span className="font-medium text-tri-ink">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-tri-border-md bg-tri-surface px-3 py-2 font-body text-tri-nav"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <p className="rounded border tri-alert-error">{error}</p>
      )}
      <button type="submit" className="tri-btn-primary w-full justify-center" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function AdminAuthedShell({
  children,
  onLogout,
  signedInEmail,
}: {
  children: ReactNode;
  onLogout: () => void;
  signedInEmail: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-tri-border bg-tri-mist">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-2">
          <span className="font-body text-xs text-tri-muted">
            {signedInEmail ? `Signed in as ${signedInEmail}` : "Signed in as mentor"}
            {usesFirebasePublished() ? " · Firebase" : " · local"}
          </span>
          <button type="button" className="tri-btn-muted py-1.5 text-sm" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
