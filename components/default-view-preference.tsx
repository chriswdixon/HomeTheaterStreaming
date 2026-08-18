"use client";

import { useState } from "react";
import type { DefaultListView } from "@/lib/default-list-view";

export function DefaultViewPreference({
  initialDefaultListView,
}: {
  initialDefaultListView: DefaultListView;
}) {
  const [defaultListView, setDefaultListView] = useState(initialDefaultListView);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(nextView: DefaultListView) {
    setSaving(true);
    setStatus(null);
    setDefaultListView(nextView);

    const response = await fetch("/api/user-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultListView: nextView }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setDefaultListView(initialDefaultListView);
      setStatus(data.error ?? "Could not save preference");
      setSaving(false);
      return;
    }

    setStatus("Saved.");
    setSaving(false);
  }

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="text-xl font-medium">Default view</h2>
      <p className="mt-1 text-sm text-muted">
        Choose which list opens when you sign in or click the ScreenStack logo.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save("personal")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            defaultListView === "personal"
              ? "bg-accent font-medium text-black"
              : "border border-white/15"
          }`}
        >
          My list
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save("shared")}
          className={`rounded-full px-5 py-2 text-sm transition ${
            defaultListView === "shared"
              ? "bg-accent font-medium text-black"
              : "border border-white/15"
          }`}
        >
          Shared list
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
    </section>
  );
}
