/**
 * offlineQueue.js
 * Cola persistente en localStorage para operaciones que fallaron por falta de red.
 * 100% de retención — nada se pierde aunque se cierre la app.
 */

const QUEUE_KEY = 'allice_offline_queue';
const EVENT_NAME = 'allice_queue_changed';

// ─── Persistencia ──────────────────────────────────────────────────────────────
export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// ─── Operaciones ───────────────────────────────────────────────────────────────
export function enqueue(operation) {
  const queue = getQueue();
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    retries: 0,
    ...operation,
  };
  queue.push(item);
  saveQueue(queue);
  return item;
}

export function dequeue(id) {
  saveQueue(getQueue().filter((item) => item.id !== id));
}

export function queueCount() {
  return getQueue().length;
}

export function clearQueue() {
  saveQueue([]);
}

// ─── Detección de error de red (no error de servidor) ─────────────────────────
export function isNetworkError(error) {
  return (
    !error.response ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error'
  );
}

// ─── Wrapper: intenta la llamada; si es error de red, encola ──────────────────
export async function withQueue(apiCall, queueItem) {
  try {
    const result = await apiCall();
    return { result, queued: false };
  } catch (error) {
    if (isNetworkError(error)) {
      const item = enqueue(queueItem);
      return { result: null, queued: true, queueItem: item };
    }
    throw error; // error de servidor → propaga normal
  }
}

export const QUEUE_EVENT = EVENT_NAME;
