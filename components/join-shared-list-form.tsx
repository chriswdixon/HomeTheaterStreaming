"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinSharedListForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not join shared list");
      }

      router.push("/shared");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join shared list");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass glass-panel space-y-5 rounded-3xl">
      <div>
        <p className="page-kicker">Join a list</p>
        <h1 className="page-title mt-2">Join a shared list</h1>
        <p className="mt-2 text-sm text-muted md:text-base">
          Enter the invite code you received. You&apos;ll keep any shared lists you
          already belong to.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <label className="block text-sm text-muted">
        Invite code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 tracking-[0.3em] text-foreground uppercase"
          placeholder="ABCD2345"
          required
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? "Joining…" : "Join shared list"}
        </button>
      </div>
    </form>
  );
}
