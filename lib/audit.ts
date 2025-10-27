import { AuditEntry } from "./types";

const STORAGE_KEY = "converge-subscriber-audit";

const getEntries = (): AuditEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch (error) {
    console.warn("Failed to read audit log", error);
    return [];
  }
};

const persistEntries = (entries: AuditEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("Failed to persist audit log", error);
  }
};

export const logAudit = <T,>(entry: AuditEntry<T>) => {
  const entries = getEntries();
  entries.unshift(entry as AuditEntry);
  persistEntries(entries.slice(0, 200));
};

export const readAudit = (): AuditEntry[] => {
  return getEntries();
};

export const clearAudit = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};
