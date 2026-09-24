# Documentación: Cabeceras Ejecutivas (KPIs), Mejoras de Inventario y Documentos de Traslado e Impresión en Transferencias

**Sistema:** ERP Repuestos Huarcaya  
**Rama:** `feature/etapa-10-transferencias`  
**Fecha:** Septiembre 2026  

---

## 1. Resumen General de los Cambios

En esta etapa se implementaron mejoras clave en la experiencia de usuario, auditoría operativa y control logístico físico/tributario del sistema:

1. **Cabeceras Modernizadas y Tarjetas de Resumen Ejecutivo (KPI Cards):**
   - Incorporación de indicadores financieros y operativos en tiempo real en los módulos de **Ventas**, **Transferencias**, **Devoluciones de Clientes** y **Ajustes de Inventario**.
   - Coherencia visual con los módulos de Inventario y Compras, usando iconos a color, tipografías monoespaciadas y tarjetas reactivas.

2. **Módulo de Documentos e Impresión en Transferencias:**
   - Creación de 4 formatos profesionales de impresión física (A4 y Ticketera 80 mm) reemplazando la impresión genérica del navegador.
   - Incorporación de la Nota de Traslado Interno, Ticket Térmico, Hoja de Picking agrupada por categorías y la Representación Impresa Oficial de la Guía de Remisión Remitente (SUNAT Tipo 09 - Motivo 04).

3. **Mejoras en el Módulo de Inventario y Catálogo:**
   - Ordenamiento inteligente **Stock-First** (prioriza repuestos con stock disponible en las primeras páginas).
   - Visibilidad completa del catálogo (1,893 productos) para todos los usuarios independientemente de la sucursal asignada.
   - Desglose por sede en chips informativos y reactividad instantánea del selector de sucursales.
   - Corrección del error de consola `usePage must be used within the Inertia component` en el hook `use-flash-toast`.

---

## 2. Detalle de Módulos con Cabeceras y Tarjetas KPI

### A. Ventas (`/sales`)
- **Cabecera:** Registro y Control de Ventas con acceso directo a *Nueva Venta*.
- **4 Tarjetas KPI:**
  1. **Total Facturado (PEN):** Suma acumulada de ventas confirmadas en Soles, con desglose en USD si existiera.
  2. **Total Operaciones:** Conteo de transacciones y desglose de borradores/locales.
  3. **Contado vs Crédito:** Recaudación al contado vs saldo pendiente de crédito.
  4. **Ticket Promedio:** Valor promedio en Soles por venta confirmada.
- **Sincronización Offline:** Integrado reactivamente con `useMergedSales`, sumando las ventas registradas localmente en Dexie en tiempo real.

### B. Transferencias (`/transfers`)
- **Cabecera:** Transferencias entre Sucursales con accesos directos a *Nueva Transferencia*, visualización de columnas e impresión.
- **4 Tarjetas KPI:**
  1. **Total Transferencias:** Total de guías registradas y solicitudes en borrador.
  2. **En Tránsito:** Guías despachadas con mercadería viajando hacia la sede destino.
  3. **Completadas:** Envíos recibidos y cerrados con conformidad total.
  4. **Con Observaciones:** Transferencias cerradas con discrepancias (faltantes o sobrantes).

### C. Devoluciones de Clientes (`/customer-returns`)
- **Cabecera:** Devoluciones (Notas de Crédito) con acceso a *Nueva Devolución*.
- **4 Tarjetas KPI:**
  1. **Total Devoluciones:** Total de notas de crédito y solicitudes.
  2. **Monto Revertido (PEN):** Suma total acumulada devuelta o acreditada en Soles.
  3. **Confirmadas:** Devoluciones procesadas con reingreso efectivo a Kardex.
  4. **En Borrador:** Solicitudes pendientes de validación o aprobación.

### D. Ajustes de Inventario (`/inventory/adjustments`)
- **Cabecera:** Ajustes Manuales de Inventario con acceso a *Nuevo Ajuste*.
- **4 Tarjetas KPI:**
  1. **Total Ajustes:** Total de actas de balance de inventario.
  2. **Ingresos (+):** Ajustes positivos aplicados por sobrantes o hallazgos.
  3. **Salidas / Mermas (-):** Ajustes negativos aplicados por desmedros, roturas o faltantes.
  4. **En Borrador:** Ajustes que aún no impactan el Kardex.

---

## 3. Módulo de Documentos e Impresión en Transferencias

### Formatos Implementados

| Documento | Formato | Ruta Web | Propósito |
|---|---|---|---|
| **Nota de Traslado Interno** | PDF / A4 | `/transfers/{id}/print/internal?format=a4` | Control interno con membrete Huarcaya, datos de partida/llegada, checklist de recepción física y 3 firmas obligatorias (*Entregado por*, *Transportado por*, *Recibido por*). |
| **Ticket de Despacho** | Térmico 80 mm | `/transfers/{id}/print/internal?format=ticket` | Formato condensado en tipografía monoespaciada para impresoras térmicas de mostrador (Epson TM-T20, Bixolon, etc.). |
| **Hoja de Picking** | A4 | `/transfers/{id}/print/picking` | Documento de recolección en estantería ordenado automáticamente por **Categoría y Marca**, con casillas `[ ]` y espacio para observaciones físicas. |
| **Guía de Remisión (GRE SUNAT)** | A4 Fiscal | `/transfers/{id}/print/guide` | Representación impresa oficial del **Tipo 09 / Motivo 04 (Traslado entre establecimientos)** con RUC, ubigeo de partida/llegada, datos del chofer/vehículo, código QR y hash de control. |

### Puntos de Acceso en la Interfaz (Frontend)
1. **En el Detalle (`/transfers/{id}`):**
   Botón desplegable `[ 🖨️ Imprimir Documento ▼ ]` en la barra superior con acceso directo a los 4 formatos en una nueva pestaña lista para imprimir o guardar como PDF.
2. **En la Tabla (`/transfers`):**
   En la columna *Acciones*, junto al botón "Ver", se agregó un botón con icono de impresora y menú desplegable para imprimir sin necesidad de entrar al detalle del registro.

---

## 4. Archivos Modificados y Creados

### Backend (PHP / Laravel)
- `app/Http/Controllers/TransferPrintController.php` *(Nuevo)*: Controlador de impresión y autorización por sucursales.
- `app/Http/Controllers/SaleController.php` *(Modificado)*: Cálculo de métricas agregadas de ventas (facturado PEN/USD, contado/crédito, ticket promedio).
- `app/Http/Controllers/TransferController.php` *(Modificado)*: Cálculo de métricas de transferencias (total, tránsito, completadas, discrepancias).
- `app/Http/Controllers/CustomerReturnController.php` *(Modificado)*: Cálculo de métricas de devoluciones y monto revertido.
- `app/Http/Controllers/InventoryAdjustmentController.php` *(Modificado)*: Cálculo de métricas de actas de ajuste (positivos, negativos, borradores).
- `routes/web.php` *(Modificado)*: Registro de las 3 rutas dedicadas de impresión con middleware de permisos.

### Vistas Blade de Impresión
- `resources/views/transfers/print/internal-a4.blade.php` *(Nuevo)*: Maquetación A4 de Nota de Traslado Interno con 3 bloques de firmas.
- `resources/views/transfers/print/internal-ticket.blade.php` *(Nuevo)*: Maquetación continua para rollo térmico de 80 mm.
- `resources/views/transfers/print/picking.blade.php` *(Nuevo)*: Maquetación de Hoja de Picking clasificada por categorías.
- `resources/views/transfers/print/guide-sunat.blade.php` *(Nuevo)*: Maquetación de Guía de Remisión Remitente SUNAT Tipo 09.

### Frontend (React / TypeScript)
- `resources/js/pages/sales/index.tsx` *(Modificado)*: Cabecera y 4 tarjetas KPI reactivas a ventas locales y del servidor.
- `resources/js/pages/transfers/index.tsx` *(Modificado)*: 4 tarjetas KPI y menú de impresión rápida en la tabla.
- `resources/js/pages/transfers/show.tsx` *(Modificado)*: Menú desplegable `Imprimir Documento` con los 4 formatos.
- `resources/js/pages/customer-returns/index.tsx` *(Modificado)*: Cabecera y 4 tarjetas KPI de devoluciones.
- `resources/js/pages/inventory/adjustments/index.tsx` *(Modificado)*: Cabecera y 4 tarjetas KPI de ajustes.

### Pruebas Automatizadas (Pest PHP)
- `tests/Feature/TransferPrintTest.php` *(Nuevo)*: 4 tests unitarios/funcionales que verifican la respuesta y contenido de los 4 formatos de impresión.
- `tests/Feature/InventoryIndexTest.php` *(Nuevo)*: Tests de visibilidad de catálogo, orden stock-first y cálculo de inventario.

---

## 5. Verificación y Calidad

- **Tests Automatizados:** Pasaron exitosamente:
  - `php artisan test --compact --filter="TransferPrintTest|TransfersTest"`: 10 tests pasados al 100% (59 aserciones).
  - `php artisan test --compact --filter="InventoryIndexTest"`: 4 tests pasados al 100% (90 aserciones).
- **Formato Pint:** Código formateado con `vendor/bin/pint --dirty --format agent` con 0 errores de estilo.
- **Compilación de Activos:** `npm run build` ejecutado en 12.9s sin ningún error de TypeScript ni Vite.
