import { authenticate, createSession, setSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const designer = authenticate(body?.email ?? "", body?.password ?? "");

  if (!designer) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const session = createSession(designer.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({ ok: true, studio: "/studio" });
}
