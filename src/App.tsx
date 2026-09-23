import { useEffect, useMemo, useRef, useState } from "react";
import {
  STEP_META,
  currentStage,
  emptySteps,
  invalidateColorMatch,
  uid,
} from "./constants";
import { loadStore, saveStore } from "./storage";
import type { CarpetRecord, PatternMarker, StageId, Store, TabId } from "./types";
import { DetailView } from "./components/DetailView";
import type { FormState } from "./components/InfoTab";
import { NewRecordModal } from "./components/NewRecordModal";
import { matchesFilters, Sidebar, type Filters } from "./components/Sidebar";
import "./styles.css";

function nextCodeOf(seq: number): string {
  return `CAR-${String(seq + 1).padStart(3, "0")}`;
}

/** 标记按顺序编号 M1、M2… */
function relabel(markers: PatternMarker[]): PatternMarker[] {
  return markers.map((m, i) => ({ ...m, label: `M${i + 1}` }));
}

const initialStore = loadStore();

export default function App() {
  const [store, setStore] = useState<Store>(() => initialStore);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialStore.records[0]?.id ?? null
  );
  const [tab, setTab] = useState<TabId>("process");
  const [filters, setFilters] = useState<Filters>({ origin: "", stage: "active", keyword: "" });
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  function notify(text: string, error = false) {
    setToast({ text, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    const r = saveStore(store);
    if (!r.ok) notify("保存失败：浏览器本地存储空间不足，请导出备份后删除部分照片。", true);
  }, [store]);

  // 当前筛选结果中仍存在的选中项
  useEffect(() => {
    if (store.records.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !store.records.some((r) => r.id === selectedId)) {
      setSelectedId(store.records[0].id);
    }
  }, [store, selectedId]);

  const record = store.records.find((r) => r.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const total = store.records.length;
    const archived = store.records.filter((r) => r.archived).length;
    const active = total - archived;
    const waiting = store.records.filter((r) => currentStage(r) === "unconfirmed").length;
    const inProgress = store.records.filter((r) => {
      const s = currentStage(r);
      return (["wash", "rethread", "flatten"] as StageId[]).includes(s);
    }).length;
    const rate = total === 0 ? 0 : Math.round((archived / total) * 100);
    return { total, active, waiting, inProgress, archived, rate };
  }, [store]);

  function updateRecord(id: string, fn: (r: CarpetRecord) => CarpetRecord) {
    setStore((s) => ({
      ...s,
      records: s.records.map((r) =>
        r.id === id ? { ...fn(r), updatedAt: new Date().toISOString() } : r
      ),
    }));
  }

  /* ---------- 新建 ---------- */
  function createRecord(data: { name: string; origin: string; era: string }) {
    const now = new Date().toISOString();
    const rec: CarpetRecord = {
      id: uid(),
      code: nextCodeOf(store.seq),
      name: data.name,
      origin: data.origin,
      era: data.era,
      density: "",
      materials: [],
      dyeType: "待检测",
      damageParts: [],
      damageNote: "",
      threadColors: [],
      colorConfirmed: false,
      steps: emptySteps(),
      markers: [],
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    setStore((s) => ({ seq: s.seq + 1, records: [rec, ...s.records] }));
    setSelectedId(rec.id);
    setTab("info");
    setShowNew(false);
    notify("已创建档案，请登记材质、破损部位与补线颜色。");
  }

  /* ---------- 基本信息保存（核心联动） ---------- */
  function saveInfo(data: FormState) {
    if (!record) return;
    const damageChanged =
      JSON.stringify(data.damageParts) !== JSON.stringify(record.damageParts);
    const colorsChanged =
      JSON.stringify(data.threadColors) !== JSON.stringify(record.threadColors);

    updateRecord(record.id, (r) => {
      const merged: CarpetRecord = {
        ...r,
        name: data.name.trim(),
        origin: data.origin.trim(),
        era: data.era,
        density: data.density.trim(),
        materials: data.materials,
        dyeType: data.dyeType,
        damageParts: data.damageParts,
        damageNote: data.damageNote,
        threadColors: data.threadColors,
      };
      // 补线色或破损部位一改：色卡确认失效、工序退回待配线
      if (r.colorConfirmed && (damageChanged || colorsChanged)) {
        return invalidateColorMatch(merged);
      }
      return merged;
    });

    if (record.colorConfirmed && (damageChanged || colorsChanged)) {
      notify("补线色/破损部位已变更：色卡确认失效，工序退回「待配线」，请重新确认后按顺序施工。", true);
    } else {
      notify("登记信息已保存。");
    }
  }

  /* ---------- 色卡确认 ---------- */
  function confirmColor() {
    if (!record || record.threadColors.length === 0) return;
    updateRecord(record.id, (r) => ({
      ...r,
      colorConfirmed: true,
      colorConfirmedAt: new Date().toISOString(),
    }));
    notify("材料色卡已确认，可以开始清洗工序。");
  }

  function unconfirmColor() {
    if (!record) return;
    if (!window.confirm("退回后色卡确认将失效，已记录的清洗/补线/压平全部清空，确定吗？")) return;
    updateRecord(record.id, (r) => invalidateColorMatch(r));
    notify("已退回「待配线」，工序记录已清空。", true);
  }

  /* ---------- 工序 ---------- */
  function completeStep(stepId: (typeof STEP_META)[number]["id"], note: string) {
    if (!record) return;
    const idx = STEP_META.findIndex((s) => s.id === stepId);
    if (!record.colorConfirmed || record.archived) return;
    if (idx > 0 && !record.steps[STEP_META[idx - 1].id].done) {
      notify("工序需按 清洗 → 补线 → 压平 顺序记录。", true);
      return;
    }
    updateRecord(record.id, (r) => ({
      ...r,
      steps: { ...r.steps, [stepId]: { done: true, at: new Date().toISOString(), note } },
    }));
    notify(`${STEP_META[idx].name}已记录。`);
  }

  function undoStep(stepId: (typeof STEP_META)[number]["id"]) {
    if (!record) return;
    const idx = STEP_META.findIndex((s) => s.id === stepId);
    if (idx < STEP_META.length - 1 && record.steps[STEP_META[idx + 1].id].done) {
      notify("后面的工序已完成，不能跳过撤销。", true);
      return;
    }
    updateRecord(record.id, (r) => ({
      ...r,
      steps: { ...r.steps, [stepId]: { done: false } },
    }));
    notify(`已撤销「${STEP_META[idx].name}」。`);
  }

  /* ---------- 归档 ---------- */
  function archive() {
    if (!record) return;
    if (!STEP_META.every((s) => record.steps[s.id].done)) {
      notify("清洗、补线、压平均完成后才能归档。", true);
      return;
    }
    if (!record.photoAfter) {
      setTab("photos");
      notify("请先上传修复后照片再归档。", true);
      return;
    }
    updateRecord(record.id, (r) => ({
      ...r,
      archived: true,
      archivedAt: new Date().toISOString(),
    }));
    notify("档案已归档，进度与全部记录已锁定。");
  }

  function unarchive() {
    if (!record) return;
    updateRecord(record.id, (r) => ({ ...r, archived: false, archivedAt: undefined }));
    notify("已撤销归档，可继续调整。");
  }

  function removeRecord() {
    if (!record) return;
    setStore((s) => ({ ...s, records: s.records.filter((r) => r.id !== record.id) }));
    notify(`已删除档案 ${record.code}。`);
  }

  /* ---------- 纹样标记 ---------- */
  function setPatternImage(dataUrl: string | undefined) {
    if (!record) return;
    updateRecord(record.id, (r) => ({ ...r, patternImage: dataUrl }));
  }
  function addMarker(m: Omit<PatternMarker, "id" | "label">) {
    if (!record) return;
    updateRecord(record.id, (r) => ({
      ...r,
      markers: relabel([...r.markers, { ...m, id: uid(), label: "" }]),
    }));
  }
  function updateMarker(id: string, patch: Partial<PatternMarker>) {
    if (!record) return;
    updateRecord(record.id, (r) => ({
      ...r,
      markers: r.markers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }
  function removeMarker(id: string) {
    if (!record) return;
    updateRecord(record.id, (r) => ({
      ...r,
      markers: relabel(r.markers.filter((m) => m.id !== id)),
    }));
  }

  /* ---------- 照片 ---------- */
  function photosChange(patch: { photoBefore?: string; photoAfter?: string }) {
    if (!record) return;
    updateRecord(record.id, (r) => ({ ...r, ...patch }));
  }

  /* ---------- 备份 ---------- */
  function exportJson() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `地毯修复档案备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Store;
        if (!Array.isArray(parsed.records) || typeof parsed.seq !== "number") {
          throw new Error("format");
        }
        if (
          !window.confirm(
            `将导入 ${parsed.records.length} 条档案并覆盖当前全部数据，确定继续？建议先导出当前备份。`
          )
        ) {
          return;
        }
        setStore({ seq: parsed.seq, records: parsed.records });
        notify(`已导入 ${parsed.records.length} 条档案。`);
      } catch {
        notify("备份文件格式不正确。", true);
      }
    };
    reader.readAsText(file);
  }

  const visibleCount = store.records.filter((r) => matchesFilters(r, filters)).length;

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>手工地毯修复 · 纹样档案工作台</h1>
          <p className="sub">
            登记产地、年代、结密度、材质、染色、破损与补线色卡；按工序留痕，完工归档。当前筛选命中 {visibleCount} 份档案。
          </p>
        </div>
        <span className="badge-local">● 进度保存在本机浏览器，关掉页面再打开仍在</span>
      </header>

      <section className="stats">
        <div className="stat"><small>档案总数</small><strong>{stats.total}</strong></div>
        <div className="stat"><small>在修中</small><strong>{stats.active}</strong></div>
        <div className="stat"><small>待配线</small><strong>{stats.waiting}</strong></div>
        <div className="stat"><small>工序进行中</small><strong>{stats.inProgress}</strong></div>
        <div className="stat"><small>已归档（完工率 {stats.rate}%）</small><strong>{stats.archived}</strong></div>
      </section>

      <div className="workspace">
        <Sidebar
          store={store}
          filters={filters}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => setShowNew(true)}
          onFilter={(p) => setFilters((f) => ({ ...f, ...p }))}
          onExport={exportJson}
          onImport={importJson}
        />

        {record ? (
          <DetailView
            key={record.id}
            record={record}
            tab={tab}
            onTab={setTab}
            onSaveInfo={saveInfo}
            onConfirmColor={confirmColor}
            onUnconfirmColor={unconfirmColor}
            onCompleteStep={completeStep}
            onUndoStep={undoStep}
            onArchive={archive}
            onUnarchive={unarchive}
            onDelete={removeRecord}
            onPatternImage={setPatternImage}
            onAddMarker={addMarker}
            onUpdateMarker={updateMarker}
            onRemoveMarker={removeMarker}
            onPhotosChange={photosChange}
          />
        ) : (
          <section className="detail">
            <div className="detail-empty">
              还没有档案。
              <br />
              <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setShowNew(true)}>
                ＋ 新建第一份修复档案
              </button>
            </div>
          </section>
        )}
      </div>

      {showNew && (
        <NewRecordModal
          nextCode={nextCodeOf(store.seq)}
          onClose={() => setShowNew(false)}
          onCreate={createRecord}
        />
      )}
      {toast && <div className={"toast" + (toast.error ? " error" : "")}>{toast.text}</div>}
    </main>
  );
}
