"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Progress, StatusPill } from "./ui";
import { StudioHeader } from "./studio-shell";
import { formatDate, money } from "@/lib/format";
import type { CollectionAnalytics, DesignWithStats } from "@/lib/store";

type Collection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  brand_name: string;
  admin_token: string;
};

export function DropDashboard({
  collection,
  designs,
  analytics,
}: {
  collection: Collection;
  designs: DesignWithStats[];
  analytics: CollectionAnalytics;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isClosed = collection.status === "closed";
  const closedForReservations = isClosed || new Date(collection.deadline).getTime() <= Date.now();
  const totalTarget = designs.reduce((s, d) => s + d.target_units, 0);
  const eligible = designs.filter((d) => d.targetReached);

  async function setStatus(status: "published" | "closed") {
    setError("");
    setBusy(status);
    try {
      const res = await fetch(`/api/collections/${collection.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: collection.admin_token, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update the drop");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the drop");
    } finally {
      setBusy(null);
    }
  }

  async function decide(designId: string, decision: "production" | "declined" | "pending") {
    setError("");
    setBusy(designId + decision);
    try {
      const res = await fetch(`/api/designs/${designId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: collection.admin_token, decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save the decision");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the decision");
    } finally {
      setBusy(null);
    }
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/drop/${collection.slug}` : `/drop/${collection.slug}`;

  return (
    <div className="min-h-screen">
      <StudioHeader
        right={
          <>
            <Link href={`/drop/${collection.slug}`} className="hidden text-[12px] text-muted hover:text-ink sm:inline">
              View showroom
            </Link>
            {collection.status === "draft" && (
              <button
                type="button"
                onClick={() => void setStatus("published")}
                disabled={busy !== null}
                className="btn btn-primary !px-4 !py-2.5 !text-[10px]"
              >
                {busy === "published" ? "Publishing…" : "Publish"}
              </button>
            )}
            {collection.status === "published" && (
              <button
                type="button"
                onClick={() => void setStatus("closed")}
                disabled={busy !== null}
                className="btn btn-ghost !px-4 !py-2.5 !text-[10px]"
              >
                {busy === "closed" ? "Closing…" : "Close drop"}
              </button>
            )}
          </>
        }
      />

      <main className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-xs text-muted">
              {collection.brand_name} · {collection.status === "draft" ? "Draft" : isClosed ? "Closed" : "Live"}
            </p>
            <h1 className="display mt-4 max-w-2xl text-[clamp(2.4rem,5vw,4rem)]">{collection.title}</h1>
            <p className="mt-3 text-[12px] text-muted">
              Closing date {formatDate(collection.deadline)} · {designs.length} designs
              {!isClosed && (
                <>
                  {" · "}
                  <Link
                    href={`/dashboard/${collection.admin_token}/edit`}
                    className="underline decoration-line-strong underline-offset-4 hover:text-ink"
                  >
                    Edit drop
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 border border-line bg-white/40 px-4 py-3">
            <code className="max-w-[220px] truncate text-[11.5px] text-ink-soft">{shareUrl}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
              className="label-xs !text-[9px] text-muted hover:text-ink"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {collection.status === "draft" && (
          <p className="mt-6 border-l-2 border-rust pl-3 text-[12px] leading-relaxed text-ink-soft">
            This drop is a draft. Only you can see it. Publish when the concepts are ready for customers.
          </p>
        )}

        {error && <p className="mt-6 border-l-2 border-rust pl-3 text-[12px] text-rust">{error}</p>}

        <section className="mt-10 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          {[
            { label: "Verified reservations", value: analytics.totalReservations, note: `goals ${totalTarget}` },
            { label: "Virtual try-ons", value: analytics.totalTryons, note: "simulated previews" },
            { label: "Unique visitors", value: analytics.uniqueVisitors, note: "sessions in the showroom" },
            {
              label: "Designs eligible",
              value: eligible.length,
              note: "for production review",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-paper p-5 sm:p-6">
              <p className="label-xs !text-[9px] text-muted">{stat.label}</p>
              <p className="mt-4 font-display text-4xl tabular-nums">{stat.value}</p>
              <p className="mt-1.5 text-[10.5px] text-muted">{stat.note}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between border-b border-line pb-3">
            <h2 className="font-display text-2xl">Demand by design</h2>
            <p className="text-[11px] text-muted">Indicators of interest, not confirmed sales</p>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="text-left label-xs !text-[9px] text-muted">
                  <th className="py-4 pr-4 font-medium">Design</th>
                  <th className="py-4 pr-4 font-medium">Price</th>
                  <th className="py-4 pr-4 font-medium">Try-ons</th>
                  <th className="py-4 pr-4 font-medium">Reservations</th>
                  <th className="py-4 pr-4 font-medium">Goal</th>
                  <th className="py-4 pr-4 font-medium">Reservation rate</th>
                  <th className="py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => {
                  // Verified reservations out of the visitors who tried this design on.
                  // Not goal progress — that is the Goal column. Capped at 100%, since a
                  // reservation can be made without a try-on in the same session.
                  const rate =
                    d.tryonSessions > 0
                      ? Math.min(100, Math.round((d.reservations / d.tryonSessions) * 100))
                      : null;
                  return (
                    <tr key={d.id} className="border-t border-line align-middle">
                      <td className="py-5 pr-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={d.image_url} alt={d.name} className="h-14 w-11 object-cover" />
                          <div>
                            <p className="font-display text-lg leading-tight">{d.name}</p>
                            <p className="mt-0.5 text-[10.5px] text-muted">{d.sizes.join(" · ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 pr-4 text-[13px]">{money(d.price_cents)}</td>
                      <td className="py-5 pr-4 text-[13px] tabular-nums">{d.tryons}</td>
                      <td className="py-5 pr-4">
                        <div className="w-[130px]">
                          <Progress value={d.reservations} target={d.target_units} reached={d.targetReached} compact />
                          <p className="mt-1.5 text-[11px] tabular-nums text-muted">
                            {d.reservations} / {d.target_units}
                            {d.pending > 0 ? ` · ${d.pending} unverified` : ""}
                          </p>
                        </div>
                      </td>
                      <td className="py-5 pr-4 text-[13px] tabular-nums">{d.target_units}</td>
                      <td className="py-5 pr-4 text-[13px] tabular-nums">
                        {rate === null ? (
                          <>
                            <span className="text-muted">—</span>
                            <span className="mt-1 block text-[10.5px] text-muted">no try-ons</span>
                          </>
                        ) : (
                          <>
                            {rate}%
                            <span className="mt-1 block text-[10.5px] text-muted">
                              {d.reservations} of {d.tryonSessions} try-ons
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-5">
                        <StatusPill reached={d.targetReached} closed={closedForReservations} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-[10.5px] leading-relaxed text-muted">
            Reservation rate = verified reservations ÷ visitors who tried that design on. It answers how many
            try-ons turn into a reservation, not how close a design is to being made — goal progress is the
            reservations-over-goal bar in the same row.
          </p>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="border-b border-line pb-3">
              <h2 className="font-display text-2xl">Sizes customers want</h2>
            </div>
            {analytics.sizeBreakdown.length === 0 ? (
              <p className="mt-6 text-[12.5px] leading-relaxed text-muted">
                No verified reservations yet. Size preferences appear here as customers confirm.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {analytics.sizeBreakdown.map((row) => {
                  const max = Math.max(...analytics.sizeBreakdown.map((r) => r.count));
                  return (
                    <div key={row.size} className="flex items-center gap-4">
                      <span className="w-10 text-[12px] text-ink-soft">{row.size}</span>
                      <div className="h-2 flex-1 bg-line">
                        <div className="h-full bg-ink" style={{ width: `${(row.count / max) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-[12px] tabular-nums text-muted">{row.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-6 text-[10.5px] leading-relaxed text-muted">
              Photos and try-on previews are private to customers. This dashboard only sees aggregate counts.
            </p>
          </div>

          <div>
            <div className="flex items-end justify-between border-b border-line pb-3">
              <h2 className="font-display text-2xl">Production decisions</h2>
              <span className="text-[10.5px] text-muted">{isClosed ? "Drop closed" : "Close the drop first"}</span>
            </div>
            <div className="mt-5 space-y-3">
              {designs.map((d) => (
                <div key={d.id} className="border border-line bg-white/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium">{d.name}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {d.reservations} of {d.target_units} reservation goal
                        {d.targetReached ? " · goal reached" : ""}
                      </p>
                    </div>
                    {d.decision === "production" && (
                      <span className="border border-moss/30 bg-moss-soft px-2 py-1 text-[9px] label-xs text-moss">
                        Production planning
                      </span>
                    )}
                    {d.decision === "declined" && (
                      <span className="border border-line-strong px-2 py-1 text-[9px] label-xs text-muted">
                        Not produced
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!isClosed || busy !== null}
                      onClick={() => void decide(d.id, "production")}
                      className={`flex-1 border px-3 py-2 text-[10px] label-xs transition-colors ${
                        d.decision === "production"
                          ? "border-moss bg-moss text-paper"
                          : "border-line-strong text-ink-soft hover:border-ink"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {busy === d.id + "production" ? "Saving…" : "Move to production"}
                    </button>
                    <button
                      type="button"
                      disabled={!isClosed || busy !== null}
                      onClick={() => void decide(d.id, "declined")}
                      className={`flex-1 border px-3 py-2 text-[10px] label-xs transition-colors ${
                        d.decision === "declined"
                          ? "border-ink bg-ink text-paper"
                          : "border-line-strong text-ink-soft hover:border-ink"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {busy === d.id + "declined" ? "Saving…" : "Do not produce"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
              Decisions notify customers by email. Nothing is manufactured automatically — production is a separate
              business decision.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
