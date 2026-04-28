"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSignOut() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      style={{
        width: "100%",
        padding: 14,
        background: "transparent",
        border: "1px solid rgba(255,0,0,0.2)",
        borderRadius: 14,
        color: "rgba(255,80,80,0.8)",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 8,
      }}
    >
      Útskráning
    </button>
  );
}
