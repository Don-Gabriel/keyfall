const DB_NAME = 'keyfall-library';
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('songs', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
export async function songStore(action, value) {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('songs', action === 'getAll' ? 'readonly' : 'readwrite');
    const request = tx.objectStore('songs')[action](value);
    tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export function readSetting(key, fallback) { try { return JSON.parse(localStorage.getItem(`keyfall:${key}`)) ?? fallback; } catch { return fallback; } }
export function writeSetting(key, value) { try { localStorage.setItem(`keyfall:${key}`, JSON.stringify(value)); return true; } catch { return false; } }
