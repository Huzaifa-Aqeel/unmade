"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudioAuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [brand, setBrand] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_name: brand, email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex gap-6 border-b border-line pb-3">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`label-xs transition-colors ${
              mode === m ? "text-ink" : "text-muted hover:text-ink-soft"
            }`}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6">
        {mode === "signup" && (
          <label className="block">
            <span className="label-xs text-muted">Brand name</span>
            <input
              className="field mt-2"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Beyond Basics"
              autoComplete="organization"
              required
            />
          </label>
        )}

        <label className="block">
          <span className="label-xs text-muted">Email</span>
          <input
            className="field mt-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="studio@beyondbasics.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="label-xs text-muted">Password</span>
          <input
            className="field mt-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
        </label>

        {error && <p className="border-l-2 border-rust pl-3 text-[12px] text-rust">{error}</p>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        Designer accounts are for launching drops and reading demand. Customers browse, try on and reserve without
        signing up.
      </p>
    </div>
  );
}
