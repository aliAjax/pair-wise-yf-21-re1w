import type { CarpetRecord, HistoryItem, StatusKey, StepKey } from "../types";

export const STORAGE_KEY = "rug-restore-archive-v1";

export const ORIGINS = ["波斯", "安纳托利亚", "高加索", "藏毯", "新疆", "土库曼"];

export const MATERIALS = ["羊毛", "羊毛 + 棉经", "羊毛 + 真丝", "真丝", "驼毛", "山羊毛"];

export const DYE_TYPES = ["植物染", "矿物染", "化学染", "植物 + 化学染"];

export const SEVERITIES = ["轻微", "中等", "严重"] as const;

export const KNOT_UNITS = ["结/平方英寸", "结/平方分米", "拉德（行/米）"];

/** 补线常用色名 + 色值（材料色卡） */
export const THREAD_SWATCHES: { name: string; hex: string }[] = [
  { name: "靛蓝", hex: "#27408b" },
  { name: "藏青", hex: "#1f3a5f" },
  { name: "茜草红", hex: "#a93b2e" },
  { name: "石榴红", hex: "#7c2d12" },
  { name: "赭石", hex: "#b45309" },
  { name: "姜黄", hex: "#d9a441" },
  { name: "木犀绿", hex: "#0f766e" },
  { name: "松石绿", hex: "#3a8f7c" },
  { name: "米白", hex: "#efe7d2" },
  { name: "原绒褐", hex: "#6b4a2f" },
  { name: "炭灰", hex: "#3a3a40" },
  { name: "墨黑", hex: "#1c1a1d" },
];

export const STEP_META: { key: StepKey; title: string; verb: string; hint: string }[] = [
  {
    key: "wash",
    title: "清洗",
    verb: "完成清洗",
    hint: "除尘、低泡中性洗剂手工平洗、阴干。",
  },
  {
    key: "rewoven",
    title: "补线",
    verb: "完成补线",
    hint: "按确认色卡配线，照原结法逐结补织破损部位。",
  },
  {
    key: "flatten",
    title: "压平",
    verb: "完成压平",
    hint: "调湿后均匀压平，定型绒头方向。",
  },
];

export const STATUS_META: Record<
  StatusKey,
  { label: string; cls: string; desc: string }
> = {
  draft: { label: "待配线", cls: "st-draft", desc: "色卡待确认 / 确认已失效，等待配线" },
  repairing: { label: "修复中", cls: "st-repairing", desc: "色卡已确认，工序进行中" },
  ready: { label: "待归档", cls: "st-ready", desc: "清洗、补线、压平均已完成" },
  archived: { label: "已归档", cls: "st-archived", desc: "档案封存，只读" },
};

export function getStatus(r: CarpetRecord): StatusKey {
  if (r.archived) return "archived";
  // 未确认色卡（包括确认后被改动而失效）都属于待配线
  if (!r.colorConfirmed) return "draft";
  const { wash, rewoven, flatten } = r.steps;
  if (wash && rewoven && flatten) return "ready";
  return "repairing";
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeHistory(text: string): HistoryItem {
  return { at: nowIso(), text };
}
