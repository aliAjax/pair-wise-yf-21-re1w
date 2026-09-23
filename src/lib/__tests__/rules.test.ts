import assert from "node:assert";
import type { CarpetRecord, StepKey } from "../../types";
import { getStatus } from "../constants";
import {
  STEP_ORDER,
  allStepsDone,
  canCompleteStep,
  withColorInvalidated,
  withStepUndone,
} from "../rules";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log("✓", name);
}

const iso = "2026-09-20T08:00:00.000Z";

function baseRecord(over: Partial<CarpetRecord> = {}): CarpetRecord {
  return {
    id: "r1",
    code: "CAR-001",
    origin: "波斯",
    era: "1960s",
    knotDensity: "180",
    knotUnit: "结/平方英寸",
    material: "羊毛",
    dyeType: "植物染",
    threadColor: "石榴红",
    threadHex: "#7c2d12",
    damageAreas: [],
    patternImage: null,
    markers: [],
    colorConfirmed: false,
    steps: {},
    photosBefore: [],
    photosAfter: [],
    notes: "",
    history: [],
    archived: false,
    createdAt: iso,
    updatedAt: iso,
    ...over,
  };
}

const hist = (text: string) => ({ at: iso, text });
const step = (k: StepKey) => ({ [k]: { at: iso, note: k } });

test("新建档案状态为待配线", () => {
  assert.equal(getStatus(baseRecord()), "draft");
});

test("色卡确认、无工序：修复中", () => {
  assert.equal(getStatus(baseRecord({ colorConfirmed: true })), "repairing");
});

test("色卡确认 + 三步完成：待归档", () => {
  const r = baseRecord({
    colorConfirmed: true,
    steps: { ...step("wash"), ...step("rewoven"), ...step("flatten") },
  });
  assert.equal(getStatus(r), "ready");
  assert.equal(allStepsDone(r), true);
});

test("归档档案只读状态", () => {
  assert.equal(
    getStatus(baseRecord({ archived: true, colorConfirmed: true })),
    "archived"
  );
});

test("未确认色卡时：清洗可做、补线不可做", () => {
  const r = baseRecord();
  assert.equal(canCompleteStep(r, "wash"), true);
  assert.equal(canCompleteStep(r, "rewoven"), false);
});

test("工序必须顺序：色卡确认后未清洗，补线仍不可做", () => {
  const r = baseRecord({ colorConfirmed: true });
  assert.equal(canCompleteStep(r, "rewoven"), false);
  assert.equal(canCompleteStep(r, "flatten"), false);
});

test("清洗后可补线，补线后可压平", () => {
  let r = baseRecord({ colorConfirmed: true, steps: { ...step("wash") } });
  assert.equal(canCompleteStep(r, "rewoven"), true);
  assert.equal(canCompleteStep(r, "flatten"), false);
  r = baseRecord({
    colorConfirmed: true,
    steps: { ...step("wash"), ...step("rewoven") },
  });
  assert.equal(canCompleteStep(r, "flatten"), true);
});

test("敏感字段变更：色卡失效 + 工序清空 + 履历记录 + 状态退回待配线", () => {
  const r = baseRecord({
    colorConfirmed: true,
    confirmedAt: iso,
    steps: { ...step("wash"), ...step("rewoven") },
    history: [hist("旧履历")],
  });
  const next = withColorInvalidated(r, "补线颜色改为「靛蓝」，", hist);
  assert.equal(next.colorConfirmed, false);
  assert.deepEqual(next.steps, {});
  assert.equal(getStatus(next), "draft");
  assert.equal(next.history.length, 2);
  assert.match(next.history[1].text, /补线颜色改为「靛蓝」/);
  assert.match(next.history[1].text, /退回待配线/);
});

test("撤销中间工序：其后工序连带撤销", () => {
  const r = baseRecord({
    colorConfirmed: true,
    steps: { ...step("wash"), ...step("rewoven"), ...step("flatten") },
  });
  const next = withStepUndone(r, "rewoven");
  assert.ok(next.wash);
  assert.ok(!next.rewoven);
  assert.ok(!next.flatten);
});

test("归档后不能再登记工序", () => {
  const r = baseRecord({
    archived: true,
    colorConfirmed: true,
    steps: { ...step("wash") },
  });
  assert.equal(canCompleteStep(r, "rewoven"), false);
});

test("工序顺序常量为 清洗→补线→压平", () => {
  assert.deepEqual(STEP_ORDER, ["wash", "rewoven", "flatten"]);
});

console.log(`\n${passed} 项规则测试全部通过`);
