# Documentación Técnica: Módulo de Devoluciones de Clientes, Kardex PEPS (FIFO) y Consistencia de Lotes

**Fecha de Actualización:** 21 de Septiembre de 2026  
**Rama:** `feature/etapa-10-transferencias`  
**Estado:** Producción / Verificado con Tests (100% Passing)

---

## 1. Resumen Ejecutivo

En este ciclo de desarrollo se resolvieron incidencias críticas operativas y se extendieron las capacidades de inventario, ventas y auditoría tributaria:
1. **Módulo de Devoluciones de Clientes:** Flujo completo de notas de devolución (borrador vs. confirmación directa), restitución inmediata al inventario y Kardex, regularización de lotes y bloqueo de sobre-devolución en ventas.
2. **Corrección de Inconsistencia de Lotes en Transferencias:** Resolución del bloqueo de ventas tras recepcionar mercadería entre sucursales (lotes recibidos ahora se activan en estado `ACTIVE`).
3. **Simulador de Kardex PEPS (FIFO) SUNAT 13.1:** Proyección de valuación de inventarios bajo el método Primeras Entradas, Primeras Salidas (PEPS) en tiempo de ejecución (*on-the-fly*), permitiendo exportaciones en formato oficial SUNAT sin alterar el costo promedio ponderado transaccional.
4. **Optimización de UI en Kardex y Ventas:** Reorganización de columnas para evitar colapso visual, selector de sucursales exclusivo para administradores y depuración de buscadores redundantes.

---

## 2. Módulo de Devoluciones de Clientes (Customer Returns)

### 2.1 Flujo Operativo y de Navegación
* **Desde el Detalle de Venta (`sales/show.tsx`):**
  * Para cualquier venta con estado `CONFIRMED`, se presenta el botón `"Nueva Devolución"` que redirige a `/customer-returns/create?sale_id={id}` precargando las líneas y el cliente.
  * **Bloqueo Inteligente de Devolución Total:** Si la suma de cantidades devueltas alcanza el total vendido (`can_be_returned === false`), el botón se oculta automáticamente y se sustituye por la insignia:
    ```tsx
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
        <CheckCircle className="h-3.5 w-3.5" /> Devolución Total Registrada
    </Badge>
    ```
  * En la tabla de artículos de la venta se indica visualmente la cantidad devuelta por cada producto: `Devuelto: X`.
* **Desde el Menú General (`customer-returns/index.tsx`):**
  * Botón `"+ Nueva Devolución"` para seleccionar una venta confirmada mediante buscador interactivo.
  * Tabla con ordenamiento, filtrado por columnas y acceso a la vista de detalle.

### 2.2 Opciones de Guardado en `create.tsx`
Para adaptarse tanto a la ventanilla rápida como a procesos con supervisión:
1. **Guardar y Confirmar:** Registra la nota de devolución y aplica de inmediato la restitución en Kardex, inventario físico y lotes.
2. **Guardar como Borrador:** Crea la nota en estado `DRAFT` para posterior revisión y confirmación por parte de almacén o tesorería.

### 2.3 Correcciones Críticas en la Vista de Detalle (`show.tsx`)
* **`ReferenceError: breadcrumbs is not defined`:** Se movió la declaración de `breadcrumbs` al ámbito superior del módulo, eliminando el error de carga que provocaba pantalla blanca en el navegador.
* **Eliminación de `route(...)` global:** Se reemplazaron llamadas a Ziggy inexistente por enlaces y rutas relativas de Wayfinder (`/customer-returns`, `/sales/{id}`, `/customer-returns/{id}/confirm`).
* **Corrección de Cálculo de Montos:** Se corrigió el acceso a `line.line_total` en lugar de `line.total_price`, previniendo valores `NaN`.
* **Diseño Completo:** Tarjeta de resumen financiero (monto reembolsable en rojo), enlace directo al comprobante de venta origen, datos del cliente, tabla con unidades y referencias, y bloque de auditoría con fecha y usuario que confirmó en Kardex.

### 2.4 Restitución de Inventario y Kardex (`CustomerReturnController.php`)
* **Diagnóstico del Fallo de Kardex:** Anteriormente, la confirmación evaluaba `$product->product_type === 'STANDARD'`. Debido a que los productos físicos en la base de datos se clasifican como `'SIMPLE'`, la condición nunca se cumplía.
* **Solución Implementada:**
  ```php
  if ($product && $product->product_type !== 'KIT_COMPONENTES') {
      // 1. Registro de línea de movimiento IN
      // 2. Registro de KardexEntry con operación 'DEVOLUCION_VENTA'
      // 3. Incremento del lote activo FIFO existente o apertura de nuevo lote
  }
  ```
* **Amortización de Cuentas por Cobrar:** Si la venta fue al crédito y existe un registro en `Receivable` activo, se deduce el monto devuelto del saldo pendiente y se registra la nota de amortización.

---

## 3. Corrección de Inconsistencia de Lotes en Transferencias

### 3.1 Causa Raíz Identificada
Al transferir repuestos entre sucursales (ej. de *Sucursal Mazuko* a *Sucursal Central*):
* El inventario global (`inventories.physical_quantity`) aumentaba al recibir la transferencia.
* Sin embargo, en la recepción del traslado (`TransferReceiptController`), los lotes creados o actualizados en destino no quedaban marcados con estado `ACTIVE` o tenían discrepancia en el costo promedio unitario.
* Al procesar una venta en destino que requería más unidades de las existentes originalmente, el validador FIFO de lotes reportaba:
  > *"Inconsistencia crítica: El inventario reportó stock disponible, pero no hay suficientes lotes con saldo para el producto..."*

### 3.2 Solución Aplicada
* En `TransferReceiptController.php`, se garantizó que la recepción cree lotes con:
  - `branch_id = $destinationBranchId`
  - `status = 'ACTIVE'`
  - `unit_cost = $transferLine->unit_cost`
  - `current_quantity = $receivedQuantity`
* Se asegura la paridad matemática estricta:
  $$\sum \text{current\_quantity (Lotes ACTIVOS)} = \text{inventories.physical\_quantity}$$

---

## 4. Simulación y Exportación Kardex PEPS (FIFO SUNAT 13.1)

### 4.1 Principio de Diseño
El método PEPS es una **proyección en tiempo de ejecución (On-the-fly Projection)**, nunca una mutación en las tablas transaccionales del sistema. El sistema transaccional principal continúa operando bajo Promedio Ponderado Móvil para el día a día.

### 4.2 Componentes Implementados
1. **`app/Services/FifoKardexSimulatorService.php`:**
   * Reconstruye la cronología de movimientos por producto y sucursal.
   * Administra una cola de capas de costo (Queue de compras/entradas).
   * Asigna el costo de las salidas consumiendo las capas más antiguas primero.
   * Maneja devoluciones de venta reinsertando el costo de las capas devueltas.
2. **`app/Http/Controllers/KardexReportController.php`:**
   * Endpoint de previsualización JSON: `GET /inventory/kardex/reports/fifo-preview`
   * Endpoint de exportación Excel SUNAT 13.1: `GET /inventory/kardex/reports/fifo-export`
   * Cabecera oficial: RUC, Razón Social, Establecimiento, Código de Existencia, Método de Valuación (PEPS).
   * Columnas triples SUNAT: Entradas (Cantidad, Costo Unit., Costo Total), Salidas (Cantidad, Costo Unit., Costo Total) y Saldos Finales.

---

## 5. Mejoras en la Interfaz de Kardex (`inventory/kardex/index.tsx`)

1. **Reorganización de Columnas Colapsadas:**
   * Se ajustó el layout y espaciado de las subcolumnas de Entradas, Salidas y Saldos para evitar que los números y monedas se monten en pantallas medianas.
2. **Seguridad en el Selector de Sucursal:**
   * El filtro para ver el Kardex consolidado de *"Todas las sucursales"* o alternar entre sucursales ahora está restringido estrictamente a usuarios con rol `Super Admin`. Los usuarios de sede ven únicamente el Kardex de su sucursal asignada.
3. **Unificación de Buscadores:**
   * Se eliminó el buscador duplicado en la cabecera, dejando una única barra de búsqueda reactiva por código de referencia, SKU o nombre de producto.

---

## 6. Verificación y Calidad de Código

### 6.1 Tests Automatizados
Se validaron los flujos con la suite Pest:
```bash
# Tests de Devoluciones de Clientes (7 tests, 46 aserciones)
php artisan test --compact tests/Feature/CustomerReturnTest.php

# Tests de Transferencias entre Sucursales y Lotes (16 tests, 71 aserciones)
php artisan test --compact tests/Feature/TransfersTest.php

# Tests del Simulador FIFO SUNAT 13.1
php artisan test --compact tests/Feature/FifoKardexSimulatorTest.php
```
* **Resultado global:** Todos los tests pasaron exitosamente al 100%.

### 6.2 Base de Datos y Kardex Regularizado
Se auditó y corrigió el historial del producto **Bujía de Encendido Iridium Test** (ID 1893):
* **ID 78:** `DEVOLUCION_VENTA` +2 unidades (Saldo: 3, Ref: `NC20260921-YQDT`)
* **ID 79:** `DEVOLUCION_VENTA` +1 unidad (Saldo: 4, Ref: `NC20260921-QNLL`)
* **Saldo final verificado:** 4 unidades físicas y 4 unidades en lote activo en Sucursal Central.

### 6.3 Limpieza y Build
* Se eliminaron más de 170 archivos `.py` y scripts temporales residuales en la raíz del proyecto.
* Formato aplicado con Laravel Pint: `vendor/bin/pint --dirty --format agent`.
* Compilación frontend exitosa: `npm run build` (0 errores de TypeScript / Vite).
