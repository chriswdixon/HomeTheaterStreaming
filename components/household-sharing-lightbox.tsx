"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildHouseholdInviteUrl } from "@/lib/household-invite";
import { WATCH_REGIONS } from "@/lib/regions";
import { SharedIcon } from "./icons";

function regionLabel(code: string) {
  return WATCH_REGIONS.find((region) => region.code === code)?.name ?? code;
}

export function HouseholdSharingLightbox({
  householdName,
  inviteCode,
  region,
  onClose,
}: {
  householdName: string;
  inviteCode: string;
  region: string;
  onClose: () => void;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    setInviteLink(buildHouseholdInviteUrl(inviteCode, window.location.origin));
  }, [inviteCode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="title-lightbox-overlay fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="household-lightbox-heading"
        className="household-lightbox-panel title-lightbox-panel relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl md:max-h-[min(92vh,720px)] md:flex-row md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="title-lightbox-close absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none"
        >
          ×
        </button>

        <div className="household-lightbox-poster title-lightbox-poster flex shrink-0 items-center justify-center md:w-[min(38%,280px)]">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
              <SharedIcon className="h-10 w-10" />
            </span>
            <p className="text-sm text-muted">Shared with your household</p>
          </div>
        </div>

        <div className="title-lightbox-body flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 md:p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Household</p>
            <h2
              id="household-lightbox-heading"
              className="mt-1 text-2xl font-semibold leading-tight md:text-3xl"
            >
              {householdName}
            </h2>
            <p className="mt-1 text-sm text-muted">{regionLabel(region)}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-sm font-medium">Invite link</h3>
            <p className="mt-1 text-sm text-muted">
              Send this link so someone can sign up and join your household in one
              step.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
                {inviteLink || "…"}
              </code>
              <button
                type="button"
                onClick={async () => {
                  if (!inviteLink) return;
                  await navigator.clipboard.writeText(inviteLink);
                  setCopiedLink(true);
                }}
                className="glass-button glass-button-primary w-full px-5 py-2.5 text-sm sm:w-auto"
              >
                {copiedLink ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-sm font-medium">Invite code</h3>
            <p className="mt-1 text-sm text-muted">
              Or share this code for someone to enter during onboarding.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg tracking-[0.3em]">
                {inviteCode}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteCode);
                  setCopiedCode(true);
                }}
                className="glass-button w-full px-5 py-2.5 text-sm sm:w-auto"
              >
                {copiedCode ? "Copied" : "Copy code"}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">What&apos;s shared</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>The shared watchlist everyone in your household can edit</li>
              <li>Household streaming services from Services settings</li>
              <li>Your personal list and add-on services stay private to you</li>
            </ul>
          </div>

          <Link
            href="/shared"
            onClick={onClose}
            className="glass-button mt-auto w-fit px-5 py-2 text-sm"
          >
            Open shared list
          </Link>
        </div>
      </div>
    </div>
  );
}
