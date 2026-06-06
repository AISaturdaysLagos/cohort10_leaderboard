import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  devSignInWithEmail,
  isLearnerAuthConfigured,
  tryLearnerEmailPasswordSignIn,
  tryLearnerEmailPasswordSignUp,
  tryLearnerGoogleLogin,
} from "../../lib/learnerAuth";
import { LEAGUE_NAME } from "../../lib/triAiBrand";

type TeamPortalLoginProps = {
  onSignedIn: () => void;
};

type EmailAuthMode = "sign-in" | "sign-up";

export function TeamPortalLogin({ onSignedIn }: TeamPortalLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const firebaseMode = isLearnerAuthConfigured();

  const onGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    const err = await tryLearnerGoogleLogin();
    setGoogleSubmitting(false);
    if (err) setError(err);
    else onSignedIn();
  };

  const onEmailAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailSubmitting(true);
    const err =
      emailAuthMode === "sign-up"
        ? await tryLearnerEmailPasswordSignUp(email, password)
        : await tryLearnerEmailPasswordSignIn(email, password);
    setEmailSubmitting(false);
    if (err) setError(err);
    else onSignedIn();
  };

  const onDevSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailSubmitting(true);
    const err = devSignInWithEmail(email);
    setEmailSubmitting(false);
    if (err) setError(err);
    else onSignedIn();
  };

  const switchEmailAuthMode = (mode: EmailAuthMode) => {
    setEmailAuthMode(mode);
    setError(null);
    setPassword("");
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded border border-tri-border bg-tri-sand p-8 shadow-card">
        <p className="text-xs text-tri-faint">{LEAGUE_NAME}</p>
        <h1 className="mt-2 font-display text-2xl text-tri-forest">Find your team</h1>
        <p className="mt-3 font-body text-tri-lead text-tri-muted">
          {firebaseMode
            ? "Sign in with Google or the email you use for Skills Boost. We will show your team assignment after sign-in."
            : "Enter your cohort email to look up your team (local development — no verification)."}
        </p>

        {firebaseMode ? (
          <div className="mt-8 space-y-6">
            <button
              type="button"
              className="tri-btn-primary w-full justify-center gap-2"
              disabled={googleSubmitting || emailSubmitting}
              onClick={() => void onGoogleSignIn()}
            >
              {googleSubmitting ? "Signing in…" : "Sign in with Google"}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-tri-border" />
              <span className="font-body text-xs uppercase tracking-wide text-tri-faint">or</span>
              <div className="h-px flex-1 bg-tri-border" />
            </div>

            <form className="space-y-4" onSubmit={(e) => void onEmailAuthSubmit(e)}>
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
              <label className="block font-body text-tri-nav">
                <span className="font-medium text-tri-ink">Password</span>
                <input
                  type="password"
                  autoComplete={emailAuthMode === "sign-up" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  className="mt-1 w-full rounded border border-tri-border-md bg-tri-surface px-3 py-2 font-body text-tri-nav"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error ? <p className="rounded border tri-alert-error">{error}</p> : null}
              <button
                type="submit"
                className="tri-btn-muted w-full justify-center"
                disabled={googleSubmitting || emailSubmitting}
              >
                {emailSubmitting
                  ? emailAuthMode === "sign-up"
                    ? "Creating account…"
                    : "Signing in…"
                  : emailAuthMode === "sign-up"
                    ? "Create account"
                    : "Sign in with email"}
              </button>
            </form>

            <p className="text-center font-body text-sm text-tri-muted">
              {emailAuthMode === "sign-in" ? (
                <>
                  No Google account?{" "}
                  <button
                    type="button"
                    className="font-medium text-tri-leaf hover:underline"
                    onClick={() => switchEmailAuthMode("sign-up")}
                  >
                    Create an account with email
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-tri-leaf hover:underline"
                    onClick={() => switchEmailAuthMode("sign-in")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
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
            <button type="submit" className="tri-btn-primary w-full justify-center" disabled={emailSubmitting}>
              {emailSubmitting ? "Looking up…" : "Continue"}
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
