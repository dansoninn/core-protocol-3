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

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 64,
        background: "rgba(10,12,15,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
        {tabs.map(({ label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                textDecoration: "none",
                color: active ? "var(--accent)" : "var(--muted)",
                paddingTop: 8,
                paddingBottom: 8,
                position: "relative",
              }}
            >
              {/* Active indicator line */}
              {active && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 20,
                    height: 2,
                    borderRadius: 999,
                    background: "var(--accent)",
                  }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.02em",
                }}
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
