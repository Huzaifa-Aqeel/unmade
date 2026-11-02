import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getPublishedCollections } from "@/lib/store";
import { daysLeft, formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const collections = getPublishedCollections();
  const featured = collections[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pt-14 pb-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-20 lg:pb-24">
          <div className="flex flex-col justify-between">
            <div className="rise">
              <p className="label-xs text-muted">Independent fashion · decided by demand</p>
              <h1 className="display mt-7 text-[clamp(3.4rem,8.4vw,6.6rem)]">
                Try it
                <br />
                before it
                <br />
                <span className="italic">exists.</span>
              </h1>
              <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-soft">
                Designers publish the garments they want to make. You see yourself wearing them, reserve the one you
                want, and that demand decides what gets produced.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/studio" className="btn btn-primary">
                  Launch a drop
                </Link>
                <Link href="#drops" className="btn btn-ghost">
                  Enter a showroom
                </Link>
              </div>
            </div>

            <dl className="mt-16 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                ["No inventory", "Nothing is made in advance"],
                ["No payment", "Reservations are interest"],
                ["No guesswork", "Demand before production"],
              ].map(([title, copy]) => (
                <div key={title}>
                  <dt className="text-[12px] font-medium">{title}</dt>
                  <dd className="mt-1.5 text-[11px] leading-relaxed text-muted">{copy}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="relative aspect-4/5 w-full overflow-hidden bg-paper-soft grain">
              {featured?.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.cover_image}
                  alt={featured.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full flex-col justify-between p-8">
                  <span className="label-xs text-muted">Showroom</span>
                  <p className="display text-[clamp(2.4rem,4vw,3.4rem)] leading-[0.95]">
                    A garment is
                    <br />
                    an argument.
                    <br />
                    <span className="italic text-rust">Make the case.</span>
                  </p>
                </div>
              )}
            </div>
            {featured && (
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/55 to-transparent p-5 text-white">
                <div>
                  <p className="label-xs !text-[9px] text-white/70">{featured.brand_name}</p>
                  <p className="mt-1.5 font-display text-2xl leading-tight">{featured.title}</p>
                </div>
                <Link
                  href={`/drop/${featured.slug}`}
                  className="border border-white/40 px-3 py-2 text-[10px] label-xs text-white hover:bg-white hover:text-ink"
                >
                  View drop
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="drops" className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <h2 className="display text-4xl">Live drops</h2>
          <p className="hidden text-[12px] text-muted sm:block">Unmanufactured concepts, open for reservations</p>
        </div>

        {collections.length === 0 ? (
          <div className="mt-10 border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="display text-3xl">The showroom is empty.</p>
            <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
              Be the first designer to put a collection in front of a real audience.
            </p>
            <Link href="/studio" className="btn btn-primary mt-7">
              Launch the first drop
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => {
              const left = daysLeft(c.deadline);
              return (
                <Link key={c.id} href={`/drop/${c.slug}`} className="group block">
                  <div className="relative aspect-4/5 overflow-hidden bg-paper-soft grain">
                    {c.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.cover_image}
                        alt={c.title}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-end p-5">
                        <span className="font-display text-3xl">Proposed</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 border border-black/10 bg-paper/90 px-2 py-1 text-[9px] label-xs">
                      {c.status === "closed" ? "Closed" : left > 0 ? `${left} days left` : "Closing today"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="label-xs !text-[9px] text-muted">{c.brand_name}</p>
                      <h3 className="mt-2 font-display text-2xl leading-tight">{c.title}</h3>
                      <p className="mt-1 text-[12px] text-muted">
                        {c.design_count} {c.design_count === 1 ? "design" : "designs"} · closes{" "}
                        {formatDateShort(c.deadline)}
                      </p>
                    </div>
                    <span className="mt-1 text-[12px] text-muted transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="how" className="border-y border-line bg-paper-soft/50">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-20">
          <p className="label-xs text-muted">How it works</p>
          <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                n: "01",
                title: "A designer launches",
                copy: "Three concepts, a proposed price, and the number of reservations needed to justify production.",
              },
              {
                n: "02",
                title: "You try them on",
                copy: "Upload one photo. See every design on yourself, side by side, before deciding.",
              },
              {
                n: "03",
                title: "Demand decides",
                copy: "One reservation per collection. The design with real interest moves to production planning.",
              },
            ].map((step) => (
              <div key={step.n} className="border-t border-ink pt-5">
                <span className="label-xs text-rust">{step.n}</span>
                <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <p className="display max-w-4xl text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02]">
          &ldquo;Don&apos;t manufacture what you hope people will buy.{" "}
          <span className="italic text-rust">Let customers show you what they want made.</span>&rdquo;
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/studio" className="btn btn-primary">
            Launch a drop
          </Link>
          <span className="text-[12px] text-muted">Free to launch · no payment processing</span>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
