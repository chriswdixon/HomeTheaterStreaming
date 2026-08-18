export type NotificationType = "household_member_joined";

export function householdMemberJoinedMessage(actorFirstName: string) {
  return `${actorFirstName} joined your household`;
}
