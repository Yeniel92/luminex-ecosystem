// =============================================
// LUMINEX ECOSYSTEM — Sincronización Sales→Stock
// =============================================

const LuminexSync = {

  // Registrar venta y descontar stock automáticamente
  async registrarVenta(venta) {
    const client = getLuminexClient();
    if (!client) return { error: 'Sin conexión a Supabase' };
    const negocioId = getNegocioId();
    if (!negocioId) return { error: 'Sin negocio configurado' };

    try {
      // 1. Insertar venta
      const { data: ventaData, error: ventaError } = await client
        .from('ventas')
        .insert({
          negocio_id: negocioId,
          usuario: venta.usuario || 'admin',
          total: venta.total,
          metodo_pago: venta.metodoPago || 'efectivo',
          items: venta.items || []
        })
        .select().single();

      if (ventaError) throw ventaError;

      // 2. Descontar stock por cada item (secuencial para evitar conflictos)
      for (const item of venta.items) {
        const normNombre = normalizarNombre(item.nombre || item.name);
        const { data: producto } = await client
          .from('productos')
          .select('id, stock_actual')
          .eq('negocio_id', negocioId)
          .eq('nombre_norm', normNombre)
          .maybeSingle();

        if (producto) {
          const nuevoStock = Math.max(0, producto.stock_actual - (item.cantidad || item.qty || 1));
          await client
            .from('productos')
            .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
            .eq('id', producto.id);

          await client.from('movimientos_stock').insert({
            negocio_id: negocioId,
            producto_id: producto.id,
            producto_nombre: item.nombre || item.name,
            tipo: 'venta',
            cantidad: item.cantidad || item.qty || 1,
            origen: 'sales',
            referencia_venta: ventaData.id
          });
        }
      }
      return { ok: true, venta: ventaData };
    } catch (e) {
      console.error('[LuminexSync] Error:', e);
      return { error: e.message };
    }
  },

  // Sincronizar productos locales a Supabase
  async sincronizarProductos(productosLocales) {
    const client = getLuminexClient();
    if (!client) return { error: 'Sin conexión' };
    const negocioId = getNegocioId();
    if (!negocioId) return { error: 'Sin negocio' };

    for (const p of productosLocales) {
      const normNombre = normalizarNombre(p.nombre || p.name);
      await client.from('productos').upsert({
        negocio_id: negocioId,
        nombre: p.nombre || p.name,
        nombre_norm: normNombre,
        emoji: p.emoji || p.icon || '📦',
        precio: p.precio || p.price || 0,
        stock_actual: p.stock || 0,
        stock_minimo: p.stockMinimo || p.minStock || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'negocio_id,nombre_norm' });
    }
    return { ok: true };
  }
};
