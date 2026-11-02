import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="label-xs text-muted">404</p>
      <h1 className="display mt-5 text-[clamp(2.6rem,6vw,4.4rem)]">This drop isn&apos;t here.</h1>
      <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
        The collection may have been unpublished, or the link is no longer active.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Back to the showroom
      </Link>
    </div>
  );
}
