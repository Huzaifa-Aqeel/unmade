"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, money } from "@/lib/format";

type DesignOption = {
  id: string;
  name: string;
  image_url: string;
  price_cents: number;
  sizes: string[];
  target_units: number;
};

type Props = {
  token: string;
  verifiedFlash: boolean;
  errorFlash: string | null;
  collection: {
    id: string;
    title: string;
    slug: string;
    deadline: string;
    status: string;
    brand_name: string;
  };
  reservation: {
    id: string;
    email: string;
    status: string;
    preferred_size: string;
    price_cents: number;
    design_id: string;
    verified_at: string | null;
  };
  currentDesign: { id: string; name: string; image_url: string };
  designs: DesignOption[];
};

export function ReservationManager({
  token,
  verifiedFlash,
  errorFlash,
  collection,
  reservation,
  currentDesign,
  designs,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "switch" | "cancel">("idle");
  const [targetId, setTargetId] = useState(reservation.design_id);
  const [size, setSize] = useState(reservation.preferred_size);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = collection.status === "published" && new Date(collection.deadline).getTime() > Date.now();
  const active = reservation.status !== "cancelled";
  const target = designs.find((d) => d.id === targetId) ?? designs[0];

  async function patch(body: Record<string, unknown>) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update your reservation");
      setMode("idle");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your reservation");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    reservation.status === "verified"
      ? "Verified"
      : reservation.status === "cancelled"
        ? "Cancelled"
        : "Awaiting verification";

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
      <div>
        <p className="label-xs text-muted">{collection.brand_name}</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,5vw,3.8rem)]">
          {active ? "Your reservation" : "Reservation closed"}
        </h1>

        {errorFlash === "invalid" && (
          <p className="mt-5 border-l-2 border-rust pl-3 text-[12.5px] text-rust">
            That confirmation link isn&apos;t valid. Use the link from your email.
          </p>
        )}
        {verifiedFlash && reservation.status === "verified" && (
          <p className="mt-5 border-l-2 border-moss pl-3 text-[12.5px] leading-relaxed text-moss">
            Email confirmed. Your reservation now counts toward the production target.
          </p>
        )}

        <div className="mt-8 flex items-start gap-6 border-y border-line py-7">
          <div className="h-32 w-24 shrink-0 overflow-hidden bg-paper-soft">
            {currentDesign.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentDesign.image_url} alt={currentDesign.name} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <span
              className={`inline-block border px-2 py-1 text-[9px] label-xs ${
                reservation.status === "verified"
                  ? "border-moss/30 bg-moss-soft text-moss"
                  : reservation.status === "cancelled"
                    ? "border-line-strong text-muted"
                    : "border-rust/30 bg-rust-soft text-rust"
              }`}
            >
              {statusLabel}
            </span>
            <h2 className="mt-3 font-display text-3xl leading-none">{currentDesign.name}</h2>
            <p className="mt-2 text-[12.5px] text-ink-soft">
              {money(reservation.price_cents)} · size {reservation.preferred_size}
            </p>
            <p className="mt-1.5 text-[11.5px] text-muted">Reserved by {reservation.email}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-2.5 text-[12.5px]">
          <div className="flex justify-between gap-4 border-b border-line pb-2.5">
            <dt className="text-muted">Reservations close</dt>
            <dd>{formatDate(collection.deadline)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-2.5">
            <dt className="text-muted">Email verified</dt>
            <dd>{reservation.verified_at ? formatDate(reservation.verified_at) : "Not yet"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Payment taken</dt>
            <dd>$0 — reservation only</dd>
          </div>
        </dl>

        {reservation.status === "pending" && (
          <p className="mt-6 max-w-md border-l-2 border-rust pl-3 text-[12px] leading-relaxed text-ink-soft">
            Your reservation isn&apos;t counted yet. Open the confirmation email and tap the verify link — until then
            this design&apos;s progress won&apos;t include you.
          </p>
        )}

        {error && <p className="mt-5 text-[12px] text-rust">{error}</p>}

        {active && (
          <div className="mt-9">
            {mode === "idle" && (
              <div className="flex flex-wrap gap-2.5">
                <Link href={`/drop/${collection.slug}`} className="btn btn-ghost">
                  Back to the drop
                </Link>
                {open && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetId(reservation.design_id);
                        setSize(reservation.preferred_size);
                        setMode("switch");
                      }}
                      className="btn btn-primary"
                    >
                      Change design
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("cancel")}
                      className="px-2 py-3 text-[11px] text-muted underline decoration-line-strong underline-offset-4 hover:text-rust"
                    >
                      Cancel reservation
                    </button>
                  </>
                )}
              </div>
            )}

            {mode === "switch" && (
              <div className="border border-line bg-white/40 p-5">
                <p className="label-xs text-muted">Move your reservation</p>
                <div className="mt-4 space-y-2">
                  {designs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setTargetId(d.id);
                        setSize(d.sizes[0] ?? "");
                      }}
                      className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                        targetId === d.id ? "border-ink bg-paper" : "border-line hover:border-line-strong"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.image_url} alt={d.name} className="h-12 w-10 object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px]">{d.name}</span>
                        <span className="text-[11px] text-muted">{money(d.price_cents)}</span>
                      </span>
                      <span
                        className={`h-3 w-3 rounded-full border ${
                          targetId === d.id ? "border-ink bg-ink" : "border-line-strong"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {target && (
                  <div className="mt-5">
                    <p className="label-xs text-muted">Size</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {target.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`h-9 min-w-11 border px-3 text-[11px] ${
                            size === s ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !size}
                    onClick={() => void patch({ action: "switch", design_id: targetId, preferred_size: size })}
                    className="btn btn-primary !px-5 !py-3"
                  >
                    {busy ? "Saving…" : "Confirm change"}
                  </button>
                  <button type="button" onClick={() => setMode("idle")} className="btn btn-ghost">
                    Keep current
                  </button>
                </div>
              </div>
            )}

            {mode === "cancel" && (
              <div className="border border-line bg-white/40 p-5">
                <p className="font-display text-xl">Cancel this reservation?</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  Your reservation will be removed from {currentDesign.name}&apos;s demand count. You can reserve
                  again while the drop is open.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patch({ action: "cancel" })}
                    className="btn btn-primary !px-5 !py-3"
                  >
                    {busy ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button type="button" onClick={() => setMode("idle")} className="btn btn-ghost">
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="lg:pt-16">
        <div className="border border-line bg-white/40 p-6">
          <p className="label-xs text-muted">What this reservation means</p>
          <ul className="mt-4 space-y-3 text-[11.5px] leading-relaxed text-ink-soft">
            {[
              "This design has not been manufactured yet.",
              "You're expressing intent to buy at the proposed price.",
              "No payment is collected and no order is created.",
              "Production is not guaranteed, even if the target is met.",
              "One reservation per collection — switching moves your vote.",
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <span className="text-muted">—</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
