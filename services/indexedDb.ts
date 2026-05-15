import "./indexedDB.h.ts"
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
 * Saves data to both IndexedDB and localStorage for immediate UI state availability.
 * @param key Unique key for the data.
 * @param data The schedule data to save.
 */
export async function IDBSave(key: string, data: any): Promise<void> {
    console.log('Saving data to persistence layers:', data);
    try {
        // 1. Save to IndexedDB (for robust, structured data)
        await saveToIndexedDB(key, data);
        console.log('data saved successfully to IndexedDB.');

        // 2. Save to localStorage (for immediate, simple fallback UI state)
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('calendarSchedule', JSON.stringify(data));
            console.log('data saved successfully to localStorage.');
        }
    } catch (error) {
        console.error('Error saving to IndexedDB or localStorage:', error);
    }
}

export async function IDBGet(key: string): Promise<any> {
    const savedFromIDB = await getFromIndexedDB(key);

    // Return data from IDB if available, otherwise fall back to localStorage
    if (savedFromIDB) {
        console.log('Retrieved data from IndexedDB:', savedFromIDB);
        return savedFromIDB;
    } else {
        console.warn('No data found in IndexedDB.');
        if (typeof localStorage !== 'undefined') {
            console.warn('Attempting fallback from localStorage.')
            const savedFromLS = localStorage.getItem('calendarSchedule');
            if (savedFromLS) {
                return JSON.parse(savedFromLS);
            }
            console.warn('No data found in either IndexedDB or localStorage.');
            return undefined;
        }
    }
}

export async function IDBGetSchedule(): Promise<Schedule | null> {
    const result = await IDBGet('calendarSchedule');
    return result ? result as Schedule : null;
}

export async function IDBSetSchedule(data: Schedule): Promise<void> {
    // This function now delegates to IDBSave which handles both layers
    await IDBSave('calendarSchedule', data);
}