import type { CarpetRecord, StepKey } from "../types";

export const STEP_ORDER: StepKey[] = ["wash", "rewoven", "flatten"];

/**
 * 敏感字段（补线颜色 / 破损部位）改动后的规则：
 * 材料色卡确认失效，工序清空退回待配线，并追加履历。
 */
export function withColorInvalidated(
  r: CarpetRecord,
  reason: string,
  makeHistory: (text: string) => { at: string; text: string }
): CarpetRecord {
  return {
    ...r,
    colorConfirmed: false,
    steps: {},
    history: [
      ...r.history,
      makeHistory(`${reason}材料色卡确认失效，工序退回待配线。`),
    ],
  };
}

/** 工序是否允许登记：清洗始终可做；补线需色卡确认；必须顺序完成 */
export function canCompleteStep(r: CarpetRecord, key: StepKey): boolean {
  if (r.archived) return false;
  if (r.steps[key]) return false;
  const idx = STEP_ORDER.indexOf(key);
  if (key !== "wash" && !r.colorConfirmed) return false;
  if (idx > 0 && !r.steps[STEP_ORDER[idx - 1]]) return false;
  return true;
}

/** 撤销某工序时，其后工序一并撤销 */
export function withStepUndone(r: CarpetRecord, key: StepKey): CarpetRecord["steps"] {
  const idx = STEP_ORDER.indexOf(key);
  const steps = { ...r.steps };
  STEP_ORDER.slice(idx).forEach((k) => delete steps[k]);
  return steps;
}

/** 全部工序是否完成（归档前提） */
export function allStepsDone(r: CarpetRecord): boolean {
  return STEP_ORDER.every((k) => Boolean(r.steps[k]));
}
