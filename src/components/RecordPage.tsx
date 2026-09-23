import { useState } from "react";
import type { CarpetRecord, DamageArea, Severity, StepKey } from "../types";
import {
  DYE_TYPES,
  KNOT_UNITS,
  MATERIALS,
  ORIGINS,
  SEVERITIES,
  STATUS_META,
  STEP_META,
  THREAD_SWATCHES,
  getStatus,
} from "../lib/constants";
import { formatDateTime, timeAgo, uid } from "../lib/utils";
import MarkerMap, { areaColor } from "./MarkerMap";
import Modal from "./Modal";
import PhotoGallery from "./PhotoGallery";
import StepDialog from "./StepDialog";

export interface RecordActions {
  patch: (patch: Partial<CarpetRecord>, log?: string) => void;
  addArea: (area: Omit<DamageArea, "id">) => string;
  updateArea: (
    id: string,
    patch: Partial<DamageArea>,
    opts?: { log?: string; sensitive?: boolean }
  ) => void;
  removeArea: (id: string) => void;
  addMarker: (areaId: string, x: number, y: number) => void;
  removeMarker: (markerId: string) => void;
  uploadPattern: (file: File) => void;
  confirmColor: () => void;
  completeStep: (key: StepKey, note: string) => void;
  undoStep: (key: StepKey) => void;
  addPhoto: (kind: "before" | "after", file: File, caption: string) => void;
  removePhoto: (kind: "before" | "after", id: string) => void;
  archive: () => void;
  unarchive: () => void;
  onPreview: (url: string, caption: string) => void;
}

interface RecordPageProps {
  record: CarpetRecord;
  actions: RecordActions;
  onBack: () => void;
  onDelete: () => void;
}

export default function RecordPage({ record: r, actions, onBack, onDelete }: RecordPageProps) {
  const readOnly = r.archived;
  const status = getStatus(r);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [stepOpen, setStepOpen] = useState<StepKey | null>(null);
  const [newAreaOpen, setNewAreaOpen] = useState(false);
  const [areaDraft, setAreaDraft] = useState({
    name: "",
    severity: "中等" as Severity,
    detail: "",
  });

  const stepOrder: StepKey[] = ["wash", "rewoven", "flatten"];
  const stepDone = (k: StepKey) => Boolean(r.steps[k]);
  const prevDone = (k: StepKey) => {
    const i = stepOrder.indexOf(k);
    return i === 0 || stepDone(stepOrder[i - 1]);
  };
  const allDone = stepOrder.every((k) => stepDone(k));

  const activeArea = r.damageAreas.find((a) => a.id === activeAreaId) ?? null;

  const submitArea = () => {
    if (!areaDraft.name.trim()) return;
    const newId = actions.addArea({ ...areaDraft, name: areaDraft.name.trim() });
    setActiveAreaId(newId);
    setAreaDraft({ name: "", severity: "中等", detail: "" });
    setNewAreaOpen(false);
  };

  return (
    <div className="record-page">
      <div className="rec-top">
        <button className="back-btn" onClick={onBack}>
          ← 档案列表
        </button>
        <div className={`status-tag ${STATUS_META[status].cls}`}>
          {STATUS_META[status].label}
        </div>
        {readOnly && <span className="readonly-flag">已封存 · 只读</span>}
      </div>

      <header className="rec-head panel">
        <div>
          <h1>{r.code}</h1>
          <p>
            {r.origin} · {r.era} · 建档 {formatDateTime(r.createdAt)} · 最近更新{" "}
            {timeAgo(r.updatedAt)}
          </p>
        </div>
        <div className="rec-head-actions">
          <button
            className="danger-link"
            onClick={() => {
              if (
                window.confirm(
                  `确定删除档案 ${r.code}？该记录及全部照片、工序履历将被删除，且无法恢复。`
                )
              )
                onDelete();
            }}
          >
            删除档案
          </button>
          {readOnly ? (
            <button
              onClick={() => {
                if (window.confirm("取消归档后档案可继续编辑，确定吗？"))
                  actions.unarchive();
              }}
            >
              取消归档
            </button>
          ) : allDone ? (
            <button
              className="primary"
              onClick={() => {
                if (
                  window.confirm(
                    "清洗、补线、压平均已完成。归档后档案将变为只读，确认归档？"
                  )
                )
                  actions.archive();
              }}
            >
              归档封存
            </button>
          ) : (
            <button className="disabled-btn" disabled title="需先完成清洗、补线、压平全部工序">
              归档封存
            </button>
          )}
        </div>
      </header>

      {!r.colorConfirmed && r.confirmedAt && (
        <div className="alert-warn">
          补线颜色或破损部位已变更，材料色卡确认已失效，工序退回「待配线」，需重新确认色卡。
        </div>
      )}

      <section className="panel">
        <h2 className="sec-title">
          <i>1</i> 基础档案
        </h2>
        <div className="field-grid">
          <label>
            <span>产地 *</span>
            <input
              list="origin-list"
              value={r.origin}
              disabled={readOnly}
              onChange={(e) => actions.patch({ origin: e.target.value })}
              placeholder="如：波斯 / 安纳托利亚"
            />
            <datalist id="origin-list">
              {ORIGINS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </label>
          <label>
            <span>年代</span>
            <input
              value={r.era}
              disabled={readOnly}
              onChange={(e) => actions.patch({ era: e.target.value })}
              placeholder="如：约 1930s"
            />
          </label>
          <label>
            <span>结密度</span>
            <div className="with-unit">
              <input
                value={r.knotDensity}
                disabled={readOnly}
                onChange={(e) =>
                  actions.patch({ knotDensity: e.target.value.replace(/[^\d]/g, "") })
                }
                inputMode="numeric"
                placeholder="如：180"
              />
              <select
                value={r.knotUnit}
                disabled={readOnly}
                onChange={(e) => actions.patch({ knotUnit: e.target.value })}
              >
                {KNOT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label>
            <span>材质</span>
            <select
              value={r.material}
              disabled={readOnly}
              onChange={(e) => actions.patch({ material: e.target.value })}
            >
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>染色类型</span>
            <select
              value={r.dyeType}
              disabled={readOnly}
              onChange={(e) => actions.patch({ dyeType: e.target.value })}
            >
              {DYE_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>补线颜色（色名）*</span>
            <input
              defaultValue={r.threadColor}
              key={`thread-${r.id}-${r.confirmedAt ?? "x"}`}
              disabled={readOnly}
              onFocus={(e) => {
                e.target.setAttribute("data-prev", r.threadColor);
                e.target.setAttribute("data-hex", r.threadHex);
              }}
              onChange={(e) => actions.patch({ threadColor: e.target.value })}
              onBlur={(e) => {
                const prev = e.target.getAttribute("data-prev") ?? "";
                const prevHex = e.target.getAttribute("data-hex") ?? "";
                const el = e.target as HTMLInputElement;
                if (el.value !== prev || r.threadHex !== prevHex) {
                  actions.patch(
                    { threadColor: el.value },
                    el.value
                      ? `补线颜色改为「${el.value}」。`
                      : "补线颜色已清空。"
                  );
                }
              }}
              placeholder="如：靛蓝，或自定义色名"
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="sec-title">
          <i>2</i> 材料色卡确认
        </h2>
        <div className="swatches">
          {THREAD_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              disabled={readOnly}
              className={`swatch ${r.threadHex === s.hex ? "on" : ""}`}
              onClick={() =>
                actions.patch(
                  { threadHex: s.hex, threadColor: s.name },
                  `补线颜色改为「${s.name}」。`
                )
              }
              title={s.name}
            >
              <i style={{ background: s.hex }} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        <div className="custom-color">
          <label className="inline-hex">
            <span>自定义色值</span>
            <input
              type="color"
              value={r.threadHex}
              disabled={readOnly}
              onChange={(e) =>
                actions.patch({ threadHex: e.target.value }, "补线颜色已改为自定义色值。")
              }
            />
          </label>
          <div className="thread-preview">
            <i style={{ background: r.threadHex }} />
            <div>
              <b>{r.threadColor || "未命名色"}</b>
              <small>{r.threadHex}</small>
            </div>
          </div>
        </div>

        <div className={`confirm-box ${r.colorConfirmed ? "confirmed" : "pending"}`}>
          {r.colorConfirmed ? (
            <>
              <div className="confirm-state">
                <span className="check">✓</span>
                <div>
                  <b>色卡已确认</b>
                  <small>
                    {r.threadColor}（{r.threadHex}）· 确认于{" "}
                    {formatDateTime(r.confirmedAt)}
                  </small>
                </div>
              </div>
              {!readOnly && (
                <p className="confirm-warn">
                  改动补线颜色或破损部位，确认将自动失效，工序退回待配线。
                </p>
              )}
            </>
          ) : (
            <div className="confirm-state">
              <span className="dot-pending" />
              <div>
                <b>{r.confirmedAt ? "色卡确认已失效，待重新配线" : "待配线：色卡尚未确认"}</b>
                <small>
                  需补线色名与色值、破损部位齐备；确认后方可开始「补线」工序。
                </small>
              </div>
              <button
                className="primary"
                disabled={readOnly || !r.threadColor.trim()}
                onClick={actions.confirmColor}
              >
                确认材料色卡
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="sec-title-row">
          <h2 className="sec-title">
            <i>3</i> 破损部位与纹样局部标记图
          </h2>
          {!readOnly && (
            <button className="small" onClick={() => setNewAreaOpen(true)}>
              ＋ 添加破损部位
            </button>
          )}
        </div>

        <MarkerMap
          image={r.patternImage}
          markers={r.markers}
          areas={r.damageAreas}
          activeAreaId={activeAreaId}
          readOnly={readOnly}
          onAddMarker={(x, y) => activeAreaId && actions.addMarker(activeAreaId, x, y)}
          onRemoveMarker={actions.removeMarker}
          onUpload={actions.uploadPattern}
        />

        <div className="area-list">
          {r.damageAreas.length === 0 && (
            <p className="photo-empty">尚未登记破损部位；添加后可在标记图上落点。</p>
          )}
          {r.damageAreas.map((a) => {
            const count = r.markers.filter((m) => m.areaId === a.id).length;
            return (
              <div
                key={a.id}
                className={`area-row ${activeAreaId === a.id ? "active" : ""}`}
                onClick={() => !readOnly && setActiveAreaId(a.id)}
              >
                <i
                  className="area-dot"
                  style={{ background: areaColor(r.damageAreas, a.id) }}
                />
                <div className="area-main">
                  <b>
                    {a.name}
                    <span className={`sev sev-${a.severity}`}>{a.severity}</span>
                    <em className="marker-count">图上标记 {count} 处</em>
                  </b>
                  {readOnly ? (
                    <p>{a.detail || "—"}</p>
                  ) : (
                    <input
                      defaultValue={a.detail}
                      placeholder="损伤描述（范围、状态…）"
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) =>
                        e.target.setAttribute("data-prev", a.detail)
                      }
                      onChange={(e) =>
                        actions.updateArea(a.id, { detail: e.target.value })
                      }
                      onBlur={(e) => {
                        if (
                          e.target.value !==
                          e.target.getAttribute("data-prev")
                        ) {
                          actions.updateArea(
                            a.id,
                            { detail: e.target.value },
                            { sensitive: true }
                          );
                        }
                      }}
                    />
                  )}
                </div>
                {!readOnly && (
                  <div className="area-ops" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={a.severity}
                      onChange={(e) =>
                        actions.updateArea(
                          a.id,
                          { severity: e.target.value as Severity },
                          {
                            sensitive: true,
                            log: `破损部位「${a.name}」程度调整为${e.target.value}。`,
                          }
                        )
                      }
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      className="area-name"
                      defaultValue={a.name}
                      onFocus={(e) =>
                        e.target.setAttribute("data-prev", a.name)
                      }
                      onChange={(e) =>
                        actions.updateArea(a.id, { name: e.target.value })
                      }
                      onBlur={(e) => {
                        const v = e.target.value.trim() || "未命名部位";
                        if (v !== e.target.getAttribute("data-prev")) {
                          actions.updateArea(a.id, { name: v }, { sensitive: true });
                        } else if (e.target.value !== v) {
                          actions.updateArea(a.id, { name: v });
                        }
                      }}
                    />
                    <button
                      className="danger-link"
                      onClick={() =>
                        window.confirm(
                          `删除破损部位「${a.name}」？图上对应标记将一并移除。`
                        ) && actions.removeArea(a.id)
                      }
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2 className="sec-title">
          <i>4</i> 修复工序
          <small className="sec-note">清洗 → 补线 → 压平，顺序登记，不可跳步</small>
        </h2>
        <div className="steps">
          {STEP_META.map((meta, idx) => {
            const k = meta.key;
            const done = stepDone(k);
            const locked = !readOnly && !r.colorConfirmed && k !== "wash";
            const orderLocked = !readOnly && !prevDone(k) && !done;
            const info = r.steps[k];
            return (
              <div
                key={k}
                className={`step-card ${done ? "done" : ""} ${
                  locked || orderLocked ? "locked" : ""
                }`}
              >
                <div className="step-no">{done ? "✓" : idx + 1}</div>
                <div className="step-body">
                  <b>{meta.title}</b>
                  {info ? (
                    <p>
                      {info.note || "已完成"}
                      <small>{formatDateTime(info.at)}</small>
                    </p>
                  ) : (
                    <p className="muted">
                      {locked
                        ? "色卡确认后方可进行"
                        : orderLocked
                        ? `请先完成「${STEP_META[idx - 1].title}」`
                        : "尚未记录"}
                    </p>
                  )}
                </div>
                <div className="step-op">
                  {done && !readOnly && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `撤销「${meta.title}」记录？其后工序记录也将一并撤销。`
                          )
                        )
                          actions.undoStep(k);
                      }}
                    >
                      撤销
                    </button>
                  )}
                  {!done && !readOnly && (
                    <button
                      className="primary small"
                      disabled={locked || orderLocked}
                      onClick={() => setStepOpen(k)}
                    >
                      登记完成
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {readOnly && (
          <p className="archive-line">
            全部工序已于 {formatDateTime(r.archivedAt)} 前完成并归档封存。
          </p>
        )}
      </section>

      <section className="panel">
        <h2 className="sec-title">
          <i>5</i> 修复前后照片
        </h2>
        <PhotoGallery
          title="修复前"
          badge="before"
          photos={r.photosBefore}
          readOnly={readOnly}
          onAdd={(file, caption) => actions.addPhoto("before", file, caption)}
          onRemove={(id) => actions.removePhoto("before", id)}
          onPreview={actions.onPreview}
        />
        <div className="photo-divider" />
        <PhotoGallery
          title="修复后"
          badge="after"
          photos={r.photosAfter}
          readOnly={readOnly}
          onAdd={(file, caption) => actions.addPhoto("after", file, caption)}
          onRemove={(id) => actions.removePhoto("after", id)}
          onPreview={actions.onPreview}
        />
      </section>

      <section className="panel two-col">
        <div>
          <h2 className="sec-title">
            <i>6</i> 修复备注
          </h2>
          <textarea
            className="notes-area"
            rows={5}
            value={r.notes}
            disabled={readOnly}
            placeholder="结法、绒头方向、客户特别要求…"
            onChange={(e) => actions.patch({ notes: e.target.value })}
          />
        </div>
        <div>
          <h2 className="sec-title">操作履历</h2>
          <ol className="timeline">
            {[...r.history].reverse().map((h) => (
              <li key={h.at + h.text}>
                <span className="t-dot" />
                <div>
                  <p>{h.text}</p>
                  <small>{formatDateTime(h.at)}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <StepDialog
        open={stepOpen !== null}
        title={STEP_META.find((m) => m.key === stepOpen)?.title ?? ""}
        hint={STEP_META.find((m) => m.key === stepOpen)?.hint ?? ""}
        onClose={() => setStepOpen(null)}
        onConfirm={(note) => {
          if (stepOpen) actions.completeStep(stepOpen, note);
          setStepOpen(null);
        }}
      />

      <Modal
        open={newAreaOpen}
        title="添加破损部位"
        onClose={() => setNewAreaOpen(false)}
        footer={
          <>
            <button onClick={() => setNewAreaOpen(false)}>取消</button>
            <button className="primary" disabled={!areaDraft.name.trim()} onClick={submitArea}>
              添加并选中
            </button>
          </>
        }
      >
        <label className="stack">
          <span>部位名称 *</span>
          <input
            autoFocus
            value={areaDraft.name}
            placeholder="如：中心纹样缺口"
            onChange={(e) =>
              setAreaDraft((d) => ({ ...d, name: e.target.value }))
            }
          />
        </label>
        <label className="stack">
          <span>破损程度</span>
          <select
            value={areaDraft.severity}
            onChange={(e) =>
              setAreaDraft((d) => ({ ...d, severity: e.target.value as Severity }))
            }
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="stack">
          <span>损伤描述</span>
          <textarea
            rows={3}
            value={areaDraft.detail}
            onChange={(e) => setAreaDraft((d) => ({ ...d, detail: e.target.value }))}
          />
        </label>
      </Modal>
    </div>
  );
}
