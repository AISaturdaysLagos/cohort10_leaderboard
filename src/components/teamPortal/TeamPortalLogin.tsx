import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { devSignInWithEmail, isLearnerAuthConfigured, tryLearnerGoogleLogin } from "../../lib/learnerAuth";
import { LEAGUE_NAME } from "../../lib/triAiBrand";

type TeamPortalLoginProps = {
  onSignedIn: () => void;
};

export function TeamPortalLogin({ onSignedIn }: TeamPortalLoginProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firebaseMode = isLearnerAuthConfigured();

  const onGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    const err = await tryLearnerGoogleLogin();
    setSubmitting(false);
    if (err) setError(err);
    else onSignedIn();
  };

  const onDevSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = devSignInWithEmail(email);
    setSubmitting(false);
    if (err) setError(err);
    else onSignedIn();
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded border border-tri-border bg-tri-sand p-8 shadow-card">
        <p className="text-xs text-tri-faint">{LEAGUE_NAME}</p>
        <h1 className="mt-2 font-display text-2xl text-tri-forest">Find your team</h1>
        <p className="mt-3 font-body text-tri-lead text-tri-muted">
          {firebaseMode
            ? "Sign in with the Google account linked to your Skills Boost email. We will show your team assignment after sign-in."
            : "Enter your cohort email to look up your team (local development — no verification)."}
        </p>

        {firebaseMode ? (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              className="tri-btn-primary w-full justify-center gap-2"
              disabled={submitting}
              onClick={() => void onGoogleSignIn()}
            >
              {submitting ? "Signing in…" : "Sign in with Google"}
            </button>
            {error ? <p className="rounded border tri-alert-error">{error}</p> : null}
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void onDevSubmit(e)}>
            <label className="block font-body text-tri-nav">
              <span className="font-medium text-tri-ink">Email address</span>
              <input
                type="email"
                autoComplete="email"
                required
                className="mt-1 w-full rounded border border-tri-border-md bg-tri-surface px-3 py-2 font-body text-tri-nav"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error ? <p className="rounded border tri-alert-error">{error}</p> : null}
            <button type="submit" className="tri-btn-primary w-full justify-center" disabled={submitting}>
              {submitting ? "Looking up…" : "Continue"}
            </button>
          </form>
        )}

        <Link to="/leaderboard" className="mt-6 inline-block font-body text-sm font-medium text-tri-leaf hover:underline">
          ← Back to leaderboard
        </Link>
      </div>
    </div>
  );
}
