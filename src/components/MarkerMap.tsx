import { useRef, useState } from "react";
import type { DamageArea, Marker } from "../types";

export const MARK_COLORS = [
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

export function areaColor(areas: DamageArea[], areaId: string): string {
  const idx = areas.findIndex((a) => a.id === areaId);
  return MARK_COLORS[(idx < 0 ? 0 : idx) % MARK_COLORS.length];
}

interface MarkerMapProps {
  image: string | null;
  markers: Marker[];
  areas: DamageArea[];
  activeAreaId: string | null;
  readOnly: boolean;
  onAddMarker: (x: number, y: number) => void;
  onRemoveMarker: (markerId: string) => void;
  onUpload: (file: File) => void;
}

export default function MarkerMap({
  image,
  markers,
  areas,
  activeAreaId,
  readOnly,
  onAddMarker,
  onRemoveMarker,
  onUpload,
}: MarkerMapProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const activeArea = areas.find((a) => a.id === activeAreaId) ?? null;

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly || !activeArea || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || y < 0 || x > 1 || y > 1) return;
    onAddMarker(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
  };

  const handleFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };

  if (!image) {
    return (
      <div
        className={`map-drop ${dragOver ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!readOnly) handleFile(e.dataTransfer.files);
        }}
        onClick={() => !readOnly && fileRef.current?.click()}
        role="button"
      >
        <div className="drop-inner">
          <span className="drop-icon">🖼️</span>
          <p>
            {readOnly
              ? "暂无纹样局部标记图"
              : "上传纹样局部图后，在图上点击标记损伤位置"}
          </p>
          {!readOnly && <small>点击选择或拖拽图片到此处 · JPG / PNG</small>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            handleFile(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="marker-map">
      <div
        ref={stageRef}
        className={`map-stage ${activeArea && !readOnly ? "picking" : ""} ${
          readOnly ? "readonly" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!readOnly) handleFile(e.dataTransfer.files);
        }}
        onClick={handleClick}
        role="img"
        aria-label="纹样局部标记图"
      >
        <img src={image} alt="纹样局部标记图" draggable={false} />
        {dragOver && <div className="map-dragover">松开以更换底图</div>}
        {markers.map((m) => {
          const area = areas.find((a) => a.id === m.areaId);
          const color = areaColor(areas, m.areaId);
          const idx = areas.findIndex((a) => a.id === m.areaId);
          return (
            <button
              key={m.id}
              className="map-pin"
              style={{
                left: `${m.x * 100}%`,
                top: `${m.y * 100}%`,
                ["--pin" as string]: color,
              }}
              title={area ? `${idx + 1}. ${area.name}（${area.severity}）` : "破损标记"}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly && window.confirm("删除这个损伤标记？")) {
                  onRemoveMarker(m.id);
                }
              }}
            >
              <span>{idx >= 0 ? idx + 1 : "?"}</span>
            </button>
          );
        })}
      </div>
      {!readOnly && (
        <div className="map-bar">
          <span>
            {activeArea
              ? `正在标记：${activeArea.name} —— 在图上点击落点`
              : "先在下方破损部位列表中选择一项，再在图上点击标记"}
          </span>
          <button onClick={() => fileRef.current?.click()}>更换底图</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleFile(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
