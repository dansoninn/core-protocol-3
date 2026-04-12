import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Sync full_name from auth metadata into profiles (set at signup)
      const fullName = data.user.user_metadata?.full_name as string | undefined;
      if (fullName) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", data.user.id)
          .is("full_name", null); // only set if not already populated
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with an error hint
  return NextResponse.redirect(
    `${origin}/auth/login?error=Staðfesting mistókst. Reyndu að skrá þig aftur.`
  );
}
