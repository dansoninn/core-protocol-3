"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/**
 * A vertical list the coach can reorder by dragging the grip — or, with the
 * keyboard, focusing the grip and using Space + arrow keys. Each list is its
 * own DndContext, so an item can only move within its parent (a block within
 * its part, a part within its day…). onReorder gets every id in the new order.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
  gap = 8,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  children: (item: T, handle: ReactNode, index: number) => ReactNode;
  gap?: number;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map((i) => i.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {items.map((item, index) => (
            <SortableItem key={item.id} id={item.id}>
              {(handle) => children(item, handle, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? "0 12px 30px rgba(0,0,0,0.35)" : undefined,
    borderRadius: 12,
  };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Draga til að raða"
      title="Draga til að raða"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        width: 18,
        height: 28,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        border: "none",
        borderRadius: 6,
        background: "transparent",
        color: "var(--muted2)",
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      <GripVertical size={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}
