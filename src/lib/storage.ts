import type { CarpetRecord } from "../types";
import { STORAGE_KEY } from "./constants";
import { buildSeedRecords } from "./seed";

export function loadRecords(): CarpetRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = buildSeedRecords();
      saveRecords(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as CarpetRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("档案读取失败", e);
    return [];
  }
}

export function saveRecords(records: CarpetRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error("档案保存失败（可能存储空间不足）", e);
    alert("保存失败：浏览器本地存储空间可能不足，请减少照片数量或缩小图片。");
    return false;
  }
}
