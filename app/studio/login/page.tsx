import Link from "next/link";
import { redirect } from "next/navigation";
import { currentDesigner } from "@/lib/auth";
import { StudioAuthForm } from "@/components/studio-auth-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Designer studio — Unmade" };

export default async function StudioLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const designer = await currentDesigner();
  const { next } = await searchParams;
  if (designer) redirect(next && next.startsWith("/") ? next : "/studio");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col justify-between border-line px-6 py-8 sm:px-10 lg:border-r">
        <Link href="/" className="text-[13px] font-medium uppercase tracking-[0.42em]">
          Unmade
        </Link>
        <div className="max-w-md py-16">
          <p className="label-xs text-muted">Designer studio</p>
          <h1 className="display mt-4 text-[clamp(2.4rem,5vw,3.6rem)]">
            Your drops,
            <br />
            <span className="italic">your demand.</span>
          </h1>
          <p className="mt-5 text-[13.5px] leading-relaxed text-ink-soft">
            Launch collections, watch which designs people actually want, and decide what gets made. Customers never
            need an account.
          </p>
        </div>
        <p className="text-[11px] text-muted">Try-on previews are simulations. No payment is collected.</p>
      </div>

      <div className="flex min-h-screen items-center px-6 py-12 sm:px-10">
        <StudioAuthForm next={next && next.startsWith("/") ? next : "/studio"} />
      </div>
    </div>
  );
}
