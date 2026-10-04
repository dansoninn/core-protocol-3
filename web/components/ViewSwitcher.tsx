"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, ArrowLeft, ShieldCheck } from "lucide-react";

interface Props {
  /** Comes from the server-side profile lookup in the root layout. */
  isAdmin: boolean;
  /**
   * "banner" — slim bar shown across the user-facing app.
   * "sidebar" — control inside the admin panel that opens the user view.
   */
  variant: "banner" | "sidebar";
}

/** Height of the admin banner, in px. Kept in sync with TopBar's sticky offset. */
export const VIEW_SWITCHER_HEIGHT = 36;

/**
 * True when the admin banner occupies the top of the page. TopBar uses this to
 * sit below the banner instead of underneath it.
 */
export function showsAdminBanner(pathname: string, isAdmin: boolean): boolean {
  if (!isAdmin) return false;
  return !pathname.startsWith("/admin") && !pathname.startsWith("/auth");
}

export default function ViewSwitcher({ isAdmin, variant }: Props) {
  const pathname = usePathname();

  // Never render anything for non-admins.
  if (!isAdmin) return null;

  if (variant === "sidebar") {
    // Only meaningful inside the admin panel.
    if (!pathname.startsWith("/admin")) return null;

    return (
      <Link
        href="/dashboard"
        className="hover:bg-white/[0.04]"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "8px 10px",
          borderRadius: 10,
          marginBottom: 4,
          textDecoration: "none",
          background: "transparent",
          color: "var(--muted2)",
          fontSize: 13,
          fontWeight: 500,
          transition: "background 0.12s",
        }}
      >
        <Eye size={16} strokeWidth={1.5} style={{ opacity: 0.6, flexShrink: 0 }} />
        Skoða notendasýn
      </Link>
    );
  }

  if (!showsAdminBanner(pathname, isAdmin)) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: VIEW_SWITCHER_HEIGHT,
        // Translucent gold composited over the opaque page background, so the
        // bar stays opaque while content scrolls underneath it.
        background: "var(--bg)",
        backgroundImage:
          "linear-gradient(var(--accent-dim), var(--accent-dim))",
        borderBottom: "1px solid var(--accent-line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        }}
      >
        <ShieldCheck
          size={14}
          strokeWidth={2}
          style={{ color: "var(--accent)", flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Admin — skoðar notendasýn
        </span>
      </div>

      <Link
        href="/admin"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          flexShrink: 0,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid var(--accent-line)",
          background: "transparent",
          color: "var(--accent)",
          fontSize: 11,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Stjórnborð
      </Link>
    </div>
  );
}
