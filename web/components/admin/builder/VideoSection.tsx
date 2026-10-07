"use client";

import { useEffect, useState } from "react";
import { Film, Plus, Search, Upload, X } from "lucide-react";
import type { MuxLibraryAsset } from "@/app/api/mux/assets/route";
import { ActionButton, actionStyle, clock } from "@/components/admin/builder/ui";
import { inputStyle } from "@/components/admin/fields";
import { formatNumericDate } from "@/lib/formatDate";

export type UploadStatus = "idle" | "requesting" | "uploading" | "processing" | "done" | "error";

const STATUS_TEXT: Record<UploadStatus, string> = {
  idle: "",
  requesting: "Undirbý upphleðslu…",
  uploading: "Hleð upp…",
  processing: "Mux vinnur myndbandið…",
  done: "Tilbúið",
  error: "Upphleðsla mistókst",
};

/** Videos longer than this default to "exercises are reference" when attached. */
export const REFERENCE_DEFAULT_MIN_SEC = 60;

const thumb = (playbackId: string, w: number, h: number) =>
  `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${w}&height=${h}&fit_mode=smartcrop`;

/**
 * The part's video, added like an exercise: "+ Myndband" opens a picker with
 * the Mux library (every video already uploaded — part videos and exercise
 * videos alike) and an upload button. With a video: thumbnail, length,
 * Skipta um / Fjarlægja, and the "exercises are reference" choice.
 */
export default function VideoSection({
  playbackId,
  durationSec,
  exercisesAreReference,
  uploadStatus,
  usedBy,
  onUpload,
  onPick,
  onRemove,
  onReferenceChange,
}: {
  playbackId: string | null;
  durationSec: number | null;
  exercisesAreReference: boolean;
  uploadStatus: UploadStatus;
  /** Where a playback ID is already used, for the library cards ("Æfing: Hnébeygja"). */
  usedBy: (playbackId: string) => string[];
  onUpload: (file: File) => void;
  onPick: (asset: MuxLibraryAsset) => void;
  onRemove: () => void;
  onReferenceChange: (value: boolean) => void;
}) {
  const [picking, setPicking] = useState(false);
  const busy = ["requesting", "uploading", "processing"].includes(uploadStatus);

  return (
    <div>
      {playbackId ? (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Mux thumbnail */}
          <img
            src={thumb(playbackId, 320, 180)}
            alt=""
            style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)" }}
          />
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
              Myndband{durationSec ? ` · ${clock(durationSec)}` : " · lengd óþekkt"}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionButton onClick={() => setPicking((v) => !v)} icon={<Film size={13} />}>
                Skipta um
              </ActionButton>
              <ActionButton onClick={onRemove} icon={<X size={13} />}>
                Fjarlægja
              </ActionButton>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={exercisesAreReference}
                onChange={(e) => onReferenceChange(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--accent)", flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--text)" }}>
                Æfingarnar eru í myndbandinu
                <span style={{ display: "block", fontSize: 12, color: "var(--muted2)" }}>
                  {exercisesAreReference
                    ? "Notandinn horfir og klárar liðinn í heild með einum takka. Æfingarnar sýnast til viðmiðunar."
                    : "Myndbandið er kynning. Notandinn merkir hverja æfingu lokið."}
                </span>
              </span>
            </label>
          </div>
        </div>
      ) : (
        !picking && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setPicking(true);
            }}
            disabled={busy}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px dashed var(--border)",
              background: "var(--surface)",
              color: "var(--muted2)",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
            }}
          >
            <Plus size={15} /> Myndband
          </button>
        )
      )}

      {uploadStatus !== "idle" && (
        <p
          role="status"
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 600,
            color: uploadStatus === "error" ? "var(--danger)" : uploadStatus === "done" ? "var(--success)" : "var(--muted2)",
          }}
        >
          {STATUS_TEXT[uploadStatus]}
        </p>
      )}

      {picking && (
        <VideoPicker
          busy={busy}
          currentPlaybackId={playbackId}
          usedBy={usedBy}
          onClose={() => setPicking(false)}
          onUpload={(file) => {
            setPicking(false);
            onUpload(file);
          }}
          onPick={(asset) => {
            setPicking(false);
            onPick(asset);
          }}
        />
      )}
    </div>
  );
}

function VideoPicker({
  busy,
  currentPlaybackId,
  usedBy,
  onClose,
  onUpload,
  onPick,
}: {
  busy: boolean;
  currentPlaybackId: string | null;
  usedBy: (playbackId: string) => string[];
  onClose: () => void;
  onUpload: (file: File) => void;
  onPick: (asset: MuxLibraryAsset) => void;
}) {
  const [assets, setAssets] = useState<MuxLibraryAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [longOnly, setLongOnly] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mux/assets")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body.assets as MuxLibraryAsset[];
      })
      .then((list) => !cancelled && setAssets(list))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const shown = (assets ?? []).filter((a) => {
    if (longOnly && (a.durationSec ?? 0) <= REFERENCE_DEFAULT_MIN_SEC) return false;
    if (!q) return true;
    const hay = [a.title ?? "", ...usedBy(a.playbackId)].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--accent-line)",
        background: "var(--surface2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--muted2)" }} />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Leita eftir nafni eða hvar það er notað…"
            style={{ ...inputStyle, width: "100%", paddingLeft: 30, height: 32 }}
          />
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted2)", cursor: "pointer" }}>
          <input type="checkbox" checked={longOnly} onChange={(e) => setLongOnly(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
          Aðeins lengri en 1 mín
        </label>
        <label style={{ ...actionStyle, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          <Upload size={13} /> Hlaða upp nýju
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        <ActionButton onClick={onClose} icon={<X size={13} />}>
          Loka
        </ActionButton>
      </div>

      {error ? (
        <p style={{ fontSize: 12, color: "var(--danger)" }}>Náði ekki í myndbandasafnið: {error}</p>
      ) : assets === null ? (
        <p style={{ fontSize: 12, color: "var(--muted2)" }}>Sæki myndbönd úr Mux…</p>
      ) : shown.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--muted2)" }}>
          {assets.length === 0 ? "Engin myndbönd í Mux enn — hlaðið upp nýju." : "Ekkert myndband passar."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {shown.map((a) => {
            const uses = usedBy(a.playbackId);
            const current = a.playbackId === currentPlaybackId;
            return (
              <button
                key={a.assetId}
                type="button"
                disabled={current}
                onClick={(e) => {
                  e.preventDefault();
                  onPick(a);
                }}
                style={{
                  textAlign: "left",
                  padding: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: current ? "default" : "pointer",
                  background: "var(--surface)",
                  border: `1px solid ${current ? "var(--accent)" : "var(--border)"}`,
                  color: "var(--text)",
                }}
              >
                <div style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Mux thumbnail */}
                  <img
                    src={thumb(a.playbackId, 360, 202)}
                    alt=""
                    loading="lazy"
                    style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", background: "var(--surface2)" }}
                  />
                  {a.durationSec !== null && (
                    <span
                      style={{
                        position: "absolute",
                        right: 6,
                        bottom: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        // Scrim over a photo — fixed in both themes on purpose
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                      }}
                    >
                      {clock(a.durationSec)}
                    </span>
                  )}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.title ?? `Myndband frá ${formatNumericDate(a.createdAt)}`}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {current ? "Valið núna" : uses.length > 0 ? `Notað: ${uses.join(", ")}` : "Ekki notað"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
