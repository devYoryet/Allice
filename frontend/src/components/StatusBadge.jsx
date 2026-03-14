import React from 'react';

const ESTADOS_VISITA = {
  no_visitado: { label: 'Sin visitar', cls: 'badge-red' },
  visitado_sin_venta: { label: 'Sin venta', cls: 'badge-yellow' },
  cliente_activo: { label: 'Cliente activo', cls: 'badge-green' },
};

const ESTADOS_PEDIDO = {
  pendiente: { label: 'Pendiente', cls: 'badge-yellow' },
  entregado: { label: 'Entregado', cls: 'badge-green' },
};

const ESTADOS_PAGO = {
  pendiente: { label: 'Sin pagar', cls: 'badge-red' },
  pagado: { label: 'Pagado', cls: 'badge-green' },
};

const ESTADOS_FACTURA = {
  sin_factura: { label: 'Sin factura', cls: 'badge-gray' },
  facturado: { label: 'Facturado', cls: 'badge-blue' },
};

export function VisitaBadge({ estado }) {
  const cfg = ESTADOS_VISITA[estado] || { label: estado, cls: 'badge-gray' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

export function PedidoBadge({ estado }) {
  const cfg = ESTADOS_PEDIDO[estado] || { label: estado, cls: 'badge-gray' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

export function PagoBadge({ estado }) {
  const cfg = ESTADOS_PAGO[estado] || { label: estado, cls: 'badge-gray' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

export function FacturaBadge({ estado }) {
  const cfg = ESTADOS_FACTURA[estado] || { label: estado, cls: 'badge-gray' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}
