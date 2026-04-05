// =============================================
// LUMINEX ECOSYSTEM — Integración Sales + Stock
// Archivo compartido — NO modificar sin revisar
// ambas apps (sales/app y stock/app)
// =============================================

const SUPABASE_URL = 'https://zsalcpmeagwxdpengwtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYWxjcG1lYWd3eGRwZW5nd3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU4OTY0MTcsImV4cCI6MjAzMTQ3MjQxN30.8i7k3X_r_V7p9_V7p9_V7p9_V7p9_V7p9_V7p9_V7p9'; 

const supabaseIntegration = {

  // Obtener cliente Supabase
  getClient() {
    if (typeof supabase === 'undefined') {
      console.error('Supabase library not loaded');
      return null;
    }
    return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },

  // Normalizar nombres para IDs de sincronización (sin tildes, lowercase, trim)
  normalizeId(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
      .replace(/[^a-z0-9]/g, '_'); // Reemplazar no-alfanuméricos por guion bajo
  },

  // Registrar venta desde Sales y descontar stock
  async registrarVenta(negocioId, venta) {
    const client = this.getClient();
    if (!client) return { error: 'No client' };
    
    try {
      // 1. Insertar la venta
      const { data: ventaData, error: ventaError } = await client
        .from('ventas')
        .insert({
          negocio_id: negocioId,
          usuario: venta.user,
          total: venta.total,
          metodo_pago: venta.payment || 'efectivo',
          items: venta.items
        })
        .select()
        .single();

      if (ventaError) throw ventaError;

      // 2. Descontar stock por cada item vendido (Atomic RPC recomendado en producción)
      // Por ahora, usamos una lógica más robusta buscando por nombre normalizado
      const updatePromises = venta.items.map(async (item) => {
        const normName = this.normalizeId(item.name);
        
        // Buscar producto por nombre normalizado y negocio
        const { data: producto, error: pError } = await client
          .from('productos')
          .select('id, stock_actual, nombre')
          .eq('negocio_id', negocioId)
          .eq('nombre_norm', normName) // Usamos el nuevo campo normalizado
          .maybeSingle();

        if (producto) {
          // Lógica atómica simple: update con filtro de stock previo para evitar sobreescritura ciega
          // En un entorno real, usaríamos una función RPC: decrement_stock(p_id, p_qty)
          const nuevoStock = Math.max(0, (producto.stock_actual || 0) - (item.qty || 1));
          
          const { error: upError } = await client
            .from('productos')
            .update({ 
              stock_actual: nuevoStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', producto.id)
            .eq('stock_actual', producto.stock_actual); // Optimistic Locking

          if (!upError) {
            // Registrar movimiento
            await client
              .from('movimientos_stock')
              .insert({
                negocio_id: negocioId,
                producto_id: producto.id,
                producto_nombre: producto.nombre,
                tipo: 'venta',
                cantidad: item.qty || 1,
                origen: 'sales',
                referencia_venta: ventaData.id
              });
          }
        }
      });

      await Promise.all(updatePromises);
      return { data: ventaData };

    } catch (e) {
      console.error('Error en integración Supabase:', e);
      return { error: e.message };
    }
  },

  // Suscribirse a cambios en productos (Stock y Precios)
  suscribirCambiosEcosistema(negocioId, callback) {
    const client = this.getClient();
    if (!client) return null;
    
    return client
      .channel('ecosystem-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'productos',
        filter: `negocio_id=eq.${negocioId}`
      }, (payload) => {
        console.log('Cambio detectado en Ecosistema:', payload);
        callback(payload);
      })
      .subscribe();
  },

  // Sincronizar productos locales a Supabase (Upsert)
  async sincronizarProductos(negocioId, productosLocales) {
    const client = this.getClient();
    if (!client) return { error: 'No client' };
    
    try {
      for (const p of productosLocales) {
        const normName = this.normalizeId(p.name);
        // Upsert por nombre normalizado y negocio_id
        const { error } = await client
          .from('productos')
          .upsert({
            negocio_id: negocioId,
            nombre: p.name,
            nombre_norm: normName,
            emoji: p.icon || p.emoji || '📦',
            precio: p.price || 0,
            stock_actual: p.stock || 0,
            stock_minimo: p.minStock || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'negocio_id,nombre_norm' }); // Índice único en nombre_norm

        if (error) console.error(`Error sincronizando ${p.name}:`, error);
      }
      return { ok: true };
    } catch (e) {
      console.error('Error masivo de sincronización:', e);
      return { error: e.message };
    }
  },

  // Obtener productos actualizados desde Supabase
  async obtenerProductos(negocioId) {
    const client = this.getClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('productos')
      .select('*')
      .eq('negocio_id', negocioId);
      
    if (error) {
      console.error('Error obteniendo productos:', error);
      return [];
    }
    return data;
  }
};
