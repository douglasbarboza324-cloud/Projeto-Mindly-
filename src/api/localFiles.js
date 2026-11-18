const DATABASE_NAME = "mindly-local-files";
const STORE_NAME = "audio";
const AUDIO_PREFIX = "local-audio:";
let activeOwnerId = null;
let hasLegacyAudioAccess = false;

export function setAudioOwner(userId, allowLegacyAudio = false) {
  activeOwnerId = userId || null;
  hasLegacyAudioAccess = Boolean(allowLegacyAudio);
}

function resolveAudioKey(uri) {
  if (!uri?.startsWith(AUDIO_PREFIX)) return null;
  const value = uri.slice(AUDIO_PREFIX.length);
  const separator = value.indexOf(":");
  if (separator === -1) return !activeOwnerId || hasLegacyAudioAccess ? value : null;
  const ownerId = value.slice(0, separator);
  return activeOwnerId === ownerId ? value : null;
}

function openDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("Este navegador não oferece armazenamento local de áudio."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento de áudio."));
  });
}

export async function saveAudio(blob) {
  const database = await openDatabase();
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = activeOwnerId ? `${activeOwnerId}:${id}` : id;

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(blob, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Não foi possível salvar o áudio."));
  });
  database.close();
  return `${AUDIO_PREFIX}${key}`;
}

export async function getAudio(uri) {
  const key = resolveAudioKey(uri);
  if (!key) return null;
  const database = await openDatabase();

  const blob = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Não foi possível carregar o áudio."));
  });
  database.close();
  return blob;
}

export async function deleteAudio(uri) {
  const key = resolveAudioKey(uri);
  if (!key) return;
  const database = await openDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Não foi possível excluir o áudio."));
  });
  database.close();
}

export async function clearAllAudio({ includeLegacy = !activeOwnerId } = {}) {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    if (!activeOwnerId && includeLegacy) {
      store.clear();
    } else {
      const request = store.getAllKeys();
      request.onsuccess = () => {
        for (const key of request.result) {
          const belongsToOwner = typeof key === "string" && key.startsWith(`${activeOwnerId}:`);
          const isLegacy = typeof key === "string" && !key.includes(":");
          if (belongsToOwner || (includeLegacy && isLegacy)) store.delete(key);
        }
      };
    }
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Não foi possível limpar os áudios locais."));
  });
  database.close();
}
