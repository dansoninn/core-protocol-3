"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  const [theme, setTheme] = useState<Theme>("dark");

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cp-theme") as Theme | null;
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Apply class to <html> — admin always stays dark
  useEffect(() => {
    if (isAdmin) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.toggle("light", theme === "light");
    }
  }, [theme, isAdmin]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("cp-theme", next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
