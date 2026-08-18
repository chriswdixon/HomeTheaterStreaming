import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinHouseholdInvite } from "@/components/join-household-invite";
import {
  buildHouseholdInviteUrl,
  householdInvitePath,
  isValidInviteCodeFormat,
  normalizeInviteCode,
} from "@/lib/household-invite";
import { WATCH_REGIONS } from "@/lib/regions";
import {
  getHouseholdInvitePreview,
  getMembership,
} from "@/lib/server/membership";

function regionLabel(code: string) {
  return WATCH_REGIONS.find((region) => region.code === code)?.name ?? code;
}

export default async function JoinHouseholdPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const inviteCode = normalizeInviteCode(rawCode);
  if (!isValidInviteCodeFormat(inviteCode)) notFound();

  const preview = await getHouseholdInvitePreview(inviteCode);
  if (!preview) notFound();

  const { userId } = await auth();
  if (!userId) {
    const joinPath = householdInvitePath(inviteCode);
    const redirectUrl = encodeURIComponent(joinPath);

    return (
      <div className="flex min-h-full flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 md:py-16">
          <div className="invite-shell rounded-3xl border border-white/10 bg-card/90 p-8 shadow-2xl">
            <p className="page-kicker">You&apos;re invited</p>
            <h1 className="page-title mt-2">Join {preview.name}</h1>
            <p className="mt-2 text-sm text-muted md:text-base">
              Create an account or sign in to join this household on ScreenStack.
            </p>
            <p className="mt-1 text-sm text-muted">{regionLabel(preview.region)}</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={`/sign-up?redirect_url=${redirectUrl}`}
                className="rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-black"
              >
                Create account to join
              </Link>
              <Link
                href={`/sign-in?redirect_url=${redirectUrl}`}
                className="rounded-full border border-white/15 px-6 py-3 text-center text-sm"
              >
                Sign in to join
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const membership = await getMembership(userId);
  if (membership) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 md:py-16">
          <div className="invite-shell rounded-3xl border border-white/10 bg-card/90 p-8 shadow-2xl">
            <p className="page-kicker">Household invite</p>
            <h1 className="page-title mt-2">You&apos;re already in a household</h1>
            <p className="mt-2 text-sm text-muted md:text-base">
              You belong to {membership.household.name}. Leave that household before
              joining {preview.name}.
            </p>
            <Link
              href="/start"
              className="mt-8 inline-block w-full rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-black sm:w-auto"
            >
              Go to your lists
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 md:py-16">
        <JoinHouseholdInvite householdName={preview.name} inviteCode={inviteCode} />
      </main>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const inviteCode = normalizeInviteCode(rawCode);
  if (!isValidInviteCodeFormat(inviteCode)) {
    return { title: "Join household · ScreenStack" };
  }

  const preview = await getHouseholdInvitePreview(inviteCode);
  if (!preview) {
    return { title: "Join household · ScreenStack" };
  }

  return {
    title: `Join ${preview.name} · ScreenStack`,
    description: `Accept an invite to join ${preview.name} on ScreenStack.`,
    openGraph: {
      title: `Join ${preview.name} on ScreenStack`,
      description: "Share a household watchlist and streaming services.",
      url: buildHouseholdInviteUrl(inviteCode, "https://home-theater-streaming.vercel.app"),
    },
  };
}
