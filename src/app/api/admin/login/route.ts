import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  validateAdminPassword,
} from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (!validateAdminPassword(parsed.data.secret)) {
      return NextResponse.json({ error: "Secret invalide" }, { status: 401 });
    }

    const token = createAdminSessionToken(parsed.data.secret);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Erreur de connexion" }, { status: 500 });
  }
}
