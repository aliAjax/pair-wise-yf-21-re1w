import { useState } from "react";
import { DAMAGE_PARTS, uid } from "../constants";
import type { CarpetRecord, PatternMarker } from "../types";
import { fileToDataUrl } from "../utils";
import { ImageDropzone } from "./common";

export function PatternTab({
  record,
  onImage,
  onAddMarker,
  onUpdateMarker,
  onRemoveMarker,
}: {
  record: CarpetRecord;
  onImage: (dataUrl: string | undefined) => void;
  onAddMarker: (m: Omit<PatternMarker, "id" | "label">) => void;
  onUpdateMarker: (id: string, patch: Partial<PatternMarker>) => void;
  onRemoveMarker: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const locked = record.archived;
  const selected = record.markers.find((m) => m.id === selectedId) ?? null;

  function stageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (locked || !record.patternImage) return;
    if ((e.target as HTMLElement).closest(".marker")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const part = record.damageParts[0] ?? DAMAGE_PARTS[0];
    onAddMarker({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, part, desc: "" });
  }

  return (
    <div>
      <div className="block">
        <div className="block-title">
          <h3>纹样局部标记图</h3>
          <span className="note-line">
            {record.patternImage && !locked ? "在图上点击任意位置即可添加损伤标记" : ""}
          </span>
        </div>

        {record.patternImage ? (
          <div className="pattern-stage" onClick={stageClick}>
            <img src={record.patternImage} alt="纹样局部图" draggable={false} />
            {record.markers.map((m) => (
              <button
                key={m.id}
                type="button"
                className={"marker" + (selectedId === m.id ? " selected" : "")}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                title={`${m.label} ${m.part}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(m.id);
                }}
              >
                {m.label.replace("M", "")}
              </button>
            ))}
          </div>
        ) : (
          <ImageDropzone
            src={undefined}
            onChange={onImage}
            hint="上传纹样局部照片（建议拍清损伤处，上传时自动压缩）"
            height={280}
            disabled={locked}
          />
        )}

        {record.patternImage && (
          <p className="marker-tip">
            {locked
              ? "档案已归档，标记图只读。"
              : "提示：点击图面落标；可更换底图或删除。标记用于对照破损部位与补线位置。"}
          </p>
        )}

        {record.patternImage && !locked && (
          <div className="dz-actions" style={{ position: "static", marginTop: 10 }}>
            <label className="btn-sm" style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", background: "#fffdf8", cursor: "pointer" }}>
              更换纹样局部图
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    onImage(await fileToDataUrl(f));
                  } catch {
                    /* 压缩失败时忽略 */
                  }
                }}
              />
            </label>
            <button className="btn-sm btn-danger" onClick={() => onImage(undefined)}>
              删除底图
            </button>
          </div>
        )}
      </div>

      <div className="block">
        <div className="block-title">
          <h3>损伤标记（{record.markers.length}）</h3>
        </div>
        {record.markers.length === 0 && <p className="note-line">还没有标记，在上方纹样图上点击即可添加。</p>}
        <div className="marker-list">
          {record.markers.map((m, i) => (
            <div
              key={m.id}
              className={"marker-row" + (selectedId === m.id ? " active" : "")}
              onClick={() => setSelectedId(m.id)}
            >
              <span className="mk-num">{i + 1}</span>
              <div>
                <b>
                  {m.label} · {m.part}
                </b>
                <p>{m.desc || "（未填写说明）"}</p>
              </div>
              {!locked && (
                <button
                  className="btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveMarker(m.id);
                    if (selectedId === m.id) setSelectedId(null);
                  }}
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>

        {selected && (
          <div className="marker-editor">
            <label className="field">
              <span>关联破损部位</span>
              <select
                value={selected.part}
                disabled={locked}
                onChange={(e) => onUpdateMarker(selected.id, { part: e.target.value })}
              >
                {Array.from(new Set([...record.damageParts, ...DAMAGE_PARTS])).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>位置（百分比坐标）</span>
              <input
                type="text"
                value={`x ${selected.x.toFixed(1)}% · y ${selected.y.toFixed(1)}%`}
                readOnly
              />
            </label>
            <label className="field full">
              <span>损伤说明 / 修复要求</span>
              <textarea
                value={selected.desc}
                disabled={locked}
                placeholder="例：缺绒约 6×9cm，需对齐毯绒方向补绒"
                onChange={(e) => onUpdateMarker(selected.id, { desc: e.target.value })}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

export function makeMarkerId() {
  return uid();
}
