import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getMembership } from "@/lib/server/membership";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const membership = await getMembership(userId);
  if (membership) redirect("/my-list");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-16">
        <OnboardingForm />
      </main>
    </div>
  );
}
