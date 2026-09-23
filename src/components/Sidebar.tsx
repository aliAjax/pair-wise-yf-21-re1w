import { ORIGINS, STAGE_LABEL, currentStage, stepProgress } from "../constants";
import type { CarpetRecord, StageId, Store } from "../types";
import { StageBadge } from "./common";

export interface Filters {
  origin: string; // "" = 全部产地
  stage: StageId | "all" | "active";
  keyword: string;
}

export function matchesFilters(r: CarpetRecord, f: Filters): boolean {
  if (f.origin && r.origin !== f.origin) return false;
  if (f.stage === "active" && r.archived) return false;
  if (f.stage !== "all" && f.stage !== "active") {
    if (currentStage(r) !== f.stage) return false;
  }
  if (f.keyword.trim()) {
    const kw = f.keyword.trim().toLowerCase();
    const hay = `${r.code} ${r.name} ${r.origin} ${r.era} ${r.damageParts.join(" ")} ${r.damageNote}`.toLowerCase();
    if (!hay.includes(kw)) return false;
  }
  return true;
}

const STAGE_FILTERS: { id: Filters["stage"]; label: string }[] = [
  { id: "active", label: "在修中" },
  { id: "unconfirmed", label: STAGE_LABEL.unconfirmed },
  { id: "wash", label: STAGE_LABEL.wash },
  { id: "rethread", label: STAGE_LABEL.rethread },
  { id: "flatten", label: STAGE_LABEL.flatten },
  { id: "ready", label: STAGE_LABEL.ready },
  { id: "archived", label: STAGE_LABEL.archived },
  { id: "all", label: "全部" },
];

export function Sidebar({
  store,
  filters,
  selectedId,
  onSelect,
  onNew,
  onFilter,
  onExport,
  onImport,
}: {
  store: Store;
  filters: Filters;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onFilter: (patch: Partial<Filters>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const list = store.records.filter((r) => matchesFilters(r, filters));
  const originsInStore = Array.from(new Set(store.records.map((r) => r.origin)));
  const originOptions = Array.from(new Set([...ORIGINS, ...originsInStore]));

  return (
    <aside className="sidebar">
      <button className="btn-primary" style={{ width: "100%", marginBottom: 12 }} onClick={onNew}>
        ＋ 新建修复档案
      </button>

      <div className="filter-row">
        <select value={filters.origin} onChange={(e) => onFilter({ origin: e.target.value })}>
          <option value="">全部产地</option>
          {originOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="搜编号/名称/破损"
          value={filters.keyword}
          onChange={(e) => onFilter({ keyword: e.target.value })}
        />
      </div>

      <div className="seg">
        {STAGE_FILTERS.map((s) => (
          <button
            key={s.id}
            className={filters.stage === s.id ? "on" : undefined}
            onClick={() => onFilter({ stage: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="record-list">
        {list.length === 0 && <div className="list-empty">没有符合条件的档案</div>}
        {list.map((r) => {
          const stage = currentStage(r);
          const progress = stepProgress(r);
          return (
            <button
              key={r.id}
              className={"record-card" + (selectedId === r.id ? " active" : "")}
              onClick={() => onSelect(r.id)}
            >
              <div className="rc-top">
                <span className="rc-code">{r.code}</span>
                <StageBadge stage={stage} />
              </div>
              <h3>{r.name || "未命名地毯"}</h3>
              <p>
                {r.origin} · {r.era}
                {r.damageParts.length > 0 ? ` · ${r.damageParts.join("、")}损伤` : ""}
              </p>
              {!r.archived && (
                <div className="rc-dots" title={`工序进度 ${progress}/3`}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={"rc-dot" + (i < progress ? " done" : "")} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="sidebar-foot">
        <button onClick={onExport}>导出备份 JSON</button>
        <button onClick={() => document.getElementById("import-json")?.click()}>导入备份</button>
        <input
          id="import-json"
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </div>
    </aside>
  );
}
