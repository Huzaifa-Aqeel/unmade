"use client";

import { useState } from "react";
import Link from "next/link";
import { SIZE_ORDER } from "@/lib/format";
import { CATEGORIES, FieldLabel, ImageSlot } from "./drop-form-bits";

type DesignDraft = {
  key: string;
  name: string;
  description: string;
  image_url: string;
  price: string;
  target_units: string;
  garment_category: string;
  sizes: string[];
};

const emptyDesign = (): DesignDraft => ({
  key: crypto.randomUUID(),
  name: "",
  description: "",
  image_url: "",
  price: "",
  target_units: "25",
  garment_category: "outer",
  sizes: ["S", "M", "L"],
});

export function CreateDropForm({ brandName }: { brandName: string }) {
  const brand = brandName;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  });
  const [designs, setDesigns] = useState<DesignDraft[]>([emptyDesign()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(null);
  const [result, setResult] = useState<{ slug: string; admin_token: string; status: string } | null>(null);

  function patch(key: string, changes: Partial<DesignDraft>) {
    setDesigns((prev) => prev.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  }

  function toggleSize(d: DesignDraft, size: string) {
    const next = d.sizes.includes(size) ? d.sizes.filter((s) => s !== size) : [...d.sizes, size];
    patch(d.key, { sizes: SIZE_ORDER.filter((s) => next.includes(s)) });
  }

  async function submit(publish: boolean) {
    setError("");

    if (!title.trim()) return setError("Give the drop a name.");
    const missing = designs.findIndex((d) => !d.image_url || !d.name.trim() || !d.price || !d.target_units);
    if (missing >= 0) return setError(`Design ${missing + 1} needs an image, name, price and target.`);

    setSubmitting(publish ? "publish" : "draft");
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cover_image: cover || designs[0]?.image_url,
          deadline: `${deadline}T23:59:00`,
          publish,
          designs: designs.map((d) => ({
            name: d.name,
            description: d.description,
            image_url: d.image_url,
            price: d.price,
            target_units: d.target_units,
            garment_category: d.garment_category,
            sizes: d.sizes,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save the drop");
      setResult(json);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the drop");
    } finally {
      setSubmitting(null);
    }
  }

  if (result) {
    const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/drop/${result.slug}` : `/drop/${result.slug}`;
    const dashUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard/${result.admin_token}` : `/dashboard/${result.admin_token}`;
    const live = result.status === "published";

    return (
      <div className="rise mx-auto max-w-2xl">
        <p className="label-xs text-rust">{live ? "Drop is live" : "Draft saved"}</p>
        <h1 className="display mt-4 text-5xl sm:text-6xl">
          {live ? "Your showroom is open." : "Saved, not yet public."}
        </h1>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-soft">
          {live
            ? "Share the showroom link. Customers can try the designs on and reserve the one they want."
            : "Publish from your dashboard whenever the collection is ready to be seen."}
        </p>

        <div className="mt-9 space-y-5 border-t border-line pt-8">
          <div>
            <FieldLabel hint="send this to customers">Showroom link</FieldLabel>
            <div className="flex items-center gap-3 border border-line bg-white/40 px-4 py-3">
              <code className="flex-1 truncate text-[12px] text-ink-soft">{publicUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(publicUrl)}
                className="label-xs !text-[9px] text-muted hover:text-ink"
              >
                Copy
              </button>
            </div>
          </div>
          <div>
            <FieldLabel hint="keep this private">Dashboard link</FieldLabel>
            <div className="flex items-center gap-3 border border-line bg-white/40 px-4 py-3">
              <code className="flex-1 truncate text-[12px] text-ink-soft">{dashUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(dashUrl)}
                className="label-xs !text-[9px] text-muted hover:text-ink"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/dashboard/${result.admin_token}`} className="btn btn-primary">
            Open dashboard
          </Link>
          <Link href={`/drop/${result.slug}`} className="btn btn-ghost">
            View showroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-16 lg:grid-cols-[1fr_380px] lg:gap-20">
        <div className="space-y-16">
          <section>
            <div className="flex items-baseline gap-3 border-b border-line pb-3">
              <span className="label-xs text-rust">01</span>
              <h2 className="font-display text-2xl">The collection</h2>
            </div>
            <div className="mt-7 grid gap-8 sm:grid-cols-[220px_1fr]">
              <div>
                <FieldLabel>Cover</FieldLabel>
                <ImageSlot url={cover} onChange={setCover} label="Upload cover" />
              </div>
              <div className="space-y-7">
                <label className="block">
                  <FieldLabel>Collection name</FieldLabel>
                  <input
                    className="field"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="The Unreleased Collection"
                  />
                </label>
                <label className="block">
                  <FieldLabel hint="optional">Short introduction</FieldLabel>
                  <textarea
                    className="field resize-none"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Three jackets we can only afford to make if enough people want one."
                  />
                </label>
                <label className="block max-w-[220px]">
                  <FieldLabel>Reservations close</FieldLabel>
                  <input
                    className="field"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-baseline gap-3">
                <span className="label-xs text-rust">02</span>
                <h2 className="font-display text-2xl">The designs</h2>
              </div>
              <span className="text-[11px] text-muted">{designs.length} of 3</span>
            </div>

            <div className="mt-8 space-y-14">
              {designs.map((d, index) => (
                <div key={d.key} className="grid gap-7 sm:grid-cols-[180px_1fr]">
                  <div>
                    <ImageSlot
                      url={d.image_url}
                      onChange={(url) => patch(d.key, { image_url: url })}
                      label={`Design ${index + 1} image`}
                    />
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="label-xs text-muted">Design {String(index + 1).padStart(2, "0")}</span>
                      {designs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDesigns((prev) => prev.filter((x) => x.key !== d.key))}
                          className="text-[11px] text-muted underline decoration-line-strong underline-offset-4 hover:text-rust"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <label className="block">
                        <FieldLabel>Name</FieldLabel>
                        <input
                          className="field"
                          value={d.name}
                          onChange={(e) => patch(d.key, { name: e.target.value })}
                          placeholder="Midnight Jacket"
                        />
                      </label>
                      <label className="block">
                        <FieldLabel>Garment type</FieldLabel>
                        <select
                          className="field"
                          value={d.garment_category}
                          onChange={(e) => patch(d.key, { garment_category: e.target.value })}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <FieldLabel hint="USD">Proposed price</FieldLabel>
                        <div className="flex items-center gap-1 border-b border-line-strong focus-within:border-ink">
                          <span className="text-[15px] text-muted">$</span>
                          <input
                            className="field !border-0"
                            inputMode="decimal"
                            value={d.price}
                            onChange={(e) => patch(d.key, { price: e.target.value })}
                            placeholder="120"
                          />
                        </div>
                      </label>
                      <label className="block">
                        <FieldLabel hint="verified reservations">Goal to move to production</FieldLabel>
                        <input
                          className="field"
                          inputMode="numeric"
                          value={d.target_units}
                          onChange={(e) => patch(d.key, { target_units: e.target.value.replace(/[^0-9]/g, "") })}
                          placeholder="50"
                        />
                      </label>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-muted">
                      Each design has its own goal. Once this many reservations are verified, the design becomes
                      eligible for production on your dashboard — you still make the final call.
                    </p>
                    <label className="block">
                      <FieldLabel hint="optional">Description</FieldLabel>
                      <input
                        className="field"
                        value={d.description}
                        onChange={(e) => patch(d.key, { description: e.target.value })}
                        placeholder="Cropped wool jacket, structured shoulder, matte finish."
                      />
                    </label>
                    <div>
                      <FieldLabel>Sizes offered</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {SIZE_ORDER.map((size) => {
                          const active = d.sizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleSize(d, size)}
                              className={`h-9 min-w-11 border px-3 text-[11px] transition-colors ${
                                active
                                  ? "border-ink bg-ink text-paper"
                                  : "border-line-strong text-muted hover:border-ink hover:text-ink"
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {designs.length < 3 && (
              <button
                type="button"
                onClick={() => setDesigns((prev) => [...prev, emptyDesign()])}
                className="mt-10 w-full border border-dashed border-line-strong py-4 label-xs text-muted transition-colors hover:border-ink hover:text-ink"
              >
                ＋ Add another design
              </button>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line bg-white/40 p-6">
            <p className="label-xs text-muted">Ready to launch</p>
            <p className="mt-1 text-[11px] text-muted">{brand}</p>
            <h3 className="mt-3 font-display text-2xl leading-tight">
              {title.trim() || "Untitled collection"}
            </h3>
            <dl className="mt-6 space-y-3 border-t border-line pt-4 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-muted">Designs</dt>
                <dd>{designs.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Closes</dt>
                <dd>{deadline || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Production goals</dt>
                <dd>
                  {designs.reduce((sum, d) => sum + (Number(d.target_units) || 0), 0)} reservations total
                </dd>
              </div>
            </dl>

            {error && <p className="mt-5 border-l-2 border-rust pl-3 text-[12px] leading-relaxed text-rust">{error}</p>}

            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={submitting !== null}
              className="btn btn-primary mt-6 w-full"
            >
              {submitting === "publish" ? "Publishing…" : "Publish drop"}
            </button>
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={submitting !== null}
              className="btn btn-ghost mt-2.5 w-full"
            >
              {submitting === "draft" ? "Saving…" : "Save as draft"}
            </button>
            <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
              Designs are shown as proposals. Nothing is manufactured until you review demand after the closing date.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
