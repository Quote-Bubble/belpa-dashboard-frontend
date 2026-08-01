"use client";

import { useState, useTransition } from "react";

import { deleteRoofer } from "@/lib/admin-actions";

export default function DeleteRooferButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-600 transition-colors hover:text-red-700 hover:underline"
      >
        Delete roofer
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-ink-soft">
        Delete <span className="font-semibold text-ink">{name}</span> and all
        their leads? This can’t be undone.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn-ghost rounded-full px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => start(() => deleteRoofer(id))}
          disabled={pending}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </div>
  );
}
