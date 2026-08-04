/**
 * Shown when the signed-in user isn't a member of any roofer.
 *
 * This is the expected state straight after signup: RLS scopes every table by
 * `roofer_members`, so until someone links the account it legitimately sees
 * zero rows. Without this, the dashboard would just look broken/empty.
 */
export default function NotLinkedNotice({ userId }: { userId: string }) {
  // userId kept for support diagnostics but no longer shown — linking is by the
  // email the roofer signed up with, done from the admin console.
  void userId;
  return (
    <div className="surface rounded-2xl p-6 sm:p-8">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-2xl">
        👋
      </div>
      <h2 className="font-display text-xl font-semibold text-ink">
        Your dashboard is being set up
      </h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        You’re all signed in. We’re just connecting your account to your Belpa
        widget — once that’s done, your leads will land here automatically.
        Nothing more you need to do.
      </p>
      <p className="mt-4 text-sm text-muted">
        Sit tight, or drop us a message if it’s taking a while.
      </p>
    </div>
  );
}
