"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { BuilderProvider, useBuilderState } from "@/components/admin/builder/state";
import Tree from "@/components/admin/builder/Tree";
import EditorPane from "@/components/admin/builder/Editors";
import Preview from "@/components/admin/builder/Preview";
import { SaveStatusPill } from "@/components/admin/SaveStatus";

/**
 * Course builder: tree (left) · editor for the selected week/day/part
 * (middle) · live phone preview (right, collapsible). Each pane scrolls on
 * its own; the whole builder fills the viewport.
 */
export default function CourseBuilder() {
  const b = useBuilderState();

  return (
    <BuilderProvider value={b}>
      <div
        ref={b.builderRef}
        style={{
          display: "grid",
          gridTemplateColumns: `300px minmax(0, 1fr)${b.showPreview ? " 356px" : ""}`,
          gap: 12,
          height: "calc(100vh - 32px)",
          minHeight: 560,
        }}
      >
        <Pane>
          <Tree />
        </Pane>

        <Pane background="var(--bg)">
          <div style={{ position: "relative", height: "100%", overflowY: "auto" }}>
            <button
              type="button"
              onClick={() => b.setShowPreview((v) => !v)}
              title={b.showPreview ? "Fela forskoðun" : "Sýna forskoðun"}
              aria-label={b.showPreview ? "Fela forskoðun" : "Sýna forskoðun"}
              style={{
                position: "sticky",
                top: 12,
                float: "right",
                marginRight: 12,
                zIndex: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                color: "var(--text)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {b.showPreview ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              Forskoðun
            </button>
            <EditorPane />
          </div>
        </Pane>

        {b.showPreview && (
          <Pane>
            <Preview />
          </Pane>
        )}
      </div>

      <SaveStatusPill status={b.saveStatus} />
      {b.toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            zIndex: 50,
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background: "var(--surface)",
            color: b.toast.type === "error" ? "var(--danger)" : "var(--text)",
            border: `1px solid ${b.toast.type === "error" ? "var(--danger)" : "var(--border)"}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {b.toast.msg}
        </div>
      )}
    </BuilderProvider>
  );
}

function Pane({ children, background = "var(--surface)" }: { children: React.ReactNode; background?: string }) {
  return (
    <section
      style={{
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
        background,
        border: "1px solid var(--border)",
        borderRadius: 16,
      }}
    >
      {children}
    </section>
  );
}
