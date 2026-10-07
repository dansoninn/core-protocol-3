import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * For API routes that only an admin may call (the Mux routes). Returns null
 * when the caller is a signed-in admin, otherwise the response to send —
 * 401 signed out, 403 not an admin. Fails closed: any error reading the role
 * is a 403, as /admin does.
 *
 * The middleware protects /admin pages only, not /api, so every admin API
 * route must call this itself.
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return null;
}
