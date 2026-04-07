"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Rangt netfang eða lykilorð. Reyndu aftur.");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">
            Innskráning
          </h1>
          <p className="text-zinc-500 text-sm">
            Skráðu þig inn í Core Protocol
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Netfang
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              placeholder="þú@dæmi.is"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-zinc-700">
                Lykilorð
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white font-semibold py-2.5 rounded-xl hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60"
          >
            {loading ? "Hinkraðu..." : "Skrá inn"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Ekki með aðgang?{" "}
            <Link
              href="/auth/signup"
              className="text-zinc-900 font-semibold hover:underline"
            >
              Nýskrá
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
