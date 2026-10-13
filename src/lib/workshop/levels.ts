export const workshopLevels = [
  {
    id: "beginner",
    label: "Principiante total",
    tag: "lvl-beginner",
  },
  {
    id: "pre",
    label: "Puedo armar oraciones pero me trabo",
    tag: "lvl-pre",
  },
  {
    id: "int",
    label: "Puedo conversar con errores",
    tag: "lvl-int",
  },
  {
    id: "adv",
    label: "Cómodo pero quiero pulir",
    tag: "lvl-adv",
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
