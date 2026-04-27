import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import ContentWrapper from "@/components/ContentWrapper";
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
      <body className={`${inter.className} ${bebasNeue.variable} min-h-screen`}>
        {/* Admin sidebar — only renders itself on /admin routes */}
        <Sidebar
          userEmail={user?.email ?? null}
          userFullName={fullName}
          isAdmin={isAdmin}
        />

        {/* Top bar — user-facing pages (hides itself on admin/auth/day-view) */}
        <TopBar
          userEmail={user?.email ?? null}
          userFullName={fullName}
        />

        {/* Content — offset for sidebar on admin desktop */}
        <ContentWrapper>
          {children}
        </ContentWrapper>

        {/* Bottom nav — all screen sizes, hidden on admin */}
        <BottomNav />
      </body>
    </html>
  );
}
