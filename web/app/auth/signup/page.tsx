"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Lykilorðin stemma ekki.");
      return;
    }
    if (password.length < 6) {
      setError("Lykilorð verður að vera a.m.k. 6 stafir.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">
            Staðfestu netfangið þitt
          </h1>
          <p className="text-zinc-500 text-sm">
            Við sendum þér staðfestingarpóst á{" "}
            <strong className="text-zinc-700">{email}</strong>. Smelltu á
            hlekkinn í póstinum til að klára skráningu.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-6 text-sm text-zinc-900 font-semibold hover:underline"
          >
            Til baka í innskráningu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">
            Búa til aðgang
          </h1>
          <p className="text-zinc-500 text-sm">
            Skráðu þig og byrjaðu þjálfunina
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
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Lykilorð
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              placeholder="A.m.k. 6 stafir"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Staðfestu lykilorð
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
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
            {loading ? "Hinkraðu..." : "Nýskrá"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Ertu nú þegar með aðgang?{" "}
            <Link
              href="/auth/login"
              className="text-zinc-900 font-semibold hover:underline"
            >
              Skrá inn
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
