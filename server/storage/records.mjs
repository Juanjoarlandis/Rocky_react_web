// Forma común del estado de los stores: {version, namespaces: {ns: {key:
// {value, expiresAt}}}}. Compartido por el almacén en memoria y el cifrado.

export const FILE_VERSION = 1;

export function emptyState() {
  return { version: FILE_VERSION, namespaces: {} };
}

export function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export function isExpired(record, now) {
  return record?.expiresAt !== null && record?.expiresAt !== undefined && record.expiresAt <= now;
}

export function readRecord(state, namespace, key, now) {
  const record = state.namespaces[namespace]?.[key];
  return !record || isExpired(record, now) ? null : record;
}

export function pruneExpiredRecords(state, now) {
  for (const [namespace, records] of Object.entries(state.namespaces)) {
    for (const [key, record] of Object.entries(records)) {
      if (isExpired(record, now)) delete records[key];
    }
    if (Object.keys(records).length === 0) delete state.namespaces[namespace];
  }
}
