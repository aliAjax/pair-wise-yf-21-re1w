export type StepId = "wash" | "rethread" | "flatten";

export interface StepState {
  done: boolean;
  at?: string;
  note?: string;
}

export interface StepsState {
  wash: StepState;
  rethread: StepState;
  flatten: StepState;
}

export interface ThreadColor {
  id: string;
  name: string;
  hex: string;
  code: string;
}

export interface PatternMarker {
  id: string;
  x: number; // 相对纹样图的横坐标百分比 0-100
  y: number; // 相对纹样图的纵坐标百分比 0-100
  label: string;
  part: string; // 对应破损部位
  desc: string;
}

export interface CarpetRecord {
  id: string;
  code: string; // 档案编号 CAR-xxx
  name: string;
  origin: string; // 产地
  era: string; // 年代
  density: string; // 结密度
  materials: string[]; // 材质
  dyeType: string; // 染色类型
  damageParts: string[]; // 破损部位
  damageNote: string; // 破损情况说明
  threadColors: ThreadColor[]; // 补线颜色
  colorConfirmed: boolean; // 材料色卡是否确认
  colorConfirmedAt?: string;
  steps: StepsState; // 清洗 / 补线 / 压平
  photoBefore?: string;
  photoAfter?: string;
  patternImage?: string;
  markers: PatternMarker[];
  archived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  seq: number;
  records: CarpetRecord[];
}

export type StageId =
  | "unconfirmed" // 待配线
  | "wash"
  | "rethread"
  | "flatten"
  | "ready" // 待归档
  | "archived";

export type TabId = "process" | "info" | "pattern" | "photos";
