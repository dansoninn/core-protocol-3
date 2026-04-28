"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ProfileThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--surface2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {isLight ? "☀️" : "🌙"}
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text)",
        }}
      >
        Útlit
      </span>

      {/* Toggle switch */}
      <div
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 12,
          background: isLight ? "var(--accent)" : "var(--surface2)",
          border: "1px solid var(--border)",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: isLight ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isLight ? "#fff" : "var(--muted2)",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </button>
  );
}
