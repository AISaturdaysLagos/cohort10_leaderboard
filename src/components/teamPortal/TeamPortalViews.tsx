import type { TeamDescription, TeamDiscordLink, TeamPortalContext, TeamPortalMember } from "../../types";
import { displayMemberName } from "../../lib/teamPortal";
import { isTeamLeaderRole } from "../../lib/teamLeaders";
import { DISCORD_SERVER_INVITE } from "../../lib/triAiBrand";
import { TeamHeroImage } from "./TeamHeroImage";

type TeamDescriptionPanelProps = {
  teamName: string;
  description: TeamDescription | null;
  discord: TeamDiscordLink | null;
};

export function TeamDescriptionPanel({ teamName, description, discord }: TeamDescriptionPanelProps) {
  return (
    <div className="space-y-4">
      <TeamHeroImage teamName={teamName} description={description} />
      <section className="rounded border border-tri-border bg-tri-surface p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-tri-faint">About your team</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-tri-forest sm:text-3xl">{teamName}</h2>
        {description ? (
          <div className="mt-6 space-y-4 font-body text-tri-lead text-tri-muted">
            <div className="flex flex-wrap gap-2">
              {description.category ? (
                <span className="rounded-full bg-tri-leaf/15 px-3 py-1 text-xs font-semibold text-tri-forest">
                  {description.category}
                </span>
              ) : null}
              {description.teamSize != null ? (
                <span className="rounded-full bg-tri-mist px-3 py-1 text-xs font-semibold text-tri-muted">
                  {description.teamSize} members
                </span>
              ) : null}
            </div>
            {description.overview ? <p className="text-tri-ink">{description.overview}</p> : null}
            {description.interestingDetails ? (
              <p className="border-l-2 border-tri-orange/40 pl-4 italic">{description.interestingDetails}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 font-body text-sm text-tri-muted">Team description is not available yet.</p>
        )}
      </section>
      <TeamDiscordCard teamName={teamName} discord={discord} />
    </div>
  );
}

type TeamDiscordCardProps = {
  teamName: string;
  discord: TeamDiscordLink | null;
};

export function TeamDiscordCard({ teamName, discord }: TeamDiscordCardProps) {
  const channelLabel = discord?.channelName
    ? discord.channelName.startsWith("#")
      ? discord.channelName
      : `#${discord.channelName}`
    : `#${teamName.toLowerCase().replace(/\s+/g, "-")}`;

  const inviteUrl = discord?.inviteUrl || DISCORD_SERVER_INVITE;
  const hasChannel = Boolean(discord?.channelUrl);
  const hasInvite = Boolean(inviteUrl);

  if (!hasChannel && !hasInvite) {
    return (
      <section className="rounded border border-dashed border-tri-border bg-tri-mist/40 px-4 py-4 font-body text-sm text-tri-muted">
        Your team Discord channel link will appear here once an admin adds it.
      </section>
    );
  }

  return (
    <section className="rounded border border-[#5865F2]/25 bg-[#5865F2]/[0.06] p-5 shadow-card">
      <div className="flex items-start gap-3">
        <DiscordIcon className="mt-0.5 h-8 w-8 shrink-0 text-[#5865F2]" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-tri-forest">Team Discord</h3>
          <p className="mt-1 font-body text-sm text-tri-muted">
            Connect with your teammates in the cohort Discord server.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {hasChannel ? (
              <a
                href={discord!.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-tri bg-[#5865F2] px-4 py-2.5 font-body text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
              >
                Open {channelLabel}
              </a>
            ) : null}
            {hasInvite ? (
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tri-btn-muted inline-flex no-underline"
              >
                {hasChannel ? "Team invite link" : "Join team on Discord"}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

type TeamPortalStudentViewProps = {
  context: TeamPortalContext;
  preview?: boolean;
};

export function TeamPortalStudentView({ context, preview = false }: TeamPortalStudentViewProps) {
  const displayName = context.profile
    ? [context.profile.firstName, context.profile.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <div className="space-y-6">
      {preview ? (
        <p className="rounded border border-tri-orange/30 bg-tri-orange/5 px-4 py-2 font-body text-sm text-tri-muted">
          Previewing the <strong className="text-tri-ink">student view</strong> — team name and description only.
        </p>
      ) : null}
      {!preview && (displayName || context.profile?.role) ? (
        <p className="font-body text-tri-lead text-tri-muted">
          Signed in as{" "}
          <strong className="text-tri-ink">{displayName || context.email}</strong>
          {context.profile?.role ? <> · {context.profile.role}</> : null}
        </p>
      ) : null}
      <TeamDescriptionPanel teamName={context.teamName} description={context.description} discord={context.discord} />
      {!context.isLeader && !preview ? (
        <section className="rounded border border-dashed border-tri-border bg-tri-mist/40 px-4 py-4 font-body text-sm text-tri-muted">
          Team leaders can see the full roster here. If you are a team leader and expected to see members,
          contact your mentor.
        </section>
      ) : null}
    </div>
  );
}

type TeamPortalLeaderViewProps = {
  context: TeamPortalContext;
  preview?: boolean;
};

export function TeamPortalLeaderView({ context, preview = false }: TeamPortalLeaderViewProps) {
  const displayName = context.profile
    ? [context.profile.firstName, context.profile.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <div className="space-y-6">
      {preview ? (
        <p className="rounded border border-tri-orange/30 bg-tri-orange/5 px-4 py-2 font-body text-sm text-tri-muted">
          Previewing the <strong className="text-tri-ink">team leader view</strong> — description plus full roster.
        </p>
      ) : null}
      {!preview ? (
        <p className="font-body text-tri-lead text-tri-muted">
          Signed in as team leader{" "}
          <strong className="text-tri-ink">{displayName || context.email}</strong>
          {context.profile?.role ? <> · {context.profile.role}</> : null}
        </p>
      ) : null}
      <TeamDescriptionPanel teamName={context.teamName} description={context.description} discord={context.discord} />
      <TeamRosterTable members={context.members} />
    </div>
  );
}

function TeamRosterTable({ members }: { members: TeamPortalMember[] }) {
  if (members.length === 0) {
    return (
      <section className="rounded border border-dashed border-tri-border bg-tri-mist/40 px-4 py-6 text-center font-body text-sm text-tri-muted">
        No team members found.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded border border-tri-border bg-tri-surface shadow-card">
      <div className="border-b border-tri-border bg-tri-mist/50 px-4 py-3">
        <h3 className="font-display text-lg text-tri-forest">Team roster</h3>
        <p className="mt-1 font-body text-xs text-tri-muted">{members.length} members</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-tri-border text-left text-[10px] font-bold uppercase tracking-wide text-tri-faint">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {members.map((member) => (
              <tr key={member.email} className="text-tri-ink">
                <td className="px-4 py-2.5 font-medium">{displayMemberName(member)}</td>
                <td className="max-w-[14rem] truncate px-4 py-2.5 text-tri-muted" title={member.email}>
                  {member.email}
                </td>
                <td className="px-4 py-2.5">
                  {member.role ? (
                    <RoleBadge role={member.role} />
                  ) : (
                    <span className="text-tri-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoleBadge({ role }: { role: string }) {
  const leader = isTeamLeaderRole(role);
  return (
    <span
      className={
        leader
          ? "inline-flex rounded-full bg-tri-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tri-orange"
          : "inline-flex rounded-full bg-tri-mist px-2 py-0.5 text-[10px] font-semibold text-tri-muted"
      }
    >
      {role}
    </span>
  );
}
