import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getMembership } from "@/lib/server/membership";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    const membership = await getMembership(userId);
    redirect(membership ? "/my-list" : "/onboarding");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <p className="text-lg font-semibold tracking-tight">ScreenStack</p>
        <SignedOut>
          <div className="flex gap-3">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-black"
              >
                Create account
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <a href="/my-list" className="text-sm text-accent">
            Open watchlist
          </a>
        </SignedIn>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-16">
        <p className="text-sm uppercase tracking-[0.25em] text-accent">
          Household streaming
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Know what to watch, and where it actually streams.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Keep a shared family queue and your own list. Pick the services you
          subscribe to. After ten personal picks, get recommendations from each
          of those services.
        </p>
        <SignedOut>
          <div className="mt-8 flex gap-3">
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-black"
              >
                Start a household
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-full border border-white/15 px-6 py-3 text-sm"
              >
                I have an invite
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </main>
      <SiteFooter />
    </div>
  );
}
