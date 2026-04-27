import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main
        style={{ maxWidth: 480, margin: "0 auto", padding: "28px 16px 80px" }}
        className="sm:px-6"
      >
        <Link
          href="/profile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--muted2)",
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Til baka í prófíl
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: 36,
            color: "var(--text)",
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          Stillingar
        </h1>

        <SettingsClient
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
        />
      </main>
    </div>
  );
}
