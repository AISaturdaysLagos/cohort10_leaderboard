import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  completeLearnerEmailLinkSignIn,
  devSignInWithEmail,
  isLearnerAuthConfigured,
  sendLearnerSignInLink,
} from "../../lib/learnerAuth";
import { LEAGUE_NAME } from "../../lib/triAiBrand";

type TeamPortalLoginProps = {
  onSignedIn: () => void;
};

export function TeamPortalLogin({ onSignedIn }: TeamPortalLoginProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [completingLink, setCompletingLink] = useState(true);
  const firebaseMode = isLearnerAuthConfigured();

  useEffect(() => {
    if (!firebaseMode) {
      setCompletingLink(false);
      return;
    }
    void completeLearnerEmailLinkSignIn().then((err) => {
      setCompletingLink(false);
      if (err) setError(err);
      else onSignedIn();
    });
  }, [firebaseMode, onSignedIn]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (firebaseMode) {
      const err = await sendLearnerSignInLink(email);
      setSubmitting(false);
      if (err) setError(err);
      else setLinkSent(true);
      return;
    }
    const err = devSignInWithEmail(email);
    setSubmitting(false);
    if (err) setError(err);
    else onSignedIn();
  };

  if (completingLink) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center font-body text-tri-muted">
        Completing sign-in…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded border border-tri-border bg-tri-sand p-8 shadow-card">
        <p className="text-xs text-tri-faint">{LEAGUE_NAME}</p>
        <h1 className="mt-2 font-display text-2xl text-tri-forest">Find your team</h1>
        <p className="mt-3 font-body text-tri-lead text-tri-muted">
          {firebaseMode
            ? linkSent
              ? "Check your inbox for a sign-in link. Open it on this device to see your team."
              : "Enter the email you use for Skills Boost. We will send a one-time sign-in link, then show your team assignment."
            : "Enter your cohort email to look up your team (local development — no verification)."}
        </p>

        {!linkSent ? (
          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
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
              {submitting
                ? firebaseMode
                  ? "Sending link…"
                  : "Looking up…"
                : firebaseMode
                  ? "Email me a sign-in link"
                  : "Continue"}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="rounded border border-tri-leaf/35 bg-tri-mist px-4 py-3 font-body text-sm text-tri-forest">
              Link sent to <strong>{email.trim().toLowerCase()}</strong>. The page will update automatically after
              you click the link.
            </p>
            <button
              type="button"
              className="tri-btn-muted w-full justify-center"
              onClick={() => {
                setLinkSent(false);
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
        )}

        <Link to="/leaderboard" className="mt-6 inline-block font-body text-sm font-medium text-tri-leaf hover:underline">
          ← Back to leaderboard
        </Link>
      </div>
    </div>
  );
}
