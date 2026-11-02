import Link from "next/link";

/**
 * Studio navigation. Only designer destinations — no public browsing links.
 * Safe to use from both server and client components.
 */
export function StudioHeader({
  right,
  dashboardHref,
}: {
  right?: React.ReactNode;
  dashboardHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/studio" className="text-[13px] font-medium uppercase tracking-[0.42em]">
          Unmade
        </Link>
        <nav className="flex items-center gap-5 text-[12px] text-muted">
          {dashboardHref && (
            <Link href={dashboardHref} className="hover:text-ink">
              Dashboard
            </Link>
          )}
          <Link href="/studio" className="hover:text-ink">
            My studio
          </Link>
          <Link href="/studio/profile" className="hidden hover:text-ink sm:inline">
            Profile
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-[12px] text-muted hover:text-ink">
              Sign out
            </button>
          </form>
          {right}
        </nav>
      </div>
    </header>
  );
}
