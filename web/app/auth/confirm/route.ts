import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Handles Supabase password-reset (and other OTP) email links.
//
// Supabase sends one of two formats depending on your project's auth settings:
//   PKCE flow  → ?code=...                    (newer default)
//   OTP flow   → ?token_hash=...&type=recovery (older / magic-link style)
//
// We try both so the route works regardless of which flow is active.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Log every param so you can see exactly what Supabase is sending
  // (visible in Vercel function logs / local terminal).
  console.log("[/auth/confirm] searchParams:", Object.fromEntries(searchParams));

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = createClient();

  // ── PKCE flow: Supabase sends ?code= ─────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A 'code' from a password-reset email lands here as type=recovery
      // when the Supabase email template uses the PKCE redirect.
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
    console.error("[/auth/confirm] exchangeCodeForSession error:", error.message);
  }

  // ── OTP / token_hash flow: Supabase sends ?token_hash=&type= ─────────────
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery" | "email" | "signup" | "invite" | "magiclink",
    });

    if (!error) {
      const dest = type === "recovery" ? "/auth/reset-password" : "/dashboard";
      return NextResponse.redirect(`${origin}${dest}`);
    }
    console.error("[/auth/confirm] verifyOtp error:", error.message);
  }

  // Nothing worked — send to login with an error
  return NextResponse.redirect(
    `${origin}/auth/login?error=Hlekkurinn+er+útrunninn`
  );
}
