import type { CarpetRecord, DamageArea, HistoryItem, Marker, Photo } from "../types";
import { generatePatternDataUrl, damageMarkerPosition } from "./pattern";
import { uid } from "./utils";

interface SeedSpec {
  code: string;
  origin: string;
  era: string;
  knotDensity: string;
  knotUnit: string;
  material: string;
  dyeType: string;
  threadColor: string;
  threadHex: string;
  seedNum: number;
  areas: { name: string; severity: DamageArea["severity"]; detail: string }[];
  state: "repairing" | "ready" | "archived";
  notes: string;
}

const SPECS: SeedSpec[] = [
  {
    code: "CAR-092",
    origin: "波斯",
    era: "约 1960s",
    knotDensity: "180",
    knotUnit: "结/平方英寸",
    material: "羊毛 + 棉经",
    dyeType: "植物染",
    threadColor: "石榴红",
    threadHex: "#7c2d12",
    seedNum: 1,
    areas: [
      { name: "左边缘磨损", severity: "中等", detail: "左侧穗边约 12cm 绒头磨平，纬线外露。" },
      { name: "角花裂口", severity: "轻微", detail: "右下角折痕处有 3cm 裂口。" },
    ],
    state: "repairing",
    notes: "毯面整体紧实，补线需沿用右捻绒头；清洗后避开脱色区。",
  },
  {
    code: "CAR-117",
    origin: "安纳托利亚",
    era: "约 1930s",
    knotDensity: "42",
    knotUnit: "结/平方分米",
    material: "羊毛",
    dyeType: "植物染",
    threadColor: "靛蓝",
    threadHex: "#27408b",
    seedNum: 2,
    areas: [
      { name: "中心纹样缺口", severity: "严重", detail: "团花上方双结缺失约 6×4cm，经线尚存。" },
      { name: "边穗散脱", severity: "中等", detail: "上端穗线散脱 8 根。" },
      { name: "局部虫蛀", severity: "轻微", detail: "背面左下角有两处点状虫蛀。" },
    ],
    state: "ready",
    notes: "靛蓝色卡已与原绒头在自然光下比对确认；补织后绒头方向一致。",
  },
  {
    code: "CAR-138",
    origin: "藏毯",
    era: "约 1980s",
    knotDensity: "96",
    knotUnit: "结/平方英寸",
    material: "羊毛 + 真丝",
    dyeType: "植物 + 化学染",
    threadColor: "松石绿",
    threadHex: "#3a8f7c",
    seedNum: 4,
    areas: [
      { name: "中心局部褪色", severity: "中等", detail: "团花右侧松石绿绒头日晒褪色，需补色补线。" },
    ],
    state: "archived",
    notes: "客户要求保留旧边，只补中心褪色区。已归档封存，附色卡小样。",
  },
];

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function buildSeedRecords(): CarpetRecord[] {
  return SPECS.map((s, si) => {
    const areas: DamageArea[] = s.areas.map((a) => ({
      id: uid("a_"),
      name: a.name,
      severity: a.severity,
      detail: a.detail,
    }));

    const patternImage = generatePatternDataUrl(s.seedNum, areas, false);

    const markers: Marker[] = areas.map((a, i) => {
      const pos = damageMarkerPosition(i);
      return { id: uid("m_"), areaId: a.id, x: pos.x, y: pos.y };
    });

    const history: HistoryItem[] = [
      { at: isoDaysAgo(14 - si * 3), text: `建立档案 ${s.code}，录入产地、年代与材质信息。` },
      { at: isoDaysAgo(13 - si * 3, 9), text: "上传纹样局部图并标记破损部位。" },
      { at: isoDaysAgo(12 - si * 3, 14), text: `材料色卡确认：补线色「${s.threadColor}」。` },
    ];

    const photosBefore: Photo[] = [
      {
        id: uid("p_"),
        url: generatePatternDataUrl(s.seedNum, areas, false),
        caption: "修复前 · 毯面全貌",
        addedAt: isoDaysAgo(13 - si * 3, 11),
      },
    ];

    const steps: CarpetRecord["steps"] = {};
    // 示例：清洗均已完成
    steps.wash = { at: isoDaysAgo(10 - si * 2), note: "中性洗剂平洗两遍，阴干 48 小时。" };
    history.push({ at: isoDaysAgo(10 - si * 2, 15), text: "工序记录：清洗完成。" });
    if (s.state === "ready" || s.state === "archived") {
      steps.rewoven = { at: isoDaysAgo(7 - si * 2), note: "按原结法补织，绒头与周边齐平。" };
      steps.flatten = { at: isoDaysAgo(4 - si), note: "调湿压平 36 小时，绒头定型。" };
      history.push({ at: isoDaysAgo(7 - si * 2, 16), text: "工序记录：补线完成。" });
      history.push({ at: isoDaysAgo(4 - si, 11), text: "工序记录：压平完成。" });
    }

    const photosAfter: Photo[] = [];
    if (s.state === "ready" || s.state === "archived") {
      photosAfter.push({
        id: uid("p_"),
        url: generatePatternDataUrl(s.seedNum, areas, true),
        caption: "修复后 · 补线压平",
        addedAt: isoDaysAgo(4 - si, 16),
      });
      history.push({ at: isoDaysAgo(4 - si, 17), text: "上传修复后照片。" });
    }

    const archived = s.state === "archived";
    if (archived) {
      history.push({ at: isoDaysAgo(3 - si, 10), text: "全部工序完成，档案归档。" });
    }

    return {
      id: uid("r_"),
      code: s.code,
      origin: s.origin,
      era: s.era,
      knotDensity: s.knotDensity,
      knotUnit: s.knotUnit,
      material: s.material,
      dyeType: s.dyeType,
      threadColor: s.threadColor,
      threadHex: s.threadHex,
      damageAreas: areas,
      patternImage,
      markers,
      colorConfirmed: true,
      confirmedAt: isoDaysAgo(12 - si * 3, 14),
      steps,
      photosBefore,
      photosAfter,
      notes: s.notes,
      history,
      archived,
      archivedAt: archived ? isoDaysAgo(3 - si, 10) : undefined,
      createdAt: isoDaysAgo(14 - si * 3),
      updatedAt: archived ? isoDaysAgo(3 - si, 10) : isoDaysAgo(2),
    };
  });
}
