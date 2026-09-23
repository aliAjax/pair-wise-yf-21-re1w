export type Severity = "轻微" | "中等" | "严重";

export interface DamageArea {
  id: string;
  /** 破损部位，如：中心纹样缺口 */
  name: string;
  severity: Severity;
  detail: string;
}

/** 纹样局部标记图上的损伤标记，坐标为相对图片 0~1 */
export interface Marker {
  id: string;
  areaId: string;
  x: number;
  y: number;
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  addedAt: string;
}

export interface StepInfo {
  at: string;
  note: string;
}

export type StepKey = "wash" | "rewoven" | "flatten";
export type StepsState = Partial<Record<StepKey, StepInfo>>;

export interface HistoryItem {
  at: string;
  text: string;
}

export interface CarpetRecord {
  id: string;
  /** 档案编号 CAR-### */
  code: string;
  origin: string;
  era: string;
  knotDensity: string;
  knotUnit: string;
  material: string;
  dyeType: string;
  /** 补线颜色（色名） */
  threadColor: string;
  /** 补线颜色（色值） */
  threadHex: string;
  damageAreas: DamageArea[];
  /** 纹样局部标记图底图 */
  patternImage: string | null;
  markers: Marker[];
  colorConfirmed: boolean;
  confirmedAt?: string;
  steps: StepsState;
  photosBefore: Photo[];
  photosAfter: Photo[];
  notes: string;
  history: HistoryItem[];
  archived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type StatusKey = "draft" | "repairing" | "ready" | "archived";
