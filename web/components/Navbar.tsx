"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userEmail?: string | null;
}

export default function Navbar({ userEmail }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-zinc-900 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight hover:text-zinc-300 transition-colors"
        >
          Core Protocol
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/exercises"
            className="text-sm text-zinc-300 hover:text-white transition-colors hidden sm:block"
          >
            Æfingabanki
          </Link>

          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-zinc-300 hover:text-white transition-colors hidden sm:block max-w-[180px] truncate"
                title={userEmail}
              >
                {userEmail}
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-zinc-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Útskráning
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="bg-white text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Innskráning
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
