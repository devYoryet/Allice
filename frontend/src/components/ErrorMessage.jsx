import React from 'react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
      <span className="text-4xl">⚠️</span>
      <p className="text-gray-600 text-center">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary btn-sm w-auto px-6">
          Reintentar
        </button>
      )}
    </div>
  );
}
