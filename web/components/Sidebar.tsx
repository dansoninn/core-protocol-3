"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  Hammer,
  Video,
  Users,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userEmail?: string | null;
  userFullName?: string | null;
  isAdmin?: boolean;
}

type NavItem = {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  href: string;
  tab: string | null;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "YFIRLIT",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin", tab: null },
    ],
  },
  {
    label: "EFNI",
    items: [
      { id: "exercises", label: "Æfingabanki", icon: Dumbbell, href: "/admin?tab=exercises", tab: "exercises" },
      { id: "courses", label: "Námskeið", icon: BookOpen, href: "/admin?tab=courses", tab: "courses" },
      { id: "builder", label: "Course Builder", icon: Hammer, href: "/admin?tab=builder", tab: "builder" },
      { id: "videos", label: "Myndbönd", icon: Video, href: "/admin?tab=videos", tab: "videos" },
    ],
  },
  {
    label: "NOTENDUR",
    items: [
      { id: "users", label: "Notendur", icon: Users, href: "/admin?tab=users", tab: "users" },
    ],
  },
  {
    label: "KERFI",
    items: [
      { id: "settings", label: "Stillingar", icon: Settings, href: "/admin?tab=settings", tab: "settings" },
      { id: "analytics", label: "Greining", icon: BarChart3, href: "/admin?tab=analytics", tab: "analytics" },
    ],
  },
];

export default function Sidebar({ userEmail, userFullName: userFullNameProp, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [fullName, setFullName] = useState<string | null>(userFullNameProp ?? null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

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

  // Detect active tab from URL (client-side only to avoid SSR issues)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActiveTab(params.get("tab"));
  }, [pathname]);

  // Only render on admin routes
  if (!pathname.startsWith("/admin")) return null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName = fullName || userEmail || "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  const isActive = (item: NavItem) => {
    if (item.tab === null) return activeTab === null;
    return activeTab === item.tab;
  };

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 h-screen z-40"
      style={{
        width: 240,
        backgroundColor: "#0d0f12",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: 20,
            color: "#fff",
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          Core Protocol
        </p>
        <p style={{ fontSize: 11, color: "var(--muted2)", marginTop: 3 }}>Admin Panel</p>
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 8px" }}>
        {(isAdmin ? navSections : []).map((section) => (
          <div key={section.label}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--muted2)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "16px 8px 6px",
              }}
            >
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    marginBottom: 2,
                    textDecoration: "none",
                    borderLeft: active
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    background: active
                      ? "rgba(240,192,112,0.08)"
                      : "transparent",
                    transition: "background 0.12s",
                  }}
                  className={!active ? "hover:bg-white/[0.04]" : ""}
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2 : 1.5}
                    style={{
                      color: active ? "var(--accent)" : "var(--muted2)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: active ? "var(--accent)" : "var(--muted2)",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {userEmail && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "#fff",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {fullName || userEmail}
              </p>
              {fullName && (
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--muted2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userEmail}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="hover:bg-white/[0.04]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted2)",
              fontSize: 13,
              fontWeight: 500,
              textAlign: "left",
              transition: "background 0.12s",
            }}
          >
            <LogOut size={16} strokeWidth={1.5} style={{ opacity: 0.6, flexShrink: 0 }} />
            Útskráning
          </button>
        </div>
      )}
    </aside>
  );
}
