import { createDesigner, createSession, isValidEmail, normaliseEmail, setSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { brand_name?: string; email?: string; password?: string }
    | null;

  const brand = (body?.brand_name ?? "").trim();
  const email = normaliseEmail(body?.email ?? "");
  const password = body?.password ?? "";

  if (!brand) return NextResponse.json({ error: "Add your brand name." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  }

  const designer = createDesigner(email, brand, password);
  if (!designer) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const session = createSession(designer.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({ ok: true, studio: "/studio" });
}
