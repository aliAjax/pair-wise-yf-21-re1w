import { DAMAGE_PARTS, STORAGE_KEY, emptySteps, uid } from "./constants";
import type { CarpetRecord, Store } from "./types";

/** 生成纹样局部图（内联 SVG，免外链），variant 决定配色与风格 */
function rugSvg(variant: "persian" | "anatolian" | "tibetan" | "caucasus"): string {
  const palettes: Record<string, { bg: string; frame: string; med: string; med2: string; line: string; accent: string }> = {
    persian: { bg: "#8f2f1e", frame: "#1e3a5f", med: "#c9a35b", med2: "#ead9a8", line: "#f1e4c2", accent: "#2f6b54" },
    anatolian: { bg: "#a83c2b", frame: "#1f4d4a", med: "#e0b65f", med2: "#f3e2ad", line: "#f6ecd2", accent: "#3a6ea5" },
    tibetan: { bg: "#6e2230", frame: "#243f5f", med: "#d8a951", med2: "#eed9a0", line: "#efe0bc", accent: "#2f6b54" },
    caucasus: { bg: "#1f3d5b", frame: "#7c2d12", med: "#d9b15f", med2: "#f0e0ae", line: "#e9e2cf", accent: "#8a3b2a" },
  };
  const p = palettes[variant];
  const motif =
    variant === "tibetan"
      ? '<path d="M400 190 L470 300 L400 410 L330 300 Z" fill="' + p.med2 + '" opacity="0.9"/>'
      : '<circle cx="400" cy="300" r="105" fill="' + p.med2 + '" opacity="0.9"/>';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
    '<rect width="800" height="600" fill="' + p.bg + '"/>' +
    '<rect x="22" y="22" width="756" height="556" fill="none" stroke="' + p.frame + '" stroke-width="26"/>' +
    '<rect x="52" y="52" width="696" height="496" fill="none" stroke="' + p.med + '" stroke-width="6"/>' +
    '<circle cx="400" cy="300" r="150" fill="' + p.med + '"/>' +
    motif +
    '<circle cx="400" cy="300" r="52" fill="' + p.frame + '"/>' +
    '<circle cx="400" cy="300" r="26" fill="' + p.accent + '"/>' +
    [120, 250, 550, 680]
      .map(
        (x) =>
          '<ellipse cx="' + x + '" cy="300" rx="34" ry="78" fill="none" stroke="' + p.line + '" stroke-width="5" opacity="0.75"/>' +
          '<circle cx="' + x + '" cy="300" r="12" fill="' + p.accent + '"/>'
      )
      .join("") +
    [120, 210, 390, 480]
      .map(
        (y) =>
          '<path d="M150 ' + y + " q50 -40 100 0 t100 0 t100 0 t100 0 t100 0" +
          '" fill="none" stroke="' + p.line + '" stroke-width="4" opacity="0.55"/>'
      )
      .join("") +
    '<g opacity="0.85" fill="' + p.med2 + '">' +
    [90, 200, 310].flatMap((x) => [90, 510].map((y) => '<circle cx="' + x + '" cy="' + y + '" r="9"/>')).join("") +
    [490, 600, 710].flatMap((x) => [90, 510].map((y) => '<circle cx="' + x + '" cy="' + y + '" r="9"/>')).join("") +
    "</g></svg>"
  );
}

function img(variant: "persian" | "anatolian" | "tibetan" | "caucasus"): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(rugSvg(variant));
}

export function seedStore(): Store {
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60000).toISOString();

  const records: CarpetRecord[] = [
    {
      id: uid(),
      code: "CAR-092",
      name: "波斯红花蔓纹毯",
      origin: "波斯（伊朗）",
      era: "1950-1970s",
      density: "约 320 结/平方分米（42 道/英尺）",
      materials: ["羊毛", "棉（经纬线）"],
      dyeType: "植物染",
      damageParts: ["毯边"],
      damageNote: "左侧毯边约 18cm 磨断，穗头轻微脱线。",
      threadColors: [
        { id: uid(), name: "铁锈红", hex: "#9c3d28", code: "YARN-A17" },
        { id: uid(), name: "旧金", hex: "#c9a35b", code: "YARN-C04" },
      ],
      colorConfirmed: true,
      colorConfirmedAt: iso(240),
      steps: {
        wash: { done: true, at: iso(150), note: "中性洗剂低速冲洗两遍，阴干。" },
        rethread: { done: false },
        flatten: { done: false },
      },
      patternImage: img("persian"),
      markers: [
        { id: uid(), x: 8, y: 48, label: "M1", part: "毯边", desc: "边缘磨断 18cm，需补经线后栽绒。" },
      ],
      photoBefore: img("persian"),
      archived: false,
      createdAt: iso(300),
      updatedAt: iso(150),
    },
    {
      id: uid(),
      code: "CAR-117",
      name: "安纳托利亚几何纹祈祷毯",
      origin: "安纳托利亚（土耳其）",
      era: "1900-1940s",
      density: "约 260 结/平方分米（36 道/英尺）",
      materials: ["羊毛"],
      dyeType: "植物染",
      damageParts: ["主纹", "毯心"],
      damageNote: "中心菱形纹缺绒一块（约 6×9cm），原补线色偏，已拆待重配。",
      threadColors: [{ id: uid(), name: "砖红（待重配）", hex: "#b0492f", code: "YARN-A21" }],
      colorConfirmed: false,
      steps: { wash: { done: true, at: iso(320), note: "干洗除尘。" }, rethread: { done: false }, flatten: { done: false } },
      patternImage: img("anatolian"),
      markers: [
        { id: uid(), x: 47, y: 42, label: "M1", part: "主纹", desc: "菱形纹缺绒，补线色偏需重染配线。" },
        { id: uid(), x: 55, y: 58, label: "M2", part: "毯心", desc: "周边绒高不齐，补绒时需对齐毯绒方向。" },
      ],
      photoBefore: img("anatolian"),
      archived: false,
      createdAt: iso(400),
      updatedAt: iso(20),
    },
    {
      id: uid(),
      code: "CAR-138",
      name: "藏式虎纹毯",
      origin: "藏毯",
      era: "清代及以前",
      density: "约 200 结/平方分米（30 道/英尺）",
      materials: ["羊毛", "真丝"],
      dyeType: "矿物染",
      damageParts: ["角部", "穗头（流苏）"],
      damageNote: "右下角虫蛀小洞，穗头缺失约 10cm。",
      threadColors: [
        { id: uid(), name: "藏红", hex: "#7a2432", code: "YARN-T08" },
        { id: uid(), name: "靛蓝", hex: "#274a78", code: "YARN-T12" },
      ],
      colorConfirmed: true,
      colorConfirmedAt: iso(500),
      steps: {
        wash: { done: true, at: iso(420), note: "低温手洗，虫蛀部位衬纱布。" },
        rethread: { done: true, at: iso(300), note: "角部衬底织补，穗头重编。" },
        flatten: { done: true, at: iso(180), note: "恒湿压平 48 小时。" },
      },
      patternImage: img("tibetan"),
      markers: [{ id: uid(), x: 86, y: 82, label: "M1", part: "角部", desc: "虫蛀 3cm 洞，已衬底织补。" }],
      photoBefore: img("tibetan"),
      photoAfter: img("tibetan"),
      archived: false,
      createdAt: iso(600),
      updatedAt: iso(180),
    },
    {
      id: uid(),
      code: "CAR-074",
      name: "高加索星徽纹毯",
      origin: "高加索",
      era: "1980-2000s",
      density: "约 280 结/平方分米（38 道/英尺）",
      materials: ["羊毛"],
      dyeType: "化学染",
      damageParts: ["边框纹"],
      damageNote: "上边框轻度褪色，已完成配色修复。",
      threadColors: [{ id: uid(), name: "海军蓝", hex: "#27476e", code: "YARN-K02" }],
      colorConfirmed: true,
      colorConfirmedAt: iso(4000),
      steps: {
        wash: { done: true, at: iso(3800), note: "常规湿洗。" },
        rethread: { done: true, at: iso(3200), note: "边框补色栽绒。" },
        flatten: { done: true, at: iso(2600), note: "压平 24 小时。" },
      },
      patternImage: img("caucasus"),
      markers: [{ id: uid(), x: 50, y: 12, label: "M1", part: "边框纹", desc: "褪色段，补线完成。" }],
      photoBefore: img("caucasus"),
      photoAfter: img("caucasus"),
      archived: true,
      archivedAt: iso(2500),
      createdAt: iso(4200),
      updatedAt: iso(2500),
    },
  ];

  return { seq: 142, records };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.records || !Array.isArray(parsed.records)) throw new Error("bad");
    return parsed;
  } catch {
    return seedStore();
  }
}

export function saveStore(store: Store): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export { DAMAGE_PARTS };
