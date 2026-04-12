"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  fullName: string | null;
}

export default function SettingsClient({ email, fullName }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ── Name form ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(fullName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSaving(true);
    setNameMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNameMsg({ ok: false, text: "Notandi fannst ekki." });
      setNameSaving(false);
      return;
    }

    const trimmed = name.trim() || null;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", user.id);

    if (error) {
      setNameMsg({ ok: false, text: "Villa: " + error.message });
    } else {
      // Also sync into auth metadata so server components can read it
      await supabase.auth.updateUser({ data: { full_name: trimmed } });
      setNameMsg({ ok: true, text: "Nafn uppfært!" });
      router.refresh();
    }
    setNameSaving(false);
  };

  // ── Password reset ─────────────────────────────────────────────────────────
  const [pwSending, setPwSending] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const handlePasswordReset = async () => {
    setPwSending(true);
    setPwMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });

    if (error) {
      setPwMsg({ ok: false, text: "Villa: " + error.message });
    } else {
      setPwMsg({
        ok: true,
        text: "Tölvupóstur sendur! Athugaðu pósthólfið þitt.",
      });
    }
    setPwSending(false);
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Account ── */}
      <section className="bg-zinc-900 rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white">Aðgangur</h2>

        {/* Email — read only */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">
            Netfang
          </label>
          <div className="w-full bg-zinc-800 text-zinc-400 text-sm px-4 py-2.5 rounded-xl border border-zinc-700 select-none">
            {email}
          </div>
        </div>

        {/* Full name */}
        <form onSubmit={handleNameSave} className="space-y-3">
          <div>
            <label
              htmlFor="full_name"
              className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide"
            >
              Fullt nafn
            </label>
            <input
              id="full_name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nafn þitt"
              className="w-full bg-zinc-800 text-white text-sm px-4 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-zinc-500"
            />
          </div>

          {nameMsg && (
            <p
              className={`text-sm ${nameMsg.ok ? "text-green-400" : "text-red-400"}`}
            >
              {nameMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={nameSaving}
            className="bg-white text-zinc-900 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {nameSaving ? "Vista..." : "Vista nafn"}
          </button>
        </form>
      </section>

      {/* ── Password ── */}
      <section className="bg-zinc-900 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Lykilorð</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Við sendum þér tölvupóst með hlekk til að breyta lykilorði.
          </p>
        </div>

        {pwMsg && (
          <p
            className={`text-sm ${pwMsg.ok ? "text-green-400" : "text-red-400"}`}
          >
            {pwMsg.text}
          </p>
        )}

        <button
          onClick={handlePasswordReset}
          disabled={pwSending || pwMsg?.ok === true}
          className="bg-zinc-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-600 transition-colors disabled:opacity-50"
        >
          {pwSending ? "Sendir..." : "Breyta lykilorði"}
        </button>
      </section>

      {/* ── Sign out ── */}
      <section className="bg-zinc-900 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-3">Útskráning</h2>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {signingOut ? "Skrái út..." : "Skrá út"}
        </button>
      </section>
    </div>
  );
}
