import { useEffect, useMemo, useState } from "react";
import { DAMAGE_PARTS, DYE_TYPES, ERAS, MATERIALS, ORIGINS } from "../constants";
import type { CarpetRecord, ThreadColor } from "../types";
import { uid } from "../constants";

export interface FormState {
  name: string;
  origin: string;
  era: string;
  density: string;
  materials: string[];
  dyeType: string;
  damageParts: string[];
  damageNote: string;
  threadColors: ThreadColor[];
}

function fromRecord(r: CarpetRecord): FormState {
  return {
    name: r.name,
    origin: r.origin,
    era: r.era,
    density: r.density,
    materials: [...r.materials],
    dyeType: r.dyeType,
    damageParts: [...r.damageParts],
    damageNote: r.damageNote,
    threadColors: r.threadColors.map((c) => ({ ...c })),
  };
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckPicker({ options, value, onChange, disabled }: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="check-grid">
      {options.map((o) => (
        <label
          key={o}
          className={"check" + (value.includes(o) ? " on" : "")}
          onClick={(e) => {
            if (disabled) e.preventDefault();
          }}
        >
          <input
            type="checkbox"
            checked={value.includes(o)}
            disabled={disabled}
            onChange={() => onChange(toggle(value, o))}
          />
          {o}
        </label>
      ))}
    </div>
  );
}

export function InfoTab({ record, onSave }: {
  record: CarpetRecord;
  onSave: (next: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(() => fromRecord(record));
  const locked = record.archived;

  // 切换档案时重置表单
  useEffect(() => {
    setForm(fromRecord(record));
  }, [record.id]);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(fromRecord(record)),
    [form, record]
  );

  const relevantChanged =
    JSON.stringify(form.damageParts) !== JSON.stringify(record.damageParts) ||
    JSON.stringify(form.threadColors) !== JSON.stringify(record.threadColors);
  const willInvalidate = record.colorConfirmed && relevantChanged;

  function setColor(id: string, p: Partial<ThreadColor>) {
    patch({ threadColors: form.threadColors.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  }
  function addColor() {
    patch({
      threadColors: [...form.threadColors, { id: uid(), name: "新补线色", hex: "#a83c2b", code: "" }],
    });
  }
  function removeColor(id: string) {
    patch({ threadColors: form.threadColors.filter((c) => c.id !== id) });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!locked && dirty) onSave(form);
      }}
    >
      {locked && <div className="readonly-banner">档案已归档，登记信息只读。如需修改，请在「修复工序」中撤销归档。</div>}
      {willInvalidate && (
        <div className="warn-banner">
          ⚠
          <div>
            本次修改涉及<b>补线颜色</b>或<b>破损部位</b>。保存后材料色卡确认将失效、档案退回「待配线」，
            已记录的清洗/补线/压平工序会一并清空，需重新确认色卡后按顺序重做。
          </div>
        </div>
      )}

      <div className="form-grid">
        <label className="field">
          <span>地毯名称</span>
          <input
            type="text"
            value={form.name}
            disabled={locked}
            placeholder="如：波斯红花蔓纹毯"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>产地</span>
          <input
            type="text"
            list="origin-list"
            value={form.origin}
            disabled={locked}
            onChange={(e) => patch({ origin: e.target.value })}
          />
          <datalist id="origin-list">
            {ORIGINS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>年代</span>
          <select value={form.era} disabled={locked} onChange={(e) => patch({ era: e.target.value })}>
            {ERAS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>结密度</span>
          <input
            type="text"
            value={form.density}
            disabled={locked}
            placeholder="例：约 320 结/平方分米（42 道/英尺）"
            onChange={(e) => patch({ density: e.target.value })}
          />
        </label>
        <div className="field full">
          <span>材质（可多选）</span>
          <CheckPicker
            options={MATERIALS}
            value={form.materials}
            disabled={locked}
            onChange={(v) => patch({ materials: v })}
          />
        </div>
        <label className="field">
          <span>染色类型</span>
          <select value={form.dyeType} disabled={locked} onChange={(e) => patch({ dyeType: e.target.value })}>
            {DYE_TYPES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>破损部位（可多选，改动将触发重新配线）</span>
          <CheckPicker
            options={DAMAGE_PARTS}
            value={form.damageParts}
            disabled={locked}
            onChange={(v) => patch({ damageParts: v })}
          />
        </div>
        <label className="field full">
          <span>破损情况说明</span>
          <textarea
            value={form.damageNote}
            disabled={locked}
            placeholder="记录破损范围、程度、历史修补情况等"
            onChange={(e) => patch({ damageNote: e.target.value })}
          />
        </label>
      </div>

      <div className="block" style={{ marginTop: 16 }}>
        <div className="block-title">
          <h3>补线颜色（材料色卡）</h3>
          {!locked && (
            <button type="button" className="btn-sm" onClick={addColor}>
              ＋ 添加颜色
            </button>
          )}
        </div>
        {form.threadColors.length === 0 && <p className="note-line">暂未登记补线色。</p>}
        <div className="swatch-list">
          {form.threadColors.map((c) => (
            <div className="swatch" key={c.id}>
              <span className="chip" style={{ background: c.hex }} />
              <div>
                <b>{c.name}</b>
                <small>
                  {c.code || "无色号"} · {c.hex}
                </small>
              </div>
            </div>
          ))}
        </div>
        {!locked &&
          form.threadColors.map((c) => (
            <div className="swatch-edit" key={c.id} style={{ marginBottom: 8 }}>
              <input
                type="color"
                value={c.hex}
                onChange={(e) => setColor(c.id, { hex: e.target.value })}
              />
              <input
                type="text"
                value={c.name}
                placeholder="颜色名称（如 铁锈红）"
                onChange={(e) => setColor(c.id, { name: e.target.value })}
              />
              <input
                type="text"
                value={c.code}
                placeholder="色号（如 YARN-A17）"
                onChange={(e) => setColor(c.id, { code: e.target.value })}
              />
              <button type="button" className="btn-sm btn-danger" onClick={() => removeColor(c.id)}>
                移除
              </button>
            </div>
          ))}
      </div>

      {!locked && (
        <div className="form-actions">
          <button type="button" disabled={!dirty} onClick={() => setForm(fromRecord(record))}>
            还原
          </button>
          <button type="submit" className="btn-primary" disabled={!dirty || !form.origin.trim()}>
            {willInvalidate ? "保存并退回待配线" : "保存登记信息"}
          </button>
        </div>
      )}
    </form>
  );
}
