import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url: redirectUrl } = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <SignIn
        forceRedirectUrl={redirectUrl || undefined}
        fallbackRedirectUrl="/start"
      />
    </main>
  );
}
