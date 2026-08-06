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
        {/* The logo itself, not type set to look like it. A giant ghosted
            watermark is conventionally monochrome, so the white silhouette is
            the right treatment here rather than a compromise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="auth-echo-word" src="/belpa-wordmark-light.png" alt="" />
      </div>

      {/* Soft top glow so the card sits in a luminous pocket */}
      <div className="auth-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]" aria-hidden />

      {children}
    </div>
  );
}
