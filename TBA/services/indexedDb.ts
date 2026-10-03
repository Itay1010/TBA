import { UISchedule } from "./indexedDB.h";
import { normalizeSchedule } from "./apiUtils";
const IDB_STORE_NAME = "TBA-ST";
const IDB_DB_NAME = "TBA-DB";
const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_DB_NAME, DB_VERSION);
        request.onupgradeneeded = function () {
            const db = request.result;
            if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
                db.createObjectStore(IDB_STORE_NAME, { keyPath: 'IDBKey' });
            }
        };
        request.onsuccess = function () {
            resolve(request.result);
        };
        request.onerror = function () {
            reject(request.error);
        };
    });
}

async function saveToIndexedDB(key: string, data: any): Promise<Event> {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_STORE_NAME);
        store.put({ IDBKey: key, data });
        transaction.oncomplete = resolve;
        transaction.onerror = reject;
    });
}

async function getFromIndexedDB(key: string): Promise<any> {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IDB_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = function () {
            resolve(request.result ? request.result.data : {});
        };
        request.onerror = reject;
    });
}

/**
 * Saves data to IndexedDB.
 * @param key Unique key for the data.
 * @param data The schedule data to save.
 */
export async function IDBSave(key: string, data: any): Promise<void> {
    console.log('Saving data to IndexedDB:', data);
    try {
        await saveToIndexedDB(key, data);
        console.log('data saved successfully to IndexedDB.');
    } catch (error) {
        console.error('Error saving to IndexedDB:', error);
    }
}

export async function IDBGet(key: string): Promise<any> {
    const savedFromIDB = await getFromIndexedDB(key);
    if (savedFromIDB) {
        console.log('Retrieved data from IndexedDB:', savedFromIDB);
        return savedFromIDB;
    }
    console.warn('No data found in IndexedDB for key:', key);
    return undefined;
}

export async function IDBGetSchedule(): Promise<UISchedule | null> {
    const result = await IDBGet('calendarSchedule');
    return result ? normalizeSchedule(result) : null;
}

export async function IDBSetSchedule(data: any): Promise<void> {
    const normalized = normalizeSchedule(data);
    await IDBSave('calendarSchedule', normalized);
}