"use client";

import { usePathname } from "next/navigation";

export default function ContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className={isAdmin ? "ml-60" : ""}>
      {children}
    </div>
  );
}
