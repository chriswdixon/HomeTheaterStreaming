const INVITE_CODE_PATTERN = /^[A-Z2-9]{8}$/;

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidInviteCodeFormat(code: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(code));
}

export function householdInvitePath(inviteCode: string): string {
  return `/join/${normalizeInviteCode(inviteCode)}`;
}

export function buildHouseholdInviteUrl(inviteCode: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${householdInvitePath(inviteCode)}`;
}
