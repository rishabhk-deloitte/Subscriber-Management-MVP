import { AuditEntry } from "./types";
import { safeStorage } from "./safe-storage";

const STORAGE_KEY = "converge-subscriber-audit";

const getEntries = (): AuditEntry[] => safeStorage.get<AuditEntry[]>(STORAGE_KEY, []);

const persistEntries = (entries: AuditEntry[]) => safeStorage.set(STORAGE_KEY, entries);

export const logAudit = <T,>(entry: AuditEntry<T>) => {
  const entries = getEntries();
  entries.unshift(entry as AuditEntry);
  persistEntries(entries.slice(0, 200));
};

export const readAudit = (): AuditEntry[] => getEntries();

export const clearAudit = () => {
  safeStorage.remove(STORAGE_KEY);
};
