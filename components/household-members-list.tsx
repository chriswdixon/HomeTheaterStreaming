import type { HouseholdMemberView } from "@/lib/server/household-members";

function memberInitials(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "?";
}

export function HouseholdMembersList({
  members,
}: {
  members: HouseholdMemberView[];
}) {
  if (members.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Members</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {members.map((member) => (
          <li key={member.userId}>
            <span className="household-member-chip">
              {member.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.imageUrl}
                  alt=""
                  className="household-member-avatar"
                />
              ) : (
                <span className="household-member-avatar household-member-avatar-fallback">
                  {memberInitials(member.displayName)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {member.displayName}
                  {member.isCurrentUser ? " (you)" : ""}
                </span>
                <span className="block text-xs text-muted">
                  {member.role === "owner" ? "Owner" : "Member"}
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
