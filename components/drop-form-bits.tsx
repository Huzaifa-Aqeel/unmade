"use client";

import { useRef, useState } from "react";

export const CATEGORIES = [
  { value: "upper_body", label: "Top" },
  { value: "lower_body", label: "Bottom" },
  { value: "full_body", label: "Full body" },
  { value: "outer", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "auto", label: "Auto" },
];

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className="label-xs text-muted">{children}</span>
      {hint && <span className="text-[10px] text-muted/70">{hint}</span>}
    </div>
  );
}

export function ImageSlot({
  url,
  onChange,
  label,
  aspect = "aspect-4/5",
}: {
  url: string;
  onChange: (url: string) => void;
  label: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group relative w-full ${aspect} overflow-hidden border border-line bg-paper-soft text-left`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="text-lg leading-none text-muted">＋</span>
            <span className="label-xs !text-[9px] text-muted">{busy ? "Uploading…" : label}</span>
          </div>
        )}
        {url && (
          <span className="absolute inset-x-0 bottom-0 bg-black/45 py-2 text-center label-xs !text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            Replace image
          </span>
        )}
      </button>
      {!url && (
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Front-facing product shot, one garment, plain background.
        </p>
      )}
      {error && <p className="mt-1.5 text-[10px] text-rust">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
