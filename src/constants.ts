import type { CarpetRecord, StageId, StepId, StepsState } from "./types";

export const STORAGE_KEY = "rug-archive-v1";

export const ORIGINS = [
  "波斯（伊朗）",
  "安纳托利亚（土耳其）",
  "高加索",
  "土库曼",
  "藏毯",
  "新疆",
  "宁夏",
  "印度",
  "阿富汗",
  "巴基斯坦",
];

export const ERAS = ["清代及以前", "1900-1940s", "1950-1970s", "1980-2000s", "2000年以后", "年代待考"];

export const MATERIALS = ["羊毛", "真丝", "棉（经纬线）", "羊绒", "驼毛", "金属线"];

export const DYE_TYPES = ["植物染", "矿物染", "化学染", "混合染色", "待检测"];

export const DAMAGE_PARTS = ["毯心", "毯边", "穗头（流苏）", "角部", "主纹", "边框纹", "底背"];

export const STEP_META: { id: StepId; name: string; verb: string }[] = [
  { id: "wash", name: "清洗", verb: "记录清洗" },
  { id: "rethread", name: "补线", verb: "记录补线" },
  { id: "flatten", name: "压平", verb: "记录压平" },
];

export const emptySteps = (): StepsState => ({
  wash: { done: false },
  rethread: { done: false },
  flatten: { done: false },
});

export function currentStage(r: CarpetRecord): StageId {
  if (r.archived) return "archived";
  if (!r.colorConfirmed) return "unconfirmed";
  if (!r.steps.wash.done) return "wash";
  if (!r.steps.rethread.done) return "rethread";
  if (!r.steps.flatten.done) return "flatten";
  return "ready";
}

export const STAGE_LABEL: Record<StageId, string> = {
  unconfirmed: "待配线",
  wash: "待清洗",
  rethread: "待补线",
  flatten: "待压平",
  ready: "待归档",
  archived: "已归档",
};

/** 工序进度 0-3（已完成的工序数） */
export function stepProgress(r: CarpetRecord): number {
  return STEP_META.reduce((n, s) => n + (r.steps[s.id].done ? 1 : 0), 0);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/**
 * 补线颜色或破损部位变更后：色卡确认失效、工序全部退回，档案回到「待配线」。
 * 清洗/补线/压平记录一并清空（重新配线后需按顺序重做）。
 */
export function invalidateColorMatch(r: CarpetRecord): CarpetRecord {
  return {
    ...r,
    colorConfirmed: false,
    colorConfirmedAt: undefined,
    steps: emptySteps(),
    updatedAt: new Date().toISOString(),
  };
}
