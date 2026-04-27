import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

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
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? null;
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="is">
      <body className={`${inter.className} ${bebasNeue.variable} bg-zinc-50 text-zinc-900 min-h-screen`}>
        {/* Top navbar — mobile only */}
        <div className="md:hidden">
          <Navbar userEmail={user?.email ?? null} userFullName={fullName} />
        </div>

        {/* Desktop sidebar */}
        <Sidebar
          userEmail={user?.email ?? null}
          userFullName={fullName}
          isAdmin={isAdmin}
        />

        {/* Main content — offset for sidebar on desktop, padded for bottom nav on mobile */}
        <div className="md:ml-60 pb-20 md:pb-0">
          {children}
        </div>

        {/* Bottom nav — mobile only */}
        <BottomNav />
      </body>
    </html>
  );
}
