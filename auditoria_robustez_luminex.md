# Auditoría de Robustez del Ecosistema Luminex (Sales + Stock)

## Introducción

Este informe detalla la auditoría de robustez realizada al Ecosistema Luminex (Sales + Stock), enfocándose en la persistencia de datos, la sincronización en tiempo real y la gestión de stock. El objetivo principal fue mapear las estructuras de `localStorage`, los flujos críticos de `checkout()` en Sales y los movimientos de stock en Stock, así como analizar la compatibilidad de IDs y evaluar riesgos como ventas offline y stock negativo.

## 1. Mapeo de Estructuras de `localStorage` y Flujo `checkout()` en Sales

### 1.1. Estructuras de `localStorage`

Ambas aplicaciones, Sales y Stock, utilizan `localStorage` para la persistencia de datos a nivel local. Se identificaron los siguientes patrones de claves:

*   **Sales:** Las claves de `localStorage` para la aplicación de ventas utilizan el prefijo `cv_u_` seguido del `username` del usuario (que actúa como `negocio_id`). Esto asegura el aislamiento de los datos por negocio. Ejemplos incluyen `cv_u_username_products` y `cv_u_username_sales`.
*   **Stock:** De manera similar, la aplicación de stock utiliza el prefijo `cc_u_` seguido del `username` para sus claves de `localStorage`, como `cc_u_username_products` y `cc_u_username_movements`.

La función `userKey(key)` es fundamental para generar estas claves, utilizando el `username` del usuario actualmente autenticado (`CU.username` en Sales y `currentUser.username` en Stock) para construir la clave específica del negocio. Esto es crucial para mantener la segregación de datos entre diferentes usuarios/negocios.

### 1.2. Flujo de `checkout()` en Sales

La función `checkout()` en la aplicación Sales (`/sales/app/index.html` [1650-1683]) orquesta el proceso de finalización de una venta. Su flujo es el siguiente:

1.  **Validación y Cálculo:** Verifica que el carrito no esté vacío y calcula el subtotal, el descuento (si aplica) y el total final de la venta.
2.  **Creación del Objeto Venta:** Se construye un objeto `sale` que incluye un `id` generado (`genId()`), la fecha y hora de la venta, los ítems vendidos (con `id`, `name`, `icon`, `price`, `qty`, `subtotal`), el subtotal, porcentaje y monto de descuento, el total, el método de pago y el nombre del usuario.
3.  **Actualización de Stock Local:** Itera sobre los ítems del carrito. Para cada ítem, busca el producto correspondiente en la lista local de productos (`getProducts()`) y **descuenta la cantidad vendida de su `stock`**. Se utiliza `Math.max(0, ...)` para asegurar que el stock local nunca sea negativo [1665]. Los productos actualizados se guardan localmente con `saveProdDB(products)`.
4.  **Registro de Venta Local:** La venta recién creada se añade a la lista local de ventas (`getSales()`) y se guarda con `saveSalesDB(sales)`.
5.  **Integración Supabase:** Se invoca `supabaseIntegration.registrarVenta(negocioId, sale)` [1675]. Esta función es crítica para la persistencia remota y la sincronización con el ecosistema. Internamente, `registrarVenta` realiza lo siguiente:
    *   Inserta la venta en la tabla `ventas` de Supabase.
    *   Para cada ítem de la venta, busca el producto en la tabla `productos` de Supabase por `negocio_id` y `nombre`.
    *   Actualiza el `stock_actual` del producto en Supabase, aplicando también `Math.max(0, ...)` para evitar stock negativo [53].
    *   Registra un movimiento de stock de tipo 'venta' en la tabla `movimientos_stock` de Supabase.
6.  **Sincronización Adicional:** Finalmente, `syncData(true)` es llamada para sincronizar los datos locales (productos y ventas) con un almacenamiento en la nube adicional (`window.storage.set`).

## 2. Mapeo de Flujo de Movimientos y Cálculo de Stock en Stock

La aplicación Stock gestiona los productos y sus movimientos. Las funciones clave son `saveProduct()` y `registerMovement()`.

### 2.1. `saveProduct()`

La función `saveProduct()` (`/stock/app/index.html` [2084-2107]) se encarga de crear o actualizar un producto en el inventario local:

1.  **Recolección de Datos:** Obtiene los valores de los campos del formulario (nombre, categoría, unidad, stock, stock mínimo, descripción).
2.  **Validación:** Verifica que el nombre del producto no esté vacío.
3.  **Actualización/Creación:** Si el producto ya tiene un `id`, busca su índice y actualiza sus propiedades. Si no tiene `id`, se genera uno nuevo (`genId()`) y se añade como un nuevo producto.
4.  **Persistencia Local:** Los productos actualizados se guardan localmente utilizando `saveProducts(products)`.
5.  **Sincronización Adicional:** Llama a `syncData(true)` para sincronizar los productos locales con el almacenamiento en la nube adicional.

### 2.2. `registerMovement()`

La función `registerMovement()` (`/stock/app/index.html` [1703-1735]) es responsable de registrar entradas, salidas o ajustes de stock:

1.  **Recolección de Datos:** Obtiene el `productId`, el `type` de movimiento (entrada, salida, ajuste), la `qty` y las `notes`.
2.  **Validación:** Verifica que se haya seleccionado un producto y que la cantidad sea válida y positiva.
3.  **Actualización de Stock Local:** Busca el producto por `productId`. Dependiendo del `type` de movimiento:
    *   **Entrada:** Suma la `qty` al `stock` actual.
    *   **Salida:** Resta la `qty` del `stock` actual. Incluye una validación para prevenir stock negativo (`if (p.stock < qty) return toast('Stock insuficiente', 'error');`).
    *   **Ajuste:** Establece el `stock` al valor de `qty`.
    Se utiliza `toFixed(4)` para manejar la precisión de los números flotantes.
4.  **Persistencia Local:** Los productos con el stock actualizado se guardan localmente con `saveProducts(products)`. Los movimientos se añaden a la lista local de movimientos (`getMovements()`) y se guardan con `saveMovements(movs)`.
5.  **Sincronización Adicional:** Llama a `syncData(true)` para sincronizar los datos locales (productos y movimientos) con el almacenamiento en la nube adicional.

## 3. Análisis de Compatibilidad de IDs y Evaluación de Riesgos

### 3.1. Compatibilidad de IDs

*   **Generación de IDs:** Ambas aplicaciones utilizan la función `genId()` para generar identificadores únicos. Esta función prioriza `crypto.randomUUID()` si está disponible, o un método basado en `Date.now()` y `Math.random()` como fallback [1741-1744 en Sales, 1741-1744 en Stock]. Esto asegura IDs únicos a nivel local.
*   **Coherencia de IDs entre Apps:** La integración con Supabase (`supabase-integration.js`) utiliza el `nombre` del producto y el `negocio_id` (username) como claves para identificar productos en la base de datos remota (`onConflict: 'negocio_id,nombre'` en `upsert` [122 en `supabase-integration.js`]). Esto significa que, aunque los IDs locales (`id` en `localStorage`) pueden ser diferentes entre Sales y Stock para el mismo producto, la sincronización se basa en el nombre del producto y el negocio, lo cual es un enfoque robusto para la identificación cruzada.
*   **IDs de Ventas y Movimientos:** Las ventas y los movimientos de stock también generan sus propios IDs únicos. En el caso de las ventas, el `id` local se usa como `referencia_venta` en los movimientos de stock de Supabase [71 en `supabase-integration.js`], lo que permite trazar el origen de un descuento de stock a una venta específica.

### 3.2. Evaluación de Riesgos

#### 3.2.1. Ventas Offline

*   **Manejo Offline:** Ambas aplicaciones están diseñadas para funcionar offline gracias al uso extensivo de `localStorage` para la persistencia de datos. Las operaciones de venta y movimientos de stock se registran localmente incluso sin conexión a internet.
*   **Sincronización Post-Conexión:** La función `syncData()` en ambas apps intenta sincronizar los datos locales con el almacenamiento en la nube. Sin embargo, la sincronización con Supabase a través de `supabaseIntegration.registrarVenta` y `supabaseIntegration.sincronizarProductos` solo ocurre cuando hay conexión. Si una venta se realiza offline, se guarda localmente y se intenta sincronizar con Supabase cuando la conexión se restablece (implícitamente, ya que `syncData` se llama después de `checkout` y `registerMovement`).
*   **Riesgo de Conflictos:** El principal riesgo en escenarios offline prolongados es la **posibilidad de conflictos de datos**. Si múltiples instancias de la aplicación (o la misma instancia después de un borrado de caché) realizan operaciones offline sobre el mismo producto, la estrategia de 
`onConflict: 'negocio_id,nombre'` en Supabase prioriza la última actualización. Esto podría llevar a la pérdida de una venta o un movimiento de stock si no se maneja adecuadamente la resolución de conflictos a nivel de aplicación, aunque la implementación actual parece favorecer la consistencia sobre la disponibilidad en caso de conflicto por nombre de producto.

#### 3.2.2. Stock Negativo

*   **Prevención en Sales:** La función `checkout()` en Sales utiliza `Math.max(0, Number(products[pi].stock)-ci.qty)` [1665 en Sales] para actualizar el stock localmente y en la integración con Supabase [53 en `supabase-integration.js`]. Esto previene activamente que el stock de un producto se vuelva negativo como resultado de una venta.
*   **Prevención en Stock:** La función `registerMovement()` en Stock incluye una validación explícita `if (p.stock < qty) return toast('Stock insuficiente', 'error');` [1720 en Stock] antes de procesar una salida de stock. Esto también previene el stock negativo en la aplicación de Stock.
*   **Riesgo Residual:** Aunque ambas aplicaciones tienen mecanismos para prevenir el stock negativo, un riesgo residual podría surgir si hay una alta concurrencia de ventas sobre un stock muy bajo en un entorno distribuido sin una gestión de transacciones a nivel de base de datos que bloquee el recurso. Sin embargo, dado el modelo PWA y la sincronización asíncrona, este riesgo es mitigado por la lógica de `Math.max(0, ...)` en Supabase, que asegura que el stock nunca baje de cero en la base de datos central.

## 4. Simulación de Escenarios Críticos

### 4.1. Día Normal (Con Conexión)

*   **Sales:** Las ventas se registran localmente de inmediato, el stock local se actualiza y la venta se sincroniza con Supabase. Supabase descuenta el stock y registra el movimiento. La aplicación Stock, al estar suscrita a cambios en Supabase, recibe la actualización de stock en tiempo real y la refleja localmente.
*   **Stock:** Los movimientos de stock (entradas, salidas, ajustes) se registran localmente, el stock local se actualiza y se sincroniza con Supabase. La aplicación Sales, al estar suscrita, recibe las actualizaciones de stock y precio en tiempo real.
*   **Resultado:** Operación fluida y consistente en ambas aplicaciones, con datos actualizados en tiempo real gracias a la sincronización con Supabase.

### 4.2. Producto Agotado

*   **Sales:** Si un producto tiene stock 0 o muy bajo, la lógica de `Math.max(0, ...)` en `checkout()` asegura que el stock no se vuelva negativo. Si un usuario intenta vender más de lo disponible, el stock en la base de datos central de Supabase se mantendrá en 0. La aplicación Sales no tiene una validación explícita para evitar añadir productos agotados al carrito, pero el descuento de stock se manejará correctamente.
*   **Stock:** Si se intenta registrar una 
salida de stock mayor al disponible, la validación `if (p.stock < qty) return toast('Stock insuficiente', 'error');` en `registerMovement()` previene la operación.
*   **Resultado:** El stock no se vuelve negativo, pero la aplicación Sales podría permitir la venta de productos agotados si no se implementa una validación adicional en el carrito.

### 4.3. Sin Internet (Offline)

*   **Sales:** Las ventas se registran localmente y el stock local se actualiza. La llamada a `supabaseIntegration.registrarVenta` fallará silenciosamente (o con un error capturado) y la venta no se sincronizará con Supabase en ese momento. La función `syncData()` intentará guardar en el almacenamiento en la nube, lo cual también podría fallar.
*   **Stock:** Los movimientos de stock se registran localmente y el stock local se actualiza. La llamada a `syncData()` intentará guardar en el almacenamiento en la nube, lo cual podría fallar.
*   **Resultado:** Ambas aplicaciones continúan funcionando localmente. Sin embargo, los datos no se sincronizan con Supabase ni entre sí. Cuando la conexión se restablece, no hay un mecanismo explícito en el código analizado para reintentar la sincronización de las ventas o movimientos fallidos con Supabase, más allá de la sincronización general de productos y ventas/movimientos recientes a través de `syncData()`. Esto representa un riesgo de pérdida de datos en la base de datos central si la caché local se borra antes de una sincronización exitosa.

## 5. Conclusiones y Recomendaciones

La arquitectura PWA del Ecosistema Luminex demuestra una sólida base para el funcionamiento offline y la persistencia local mediante `localStorage`. La integración con Supabase proporciona una sincronización en tiempo real efectiva para mantener la consistencia de datos entre las aplicaciones de Sales y Stock.

Sin embargo, se identifican áreas de mejora para fortalecer la robustez del sistema:

1.  **Gestión de Sincronización Offline:** Implementar una cola de sincronización local (por ejemplo, usando IndexedDB o un array en `localStorage`) para almacenar las operaciones (ventas, movimientos) que fallan al intentar sincronizarse con Supabase debido a la falta de conexión. Un proceso en segundo plano (Service Worker) o un reintento al detectar conexión debería procesar esta cola para asegurar la consistencia eventual con la base de datos central.
2.  **Validación de Stock en Sales:** Añadir una validación en la aplicación Sales, preferiblemente al momento de añadir un producto al carrito o antes de finalizar la venta, para alertar al usuario si el producto está agotado o si la cantidad solicitada supera el stock disponible. Esto mejoraría la experiencia del usuario y evitaría discrepancias lógicas, aunque el stock en base de datos esté protegido contra valores negativos.
3.  **Resolución de Conflictos:** Evaluar la estrategia de resolución de conflictos en Supabase (`onConflict: 'negocio_id,nombre'`). Si bien es simple, podría sobrescribir datos si múltiples dispositivos operan offline y luego se sincronizan. Considerar el uso de marcas de tiempo (`updated_at`) o versionado para una resolución más sofisticada si el ecosistema escala a múltiples terminales por negocio.

En general, el sistema actual cumple con los requisitos básicos de sincronización y persistencia, pero la implementación de una cola de sincronización robusta para operaciones offline es el paso más crítico para garantizar la integridad de los datos en todos los escenarios.
