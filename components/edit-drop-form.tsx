"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SIZE_ORDER } from "@/lib/format";
import { CATEGORIES, FieldLabel, ImageSlot } from "./drop-form-bits";
import { StudioHeader } from "./studio-shell";

type DesignDraft = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: string;
  target_units: string;
  garment_category: string;
  sizes: string[];
};

type Props = {
  collection: {
    id: string;
    admin_token: string;
    slug: string;
    title: string;
    description: string;
    cover_image: string | null;
    deadline: string;
  };
  designs: DesignDraft[];
};

/** ISO timestamp → local yyyy-mm-dd for a date input. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EditDropForm({ collection, designs: initialDesigns }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description);
  const [cover, setCover] = useState(collection.cover_image ?? "");
  const [deadline, setDeadline] = useState(() => toDateInput(collection.deadline));
  const [designs, setDesigns] = useState(initialDesigns);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function patch(id: string, changes: Partial<DesignDraft>) {
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d)));
  }

  function toggleSize(d: DesignDraft, size: string) {
    const next = d.sizes.includes(size) ? d.sizes.filter((s) => s !== size) : [...d.sizes, size];
    patch(d.id, { sizes: SIZE_ORDER.filter((s) => next.includes(s)) });
  }

  async function save() {
    setError("");
    if (!title.trim()) return setError("Give the drop a name.");
    if (!deadline) return setError("Set a closing date.");
    const missing = designs.findIndex((d) => !d.image_url || !d.name.trim() || !d.price || !d.target_units);
    if (missing >= 0) return setError(`Design ${missing + 1} needs an image, name, price and target.`);
    if (designs.some((d) => d.sizes.length === 0)) return setError("Every design needs at least one size.");

    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cover_image: cover || designs[0]?.image_url || null,
          deadline: `${deadline}T23:59:00`,
          designs: designs.map((d) => ({
            id: d.id,
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
      if (!res.ok) throw new Error(json.error ?? "Could not save the changes");
      router.push(`/dashboard/${collection.admin_token}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the changes");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <StudioHeader
        right={
          <Link href={`/dashboard/${collection.admin_token}`} className="text-[12px] text-muted hover:text-ink">
            Back to dashboard
          </Link>
        }
      />

      <main className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="mb-12 max-w-2xl">
          <p className="label-xs text-muted">Edit drop</p>
          <h1 className="display mt-4 text-[clamp(2.4rem,5.2vw,3.6rem)]">{collection.title || "Untitled drop"}</h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
            Changes go live immediately. The showroom link stays the same, and existing reservations keep the price
            they were made at.
          </p>
        </div>

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
                    <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label className="block">
                    <FieldLabel hint="optional">Short introduction</FieldLabel>
                    <textarea
                      className="field resize-none"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
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
                <span className="text-[11px] text-muted">{designs.length} designs</span>
              </div>

              <div className="mt-8 space-y-14">
                {designs.map((d, index) => (
                  <div key={d.id} className="grid gap-7 sm:grid-cols-[180px_1fr]">
                    <div>
                      <ImageSlot
                        url={d.image_url}
                        onChange={(url) => patch(d.id, { image_url: url })}
                        label={`Design ${index + 1} image`}
                      />
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="label-xs text-muted">Design {String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <label className="block">
                          <FieldLabel>Name</FieldLabel>
                          <input
                            className="field"
                            value={d.name}
                            onChange={(e) => patch(d.id, { name: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <FieldLabel>Garment type</FieldLabel>
                          <select
                            className="field"
                            value={d.garment_category}
                            onChange={(e) => patch(d.id, { garment_category: e.target.value })}
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
                              onChange={(e) => patch(d.id, { price: e.target.value })}
                            />
                          </div>
                        </label>
                        <label className="block">
                          <FieldLabel hint="verified reservations">Goal to move to production</FieldLabel>
                          <input
                            className="field"
                            inputMode="numeric"
                            value={d.target_units}
                            onChange={(e) =>
                              patch(d.id, { target_units: e.target.value.replace(/[^0-9]/g, "") })
                            }
                          />
                        </label>
                      </div>
                      <label className="block">
                        <FieldLabel hint="optional">Description</FieldLabel>
                        <input
                          className="field"
                          value={d.description}
                          onChange={(e) => patch(d.id, { description: e.target.value })}
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

              <p className="mt-10 border-t border-line pt-4 text-[10.5px] leading-relaxed text-muted">
                Designs can&apos;t be added or removed after a drop is created.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-line bg-white/40 p-6">
              <p className="label-xs text-muted">Changes</p>
              <h3 className="mt-3 font-display text-2xl leading-tight">{title.trim() || "Untitled collection"}</h3>
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
                  <dt className="text-muted">Showroom</dt>
                  <dd className="truncate pl-3 text-right text-ink-soft">/drop/{collection.slug}</dd>
                </div>
              </dl>

              {error && (
                <p className="mt-5 border-l-2 border-rust pl-3 text-[12px] leading-relaxed text-rust">{error}</p>
              )}

              <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-primary mt-6 w-full">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link
                href={`/dashboard/${collection.admin_token}`}
                className="btn btn-ghost mt-2.5 w-full justify-center text-center"
              >
                Cancel
              </Link>
              <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
                Replacing a design image resets its YouCam reference, so new try-ons use the new garment shot.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
