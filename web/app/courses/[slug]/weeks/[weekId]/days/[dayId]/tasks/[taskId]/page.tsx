import { notFound } from "next/navigation";
import { requireDayAccess, loadDayParts } from "@/lib/dayAccess";
import PartClient from "@/components/day/PartClient";

export const dynamic = "force-dynamic";

export default async function PartPage({
  params,
}: {
  params: { slug: string; weekId: string; dayId: string; taskId: string };
}) {
  // Same checks as the day overview — a direct part URL cannot skip them.
  const { view, completedBlockIds } = await requireDayAccess(
    params,
    `/courses/${params.slug}/weeks/${params.weekId}/days/${params.dayId}/tasks/${params.taskId}`
  );
  const parts = await loadDayParts(params.dayId);

  const partIndex = parts.findIndex((p) => p.id === params.taskId);
  if (partIndex < 0) notFound();

  const dayBlockIds = parts.flatMap((p) => p.blocks.map((b) => b.id));

  return (
    <PartClient
      view={view}
      parts={parts}
      partIndex={partIndex}
      initialCompletedBlockIds={dayBlockIds.filter((id) => completedBlockIds.has(id))}
    />
  );
}
