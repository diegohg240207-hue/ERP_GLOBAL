const STATUS_MAP = {
  activo:     { cls: 'badge-green',  es: 'Activo',       en: 'Active' },
  pendiente:  { cls: 'badge-yellow', es: 'Pendiente',    en: 'Pending' },
  confirmada: { cls: 'badge-blue',   es: 'Confirmada',   en: 'Confirmed' },
  entregada:  { cls: 'badge-green',  es: 'Entregada',    en: 'Delivered' },
  cancelada:  { cls: 'badge-red',    es: 'Cancelada',    en: 'Cancelled' },
  vencido:    { cls: 'badge-red',    es: 'Vencido',      en: 'Overdue' },
  revision:   { cls: 'badge-orange', es: 'En Revisión',  en: 'Under Review' },
  recibida:   { cls: 'badge-green',  es: 'Recibida',     en: 'Received' },
  ok:         { cls: 'badge-green',  es: 'OK',           en: 'OK' },
  bajo:       { cls: 'badge-yellow', es: 'Stock Bajo',   en: 'Low Stock' },
  critico:    { cls: 'badge-red',    es: 'Crítico',      en: 'Critical' },
  aplicado:   { cls: 'badge-green',  es: 'Aplicado',     en: 'Applied' },
  en_proceso: { cls: 'badge-yellow', es: 'En Proceso',   en: 'Processing' },
  cerrado:    { cls: 'badge-gray',   es: 'Cerrado',      en: 'Closed' },
  abierto:    { cls: 'badge-green',  es: 'Abierto',      en: 'Open' },
  agotado:    { cls: 'badge-red',    es: 'Agotado',      en: 'Out of Stock' },
  inactivo:   { cls: 'badge-gray',   es: 'Inactivo',     en: 'Inactive' },
  programado: { cls: 'badge-blue',   es: 'Programado',   en: 'Scheduled' },
  proximo:    { cls: 'badge-orange', es: 'Próximo',      en: 'Upcoming' },
  completado: { cls: 'badge-green',  es: 'Completado',   en: 'Completed' },
  A:          { cls: 'badge-purple', es: 'Segmento A',   en: 'Segment A' },
  B:          { cls: 'badge-blue',   es: 'Segmento B',   en: 'Segment B' },
  C:          { cls: 'badge-gray',   es: 'Segmento C',   en: 'Segment C' },
}

export default function StatusBadge({ status, lang = 'es' }) {
  const info = STATUS_MAP[status]
  if (!info) return <span className="badge badge-gray">{status}</span>
  return (
    <span className={`badge ${info.cls}`}>
      {lang === 'en' ? info.en : info.es}
    </span>
  )
}
