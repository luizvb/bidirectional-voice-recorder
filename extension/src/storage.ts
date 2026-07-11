import type { StoredRecording } from './types';

const DB_NAME = 'voxa-extension';
const STORE_NAME = 'recordings';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export const saveRecording = (recording: StoredRecording) => transaction('readwrite', (store) => store.put(recording));
export const getRecording = (sessionId: string) => transaction<StoredRecording | undefined>('readonly', (store) => store.get(sessionId));
export const deleteRecording = (sessionId: string) => transaction('readwrite', (store) => store.delete(sessionId));
export const listRecordings = () => transaction<StoredRecording[]>('readonly', (store) => store.getAll());
