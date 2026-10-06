import { requireDayAccess, loadDayParts } from "@/lib/dayAccess";
import DayOverview from "@/components/day/DayOverview";

export const dynamic = "force-dynamic";

export default async function DayOverviewPage({
  params,
}: {
  params: { slug: string; weekId: string; dayId: string };
}) {
  const { view, completedBlockIds, completedTaskIds } = await requireDayAccess(
    params,
    `/courses/${params.slug}/weeks/${params.weekId}/days/${params.dayId}`
  );
  const parts = await loadDayParts(params.dayId);

  const dayBlockIds = parts.flatMap((p) => p.blocks.map((b) => b.id));

  return (
    <DayOverview
      view={view}
      parts={parts}
      completedBlockIds={dayBlockIds.filter((id) => completedBlockIds.has(id))}
      completedTaskIds={parts.map((p) => p.id).filter((id) => completedTaskIds.has(id))}
    />
  );
}
