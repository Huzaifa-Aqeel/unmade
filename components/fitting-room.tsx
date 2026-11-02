"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money } from "@/lib/format";
import type { DesignWithStats } from "@/lib/store";

export type TryOnState = {
  taskId: string;
  status: "pending" | "success" | "error" | "expired";
  url?: string;
  error?: string;
};

type Props = {
  designs: DesignWithStats[];
  collectionTitle: string;
  sessionId: string;
  initialDesignId: string | null;
  onClose: () => void;
  onReserve: (designId: string) => void;
};

const POLL_MS = 2500;
const MAX_WAIT_MS = 120_000;

function PhotoStep({
  onPhoto,
  busy,
}: {
  onPhoto: (file: File) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError("Please use a JPG or PNG.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Keep the photo under 10MB.");
        return;
      }
      if (!consent) {
        setError("Please accept the photo processing consent first.");
        return;
      }
      setError("");
      onPhoto(file);
    },
    [consent, onPhoto],
  );

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
      <p className="label-xs text-white/45">Step one</p>
      <h2 className="display mt-3 text-[clamp(2.2rem,5vw,3.2rem)] text-paper">Upload one photo.</h2>
      <p className="mt-3 text-[13px] leading-relaxed text-white/55">
        You&apos;ll reuse this photo for every design in this drop, and you can delete it at any time.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`mt-8 flex w-full flex-col items-center justify-center gap-3 border border-dashed px-6 py-16 transition-colors ${
          dragging ? "border-white/70 bg-white/5" : "border-white/25 hover:border-white/50"
        }`}
      >
        <span className="text-2xl leading-none text-white/60">＋</span>
        <span className="label-xs text-white/70">{busy ? "Preparing…" : "Choose a photo"}</span>
        <span className="max-w-[220px] text-center text-[11px] leading-relaxed text-white/35">
          JPG or PNG · under 10MB · drag and drop works too
        </span>
      </button>

      <ul className="mt-8 space-y-2.5 text-[12px] text-white/45">
        {[
          "Standing, facing the camera, full body or chest-up.",
          "One person only, face fully visible.",
          "Plain background and even light work best.",
        ].map((tip) => (
          <li key={tip} className="flex gap-3">
            <span className="text-white/25">—</span>
            {tip}
          </li>
        ))}
      </ul>

      <label className="mt-8 flex cursor-pointer items-start gap-3 text-[11.5px] leading-relaxed text-white/55">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-white"
        />
        <span>
          I understand this photo is sent to the try-on service to generate a simulation, is not stored permanently,
          and previews are deleted after 24 hours.
        </span>
      </label>

      {error && <p className="mt-4 text-[12px] text-[#e2a08d]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function FittingRoom({
  designs,
  collectionTitle,
  sessionId,
  initialDesignId,
  onClose,
  onReserve,
}: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [results, setResults] = useState<Record<string, TryOnState>>({});
  const [activeId, setActiveId] = useState<string | null>(initialDesignId ?? designs[0]?.id ?? null);
  const [compare, setCompare] = useState(false);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const activeDesign = useMemo(() => designs.find((d) => d.id === activeId) ?? designs[0], [activeId, designs]);
  const tried = Object.keys(results);

  const poll = useCallback(
    async (designId: string, taskId: string, startedAt: number) => {
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        setResults((prev) => ({
          ...prev,
          [designId]: { taskId, status: "error", error: "The preview took too long. Try again." },
        }));
        return;
      }
      try {
        const res = await fetch(`/api/tryon/${taskId}?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Something went wrong");

        if (json.status === "success") {
          setResults((prev) => ({ ...prev, [designId]: { taskId, status: "success", url: json.url } }));
          return;
        }
        if (json.status === "error") {
          setResults((prev) => ({
            ...prev,
            [designId]: { taskId, status: "error", error: json.error ?? "Try-on failed" },
          }));
          return;
        }
        timers.current[designId] = window.setTimeout(() => void poll(designId, taskId, startedAt), POLL_MS);
      } catch (e) {
        setResults((prev) => ({
          ...prev,
          [designId]: {
            taskId,
            status: "error",
            error: e instanceof Error ? e.message : "Try-on failed",
          },
        }));
      }
    },
    [sessionId],
  );

  const startTryOn = useCallback(
    async (design: DesignWithStats, file: File) => {
      setActiveId(design.id);
      setResults((prev) => ({ ...prev, [design.id]: { taskId: "", status: "pending" } }));

      const form = new FormData();
      form.append("photo", file);
      form.append("design_id", design.id);
      form.append("session_id", sessionId);
      form.append("consent", "true");

      try {
        const res = await fetch("/api/tryon", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not start the try-on");
        setResults((prev) => ({ ...prev, [design.id]: { taskId: json.id, status: "pending" } }));
        void poll(design.id, json.id, Date.now());
      } catch (e) {
        setResults((prev) => ({
          ...prev,
          [design.id]: {
            taskId: "",
            status: "error",
            error: e instanceof Error ? e.message : "Could not start the try-on",
          },
        }));
      }
    },
    [poll, sessionId],
  );

  const onPhoto = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setPhoto(file);
      setPhotoUrl(url);
      const design = designs.find((d) => d.id === activeId) ?? designs[0];
      if (design) void startTryOn(design, file);
    },
    [activeId, designs, startTryOn],
  );

  function changePhoto() {
    setPhoto(null);
    setPhotoUrl("");
    setResults({});
    setCompare(false);
    Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    timers.current = {};
  }

  const active = activeId ? results[activeId] : undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink text-paper">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="label-xs !text-[9px] text-white/40">Fitting room</p>
            <p className="mt-1.5 truncate font-display text-lg leading-none text-paper">{collectionTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            {photo && tried.length > 1 && (
              <button
                type="button"
                onClick={() => setCompare((v) => !v)}
                className="hidden border border-white/25 px-3 py-2 label-xs !text-[9px] text-white/70 hover:border-white/60 hover:text-white sm:block"
              >
                {compare ? "Back to try-on" : `Compare ${tried.length}`}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center border border-white/25 text-white/70 transition-colors hover:border-white hover:text-white"
              aria-label="Close fitting room"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {!photo ? (
        <PhotoStep onPhoto={onPhoto} busy={false} />
      ) : compare ? (
        <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8">
          <p className="label-xs text-white/40">Same photo · different designs</p>
          <h2 className="display mt-3 text-[clamp(2rem,4vw,3rem)]">Which one deserves to exist?</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tried.map((id) => {
              const design = designs.find((d) => d.id === id);
              const state = results[id];
              if (!design) return null;
              return (
                <div key={id} className="border border-white/12">
                  <div className="relative aspect-4/5 bg-white/5">
                    {state?.status === "success" && state.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={state.url} alt={`You wearing ${design.name}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-[11px] text-white/40">
                        {state?.status === "pending" ? "Generating…" : state?.error ?? "Not generated"}
                      </div>
                    )}
                    <span className="absolute bottom-3 left-3 border border-white/25 bg-black/40 px-2 py-1 text-[9px] label-xs text-white/80">
                      Simulated preview
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-xl leading-tight">{design.name}</h3>
                      <span className="text-[12px] text-white/60">{money(design.price_cents)}</span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      {design.reservations} / {design.target_units} reservations
                    </p>
                    <button
                      type="button"
                      onClick={() => onReserve(design.id)}
                      className="w-full border border-white/30 py-2.5 label-xs !text-[9px] text-white transition-colors hover:bg-white hover:text-ink"
                    >
                      Reserve this design
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCompare(false)}
              className="border border-white/25 px-4 py-2.5 label-xs !text-[9px] text-white/70 hover:text-white"
            >
              Try another design
            </button>
            <button
              type="button"
              onClick={changePhoto}
              className="px-1 py-2.5 text-[11px] text-white/35 underline decoration-white/20 underline-offset-4 hover:text-white/70"
            >
              Use a different photo
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[260px_1fr] lg:gap-12">
          <aside className="order-2 lg:order-1">
            <div className="flex items-center gap-3 border border-white/12 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Your photo" className="h-14 w-11 object-cover" />
              <div className="min-w-0">
                <p className="label-xs !text-[9px] text-white/40">Your photo</p>
                <button
                  type="button"
                  onClick={changePhoto}
                  className="mt-1 text-[11px] text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  Change
                </button>
              </div>
            </div>

            <p className="mt-7 label-xs !text-[9px] text-white/40">Designs in this drop</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {designs.map((d) => {
                const state = results[d.id];
                const isActive = d.id === activeId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveId(d.id)}
                    className={`flex min-w-[190px] items-center gap-3 border px-2.5 py-2 text-left transition-colors lg:min-w-0 ${
                      isActive ? "border-white/60 bg-white/5" : "border-white/12 hover:border-white/30"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.image_url} alt={d.name} className="h-12 w-10 shrink-0 object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] text-white/85">{d.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
                        {state?.status === "success" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#9fbf8f]" /> Tried on
                          </>
                        ) : state?.status === "pending" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-white/50 pulse-soft" /> Generating
                          </>
                        ) : state?.status === "error" ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#e2a08d]" /> Unavailable
                          </>
                        ) : (
                          "Not tried"
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 hidden text-[10.5px] leading-relaxed text-white/30 lg:block">
              Previews are AI simulations. Fit, fabric and finish may differ from the final garment. Photos are not
              kept by the designer.
            </p>
          </aside>

          <div className="order-1 lg:order-2">
            <div className="relative mx-auto aspect-4/5 max-h-[calc(100vh-220px)] w-full max-w-[560px] overflow-hidden bg-white/5">
              {active?.status === "success" && active.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.url}
                  alt={`You wearing ${activeDesign?.name ?? "this design"}`}
                  className="h-full w-full object-contain"
                />
              ) : active?.status === "pending" ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                  <div className="h-9 w-9 animate-spin rounded-full border border-white/20 border-t-white/80" />
                  <p className="font-display text-2xl">Putting it on you…</p>
                  <p className="max-w-[260px] text-[11.5px] leading-relaxed text-white/40">
                    Generating a simulation of {activeDesign?.name} on your photo. This usually takes 15–40 seconds.
                  </p>
                </div>
              ) : active?.status === "error" ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                  <p className="font-display text-2xl">That one didn&apos;t work.</p>
                  <p className="max-w-[280px] text-[12px] leading-relaxed text-white/50">{active.error}</p>
                  <button
                    type="button"
                    onClick={() => activeDesign && photo && void startTryOn(activeDesign, photo)}
                    className="border border-white/30 px-4 py-2.5 label-xs !text-[9px] text-white hover:bg-white hover:text-ink"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
                  <p className="font-display text-2xl">{activeDesign?.name}</p>
                  <p className="max-w-[260px] text-[11.5px] leading-relaxed text-white/40">
                    See this design on your photo. One upload works for every design in the drop.
                  </p>
                  <button
                    type="button"
                    onClick={() => activeDesign && photo && void startTryOn(activeDesign, photo)}
                    className="border border-white/30 px-4 py-2.5 label-xs !text-[9px] text-white hover:bg-white hover:text-ink"
                  >
                    Try it on
                  </button>
                </div>
              )}
              {active?.status === "success" && (
                <span className="absolute bottom-3 left-3 border border-white/25 bg-black/45 px-2 py-1 text-[9px] label-xs text-white/85">
                  Simulated preview
                </span>
              )}
            </div>

            <div className="mx-auto mt-5 flex max-w-[560px] flex-wrap items-end justify-between gap-4 border-t border-white/12 pt-4">
              <div>
                <p className="label-xs !text-[9px] text-white/40">{activeDesign?.name}</p>
                <p className="mt-2 font-display text-2xl leading-none">{money(activeDesign?.price_cents ?? 0)}</p>
                <p className="mt-2 text-[11px] text-white/40">
                  {activeDesign?.reservations} / {activeDesign?.target_units} reservations
                  {activeDesign?.targetReached ? " · target reached" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tried.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompare(true)}
                    className="border border-white/25 px-4 py-2.5 label-xs !text-[9px] text-white/75 hover:text-white sm:hidden"
                  >
                    Compare
                  </button>
                )}
                <button
                  type="button"
                  disabled={active?.status !== "success"}
                  onClick={() => activeDesign && onReserve(activeDesign.id)}
                  className="bg-paper px-5 py-3 label-xs !text-[9px] text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Reserve this design
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
