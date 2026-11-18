import { clearAllAudio, setAudioOwner } from "@/api/localFiles";

const STORAGE_PREFIX = "mindly:";
const LEGACY_AUDIO_OWNER_KEY = `${STORAGE_PREFIX}legacy-audio-owner:v1`;
const COLLECTIONS = {
  moods: `${STORAGE_PREFIX}moods:v1`,
  tasks: `${STORAGE_PREFIX}tasks:v1`,
  triageSessions: `${STORAGE_PREFIX}triage-sessions:v1`,
  consents: `${STORAGE_PREFIX}consents:v1`,
};
let activeOwnerId = null;

function scopedCollectionKey(collection) {
  const key = COLLECTIONS[collection];
  if (!key) throw new Error(`Unknown local collection: ${collection}`);
  return activeOwnerId ? `${STORAGE_PREFIX}user:${activeOwnerId}:${key.slice(STORAGE_PREFIX.length)}` : key;
}

export function setLocalDataOwner(userId) {
  activeOwnerId = userId || null;
  if (!activeOwnerId) { setAudioOwner(null); return; }

  for (const [collection, legacyKey] of Object.entries(COLLECTIONS)) {
    const scopedKey = scopedCollectionKey(collection);
    const legacyData = window.localStorage.getItem(legacyKey);
    if (legacyData !== null) {
      if (!window.localStorage.getItem(LEGACY_AUDIO_OWNER_KEY)) {
        window.localStorage.setItem(LEGACY_AUDIO_OWNER_KEY, activeOwnerId);
      }
      const scopedData = window.localStorage.getItem(scopedKey);
      try {
        const legacyRecords = JSON.parse(legacyData);
        const scopedRecords = scopedData ? JSON.parse(scopedData) : [];
        if (Array.isArray(legacyRecords) && Array.isArray(scopedRecords)) {
          const recordsById = new Map(legacyRecords.map((record) => [record.id, { ...record, user_id: activeOwnerId }]));
          for (const record of scopedRecords) recordsById.set(record.id, { ...record, user_id: activeOwnerId });
          window.localStorage.setItem(scopedKey, JSON.stringify([...recordsById.values()]));
        } else if (!scopedData) {
          window.localStorage.setItem(scopedKey, legacyData);
        }
      } catch {
        if (!scopedData) window.localStorage.setItem(scopedKey, legacyData);
      }
      window.localStorage.removeItem(legacyKey);
    }
  }
  setAudioOwner(activeOwnerId, window.localStorage.getItem(LEGACY_AUDIO_OWNER_KEY) === activeOwnerId);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readCollection(collection) {
  const key = scopedCollectionKey(collection);

  const stored = window.localStorage.getItem(key);
  if (!stored) return [];

  const records = JSON.parse(stored);
  if (!Array.isArray(records)) {
    throw new Error(`Local data for "${collection}" is invalid. Clear Mindly data to continue.`);
  }
  return records;
}

function writeCollection(collection, records) {
  const key = scopedCollectionKey(collection);
  window.localStorage.setItem(key, JSON.stringify(records));
}

function list(collection, sort = "-created_date", limit) {
  const descending = sort.startsWith("-");
  const field = descending ? sort.slice(1) : sort;
  const records = readCollection(collection).sort((a, b) => {
    const left = a[field] ?? "";
    const right = b[field] ?? "";
    return (left > right ? 1 : left < right ? -1 : 0) * (descending ? -1 : 1);
  });
  return typeof limit === "number" ? records.slice(0, limit) : records;
}

function create(collection, values) {
  const now = new Date().toISOString();
  const record = {
    ...values,
    ...(activeOwnerId ? { user_id: activeOwnerId } : {}),
    id: createId(),
    created_date: values.created_date || now,
    updated_date: now,
  };
  writeCollection(collection, [record, ...readCollection(collection)]);
  return record;
}

function update(collection, id, values) {
  const records = readCollection(collection);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) throw new Error(`Record "${id}" was not found in "${collection}".`);

  const next = { ...records[index], ...values, id, updated_date: new Date().toISOString() };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete next[key];
  }
  records[index] = next;
  writeCollection(collection, records);
  return next;
}

function remove(collection, id) {
  const records = readCollection(collection);
  writeCollection(collection, records.filter((record) => record.id !== id));
}

function clearCollection(collection) {
  writeCollection(collection, []);
}

export const localData = {
  moods: {
    list: (sort, limit) => list("moods", sort, limit),
    create: (values) => create("moods", values),
    update: (id, values) => update("moods", id, values),
    delete: (id) => remove("moods", id),
  },
  tasks: {
    list: (sort, limit) => list("tasks", sort, limit),
    create: (values) => create("tasks", values),
    update: (id, values) => update("tasks", id, values),
    delete: (id) => remove("tasks", id),
  },
  triageSessions: {
    list: (sort, limit) => list("triageSessions", sort, limit),
    create: (values) => create("triageSessions", values),
    update: (id, values) => update("triageSessions", id, values),
  },
  consents: {
    list: () => list("consents"),
    create: (values) => create("consents", values),
  },
  async clearAll() {
    for (const collection of Object.keys(COLLECTIONS)) clearCollection(collection);
    window.localStorage.removeItem(`${STORAGE_PREFIX}feedback:v1`);
    window.localStorage.removeItem(`${STORAGE_PREFIX}profile:v1`);
    window.localStorage.removeItem(`${STORAGE_PREFIX}accounts:v1`);
    const ownsLegacyAudio = !activeOwnerId || window.localStorage.getItem(LEGACY_AUDIO_OWNER_KEY) === activeOwnerId;
    await clearAllAudio({ includeLegacy: Boolean(ownsLegacyAudio) });
    if (activeOwnerId && ownsLegacyAudio) window.localStorage.removeItem(LEGACY_AUDIO_OWNER_KEY);
  },
};
