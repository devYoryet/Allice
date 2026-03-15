/**
 * useOfflineSync
 * Hook que:
 * 1. Detecta si hay conexión (navigator.onLine + eventos)
 * 2. Al reconectarse, vacía la cola enviando cada operación al backend
 * 3. Expone estado para que el banner sepa qué mostrar
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  getQueue,
  dequeue,
  queueCount,
  isNetworkError,
  QUEUE_EVENT,
} from '../utils/offlineQueue';

export default function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(queueCount);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null); // nº de ops synced

  // ── Actualizar contador cuando cambia la cola ──────────────────────────────
  useEffect(() => {
    const handler = () => setPending(queueCount());
    window.addEventListener(QUEUE_EVENT, handler);
    return () => window.removeEventListener(QUEUE_EVENT, handler);
  }, []);

  // ── Vaciar cola ────────────────────────────────────────────────────────────
  const flushQueue = useCallback(async () => {
    const ops = getQueue();
    if (ops.length === 0) return;

    setSyncing(true);
    let synced = 0;

    for (const op of ops) {
      try {
        if (op.method === 'POST') {
          await api.post(op.url, op.data);
        } else if (op.method === 'PUT') {
          await api.put(op.url, op.data);
        } else if (op.method === 'DELETE') {
          await api.delete(op.url);
        }
        dequeue(op.id);
        synced++;
      } catch (error) {
        if (!isNetworkError(error)) {
          // Error de servidor (ej. conflicto) → saca de la cola para no reintentar
          dequeue(op.id);
          synced++;
        }
        // Error de red → deja en cola, para el próximo intento
      }
    }

    setSyncing(false);
    if (synced > 0) setLastSynced(synced);
  }, []);

  // ── Listeners de online / offline ─────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Si arranca online con cola pendiente (ej. cerraron y abrieron la app)
    if (navigator.onLine && queueCount() > 0) {
      flushQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  return { isOnline, pending, syncing, lastSynced };
}
