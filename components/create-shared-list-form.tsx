"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WATCH_REGIONS } from "@/lib/regions";

export function CreateSharedListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, region, services: [] }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create shared list");
      }

      router.push("/shared?showInvite=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create shared list");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass glass-panel space-y-5 rounded-3xl">
      <div>
        <p className="page-kicker">New shared list</p>
        <h1 className="page-title mt-2">Create a shared list</h1>
        <p className="mt-2 text-sm text-muted md:text-base">
          Each shared list gets its own invite code and link. You can pick streaming
          services for it afterward on the Services page.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <label className="block text-sm text-muted">
        Shared list name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-foreground"
          placeholder="Movie night crew"
          required
        />
      </label>

      <label className="block text-sm text-muted">
        Country
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-foreground"
        >
          {WATCH_REGIONS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
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
          {loading ? "Creating…" : "Create shared list"}
        </button>
      </div>
    </form>
  );
}
