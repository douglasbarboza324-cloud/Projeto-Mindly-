const DATABASE_NAME = "mindly-local-files";
const STORE_NAME = "audio";
const AUDIO_PREFIX = "local-audio:";

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

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(blob, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Não foi possível salvar o áudio."));
  });
  database.close();
  return `${AUDIO_PREFIX}${id}`;
}

export async function getAudio(uri) {
  if (!uri?.startsWith(AUDIO_PREFIX)) return null;
  const database = await openDatabase();
  const id = uri.slice(AUDIO_PREFIX.length);

  const blob = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Não foi possível carregar o áudio."));
  });
  database.close();
  return blob;
}

export async function deleteAudio(uri) {
  if (!uri?.startsWith(AUDIO_PREFIX)) return;
  const database = await openDatabase();
  const id = uri.slice(AUDIO_PREFIX.length);

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Não foi possível excluir o áudio."));
  });
  database.close();
}

export async function clearAllAudio() {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();

  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Não foi possível limpar os áudios locais."));
  });
  database.close();
}
