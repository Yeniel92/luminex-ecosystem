// =============================================
// LUMINEX ECOSYSTEM — Cliente Supabase Compartido
// Usado por: sales/app y stock/app
// =============================================

const LUMINEX_CONFIG = {
  supabaseUrl: 'https://zsalcpmeagwxdpengwtg.supabase.co',
  supabaseKey: 'REEMPLAZAR_CON_TU_ANON_KEY',
  version: '2.0.0'
};

// Cliente Supabase único para todo el ecosistema
function getLuminexClient() {
  if (typeof supabase === 'undefined') {
    console.error('[Luminex] Supabase library not loaded');
    return null;
  }
  if (window._luminexClient) return window._luminexClient;
  window._luminexClient = supabase.createClient(
    LUMINEX_CONFIG.supabaseUrl,
    LUMINEX_CONFIG.supabaseKey
  );
  return window._luminexClient;
}

// Normalizar nombres para IDs de sincronización
function normalizarNombre(nombre) {
  if (!nombre) return '';
  return nombre.trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');
}

// Obtener negocioId desde localStorage
function getNegocioId() {
  const config = localStorage.getItem('luminex_negocio');
  if (!config) return null;
  try {
    const data = JSON.parse(config);
    return normalizarNombre(data.nombre || 'negocio');
  } catch {
    return null;
  }
  }
