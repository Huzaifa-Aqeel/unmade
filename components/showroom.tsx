"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FittingRoom } from "./fitting-room";
import { ReserveSheet } from "./reserve-sheet";
import { Progress, StatusPill } from "./ui";
import { daysLeft, formatDate, money } from "@/lib/format";
import type { DesignWithStats } from "@/lib/store";

type CollectionView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  deadline: string;
  status: string;
  brand_name: string;
};

function sessionKey() {
  return "unmade_session";
}

export function Showroom({
  collection,
  designs,
}: {
  collection: CollectionView;
  designs: DesignWithStats[];
}) {
  const [sessionId, setSessionId] = useState("");
  const [fitting, setFitting] = useState(false);
  const [fittingDesign, setFittingDesign] = useState<string | null>(null);
  const [reserving, setReserving] = useState<string | null>(null);
  const [myToken, setMyToken] = useState<string | null>(null);

  const closed = collection.status === "closed" || new Date(collection.deadline).getTime() <= Date.now();
  const left = daysLeft(collection.deadline);

  useEffect(() => {
    let id = localStorage.getItem(sessionKey());
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(sessionKey(), id);
    }
    setSessionId(id);
    setMyToken(localStorage.getItem(`unmade_res_${collection.id}`));

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection_id: collection.id, session_id: id, type: "view" }),
    }).catch(() => {});
  }, [collection.id]);

  const openFitting = useCallback((designId: string | null) => {
    setFittingDesign(designId);
    setFitting(true);
  }, []);

  const reservingDesign = designs.find((d) => d.id === reserving) ?? null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="text-[13px] font-medium uppercase tracking-[0.42em]">
            Unmade
          </Link>
          <div className="flex items-center gap-5">
            <span className="hidden text-[12px] text-muted sm:inline">{collection.brand_name}</span>
            {myToken ? (
              <Link href={`/reservation/${myToken}`} className="btn btn-ghost !px-4 !py-2.5 !text-[10px]">
                My reservation
              </Link>
            ) : (
              <span
                className={`border px-3 py-2 label-xs !text-[9px] ${
                  closed ? "border-line-strong text-muted" : "border-ink/20 text-ink-soft"
                }`}
              >
                {closed ? "Closed" : left > 0 ? `${left} days left` : "Closing today"}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-16">
          <div className="rise">
            <p className="label-xs text-muted">{collection.brand_name} · proposed collection</p>
            <h1 className="display mt-5 text-[clamp(2.8rem,6.6vw,5.2rem)]">{collection.title}</h1>
            {collection.description && (
              <p className="mt-6 max-w-lg text-[14px] leading-relaxed text-ink-soft">{collection.description}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px] text-muted">
              <span>
                {designs.length} {designs.length === 1 ? "design" : "designs"}
              </span>
              <span>Reservations close {formatDate(collection.deadline)}</span>
              <span className="text-ink-soft">Nothing here is manufactured yet</span>
            </div>
            {!closed && (
              <button type="button" onClick={() => openFitting(designs[0]?.id ?? null)} className="btn btn-primary mt-8">
                Try the collection on
              </button>
            )}

            <div className="mt-12 hidden max-w-lg gap-8 border-t border-line pt-5 sm:grid sm:grid-cols-3">
              {[
                ["One photo", "Try every design on it"],
                ["One reservation", "Per collection, not per design"],
                ["Verified only", "Confirmed emails count"],
              ].map(([title, copy]) => (
                <div key={title}>
                  <p className="text-[12px]">{title}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-2.5">
              {designs.slice(0, 3).map((d, i) => (
                <div
                  key={d.id}
                  className={`relative overflow-hidden bg-paper-soft ${
                    i === 0 && designs.length === 3 ? "col-span-2 aspect-16/10" : "aspect-4/5"
                  } ${designs.length === 1 ? "col-span-2 aspect-4/3" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-right text-[9px] label-xs text-muted">Concept imagery</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:py-20">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <h2 className="display text-3xl sm:text-4xl">The designs</h2>
          <p className="hidden text-[12px] text-muted sm:block">Reserve only what you&apos;d actually wear</p>
        </div>

        <div className="mt-10 space-y-16 lg:space-y-24">
          {designs.map((d, index) => (
            <article key={d.id} className="grid gap-8 lg:grid-cols-2 lg:gap-14">
              <div className={`relative ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                <div className="relative aspect-4/5 overflow-hidden bg-paper-soft grain">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                  <span className="absolute left-4 top-4 border border-black/10 bg-paper/90 px-2 py-1 text-[9px] label-xs">
                    Proposed · not manufactured
                  </span>
                </div>
              </div>

              <div className={`flex flex-col justify-center ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="label-xs text-muted">
                      Design {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 font-display text-[clamp(2rem,3.6vw,2.9rem)] leading-none">{d.name}</h3>
                  </div>
                  <p className="whitespace-nowrap font-display text-2xl">{money(d.price_cents)}</p>
                </div>

                {d.description && (
                  <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-ink-soft">{d.description}</p>
                )}

                <div className="mt-7 max-w-md">
                  <Progress value={d.reservations} target={d.target_units} reached={d.targetReached} />
                  <div className="mt-3 flex items-center justify-between">
                    <StatusPill reached={d.targetReached} closed={closed && d.decision === "pending"} />
                    <span className="text-[11px] text-muted">
                      {d.sizes.join(" · ")}
                    </span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  {closed ? (
                    <span className="btn btn-ghost cursor-default">Reservations closed</span>
                  ) : (
                    <>
                      <button type="button" onClick={() => openFitting(d.id)} className="btn btn-primary">
                        Try it on
                      </button>
                      <button type="button" onClick={() => setReserving(d.id)} className="btn btn-ghost">
                        Reserve
                      </button>
                    </>
                  )}
                  {d.decision === "production" && (
                    <span className="self-center text-[11px] text-moss">Moved to production planning</span>
                  )}
                  {d.decision === "declined" && (
                    <span className="self-center text-[11px] text-muted">Not produced in this drop</span>
                  )}
                </div>

                {!closed && (
                  <p className="mt-5 max-w-sm text-[11px] leading-relaxed text-muted">
                    Reservation is an expression of interest at the proposed price. No payment is collected and
                    production is not guaranteed.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper-soft/60">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-xs text-muted">Your role in this</p>
            <p className="display mt-4 max-w-2xl text-[clamp(1.8rem,3.4vw,2.8rem)] leading-tight">
              Every verified reservation is evidence that this garment should exist.
            </p>
          </div>
          <div className="shrink-0 text-[12px] leading-relaxed text-muted lg:text-right">
            <p>One reservation per collection.</p>
            <p>Switch designs any time before close.</p>
            <p className="mt-2">Deadline {formatDate(collection.deadline)}</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-8 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Try-on previews are AI simulations, not photographs of a finished product.</span>
          <Link href="/" className="hover:text-ink">
            Unmade
          </Link>
        </div>
      </footer>

      {fitting && sessionId && (
        <FittingRoom
          designs={designs}
          collectionTitle={collection.title}
          sessionId={sessionId}
          initialDesignId={fittingDesign}
          onClose={() => setFitting(false)}
          onReserve={(id) => {
            setFitting(false);
            setReserving(id);
          }}
        />
      )}

      {reservingDesign && (
        <ReserveSheet
          design={reservingDesign}
          collection={collection}
          onClose={() => {
            setReserving(null);
            const token = localStorage.getItem(`unmade_res_${collection.id}`);
            if (token) setMyToken(token);
          }}
        />
      )}
    </div>
  );
}
