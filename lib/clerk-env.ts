export function clerkKeyIssue(): string | null {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (!publishableKey) {
    return "Clerk publishable key is missing.";
  }

  if (
    process.env.VERCEL_ENV === "production" &&
    publishableKey.startsWith("pk_test_")
  ) {
    return "Production is using Clerk development keys. In the Clerk dashboard, open the Production instance, copy the live keys (pk_live_/sk_live_), and update them in Vercel → Settings → Environment Variables.";
  }

  return null;
}
