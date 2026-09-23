import { useState } from "react";
import Modal from "./Modal";

interface StepDialogProps {
  open: boolean;
  title: string;
  hint: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export default function StepDialog({ open, title, hint, onClose, onConfirm }: StepDialogProps) {
  const [note, setNote] = useState("");

  const submit = () => {
    onConfirm(note.trim());
    setNote("");
  };

  return (
    <Modal
      open={open}
      title={`工序登记 · ${title}`}
      onClose={() => {
        setNote("");
        onClose();
      }}
      footer={
        <>
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={false}>
            确认完成{title}
          </button>
        </>
      }
    >
      <p className="step-hint">{hint}</p>
      <label className="stack">
        <span>施工记录（材料、手法、耗时等）</span>
        <textarea
          rows={4}
          placeholder={`记录本次${title}的要点…`}
          value={note}
          autoFocus
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Modal>
  );
}
