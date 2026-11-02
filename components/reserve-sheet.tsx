"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import type { DesignWithStats } from "@/lib/store";

type Props = {
  design: DesignWithStats;
  collection: { id: string; title: string; deadline: string; status: string };
  onClose: () => void;
  onVerified?: () => void;
};

type Phase = "form" | "sending" | "confirm" | "switching" | "done";

export function ReserveSheet({ design, collection, onClose, onVerified }: Props) {
  const [email, setEmail] = useState("");
  const [size, setSize] = useState(design.sizes[Math.min(1, design.sizes.length - 1)] ?? design.sizes[0] ?? "");
  const [terms, setTerms] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState("");
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ token: string; message: string } | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function submit() {
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!size) return setError("Choose a size.");
    if (!terms) return setError("Please accept the reservation terms.");

    setPhase("sending");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_id: collection.id,
          design_id: design.id,
          email,
          preferred_size: size,
          terms: true,
        }),
      });
      const json = await res.json();

      if (res.status === 409 && json.code === "already_reserved") {
        setConflict({ token: json.manage_token, message: json.message });
        setPhase("confirm");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Could not reserve this design");

      setManageToken(json.manage_token);
      setVerifyUrl(json.verify_url ?? null);
      localStorage.setItem(`unmade_res_${collection.id}`, json.manage_token);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reserve this design");
      setPhase("form");
    }
  }

  async function switchToHere() {
    if (!conflict) return;
    setPhase("switching");
    try {
      const res = await fetch(`/api/reservations/${conflict.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", design_id: design.id, preferred_size: size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not move your reservation");
      localStorage.setItem(`unmade_res_${collection.id}`, conflict.token);
      setManageToken(conflict.token);
      setPhase("done");
      onVerified?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move your reservation");
      setPhase("confirm");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto bg-paper p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
          aria-label="Close"
        >
          ✕
        </button>

        {phase === "done" ? (
          <div className="py-4">
            <p className="label-xs text-rust">Reservation held</p>
            <h2 className="display mt-3 text-4xl">
              {verifyUrl ? "One step left." : "Check your inbox."}
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
              {verifyUrl
                ? "Confirm your email address to make this reservation count toward the production target."
                : `We sent a confirmation link to ${email}. Your reservation only counts once your email is verified.`}
            </p>

            <div className="mt-6 space-y-2 border-y border-line py-4 text-[12.5px]">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Design</span>
                <span className="text-right">{design.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Proposed price</span>
                <span>{money(design.price_cents)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Size</span>
                <span>{size}</span>
              </div>
            </div>

            {verifyUrl && (
              <a href={verifyUrl} className="btn btn-primary mt-6 w-full">
                Verify my email
              </a>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {manageToken && (
                <a href={`/reservation/${manageToken}`} className="btn btn-ghost flex-1">
                  Manage reservation
                </a>
              )}
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                Back to the drop
              </button>
            </div>

            <p className="mt-5 text-[10.5px] leading-relaxed text-muted">
              This design has not been manufactured. Your reservation expresses purchase interest at the proposed
              price. No payment is collected and production is not guaranteed.
            </p>
          </div>
        ) : (
          <>
            <p className="label-xs text-muted">Reserve</p>
            <h2 className="display mt-3 pr-8 text-3xl leading-tight sm:text-4xl">{design.name}</h2>
            <p className="mt-2 text-[13px] text-ink-soft">
              {money(design.price_cents)} · {design.reservations} of {design.target_units} reservations so far
            </p>

            {conflict ? (
              <div className="mt-6">
                <p className="border-l-2 border-rust pl-3 text-[13px] leading-relaxed text-ink-soft">
                  {conflict.message}
                </p>
                <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
                  One reservation per collection keeps your signal meaningful. You can move it here.
                </p>
                {error && <p className="mt-3 text-[12px] text-rust">{error}</p>}
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void switchToHere()}
                    disabled={phase === "switching"}
                    className="btn btn-primary w-full"
                  >
                    {phase === "switching" ? "Moving…" : `Move my reservation to ${design.name}`}
                  </button>
                  <a href={`/reservation/${conflict.token}`} className="btn btn-ghost w-full">
                    Keep my current reservation
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <p className="label-xs text-muted">Size</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {design.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`h-9 min-w-11 border px-3 text-[11px] transition-colors ${
                          size === s
                            ? "border-ink bg-ink text-paper"
                            : "border-line-strong text-ink-soft hover:border-ink"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-6 block">
                  <span className="label-xs text-muted">Email</span>
                  <input
                    className="field mt-2"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="mt-6 flex cursor-pointer items-start gap-3 border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-soft">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#16150f]"
                  />
                  <span>
                    I understand this design has not been manufactured. I&apos;m expressing intent to buy at{" "}
                    {money(design.price_cents)} if it&apos;s produced. No payment is taken now.
                  </span>
                </label>

                {error && <p className="mt-4 text-[12px] text-rust">{error}</p>}

                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={phase === "sending"}
                  className="btn btn-primary mt-6 w-full"
                >
                  {phase === "sending" ? "Reserving…" : "Reserve this design"}
                </button>
                <p className="mt-3 text-center text-[10.5px] text-muted">
                  One reservation per collection · cancel any time before close
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
