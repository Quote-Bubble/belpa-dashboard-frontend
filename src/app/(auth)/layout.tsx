export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      {/* Branded aurora wash */}
      <div className="auth-bg pointer-events-none absolute inset-0 -z-40" aria-hidden />
      <div
        className="auth-aurora pointer-events-none absolute inset-0 -z-30 overflow-hidden"
        aria-hidden
      >
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>

      {/* Faint dot texture */}
      <div className="dot-grid pointer-events-none absolute inset-0 -z-20 opacity-60" aria-hidden />

      {/* Giant dissolving wordmark, bottom */}
      <div
        className="auth-echo pointer-events-none absolute inset-x-0 bottom-0 -z-20 overflow-hidden"
        aria-hidden
      >
        {/* Lowercase to match the logo's own casing — this is a rendering of
            the wordmark, not prose. Same device as the landing's footer echo. */}
        <span className="auth-echo-word">belpa</span>
      </div>

      {/* Soft top glow so the card sits in a luminous pocket */}
      <div className="auth-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" aria-hidden />

      {children}
    </div>
  );
}
