"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userEmail?: string | null;
  userFullName?: string | null;
  isAdmin?: boolean;
}

export default function Sidebar({ userEmail, userFullName: userFullNameProp, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  // full_name from profiles — start with server-side prop, refresh client-side
  const [fullName, setFullName] = useState<string | null>(userFullNameProp ?? null);

  useEffect(() => {
    if (!userEmail) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setFullName(data?.full_name?.trim() || null);
    })();
  }, [userEmail]);

  // Only render on admin routes
  if (!pathname.startsWith("/admin")) return null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const displayName = fullName || userEmail || "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 h-screen w-60 z-40"
      style={{ backgroundColor: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div className="px-5 py-6 shrink-0">
        <p className="text-white font-semibold text-base tracking-tight">
          Core Protocol
        </p>
        <p className="text-zinc-500 text-xs mt-0.5">Admin Panel</p>
      </div>

      {/* Admin nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
              isActive("/admin")
                ? "bg-white/10 text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-normal"
            }`}
          >
            <ShieldCheck
              className={`w-[18px] h-[18px] shrink-0 transition-opacity ${
                isActive("/admin") ? "opacity-100" : "opacity-60"
              }`}
              strokeWidth={isActive("/admin") ? 2 : 1.5}
            />
            Admin
          </Link>
        )}
      </nav>

      {/* User footer */}
      {userEmail && (
        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-medium shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {fullName || userEmail}
              </p>
              {fullName && (
                <p className="text-zinc-500 text-[10px] truncate">{userEmail}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all text-sm font-normal"
          >
            <LogOut className="w-[18px] h-[18px] opacity-60 shrink-0" strokeWidth={1.5} />
            Útskráning
          </button>
        </div>
      )}
    </aside>
  );
}
