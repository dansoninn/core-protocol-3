"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Dumbbell, User } from "lucide-react";

const tabs = [
  { label: "Heim", href: "/dashboard", Icon: Home },
  { label: "Námskeið", href: "/courses", Icon: BookOpen },
  { label: "Æfingar", href: "/exercises", Icon: Dumbbell },
  { label: "Prófíll", href: "/profile", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 rounded-t-2xl border-t border-zinc-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-3">
        {tabs.map(({ label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors ${
                active
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-all ${active ? "stroke-[2.5px]" : "stroke-[1.5px]"}`}
              />
              <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-white" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
