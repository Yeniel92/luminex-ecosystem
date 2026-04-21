// ══════════════════════════════════════════
//  Luminex Ecosystem — Constantes globales
// ══════════════════════════════════════════

// Valores reales almacenados en Supabase (tabla: licencias, app_versiones)
export const APPS = {
  SALES: 'ventas',
  STOCK: 'inventario'
};

// Estados de licencia
export const LICENSE_STATUS = {
  PENDING:  'pendiente',
  ACTIVE:   'activa',
  REVOKED:  'revocada'
};

// Configuración general
export const CONFIG = {
  TRIAL_DAYS:    7,
  MAX_CAJEROS:   10,
  PIN_LENGTH:    4,
  VERSION_CHECK_INTERVAL_MS: 60 * 60 * 1000 // 1 hora
};
