"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/quotes");
    router.refresh();
  };

  return (
    <div className="auth-card glass w-full max-w-sm rounded-2xl p-7 shadow-[var(--shadow-float)]">
      <div className="mb-6 text-center">
        <p className="font-display text-2xl font-semibold tracking-tight text-ink">
          Quoter
        </p>
        <p className="mt-1 text-sm text-ink-soft">Choose a new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="field w-full px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
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
          {loading ? "Saving…" : "Update password"}
        </button>

        <p className="pt-2 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-brand-600">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
