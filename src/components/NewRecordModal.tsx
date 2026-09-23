import { useState } from "react";
import { ERAS, ORIGINS } from "../constants";

export function NewRecordModal({
  nextCode,
  onClose,
  onCreate,
}: {
  nextCode: string;
  onClose: () => void;
  onCreate: (data: { name: string; origin: string; era: string }) => void;
}) {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [era, setEra] = useState(ERAS[ERAS.length - 1]);
  const [touched, setTouched] = useState(false);

  const valid = origin.trim().length > 0;

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>新建修复档案</h3>
        <p className="modal-sub">
          档案编号自动分配：<b>{nextCode}</b>。创建后在详情中补全材质、破损与补线信息。
        </p>
        <label className="field">
          <span>名称（可留空）</span>
          <input
            type="text"
            placeholder="例：波斯红花蔓纹毯"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span>产地 *</span>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            onBlur={() => setTouched(true)}
          >
            {ORIGINS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>年代</span>
          <select value={era} onChange={(e) => setEra(e.target.value)}>
            {ERAS.map((e2) => (
              <option key={e2} value={e2}>
                {e2}
              </option>
            ))}
          </select>
        </label>
        {touched && !valid && <p style={{ color: "var(--danger)", fontSize: 13 }}>产地为必填项</p>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button
            className="btn-primary"
            disabled={!valid}
            onClick={() => onCreate({ name: name.trim(), origin, era })}
          >
            创建档案
          </button>
        </div>
      </div>
    </div>
  );
}
