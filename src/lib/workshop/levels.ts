export const workshopLevels = [
  {
    id: "beginner",
    label: "Principiante total",
    tag: "Principiante",
  },
  {
    id: "pre",
    label: "Puedo armar oraciones pero me trabo",
    tag: "Pre-Intermediate",
  },
  {
    id: "int",
    label: "Puedo conversar con errores",
    tag: "Intermediate",
  },
  {
    id: "adv",
    label: "Cómodo pero quiero pulir",
    tag: "Advanced",
  },
] as const;

export type WorkshopLevelId = (typeof workshopLevels)[number]["id"];

export function levelTag(id: WorkshopLevelId): string {
  const level = workshopLevels.find((item) => item.id === id);
  if (!level) {
    throw new Error(`Unknown workshop level: ${id}`);
  }
  return level.tag;
}
