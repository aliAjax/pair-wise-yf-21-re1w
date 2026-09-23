import { useRef, useState } from "react";
import type { Photo } from "../types";
import { formatDateTime } from "../lib/utils";

interface PhotoGalleryProps {
  title: string;
  photos: Photo[];
  readOnly: boolean;
  badge: string;
  onAdd: (file: File, caption: string) => void;
  onRemove: (id: string) => void;
  onPreview: (url: string, caption: string) => void;
}

export default function PhotoGallery({
  title,
  photos,
  readOnly,
  badge,
  onAdd,
  onRemove,
  onPreview,
}: PhotoGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  return (
    <div className="photo-block">
      <div className="photo-head">
        <h4>
          <span className={`photo-badge ${badge}`}>{title}</span>
          <em>{photos.length} 张</em>
        </h4>
        {!readOnly && (
          <button onClick={() => fileRef.current?.click()}>＋ 添加照片</button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setPending(f);
              setCaption("");
            }
            e.target.value = "";
          }}
        />
      </div>

      {photos.length === 0 ? (
        <p className="photo-empty">暂无{title}照片</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <figure key={p.id} className="photo-item">
              <img
                src={p.url}
                alt={p.caption}
                onClick={() => onPreview(p.url, p.caption)}
              />
              <figcaption>
                <span>{p.caption}</span>
                <small>{formatDateTime(p.addedAt)}</small>
              </figcaption>
              {!readOnly && (
                <button
                  className="photo-del"
                  onClick={() =>
                    window.confirm("删除这张照片？") && onRemove(p.id)
                  }
                  aria-label="删除照片"
                >
                  ✕
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      {pending && (
        <div className="caption-row">
          <input
            placeholder="给照片加个说明，如：修复后 · 补线压平"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            autoFocus
          />
          <button
            className="primary small"
            onClick={() => {
              onAdd(pending, caption.trim() || `${title}照片`);
              setPending(null);
            }}
          >
            确认上传
          </button>
          <button onClick={() => setPending(null)}>取消</button>
        </div>
      )}
    </div>
  );
}
