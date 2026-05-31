import { defaultReminders } from "../lib/framework";
import type { AppSettings, DailyRecord, DailyRecordPatch } from "../types/record";
import { createEmptyRecord, mergeRecord } from "../utils/record";

const DB_NAME = "self-trace-daily-db";
const DB_VERSION = 1;
const RECORDS = "dailyRecords";
const SETTINGS = "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS)) {
        db.createObjectStore(RECORDS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS)) {
        db.createObjectStore(SETTINGS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function transact<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);
        let result: T | undefined;

        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
          request.onerror = () => reject(request.error);
        }

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function getRecord(date: string): Promise<DailyRecord> {
  const found = await transact<DailyRecord>(RECORDS, "readonly", (store) => store.get(date));
  return found ?? createEmptyRecord(date);
}

export async function saveRecord(record: DailyRecord): Promise<DailyRecord> {
  const saved = mergeRecord(record, {});
  await transact<IDBValidKey>(RECORDS, "readwrite", (store) => store.put(saved));
  window.dispatchEvent(new CustomEvent("records:changed"));
  return saved;
}

export async function patchRecord(date: string, patch: DailyRecordPatch): Promise<DailyRecord> {
  const current = await getRecord(date);
  const merged = mergeRecord(current, patch);
  await transact<IDBValidKey>(RECORDS, "readwrite", (store) => store.put(merged));
  window.dispatchEvent(new CustomEvent("records:changed"));
  return merged;
}

export async function listRecords(): Promise<DailyRecord[]> {
  const records = (await transact<DailyRecord[]>(RECORDS, "readonly", (store) => store.getAll())) ?? [];
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

export async function importRecords(records: DailyRecord[]): Promise<void> {
  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(RECORDS, "readwrite");
        const store = tx.objectStore(RECORDS);
        for (const record of records) {
          store.put(mergeRecord(createEmptyRecord(record.date), record));
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
  window.dispatchEvent(new CustomEvent("records:changed"));
}

export async function clearAllRecords(): Promise<void> {
  await transact<undefined>(RECORDS, "readwrite", (store) => {
    store.clear();
  });
  window.dispatchEvent(new CustomEvent("records:changed"));
}

export async function getSettings(): Promise<AppSettings> {
  const found = await transact<AppSettings>(SETTINGS, "readonly", (store) => store.get("settings"));
  if (found) {
    const mergedReminders = defaultReminders.map((defaultReminder) => ({
      ...defaultReminder,
      ...found.reminders.find((item) => item.key === defaultReminder.key),
    }));
    return { ...found, reminders: mergedReminders };
  }
  return {
    id: "settings",
    reminders: defaultReminders,
    updated_at: new Date().toISOString(),
  };
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const saved = { ...settings, updated_at: new Date().toISOString() };
  await transact<IDBValidKey>(SETTINGS, "readwrite", (store) => store.put(saved));
  window.dispatchEvent(new CustomEvent("settings:changed"));
  return saved;
}
