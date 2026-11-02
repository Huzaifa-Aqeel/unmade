import { getDb, now, uid } from "./db";

/**
 * Email delivery. Uses Resend when RESEND_API_KEY is configured.
 * Otherwise messages are written to a local outbox so the whole flow still
 * works in development (the UI surfaces the action link directly).
 */
export async function sendMail(opts: { to: string; subject: string; body: string; link?: string }) {
  const db = getDb();
  const key = process.env.RESEND_API_KEY;
  let delivered = 0;

  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Unmade <hello@unmade.app>",
          to: [opts.to],
          subject: opts.subject,
          text: opts.body,
        }),
      });
      if (res.ok) delivered = 1;
    } catch {
      delivered = 0;
    }
  }

  db.prepare(
    `INSERT INTO outbox (id, to_email, subject, body, link, delivered, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(uid("mail_"), opts.to, opts.subject, opts.body, opts.link ?? null, delivered, now());

  return { delivered: Boolean(delivered) };
}

export function appUrl(path = ""): string {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
