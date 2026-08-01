"use client";

import { useFormStatus } from "react-dom";

import { createRoofer } from "@/lib/admin-actions";

const field =
  "field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted";
const label = "mb-1.5 block text-sm font-medium text-ink";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary rounded-full px-4 py-2.5 text-sm font-semibold"
    >
      {pending ? "Adding…" : "Add roofer"}
    </button>
  );
}

export default function AddRooferForm() {
  return (
    <form action={createRoofer} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={label} htmlFor="name">
          Company name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ridgeway Roofing"
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="website">
          Website <span className="text-muted">(optional)</span>
        </label>
        <input
          id="website"
          name="website"
          placeholder="https://ridgewayroofing.co.uk"
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="contact_name">
          Contact <span className="text-muted">(optional)</span>
        </label>
        <input
          id="contact_name"
          name="contact_name"
          placeholder="Dave"
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="contact_phone">
          Phone <span className="text-muted">(optional)</span>
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          placeholder="07700 900123"
          className={field}
        />
      </div>
      <div className="flex items-end justify-end sm:col-span-1 sm:col-start-2">
        <SubmitButton />
      </div>
    </form>
  );
}
