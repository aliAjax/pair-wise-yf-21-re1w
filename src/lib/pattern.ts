import type { DamageArea } from "../types";

interface Palette {
  field: string;
  border: string;
  inner: string;
  motif: string;
  motif2: string;
}

const PALETTES: Palette[] = [
  {
    field: "#8c2f1b",
    border: "#243b53",
    inner: "#c98a3c",
    motif: "#e8d7b2",
    motif2: "#3f6b57",
  },
  {
    field: "#7a1f2b",
    border: "#1f3a4d",
    inner: "#c9a25f",
    motif: "#f0e4c8",
    motif2: "#486a52",
  },
  {
    field: "#5b2a20",
    border: "#2c2417",
    inner: "#a8763e",
    motif: "#e4d5ac",
    motif2: "#6b7b4e",
  },
  {
    field: "#1d3b57",
    border: "#5b2a20",
    inner: "#c2a06a",
    motif: "#efe2c0",
    motif2: "#8a3b2e",
  },
];

/** 可重复的伪随机数，保证同一档案纹样稳定 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function diamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w, y);
  ctx.closePath();
  ctx.fill();
}

function medallion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  p: Palette,
  rnd: () => number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rnd() - 0.5) * 0.08);
  ctx.fillStyle = p.inner;
  ctx.beginPath();
  ctx.ellipse(0, 0, 130 * scale, 92 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.motif2;
  ctx.lineWidth = 5 * scale;
  ctx.stroke();

  ctx.fillStyle = p.motif2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 86 * scale, 58 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.motif;
  ctx.beginPath();
  ctx.ellipse(0, 0, 56 * scale, 38 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    diamond(
      ctx,
      Math.cos(a) * 106 * scale,
      Math.sin(a) * 70 * scale,
      10 * scale,
      16 * scale,
      p.motif
    );
  }
  ctx.restore();
}

/** 示意破损斑块的固定相对坐标（与标记图上的标记点一致） */
export function damageMarkerPosition(index: number): { x: number; y: number } {
  return {
    x: 0.18 + ((index * 0.31) % 0.64),
    y: 0.22 + ((index * 0.27) % 0.56),
  };
}

/** 在纹样图上画“破损”斑块，供示例记录演示标记位置 */
function drawDamageBlobs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  areas: DamageArea[],
  rnd: () => number,
  severityAlpha: number
) {
  areas.forEach((area, idx) => {
    const pos = damageMarkerPosition(idx);
    const cx = w * pos.x;
    const cy = h * pos.y;    const size =
      area.severity === "严重" ? 60 : area.severity === "中等" ? 42 : 28;
    ctx.save();
    for (let k = 0; k < 7; k++) {
      const a = rnd() * Math.PI * 2;
      const r = size * (0.4 + rnd() * 0.8);
      ctx.fillStyle = `rgba(20, 14, 10, ${
        (0.25 + rnd() * 0.35) * severityAlpha
      })`;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(a) * r * 0.6,
        cy + Math.sin(a) * r * 0.5,
        size * (0.5 + rnd() * 0.7),
        size * (0.35 + rnd() * 0.5),
        rnd() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // 磨白的线头感
    ctx.strokeStyle = `rgba(235, 224, 200, ${0.35 * severityAlpha})`;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      const sx = cx + (rnd() - 0.5) * size;
      const sy = cy + (rnd() - 0.5) * size;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rnd() - 0.5) * 26, sy + (rnd() - 0.5) * 26);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/**
 * 生成一张示意纹样局部图（canvas → JPEG dataURL）。
 * repaired 为 true 时破损处变浅，模拟修复后照片效果。
 */
export function generatePatternDataUrl(
  seedNum: number,
  areas: DamageArea[] = [],
  repaired = false
): string {
  const W = 1000;
  const H = 700;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const p = PALETTES[seedNum % PALETTES.length];
  const rnd = mulberry32(seedNum * 7919 + 11);

  // 毯面底色
  ctx.fillStyle = p.field;
  ctx.fillRect(0, 0, W, H);

  // 编织纹理
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.03})`;
    ctx.fillRect(0, y, W, 2);
  }
  for (let x = 0; x < W; x += 5) {
    ctx.fillStyle = `rgba(255,240,210,${rnd() * 0.03})`;
    ctx.fillRect(x, 0, 1, H);
  }

  // 边框
  const B = 46;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = B;
  ctx.strokeRect(B / 2, B / 2, W - B, H - B);
  ctx.strokeStyle = p.inner;
  ctx.lineWidth = 6;
  ctx.strokeRect(B + 10, B + 10, W - (B + 10) * 2, H - (B + 10) * 2);

  // 角花
  for (const [gx, gy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    ctx.save();
    ctx.translate(gx === 1 ? 110 : W - 110, gy === 1 ? 108 : H - 108);
    ctx.scale(gx, gy);
    diamond(ctx, 0, 0, 46, 34, p.motif);
    diamond(ctx, 30, 26, 20, 14, p.motif2);
    ctx.restore();
  }

  // 边饰小菱形
  for (let i = 0; i < 14; i++) {
    const x = 150 + i * ((W - 300) / 13);
    diamond(ctx, x, 44, 10, 10, p.motif2);
    diamond(ctx, x, H - 44, 10, 10, p.motif2);
  }

  // 中心团花与侧花
  medallion(ctx, W / 2, H / 2, 1, p, rnd);
  medallion(ctx, W * 0.2, H * 0.5, 0.42, p, rnd);
  medallion(ctx, W * 0.8, H * 0.5, 0.42, p, rnd);

  // 缠枝小点
  ctx.fillStyle = p.motif;
  for (let i = 0; i < 90; i++) {
    const x = 120 + rnd() * (W - 240);
    const y = 120 + rnd() * (H - 240);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 2 + rnd() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (areas.length) {
    drawDamageBlobs(ctx, W, H, areas, rnd, repaired ? 0.18 : 1);
  }

  // 做旧晕影
  const grad = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.3,
    W / 2,
    H / 2,
    H * 0.85
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  return canvas.toDataURL("image/jpeg", 0.82);
}
