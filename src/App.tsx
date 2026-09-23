import { useEffect, useMemo, useState } from "react";
import type {
  CarpetRecord,
  DamageArea,
  HistoryItem,
  Photo,
  StepKey,
} from "./types";
import {
  ORIGINS,
  STATUS_META,
  STEP_META,
  getStatus,
  makeHistory,
  nowIso,
} from "./lib/constants";
import { loadRecords, saveRecords } from "./lib/storage";
import {
  STEP_ORDER,
  allStepsDone,
  canCompleteStep,
  withColorInvalidated,
  withStepUndone,
} from "./lib/rules";
import { fileToDataUrl, uid } from "./lib/utils";
import RecordPage, { RecordActions } from "./components/RecordPage";
import type { StatusKey } from "./types";

type OriginFilter = "全部" | string;
type StatusFilter = "all" | StatusKey;

interface PreviewState {
  url: string;
  caption: string;
}

const STEP_KEYS = STEP_ORDER;

export default function App() {
  const [records, setRecords] = useState<CarpetRecord[]>(() => loadRecords());
  const [openId, setOpenId] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("全部");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  // 关掉页面再打开进度还在：每次变更写入 localStorage
  useEffect(() => {
    const ok = saveRecords(records);
    if (ok) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [records]);

  // hash 路由：#/r/<id>
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#\/r\/(.+)$/);
      setOpenId(m ? decodeURIComponent(m[1]) : null);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const openRecord = records.find((r) => r.id === openId) ?? null;

  const updateRecord = (id: string, fn: (r: CarpetRecord) => CarpetRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...fn(r), updatedAt: nowIso() } : r))
    );
  };

  const touchWithLog = (
    r: CarpetRecord,
    patch: Partial<CarpetRecord>,
    log?: string,
    history: HistoryItem[] = r.history
  ): CarpetRecord => ({
    ...r,
    ...patch,
    history: log ? [...history, makeHistory(log)] : history,
  });

  /** 敏感字段（补线色 / 破损部位）改动：色卡失效，工序退回待配线 */
  const invalidateColor = (r: CarpetRecord, reason: string): CarpetRecord =>
    withColorInvalidated(r, reason, makeHistory);

  const createRecord = () => {
    const nums = records
      .map((r) => Number(r.code.replace(/\D/g, "")))
      .filter((n) => !Number.isNaN(n));
    const next = Math.max(0, ...nums) + 1;
    const id = uid("r_");
    const iso = nowIso();
    const rec: CarpetRecord = {
      id,
      code: `CAR-${String(next).padStart(3, "0")}`,
      origin: originFilter !== "全部" ? originFilter : "",
      era: "",
      knotDensity: "",
      knotUnit: "结/平方英寸",
      material: "羊毛",
      dyeType: "植物染",
      threadColor: "",
      threadHex: THREAD_DEFAULT_HEX,
      damageAreas: [],
      patternImage: null,
      markers: [],
      colorConfirmed: false,
      steps: {},
      photosBefore: [],
      photosAfter: [],
      notes: "",
      history: [{ at: iso, text: "建立新档案，等待录入。" }],
      archived: false,
      createdAt: iso,
      updatedAt: iso,
    };
    setRecords((prev) => [rec, ...prev]);
    window.location.hash = `#/r/${id}`;
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    window.location.hash = "";
  };

  const makeActions = (r: CarpetRecord): RecordActions => ({
    patch: (patch, log) => {
      updateRecord(r.id, (cur) => {
        // 带履历的提交视为落定变更：比较补线色是否相对已确认状态发生变化
        if (log !== undefined && cur.colorConfirmed) {
          const merged = { ...cur, ...patch };
          const colorChanged =
            (patch.threadHex !== undefined && patch.threadHex !== cur.threadHex) ||
            (patch.threadColor !== undefined && patch.threadColor !== cur.threadColor);
          if (colorChanged) {
            return invalidateColor(
              merged,
              log ?? `补线颜色改为「${merged.threadColor || "未命名色"}」，`
            );
          }
        }
        return touchWithLog(cur, patch, log);
      });
    },

    addArea: (area) => {
      const newArea: DamageArea = { id: uid("a_"), ...area };
      updateRecord(r.id, (cur) => {
        const next: CarpetRecord = {
          ...cur,
          damageAreas: [...cur.damageAreas, newArea],
        };
        if (cur.colorConfirmed) {
          return invalidateColor(next, `新增破损部位「${area.name}」，`);
        }
        return touchWithLog(next, {}, `新增破损部位「${area.name}」。`);
      });
      return newArea.id;
    },

    updateArea: (id, patch, opts) => {
      updateRecord(r.id, (cur) => {
        const area = cur.damageAreas.find((a) => a.id === id);
        if (!area) return cur;
        const next: CarpetRecord = {
          ...cur,
          damageAreas: cur.damageAreas.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        };
        // 仅在明确提交（失焦改名/改描述、程度选择）时按破损部位变更处理
        if (opts?.sensitive && cur.colorConfirmed) {
          const name = patch.name ?? area.name;
          return invalidateColor(
            next,
            opts.log ??
              (patch.name
                ? `破损部位更名为「${name}」，`
                : `破损部位「${name}」信息变更，`)
          );
        }
        return touchWithLog(next, {}, opts?.log);
      });
    },

    removeArea: (id) => {
      updateRecord(r.id, (cur) => {
        const area = cur.damageAreas.find((a) => a.id === id);
        const next: CarpetRecord = {
          ...cur,
          damageAreas: cur.damageAreas.filter((a) => a.id !== id),
          markers: cur.markers.filter((m) => m.areaId !== id),
        };
        if (cur.colorConfirmed && area) {
          return invalidateColor(next, `删除破损部位「${area.name}」，`);
        }
        return touchWithLog(
          next,
          {},
          area ? `删除破损部位「${area.name}」及图上标记。` : undefined
        );
      });
    },

    addMarker: (areaId, x, y) => {
      updateRecord(r.id, (cur) => ({
        ...cur,
        markers: [...cur.markers, { id: uid("m_"), areaId, x, y }],
      }));
    },

    removeMarker: (markerId) => {
      updateRecord(r.id, (cur) => ({
        ...cur,
        markers: cur.markers.filter((m) => m.id !== markerId),
      }));
    },

    uploadPattern: async (file) => {
      try {
        const url = await fileToDataUrl(file, 1400, 0.82);
        updateRecord(r.id, (cur) =>
          touchWithLog(
            { ...cur, patternImage: url },
            {},
            cur.patternImage ? "更换纹样局部标记图底图。" : "上传纹样局部标记图。"
          )
        );
      } catch (e) {
        alert(e instanceof Error ? e.message : "图片上传失败");
      }
    },

    confirmColor: () => {
      updateRecord(r.id, (cur) => {
        if (cur.colorConfirmed || !cur.threadColor.trim()) return cur;
        return touchWithLog(
          { ...cur, colorConfirmed: true, confirmedAt: nowIso() },
          {},
          `材料色卡确认：补线色「${cur.threadColor}」（${cur.threadHex}），可开始修复工序。`
        );
      });
    },

    completeStep: (key, note) => {
      updateRecord(r.id, (cur) => {
        if (!canCompleteStep(cur, key)) return cur;
        const steps = { ...cur.steps, [key]: { at: nowIso(), note } };
        const meta = STEP_META.find((m) => m.key === key)!;
        const allDone = STEP_ORDER.every(
          (k) => k === key || cur.steps[k] !== undefined
        );
        return touchWithLog(
          { ...cur, steps },
          {},
          allDone
            ? `工序登记：${meta.title}完成。全部工序完成，可归档。`
            : `工序登记：${meta.title}完成。`
        );
      });
    },

    undoStep: (key) => {
      updateRecord(r.id, (cur) => {
        const steps = withStepUndone(cur, key);
        const idx = STEP_ORDER.indexOf(key);
        const meta = STEP_META.find((m) => m.key === key)!;
        const also = STEP_ORDER.slice(idx + 1).map(
          (k) => STEP_META.find((m) => m.key === k)!.title
        );
        return touchWithLog(
          { ...cur, steps },
          {},
          `撤销「${meta.title}」记录${
            also.length ? `，同步撤销：${also.join("、")}` : ""
          }。`
        );
      });
    },

    addPhoto: async (kind, file, caption) => {
      try {
        const url = await fileToDataUrl(file, 1400, 0.82);
        const photo: Photo = {
          id: uid("p_"),
          url,
          caption,
          addedAt: nowIso(),
        };
        updateRecord(r.id, (cur) =>
          touchWithLog(
            {
              ...cur,
              [kind === "before" ? "photosBefore" : "photosAfter"]: [
                ...(kind === "before" ? cur.photosBefore : cur.photosAfter),
                photo,
              ],
            },
            {},
            `上传${kind === "before" ? "修复前" : "修复后"}照片：${caption}。`
          )
        );
      } catch (e) {
        alert(e instanceof Error ? e.message : "照片上传失败");
      }
    },

    removePhoto: (kind, id) => {
      updateRecord(r.id, (cur) => {
        const list = kind === "before" ? cur.photosBefore : cur.photosAfter;
        const target = list.find((p) => p.id === id);
        const nextList = list.filter((p) => p.id !== id);
        return touchWithLog(
          {
            ...cur,
            [kind === "before" ? "photosBefore" : "photosAfter"]: nextList,
          },
          {},
          target
            ? `删除${kind === "before" ? "修复前" : "修复后"}照片：${target.caption}。`
            : undefined
        );
      });
    },

    archive: () => {
      updateRecord(r.id, (cur) => {
        if (!allStepsDone(cur)) return cur;
        return touchWithLog(
          { ...cur, archived: true, archivedAt: nowIso() },
          {},
          "清洗、补线、压平全部完成，档案归档封存。"
        );
      });
    },

    unarchive: () => {
      updateRecord(r.id, (cur) =>
        touchWithLog({ ...cur, archived: false, archivedAt: undefined }, {}, "取消归档，档案恢复可编辑。")
      );
    },

    onPreview: (url, caption) => setPreview({ url, caption }),
  });

  // 列表派生
  const originOptions = useMemo(() => {
    const set = new Set<string>([...ORIGINS, ...records.map((r) => r.origin).filter(Boolean)]);
    return ["全部", ...Array.from(set)];
  }, [records]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: records.length,
      draft: 0,
      repairing: 0,
      ready: 0,
      archived: 0,
    };
    records.forEach((r) => {
      c[getStatus(r)] += 1;
    });
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return records
      .filter((r) => (originFilter === "全部" ? true : r.origin === originFilter))
      .filter((r) => (statusFilter === "all" ? true : getStatus(r) === statusFilter))
      .filter((r) => {
        if (!kw) return true;
        return [r.code, r.origin, r.era, r.material, r.dyeType, r.threadColor]
          .join(" ")
          .toLowerCase()
          .includes(kw);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [records, originFilter, statusFilter, keyword]);

  if (openRecord) {
    return (
      <>
        <div className="topbar">
          <div className="brand" onClick={() => (window.location.hash = "")}>
            <span className="logo">◈</span> 织补 · 手工地毯修复档案工作台
          </div>
          <span className={`save-state ${savedFlash ? "show" : ""}`}>
            进度已保存
          </span>
        </div>
        <main className="app detail-shell">
          <RecordPage
            record={openRecord}
            actions={makeActions(openRecord)}
            onBack={() => (window.location.hash = "")}
            onDelete={() => deleteRecord(openRecord.id)}
          />
        </main>
        {preview && (
          <div className="lightbox" onClick={() => setPreview(null)}>
            <figure>
              <img src={preview.url} alt={preview.caption} />
              <figcaption>{preview.caption}</figcaption>
            </figure>
            <button className="lightbox-close" aria-label="关闭">
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <span className="logo">◈</span> 织补 · 手工地毯修复档案工作台
        </div>
        <span className={`save-state ${savedFlash ? "show" : ""}`}>
          进度已自动保存在本机
        </span>
      </div>

      <main className="app">
        <section className="list-hero panel">
          <div>
            <h1>纹样与修复档案</h1>
            <p>
              登记产地、年代、结密度、材质、染色、破损部位与补线色；纹样局部图标记损伤，
              清洗 · 补线 · 压平顺序登记，完工归档。
            </p>
          </div>
          <button className="primary big" onClick={createRecord}>
            ＋ 新建修复档案
          </button>
        </section>

        <section className="metrics">
          <Metric label="档案总数" value={records.length} />
          <Metric label="待配线" value={counts.draft} tone="amber" />
          <Metric label="修复中" value={counts.repairing} tone="teal" />
          <Metric label="待归档" value={counts.ready} tone="blue" />
          <Metric label="已归档" value={counts.archived} tone="stone" />
        </section>

        <section className="panel list-panel">
          <div className="filters">
            <div className="filter-group">
              <span className="filter-label">产地</span>
              <div className="chips">
                {originOptions.map((o) => (
                  <button
                    key={o}
                    className={`chip ${originFilter === o ? "on" : ""}`}
                    onClick={() => setOriginFilter(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-label">状态</span>
              <div className="chips">
                {(
                  [
                    ["all", "全部"],
                    ["draft", "待配线"],
                    ["repairing", "修复中"],
                    ["ready", "待归档"],
                    ["archived", "已归档"],
                  ] as [StatusFilter, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    className={`chip ${statusFilter === k ? "on" : ""}`}
                    onClick={() => setStatusFilter(k)}
                  >
                    {label}
                    <i>{counts[k]}</i>
                  </button>
                ))}
              </div>
            </div>
            <div className="search-box">
              <input
                placeholder="搜索编号 / 产地 / 材质 / 补线色…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="card-grid">
            {filtered.map((r) => {
              const st = getStatus(r);
              const doneSteps = STEP_KEYS.filter((k) => r.steps[k]).length;
              return (
                <article
                  key={r.id}
                  className="rug-card"
                  onClick={() => (window.location.hash = `#/r/${r.id}`)}
                >
                  <div className="card-thumb">
                    {r.patternImage ? (
                      <img src={r.patternImage} alt={`${r.code} 纹样局部`} />
                    ) : (
                      <div className="thumb-empty">无标记图</div>
                    )}
                    <span className={`status-tag ${STATUS_META[st].cls}`}>
                      {STATUS_META[st].label}
                    </span>
                  </div>
                  <div className="card-body">
                    <h3>
                      {r.code}
                      {r.origin && <em>{r.origin}</em>}
                    </h3>
                    <p className="card-meta">
                      {[r.era, r.material, r.dyeType, r.knotDensity && `结密 ${r.knotDensity}`]
                        .filter(Boolean)
                        .join(" · ") || "基础信息待补全"}
                    </p>
                    <div className="card-damages">
                      {r.damageAreas.length === 0 ? (
                        <span>破损部位未登记</span>
                      ) : (
                        r.damageAreas.slice(0, 3).map((a) => (
                          <span key={a.id} className="damage-chip">
                            {a.name}
                          </span>
                        ))
                      )}
                      {r.damageAreas.length > 3 && (
                        <span className="more">+{r.damageAreas.length - 3}</span>
                      )}
                    </div>
                    <div className="card-foot">
                      <span className="thread-chip">
                        <i style={{ background: r.threadHex }} />
                        {r.threadColor || "补线色未定"}
                        {r.colorConfirmed ? <b className="ok">色卡✓</b> : <b className="bad">待配线</b>}
                      </span>
                      <span className="step-mini">
                        {STEP_KEYS.map((k) => (
                          <i
                            key={k}
                            className={r.steps[k] ? "on" : ""}
                            title={STEP_META.find((m) => m.key === k)!.title}
                          />
                        ))}
                        <small>
                          {doneSteps}/3{st === "archived" ? " · 已归档" : ""}
                        </small>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <p>没有符合筛选条件的档案。</p>
              <button
                onClick={() => {
                  setOriginFilter("全部");
                  setStatusFilter("all");
                  setKeyword("");
                }}
              >
                清除筛选
              </button>
            </div>
          )}
        </section>

        <footer className="list-foot">
          数据保存在本浏览器（localStorage），清除浏览数据会一并删除档案。
        </footer>
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <article className={`metric tone-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

const THREAD_DEFAULT_HEX = "#b45309";
