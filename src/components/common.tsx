import { useRef, useState } from "react";
import { STAGE_LABEL } from "../constants";
import type { StageId } from "../types";
import { cx, fileToDataUrl } from "../utils";

export function StageBadge({ stage, className }: { stage: StageId; className?: string }) {
  return <span className={cx("badge", stage, className)}>{STAGE_LABEL[stage]}</span>;
}

export function ImageDropzone({
  src,
  onChange,
  hint,
  height,
  disabled,
}: {
  src?: string;
  onChange: (dataUrl: string | undefined) => void;
  hint: React.ReactNode;
  height?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片处理失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cx("dropzone", src && "has-img")}
      style={!src && height ? { minHeight: height } : undefined}
      onClick={() => {
        if (!src && !disabled) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!disabled) void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {src ? (
        <>
          <img src={src} alt="" />
          {!disabled && (
            <div className="dz-actions">
              <button onClick={() => inputRef.current?.click()}>{busy ? "处理中…" : "更换"}</button>
              <button className="btn-danger" onClick={() => onChange(undefined)}>
                删除
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="dz-hint">
          {busy ? (
            "正在压缩图片…"
          ) : (
            <>
              <b>点击选择</b> 或拖拽图片到此处
              <br />
              {hint}
              {error && (
                <>
                  <br />
                  <span style={{ color: "var(--danger)" }}>{error}</span>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
