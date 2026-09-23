import { currentStage } from "../constants";
import type { CarpetRecord, PatternMarker, StepId, TabId } from "../types";
import { formatDateTime } from "../utils";
import { StageBadge } from "./common";
import type { FormState } from "./InfoTab";
import { InfoTab } from "./InfoTab";
import { PatternTab } from "./PatternTab";
import { PhotosTab } from "./PhotosTab";
import { ProcessTab } from "./ProcessTab";

const TABS: { id: TabId; label: string }[] = [
  { id: "process", label: "修复工序" },
  { id: "info", label: "基本信息 / 色卡" },
  { id: "pattern", label: "纹样局部标记图" },
  { id: "photos", label: "修复前后照片" },
];

export function DetailView({
  record,
  tab,
  onTab,
  onSaveInfo,
  onConfirmColor,
  onUnconfirmColor,
  onCompleteStep,
  onUndoStep,
  onArchive,
  onUnarchive,
  onDelete,
  onPatternImage,
  onAddMarker,
  onUpdateMarker,
  onRemoveMarker,
  onPhotosChange,
}: {
  record: CarpetRecord;
  tab: TabId;
  onTab: (t: TabId) => void;
  onSaveInfo: (data: FormState) => void;
  onConfirmColor: () => void;
  onUnconfirmColor: () => void;
  onCompleteStep: (stepId: StepId, note: string) => void;
  onUndoStep: (stepId: StepId) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onPatternImage: (d: string | undefined) => void;
  onAddMarker: (m: Omit<PatternMarker, "id" | "label">) => void;
  onUpdateMarker: (id: string, patch: Partial<PatternMarker>) => void;
  onRemoveMarker: (id: string) => void;
  onPhotosChange: (patch: { photoBefore?: string; photoAfter?: string }) => void;
}) {
  const stage = currentStage(record);

  return (
    <section className="detail">
      <div className="detail-head">
        <div>
          <StageBadge stage={stage} />
          <h2>{record.name || "未命名地毯"}</h2>
          <div className="meta-line">
            <span>编号 {record.code}</span>
            <span>·</span>
            <span>{record.origin}</span>
            <span>·</span>
            <span>{record.era}</span>
            <span>·</span>
            <span>更新于 {formatDateTime(record.updatedAt)}</span>
          </div>
        </div>
        <div className="head-actions">
          <button
            className="btn-sm btn-danger"
            onClick={() => {
              if (window.confirm(`确定删除档案 ${record.code}（${record.name || "未命名地毯"}）？此操作不可恢复。`)) {
                onDelete();
              }
            }}
          >
            删除档案
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : undefined} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "process" && (
        <ProcessTab
          record={record}
          onConfirm={onConfirmColor}
          onUnconfirm={onUnconfirmColor}
          onComplete={onCompleteStep}
          onUndo={onUndoStep}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onGoInfo={() => onTab("info")}
        />
      )}
      {tab === "info" && <InfoTab record={record} onSave={onSaveInfo} />}
      {tab === "pattern" && (
        <PatternTab
          record={record}
          onImage={onPatternImage}
          onAddMarker={onAddMarker}
          onUpdateMarker={onUpdateMarker}
          onRemoveMarker={onRemoveMarker}
        />
      )}
      {tab === "photos" && <PhotosTab record={record} onChange={onPhotosChange} />}
    </section>
  );
}
