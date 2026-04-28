"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

interface Props {
  userEmail: string | null;
  userFullName: string | null;
}

const DAY_VIEW_RE = /^\/courses\/[^/]+\/weeks\/[^/]+\/days\/[^/]+/;

export default function TopBar({ userEmail, userFullName }: Props) {
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    DAY_VIEW_RE.test(pathname)
  ) {
    return null;
  }

  const displayName = userFullName?.trim() || userEmail || "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: 56,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-bebas)",
          fontSize: 22,
          color: "var(--text)",
          textDecoration: "none",
          letterSpacing: "0.06em",
        }}
      >
        CORE PROTOCOL
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
            borderRadius: 8,
          }}
          aria-label="Tilkynningar"
        >
          <Bell size={20} strokeWidth={1.5} />
        </button>

        {userEmail ? (
          <Link
            href="/profile"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--surface2)",
              border: "1.5px solid rgba(240,192,112,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            {initials}
          </Link>
        ) : (
          <Link
            href="/auth/login"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            Innskráning
          </Link>
        )}
      </div>
    </header>
  );
}
