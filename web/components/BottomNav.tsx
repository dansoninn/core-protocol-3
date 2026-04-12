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
      className="block md:hidden rounded-t-2xl border-t border-white/10"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "#0d1117",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-3">
        {tabs.map(({ label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
                active ? "bg-white/10 text-white" : "text-zinc-400"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-opacity ${
                  active ? "opacity-100" : "opacity-60"
                }`}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={`text-[10px] tracking-wide ${
                  active ? "font-medium" : "font-normal"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
