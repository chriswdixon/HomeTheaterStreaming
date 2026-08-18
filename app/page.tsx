import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
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
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <Image
        src="/hero.png"
        alt="A dark home theater with a glowing screen"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/25" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <p className="text-lg font-semibold tracking-tight">ScreenStack</p>
        <div className="flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm backdrop-blur"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-black"
          >
            Create account
          </Link>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16">
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
        <div className="mt-8 flex gap-3">
          <Link
            href="/sign-up"
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-black"
          >
            Start a household
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full border border-white/15 bg-black/30 px-6 py-3 text-sm backdrop-blur"
          >
            I have an invite
          </Link>
        </div>
      </main>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}
