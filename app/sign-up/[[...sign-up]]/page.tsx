import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url: redirectUrl } = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <SignUp
        forceRedirectUrl={redirectUrl || undefined}
        fallbackRedirectUrl="/onboarding"
      />
    </main>
  );
}
