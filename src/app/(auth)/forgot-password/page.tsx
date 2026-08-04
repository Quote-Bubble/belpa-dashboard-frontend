"use client";

import { useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
          "/update-password",
        )}`,
      },
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="auth-card glass w-full max-w-sm rounded-2xl p-7 shadow-[var(--shadow-float)]">
      <div className="mb-6 text-center">
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">
          Belpa
        </p>
        <p className="mt-1 text-sm text-ink-soft">Reset your password</p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            If an account exists for that email, we&apos;ve sent a reset link.
            Check your inbox (and spam).
          </p>
          <p className="text-center text-sm text-muted">
            <Link href="/login" className="font-medium text-brand-600">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.co.uk"
              className="field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-1 w-full rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <p className="pt-2 text-center text-sm text-muted">
            <Link href="/login" className="font-medium text-brand-600">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
