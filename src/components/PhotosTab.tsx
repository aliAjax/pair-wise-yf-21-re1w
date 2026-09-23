import type { CarpetRecord } from "../types";
import { ImageDropzone } from "./common";

export function PhotosTab({
  record,
  onChange,
}: {
  record: CarpetRecord;
  onChange: (patch: { photoBefore?: string; photoAfter?: string }) => void;
}) {
  const locked = record.archived;
  return (
    <div>
      {locked && <div className="readonly-banner">档案已归档，修复前后照片锁定为历史记录。</div>}
      <div className="photo-grid">
        <div className="photo-cell">
          <h4>修复前照片（接修时登记）</h4>
          <ImageDropzone
            src={record.photoBefore}
            onChange={(d) => onChange({ photoBefore: d })}
            hint="接修时拍摄的破损全貌"
            height={260}
            disabled={locked}
          />
        </div>
        <div className="photo-cell">
          <h4>修复后照片（归档前必传）</h4>
          <ImageDropzone
            src={record.photoAfter}
            onChange={(d) => onChange({ photoAfter: d })}
            hint="三道工序完成后拍摄，作为归档依据"
            height={260}
            disabled={locked}
          />
        </div>
      </div>
      <p className="marker-tip">
        照片仅保存在本机浏览器（localStorage），上传时会自动压缩；可在左侧导出 JSON 做离线备份。
      </p>
    </div>
  );
}
