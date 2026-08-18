"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinHouseholdInvite({
  householdName,
  inviteCode,
}: {
  householdName: string;
  inviteCode: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinHousehold() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not join household");
      router.push("/my-list");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join household");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-card/90 p-8 shadow-2xl">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">Household invite</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Join {householdName}
      </h1>
      <p className="mt-2 text-muted">
        Accept this invite to share the household watchlist and streaming services.
      </p>
      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void joinHousehold()}
        disabled={loading}
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-medium text-black disabled:opacity-60"
      >
        {loading ? "Joining…" : "Join household"}
      </button>
    </div>
  );
}
