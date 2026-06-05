import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminTeamPortalPreview } from "../components/teamPortal/AdminTeamPortalPreview";
import { TeamPortalLogin } from "../components/teamPortal/TeamPortalLogin";
import { TeamPortalLeaderView, TeamPortalStudentView } from "../components/teamPortal/TeamPortalViews";
import { useTeamPortalData } from "../hooks/useTeamPortalData";
import { isAllowedAdmin } from "../lib/adminAuth";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { learnerLogout, subscribeLearnerAuth, devLearnerEmail } from "../lib/learnerAuth";
import { resolveTeamPortal } from "../lib/teamPortal";
import { LEAGUE_NAME } from "../lib/triAiBrand";

export function MyTeamPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const dataEnabled = Boolean(email);
  const { loading, error, assignments, profiles, descriptions, discordLinks } = useTeamPortalData(dataEnabled);

  const refreshAuth = useCallback(() => {
    if (isFirebaseConfigured()) {
      const user = getFirebaseAuth().currentUser;
      setEmail(user?.email?.trim().toLowerCase() ?? null);
      setIsAdmin(isAllowedAdmin(user));
    } else {
      setEmail(devLearnerEmail());
      setIsAdmin(false);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    return subscribeLearnerAuth((learnerEmail) => {
      setEmail(learnerEmail);
      if (isFirebaseConfigured()) {
        setIsAdmin(isAllowedAdmin(getFirebaseAuth().currentUser));
      }
      setCheckingAuth(false);
    });
  }, []);

  const context = useMemo(() => {
    if (!email || isAdmin) return null;
    return resolveTeamPortal(email, assignments, profiles, descriptions, discordLinks);
  }, [email, isAdmin, assignments, profiles, descriptions, discordLinks]);

  const onSignedIn = useCallback(() => {
    refreshAuth();
  }, [refreshAuth]);

  const onLogout = () => {
    void learnerLogout().then(() => {
      setEmail(null);
      setIsAdmin(false);
    });
  };

  if (checkingAuth) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center font-body text-tri-muted">
        Checking sign-in…
      </div>
    );
  }

  if (!email) {
    return <TeamPortalLogin onSignedIn={onSignedIn} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-tri-border bg-tri-chrome">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs text-tri-faint">{LEAGUE_NAME}</p>
            <h1 className="font-display text-xl font-bold text-tri-forest">My team</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-body text-xs text-tri-muted">{email}</span>
            <button type="button" className="tri-btn-muted py-1.5 text-sm" onClick={onLogout}>
              Sign out
            </button>
            {isAdmin ? (
              <Link to="/admin" className="tri-btn-muted py-1.5 text-sm no-underline">
                Admin
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {error ? <div className="tri-alert-error mb-6">{error}</div> : null}
        {loading ? (
          <p className="text-center font-body text-tri-muted">Loading team data…</p>
        ) : isAdmin ? (
          <AdminTeamPortalPreview
            assignments={assignments}
            profiles={profiles}
            descriptions={descriptions}
            discordLinks={discordLinks}
            signedInEmail={email}
          />
        ) : !context ? (
          <div className="rounded border border-tri-border bg-tri-sand p-8 text-center shadow-card">
            <h2 className="font-display text-xl text-tri-forest">Email not found</h2>
            <p className="mt-3 font-body text-tri-lead text-tri-muted">
              <strong className="text-tri-ink">{email}</strong> is not listed in the cohort team assignments. Double-check
              you used the same email as Skills Boost, or contact your mentor.
            </p>
            <button type="button" className="tri-btn-muted mt-6" onClick={onLogout}>
              Try another email
            </button>
          </div>
        ) : context.isLeader ? (
          <TeamPortalLeaderView context={context} />
        ) : (
          <TeamPortalStudentView context={context} />
        )}
      </main>
    </div>
  );
}
