/**
 * 种子档案 + localStorage 持久化测试。
 * jsdom 不实现 canvas 2d，这里用最小桩件模拟 toDataURL / drawImage，
 * 以验证档案生成、字段完整性与存取往返（真实 canvas 渲染在浏览器中）。
 */
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

class Ctx2dStub {
  fillRect() {}
  strokeRect() {}
  fill() {}
  stroke() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  ellipse() {}
  save() {}
  restore() {}
  translate() {}
  scale() {}
  rotate() {}
  drawImage() {}
  createRadialGradient() {
    return { addColorStop() {} };
  }
  set fillStyle(_: unknown) {}
  get fillStyle() {
    return "";
  }
  set strokeStyle(_: unknown) {}
  get strokeStyle() {
    return "";
  }
  set lineWidth(_: unknown) {}
  get lineWidth() {
    return 1;
  }
  set globalAlpha(_: unknown) {}
  get globalAlpha() {
    return 1;
  }
}

dom.window.HTMLCanvasElement.prototype.getContext = (function () {
  return new Ctx2dStub();
} as never) as HTMLCanvasElement["getContext"];
dom.window.HTMLCanvasElement.prototype.toDataURL = function () {
  return "data:image/jpeg;base64,STUB";
};
globalThis.Image = dom.window.Image;
globalThis.FileReader = dom.window.FileReader;

import { buildSeedRecords } from "../seed";
import { STORAGE_KEY, getStatus } from "../constants";
import { loadRecords, saveRecords } from "../storage";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log("✓", name);
};

const records = buildSeedRecords();

test("生成 3 条示例档案", () => {
  assert.equal(records.length, 3);
});

test("必填字段齐备：产地/年代/结密度/材质/染色/补线色", () => {
  for (const r of records) {
    assert.ok(r.origin, "产地");
    assert.ok(r.era, "年代");
    assert.ok(r.knotDensity, "结密度");
    assert.ok(r.material, "材质");
    assert.ok(r.dyeType, "染色");
    assert.ok(r.threadColor, "补线色名");
    assert.match(r.threadHex, /^#[0-9a-f]{6}$/i, "色值");
  }
});

test("每条档案都有纹样标记图和破损标记", () => {
  for (const r of records) {
    assert.ok(r.patternImage?.startsWith("data:image"), "标记图底图");
    assert.ok(r.damageAreas.length >= 1, "破损部位");
    assert.equal(
      r.markers.length,
      r.damageAreas.length,
      "标记点与部位数量一致"
    );
    for (const m of r.markers) {
      assert.ok(r.damageAreas.some((a) => a.id === m.areaId), "标记关联到部位");
      assert.ok(m.x >= 0 && m.x <= 1 && m.y >= 0 && m.y <= 1, "标记坐标归一化");
    }
  }
});

test("种子含不同状态：修复中 / 待归档 / 已归档", () => {
  const statuses = records.map(getStatus);
  assert.ok(statuses.includes("repairing"));
  assert.ok(statuses.includes("ready"));
  assert.ok(statuses.includes("archived"));
});

test("工序顺序：已归档/待归档的三步齐全；修复中仅清洗", () => {
  for (const r of records) {
    const s = getStatus(r);
    if (s === "repairing") {
      assert.ok(r.steps.wash, "已清洗");
      assert.ok(!r.steps.rewoven, "未补线");
    }
    if (s === "ready" || s === "archived") {
      assert.ok(r.steps.wash && r.steps.rewoven && r.steps.flatten);
    }
  }
});

test("localStorage 存取往返一致", () => {
  const ok = saveRecords(records);
  assert.equal(ok, true);
  assert.ok(localStorage.getItem(STORAGE_KEY));
  const loaded = loadRecords();
  assert.equal(loaded.length, 3);
  assert.deepEqual(
    loaded.map((r) => r.code),
    records.map((r) => r.code)
  );
});

test("首次无缓存时 loadRecords 自动播种", () => {
  localStorage.removeItem(STORAGE_KEY);
  const seeded = loadRecords();
  assert.equal(seeded.length, 3);
  assert.ok(localStorage.getItem(STORAGE_KEY), "播种后已落盘");
});

console.log(`\n${passed} 项数据测试全部通过`);
