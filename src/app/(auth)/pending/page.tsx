"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function PendingPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
      router.push("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    // Lives in (auth) so it inherits the same aurora shell as sign-in, and so
    // it is OUTSIDE (app) — the approval gate redirects here, and a page inside
    // the guarded layout would bounce against its own check forever.
    <div className="auth-card glass w-full max-w-sm rounded-2xl p-7 text-center shadow-[var(--shadow-float)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/belpa-wordmark.png"
        alt="Belpa"
        className="mx-auto h-7 w-auto"
      />

      <h1 className="mt-5 text-lg font-semibold text-ink">
        Your account is being set up
      </h1>

      {/* Deliberately not "you have been denied" or "awaiting approval".
          Every roofer reaching this screen was onboarded by hand, so from
          their side this is setup still in progress, which is true. Someone
          who signed up uninvited gets the same wording and simply never
          progresses — no signal worth probing, and nobody legitimate is made
          to feel suspected. */}
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        We finish setting up each account by hand so your pricing is right
        before any customer sees a quote. You’ll get an email the moment it’s
        ready.
      </p>

      <p className="mt-4 text-sm text-ink-soft">
        Need it sooner?{" "}
        <a
          href="mailto:hello@belpa.co.uk"
          className="font-semibold text-brand-600 hover:underline"
        >
          hello@belpa.co.uk
        </a>
      </p>

      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="btn-ghost mt-6 w-full rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
