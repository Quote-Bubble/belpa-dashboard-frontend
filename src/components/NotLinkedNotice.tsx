/**
 * Shown when the signed-in user isn't a member of any roofer.
 *
 * This is the expected state straight after signup: RLS scopes every table by
 * `roofer_members`, so until someone links the account it legitimately sees
 * zero rows. Without this, the dashboard would just look broken/empty.
 */
export default function NotLinkedNotice({ userId }: { userId: string }) {
  return (
    <div className="surface rounded-2xl p-6 sm:p-8">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-2xl">
        🔑
      </div>
      <h2 className="font-display text-xl font-semibold text-ink">
        Your account isn’t linked to a roofer yet
      </h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        You’re signed in, but this account isn’t a member of any roofing company
        — so there are no leads to show. Contact support and quote reference{" "}
        <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-xs">
          {userId}
        </code>
        .
      </p>

      <p className="mt-4 text-sm text-muted">
        Reload this page once that’s done.
      </p>
    </div>
  );
}
