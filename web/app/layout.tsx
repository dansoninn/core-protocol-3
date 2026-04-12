import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Core Protocol — Þjálfunarnámskeið",
  description: "Veldu markmið þitt og við finnum námskeið fyrir þig.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? null;
  }

  return (
    <html lang="is">
      <body className={`${inter.className} bg-zinc-50 text-zinc-900 min-h-screen`}>
        <Navbar userEmail={user?.email ?? null} userFullName={fullName} />
        <div className="pb-16 md:pb-0">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
