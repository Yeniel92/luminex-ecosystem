// =============================================
// LUMINEX ECOSYSTEM — Integración Sales + Stock
// Archivo compartido — NO modificar sin revisar
// ambas apps (sales/app y stock/app)
// =============================================

const SUPABASE_URL = 'https://zsalcpmeagwxdpengwtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYWxjcG1lYWd3eGRwZW5nd3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU4OTY0MTcsImV4cCI6MjAzMTQ3MjQxN30.8i7k3X_r_V7p9_V7p9_V7p9_V7p9_V7p9_V7p9_V7p9'; // Anon key extraída del código

const supabaseIntegration = {

  // Obtener cliente Supabase
  getClient() {
    return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },

  // Registrar venta desde Sales y descontar stock
  async registrarVenta(negocioId, venta) {
    const client = this.getClient();
    
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

    if (ventaError) {
      console.error('Error registrando venta:', ventaError);
      return { error: ventaError };
    }

    // 2. Descontar stock por cada item vendido
    for (const item of venta.items) {
      // Buscar producto por nombre y negocio
      const { data: producto } = await client
        .from('productos')
        .select('id, stock_actual')
        .eq('negocio_id', negocioId)
        .eq('nombre', item.name)
        .single();

      if (producto) {
        const nuevoStock = Math.max(0, 
          producto.stock_actual - (item.qty || 1));
        
        // Actualizar stock
        await client
          .from('productos')
          .update({ stock_actual: nuevoStock })
          .eq('id', producto.id);

        // Registrar movimiento
        await client
          .from('movimientos_stock')
          .insert({
            negocio_id: negocioId,
            producto_id: producto.id,
            producto_nombre: item.name,
            tipo: 'venta',
            cantidad: item.qty || 1,
            origen: 'sales',
            referencia_venta: ventaData.id
          });
      }
    }

    return { data: ventaData };
  },

  // Stock escucha cambios en tiempo real
  suscribirCambiosStock(negocioId, callback) {
    const client = this.getClient();
    
    return client
      .channel('stock-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'productos',
        filter: `negocio_id=eq.${negocioId}`
      }, callback)
      .subscribe();
  },

  // Sincronizar productos locales a Supabase
  async sincronizarProductos(negocioId, productosLocales) {
    const client = this.getClient();
    
    for (const producto of productosLocales) {
      const { data: existe } = await client
        .from('productos')
        .select('id')
        .eq('negocio_id', negocioId)
        .eq('nombre', producto.name)
        .single();

      if (!existe) {
        await client.from('productos').insert({
          negocio_id: negocioId,
          nombre: producto.name,
          emoji: producto.icon || '📦',
          precio: producto.price || 0,
          stock_actual: producto.stock || 0,
          stock_minimo: producto.minStock || 0
        });
      }
    }
  }
};
