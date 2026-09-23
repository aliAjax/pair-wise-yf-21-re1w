import { useState } from "react";
import { STEP_META, currentStage, stepProgress } from "../constants";
import type { CarpetRecord, StepId } from "../types";
import { formatDateTime } from "../utils";
import { StageBadge } from "./common";

const NODE_NAMES = ["配线", "清洗", "补线", "压平", "归档"];

function Stepper({ record }: { record: CarpetRecord }) {
  const stage = currentStage(record);
  const nodeDone = [
    record.colorConfirmed,
    record.steps.wash.done,
    record.steps.rethread.done,
    record.steps.flatten.done,
    record.archived,
  ];
  const currentIndex: Record<string, number> = {
    unconfirmed: 0,
    wash: 1,
    rethread: 2,
    flatten: 3,
    ready: 4,
    archived: -1,
  };
  const cur = currentIndex[stage];
  const dotLabels = ["线", "1", "2", "3", "档"];

  return (
    <div className="stepper">
      {NODE_NAMES.map((name, i) => (
        <div key={name} style={{ display: "contents" }}>
          <div className={"step-node" + (nodeDone[i] ? " done" : "") + (cur === i ? " current" : "")}>
            <div className="step-dot">{nodeDone[i] ? "✓" : dotLabels[i]}</div>
            <span className="step-name">{name}</span>
          </div>
          {i < NODE_NAMES.length - 1 && (
            <div className={"step-link" + (nodeDone[i] ? " done" : "")} />
          )}
        </div>
      ))}
    </div>
  );
}

function ColorCard({ record, onConfirm, onUnconfirm, onGoInfo }: {
  record: CarpetRecord;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onGoInfo: () => void;
}) {
  const locked = record.archived;
  return (
    <div className="block">
      <div className="block-title">
        <h3>材料色卡 · 补线配色</h3>
        <button className="btn-sm" onClick={onGoInfo}>去基本信息修改</button>
      </div>

      {record.threadColors.length === 0 ? (
        <p className="note-line">尚未登记补线颜色，请先在「基本信息」中添加。</p>
      ) : (
        <div className="swatch-list">
          {record.threadColors.map((c) => (
            <div className="swatch" key={c.id}>
              <span className="chip" style={{ background: c.hex }} />
              <div>
                <b>{c.name}</b>
                <small>
                  {c.code || "—"} · {c.hex}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      {record.colorConfirmed ? (
        <div className="confirm-banner ok">
          <p>
            ✓ 色卡已确认（{formatDateTime(record.colorConfirmedAt)}），可以按顺序记录修复工序。
            {!locked && " 发现色差可退回重新配线。"}
          </p>
          {!locked && (
            <button className="btn-sm btn-danger" onClick={onUnconfirm}>
              色差 · 退回待配线
            </button>
          )}
        </div>
      ) : (
        <div className="confirm-banner pending">
          <p>
            ⚳ 色卡未确认，档案处于「待配线」，工序暂停。
            {record.threadColors.length === 0
              ? "请先登记补线颜色。"
              : "确认实物配线与色卡一致后方可开始清洗。"}
          </p>
          <button className="btn-sm btn-accent" disabled={locked || record.threadColors.length === 0} onClick={onConfirm}>
            确认材料色卡
          </button>
        </div>
      )}
    </div>
  );
}

function StepRow({ record, stepId, index, onComplete, onUndo }: {
  record: CarpetRecord;
  stepId: StepId;
  index: number;
  onComplete: (stepId: StepId, note: string) => void;
  onUndo: (stepId: StepId) => void;
}) {
  const meta = STEP_META[index];
  const step = record.steps[stepId];
  const prevDone = index === 0 || record.steps[STEP_META[index - 1].id].done;
  const available = !record.archived && record.colorConfirmed && prevDone;
  const isLastDone =
    step.done &&
    !record.archived &&
    (index === STEP_META.length - 1 || !record.steps[STEP_META[index + 1].id].done);
  const [note, setNote] = useState("");

  let hint: string | null = null;
  if (record.archived) hint = "档案已归档，记录锁定。";
  else if (!record.colorConfirmed) hint = "等待材料色卡确认。";
  else if (!prevDone) hint = `请先完成上一道工序（${STEP_META[index - 1].name}）。`;

  return (
    <div className={"tl-item" + (step.done ? " is-done" : "") + (!available && !step.done ? " is-locked" : "")}>
      <div className="tl-num">{step.done ? "✓" : index + 1}</div>
      <div className="tl-body">
        <strong>
          {meta.name}
          {step.done ? "（已完成）" : ""}
        </strong>
        <span className="at">{step.done ? `完成时间 ${formatDateTime(step.at)}` : hint ?? "可以记录"}</span>
        {step.done && step.note && <p className="note">{step.note}</p>}
      </div>
      <div className="tl-action">
        {step.done ? (
          isLastDone ? (
            <button className="btn-sm" onClick={() => onUndo(stepId)}>
              撤销此工序
            </button>
          ) : (
            <span className="note-line">已锁定</span>
          )
        ) : available ? (
          <>
            <textarea
              placeholder={`${meta.name}处理记录：洗剂/配线色号/温湿度…`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="row">
              <button className="btn-sm btn-accent" onClick={() => onComplete(stepId, note.trim())}>
                ✓ {meta.verb}
              </button>
            </div>
          </>
        ) : (
          <span className="note-line">未解锁</span>
        )}
      </div>
    </div>
  );
}

export function ProcessTab({ record, onConfirm, onUnconfirm, onComplete, onUndo, onArchive, onUnarchive, onGoInfo }: {
  record: CarpetRecord;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onComplete: (stepId: StepId, note: string) => void;
  onUndo: (stepId: StepId) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onGoInfo: () => void;
}) {
  const stage = currentStage(record);
  const progress = stepProgress(record);
  const missingPhoto = !record.photoAfter;

  return (
    <div>
      <Stepper record={record} />
      <ColorCard record={record} onConfirm={onConfirm} onUnconfirm={onUnconfirm} onGoInfo={onGoInfo} />

      <div className="block">
        <div className="block-title">
          <h3>修复工序记录</h3>
          <span className="note-line">
            已完成 {progress}/3 道 · 严格按 清洗 → 补线 → 压平 顺序记录
          </span>
        </div>
        <div className="timeline">
          {STEP_META.map((s, i) => (
            <StepRow
              key={s.id}
              record={record}
              stepId={s.id}
              index={i}
              onComplete={onComplete}
              onUndo={onUndo}
            />
          ))}
        </div>
      </div>

      {record.archived ? (
        <div className="archive-banner done">
          <p>
            此档案已于 {formatDateTime(record.archivedAt)} 归档，全部信息与照片锁定为历史记录。
          </p>
          <button className="btn-sm" onClick={onUnarchive}>
            撤销归档（退回待归档）
          </button>
        </div>
      ) : (
        <div className={"archive-banner" + (stage === "ready" ? " ready" : "")}>
          <p>
            {stage === "ready" ? (
              missingPhoto ? (
                <>三道工序已全部完成。归档前还需在「修复照片」中上传 <b>修复后照片</b>。</>
              ) : (
                <>三道工序已全部完成，修复后照片已就位，可以归档。</>
              )
            ) : (
              <>全部工序完成后方可归档（当前阶段：待配线确认与三道工序记录）。</>
            )}
          </p>
          <button className="btn-primary btn-sm" disabled={stage !== "ready" || missingPhoto} onClick={onArchive}>
            归档
          </button>
        </div>
      )}
    </div>
  );
}
