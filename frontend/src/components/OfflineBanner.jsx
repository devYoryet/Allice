import React, { useEffect, useState } from 'react';
import useOfflineSync from '../hooks/useOfflineSync';

export default function OfflineBanner() {
  const { isOnline, pending, syncing, lastSynced } = useOfflineSync();
  const [showSynced, setShowSynced] = useState(false);

  // Muestra flash verde "✓ Sincronizado" durante 3s tras sync exitoso
  useEffect(() => {
    if (lastSynced) {
      setShowSynced(true);
      const t = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastSynced]);

  if (isOnline && pending === 0 && !syncing && !showSynced) return null;

  if (!isOnline) {
    return (
      <div className="bg-gray-800 text-white text-xs text-center py-2 px-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
        <span>
          Sin conexión — tus acciones se guardan y se enviarán al reconectarte
          {pending > 0 && (
            <span className="ml-1 font-bold">({pending} pendiente{pending !== 1 ? 's' : ''})</span>
          )}
        </span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="bg-blue-600 text-white text-xs text-center py-2 px-4 flex items-center justify-center gap-2">
        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
        Sincronizando {pending} operación{pending !== 1 ? 'es' : ''} guardada{pending !== 1 ? 's' : ''}...
      </div>
    );
  }

  if (isOnline && pending > 0) {
    return (
      <div className="bg-amber-500 text-white text-xs text-center py-2 px-4">
        {pending} acción{pending !== 1 ? 'es' : ''} pendiente{pending !== 1 ? 's' : ''} de sincronizar...
      </div>
    );
  }

  if (showSynced) {
    return (
      <div className="bg-green-600 text-white text-xs text-center py-2 px-4">
        ✓ {lastSynced} operación{lastSynced !== 1 ? 'es' : ''} sincronizada{lastSynced !== 1 ? 's' : ''} correctamente
      </div>
    );
  }

  return null;
}
