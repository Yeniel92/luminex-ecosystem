# REPORTE DE AUDITORÍA: SIMULACIÓN DE USO INTENSIVO (6 MESES)
## Ecosistema Luminex — Sales, Stock, Integración y Marketing

### RESUMEN EJECUTIVO
- **Total de issues encontrados:** 14
- **Críticos 🔴:** 4 | **Medios ⚠️:** 6 | **Menores 💡:** 4

---

### ISSUES CRÍTICOS 🔴

1. **🔴 Bloqueo por Cuota de LocalStorage (>5MB)**
   - **Descripción:** Al alcanzar el límite de almacenamiento del navegador (común tras 6 meses de ventas intensivas con imágenes de logos), la app lanza una excepción `QuotaExceededError` no capturada.
   - **Cómo reproducirlo:** Llenar el `localStorage` con ~5000 ventas y logos pesados. Intentar realizar un `checkout()`.
   - **Impacto:** El proceso de venta se interrumpe, no se guarda localmente ni se envía a Supabase. Pérdida de datos inmediata.
   - **Solución:** Implementar un `try/catch` global en el guardado y una función de "Purga de Historial" que mueva ventas antiguas a un archivo `.json` descargable antes de eliminarlas.

2. **🔴 Condición de Carrera en Descuento de Stock (Supabase)**
   - **Descripción:** La función `registrarVenta` lee el stock, calcula el nuevo valor en el cliente y luego hace un `update`.
   - **Cómo reproducirlo:** Dos cajeros venden el mismo producto simultáneamente en menos de 500ms.
   - **Impacto:** El stock final será incorrecto (se pierde una de las restas).
   - **Solución:** Usar una función RPC en Supabase (PostgreSQL) para restar el stock directamente en el servidor: `UPDATE productos SET stock_actual = stock_actual - qty WHERE id = pid`.

3. **🔴 Pérdida Total por Borrado de Caché**
   - **Descripción:** Al no usar `IndexedDB` ni forzar una sincronización inicial completa, si el usuario borra datos del sitio, pierde toda su configuración y ventas offline.
   - **Cómo reproducirlo:** Configurar el negocio, registrar ventas offline y limpiar datos del navegador.
   - **Impacto:** Cierre del negocio y pérdida de toda la contabilidad.
   - **Solución:** Implementar un "Modo Espejo" que use `IndexedDB` (vía Dexie.js o similar) para mayor persistencia y forzar un backup automático al cerrar la sesión.

4. **🔴 Duplicidad de Usuarios en Configuración**
   - **Descripción:** La función `saveUser()` no valida la existencia previa del email/username.
   - **Cómo reproducirlo:** Crear dos usuarios con el mismo nombre en la configuración de Sales.
   - **Impacto:** Los reportes por vendedor se mezclan y las licencias podrían entrar en conflicto si se basan en el ID de usuario.
   - **Solución:** Añadir una validación `if (users.find(u => u.email === newEmail))` antes de hacer el `push` al array.

---

### ISSUES MEDIOS ⚠️

1. **⚠️ Degradación de Performance en Historial (DOM Heavy)**
   - **Descripción:** El historial renderiza todos los registros de una vez. Con 500+ ventas, el scroll tiene *jank*.
   - **Solución:** Implementar "Virtual Scrolling" o paginación simple de 50 en 50.

2. **⚠️ Conflicto de Nombres en Integración**
   - **Descripción:** La integración depende de `item.name === producto.nombre`. Un espacio extra o una tilde diferente rompe el vínculo.
   - **Solución:** Crear un campo `sku` o `id_unico` oculto que sea el vínculo real, independiente del nombre comercial.

3. **⚠️ Bloqueo de UI en Generación de PDF**
   - **Descripción:** `jspdf` corre en el hilo principal. Con reportes de 6 meses, la app parece colgada.
   - **Solución:** Mover la generación del PDF a un `Web Worker`.

4. **⚠️ Stock Negativo Permitido**
   - **Descripción:** Sales permite vender productos con stock 0 sin advertencia restrictiva.
   - **Solución:** Añadir un toggle en configuración: "Permitir ventas sin stock: ON/OFF".

5. **⚠️ Licencia Offline Indefinida**
   - **Descripción:** Si el usuario entra en modo offline antes de que venza la licencia, puede seguir usando la app indefinidamente si no vuelve a conectar.
   - **Solución:** Guardar la fecha de vencimiento firmada localmente y bloquear el acceso si `Date.now() > expirationDate`, incluso offline.

6. **⚠️ Imágenes de Logo sin Optimizar**
   - **Descripción:** Aunque implementamos compresión, si el usuario sube muchos logos de marca, el `localStorage` se llena rápido.
   - **Solución:** Limitar a un solo logo activo por negocio y forzar un re-scale a 200x200px.

---

### ISSUES MENORES 💡

1. **💡 SEO: Falta de Meta Descriptions:** Las páginas de marketing tienen títulos pero descripciones genéricas. *Solución: Añadir tags específicos por app.*
2. **💡 UX: Falta de Buscador en Inventario:** Con +100 productos, buscar a mano es lento. *Solución: Añadir input de búsqueda con filter() en tiempo real.*
3. **💡 Visual: Consistencia de Navbars:** El navbar del Hub es ligeramente distinto al de Sales/Stock. *Solución: Unificar el componente CSS.*
4. **💡 Copy: Español Rioplatense Incompleto:** Algunos mensajes de error siguen en español neutro ("Ocurrió un error"). *Solución: Cambiar a "Hubo un error" o "Algo salió mal".*

---

### PLAN DE ACCIÓN RECOMENDADO

1. **Hacer YA (Crítico, Fácil):**
   - Validar duplicados de usuarios.
   - Capturar error de `LocalStorage` lleno con alerta al usuario.
   - Normalizar nombres de productos (trim y lowercase) para la integración.

2. **Hacer PRONTO (Crítico, Complejo):**
   - Migrar lógica de descuento de stock a RPC en Supabase (evitar condiciones de carrera).
   - Implementar paginación en Historial y Caja.
   - Integrar `IndexedDB` para persistencia de seguridad.

3. **Hacer DESPUÉS (Mejora):**
   - Web Workers para PDFs.
   - Unificación total de UI/UX entre Hub y Apps.
   - Optimización SEO avanzada.
