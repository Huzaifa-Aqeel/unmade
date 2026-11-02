import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`text-[13px] font-medium tracking-[0.42em] uppercase ${className}`}>
      Unmade
    </Link>
  );
}

/** Public navigation. No studio links here — designers browse as guests. */
export function SiteHeader({
  right,
  transparent = false,
}: {
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-40 ${
        transparent ? "bg-paper/70" : "bg-paper/90"
      } backdrop-blur-md border-b border-line`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-6 text-[12px] text-muted">
          <Link href="/#drops" className="hidden hover:text-ink sm:inline">
            Explore
          </Link>
          <Link href="/studio/login" className="btn btn-primary !px-4 !py-2.5 !text-[10px]">
            Login
          </Link>
          {right}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
              A showroom for garments that don&apos;t exist yet. Reservations express interest only — no payment is
              collected.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-[12px] text-muted">
            <Link href="/studio" className="hover:text-ink">
              Designer studio
            </Link>
            <Link href="/#drops" className="hover:text-ink">
              Live drops
            </Link>
            <span>Try-on previews are simulations</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
