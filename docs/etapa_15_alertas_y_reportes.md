# Documentación de Entrega: Etapa 15 - Alertas y Reportes

## 1. Resumen de la Implementación

En cumplimiento con la **Etapa 15** del documento maestro [`docs/Plan_de_trabajo_para_desarrollar_el_sistema.md`](file:///d:/inversiones/huarcaya/docs/Plan_de_trabajo_para_desarrollar_el_sistema.md), se ha desarrollado el módulo integral de **Centro de Alertas y Reportes Exportables** para **Inversiones Huarcaya S.A.C.**

El módulo provee una solución unificada de inteligencia operativa y analítica para la empresa, compuesta por:
1. **Motor y Bandeja de Alertas Operativas (`/alerts`)**: Detección continua de 10 anomalías críticas, advertencias e informativas, con aislamiento por sucursal y acciones de resolución en un clic.
2. **Centro de 12 Reportes Exportables (`/reports`)**: Panel categorizado con filtros de fecha y tienda, cálculo de KPIs en vivo, exportación en streaming a Excel (`.xlsx`) y visor de impresión en formato A4 integrado mediante modal dentro del sistema (sin abrir pestañas nuevas `_blank`).
3. **Seguridad y Control de Acceso por Sucursal**: Visibilidad completa para el rol `Super Admin` y acceso restringido estrictamente a las sucursales asignadas para administradores de tienda, cajeros y almaceneros (`403 Forbidden` en peticiones o filtros no autorizados).

---

## 2. Catálogo de 10 Alertas Operativas Implementadas

| # | Código de Alerta | Severidad | Regla de Detección | Acción Rápida |
|---|---|---|---|---|
| 1 | `LOW_STOCK` | `WARNING` | Stock disponible $\le$ stock mínimo configurado en `product_min_stocks` (o umbral base $\le 5$) | Ir a Repuestos / Crear Compra |
| 2 | `OUT_OF_STOCK` | `CRITICAL` | Producto activo con stock disponible $\le 0$ en la sucursal | Ir a Inventario / Compras |
| 3 | `NEGATIVE_STOCK` | `CRITICAL` | Stock físico $< 0$ (anomalía de stock o venta fuera de orden) | Auditar en Kardex |
| 4 | `PENDING_CLOSING` | `WARNING` | Cierre diario en estado `DRAFT` o jornada previa sin cierre confirmado | Auditar y Confirmar Cierre |
| 5 | `INVENTORY_DIFFERENCE` | `WARNING` | Cierre confirmado con descuadre de caja (`difference != 0`) | Ver Detalle del Cierre |
| 6 | `PENDING_TRANSFER` | `WARNING` | Transferencia intersucursal en estado `PENDING` o `IN_TRANSIT` por más de 12 horas | Recepcionar Traslado |
| 7 | `OVERDUE_RECEIVABLE` | `CRITICAL` | Cuenta por cobrar con saldo pendiente y fecha de vencimiento superada | Gestionar Cobranza |
| 8 | `PENDING_OFFLINE_OPS` | `INFO` | Operaciones offline en cola del servidor pendientes de procesar | Ver Sincronización |
| 9 | `SYNC_CONFLICT` | `CRITICAL` | Conflictos de sincronización no resueltos (`Conflict::pending()`) | Resolver Conflicto |
| 10 | `UNKNOWN_DEVICE` | `WARNING` | Dispositivo en estado `INACTIVE` o sin tienda asignada que registró actividad reciente | Revisar Dispositivos |

---

## 3. Catálogo de 12 Reportes Exportables e Imprimibles

### A. Inventario y Almacén
1. **Inventario por Sucursal**: Existencias físicas, stock disponible, costos promedio y valorización total por tienda.
2. **Inventario Consolidado**: Comparativo multitienda agrupado por producto con stock en cada sede y total global de la empresa.
3. **Kardex Valorado**: Historial de movimientos de entradas, salidas y saldos físicos valorizados (con trazabilidad de usuarios y referencias).
4. **Salidas de Almacén**: Registro de mermas, desmedros, consumos internos y ajustes de baja de stock.

### B. Ventas y Comercial
5. **Registro de Ventas**: Facturación detallada por tipo de comprobante (Facturas, Boletas, Notas de Venta), cliente, condición contado/crédito, impuestos y totales.
6. **Registro de Compras**: Compras a proveedores, números de comprobante comercial, base imponible, IGV y montos totales.
7. **Pagos y Cobranzas**: Recibos de caja, abonos de créditos y desglose por método de pago (Efectivo, Yape, Plin, Transferencia).
8. **Cuentas por Cobrar**: Antigüedad de cartera de clientes, saldos pendientes, deudas vencidas y estado de amortizaciones.

### C. Operaciones de Tienda
9. **Transferencias**: Historial de traslados intersucursal enviados y recibidos, estado de despacho y recepción.
10. **Cierres Diarios**: Arqueos de caja por sucursal, facturación del día, dinero reportado vs esperado, diferencias y usuarios responsables.

### D. Sincronización y Auditoría
11. **Operaciones Offline**: Trazabilidad cronológica de operaciones encoladas por terminales, estados y tiempos de procesamiento.
12. **Conflictos Sync**: Auditoría de discrepancias detectadas, causas, resoluciones aplicadas y usuarios que resolvieron.

---

## 4. Componentes Creados y Modificados

### Backend (Laravel 12 / PHP 8.5)
1. **Servicio y Controlador de Alertas**:
   - [`app/Services/AlertService.php`](file:///d:/inversiones/huarcaya/app/Services/AlertService.php): Motor reactivo de detección de las 10 alertas, persistencia en tabla `alerts`, gestión de estados de lectura (`markAsRead`, `markAllAsRead`) y conteo para badges.
   - [`app/Http/Controllers/AlertController.php`](file:///d:/inversiones/huarcaya/app/Http/Controllers/AlertController.php): `index`, `markAsRead`, `markAllAsRead`, `refresh`.
2. **Servicio y Controlador de Reportes**:
   - [`app/Services/ReportService.php`](file:///d:/inversiones/huarcaya/app/Services/ReportService.php): Consultas optimizadas con eager loading y scoping de sucursal para los 12 reportes, KPIs ejecutivos y generación de streams Excel con `Spatie\SimpleExcel\SimpleExcelWriter`.
   - [`app/Http/Controllers/ReportController.php`](file:///d:/inversiones/huarcaya/app/Http/Controllers/ReportController.php): `index`, `exportExcel`, `printReport`.
3. **Plantilla Imprimible en Formato A4**:
   - [`resources/views/reports/print/general-a4.blade.php`](file:///d:/inversiones/huarcaya/resources/views/reports/print/general-a4.blade.php): Plantilla Blade A4 estándar con logo corporativo oficial (`logo-text.png`), cabecera fiscal, parámetros del reporte, resumen KPI, tabla de datos y botón de cierre compatible con iframe modal.
4. **Middleware y Permisos**:
   - [`app/Http/Middleware/HandleInertiaRequests.php`](file:///d:/inversiones/huarcaya/app/Http/Middleware/HandleInertiaRequests.php): Compartición de la prop reactiva `active_alerts_count` para badges en navegación.
   - [`database/seeders/RolesAndPermissionsSeeder.php`](file:///d:/inversiones/huarcaya/database/seeders/RolesAndPermissionsSeeder.php): Registro y asignación de permisos `view_alerts` y `view_reports`.
   - [`routes/web.php`](file:///d:/inversiones/huarcaya/routes/web.php): Registro de rutas seguras para `/alerts` y `/reports`.

### Frontend (Inertia + React + Tailwind CSS)
1. **Bandeja de Alertas (`resources/js/pages/alerts/index.tsx`)**:
   - Tarjetas KPI dinámicas (Críticas, Advertencias, Informativas, Total No Atendidas).
   - Filtros por sucursal (restringido para no-admin), severidad, estado y buscador de texto.
   - Tarjetas de incidencias con bordes de color por severidad, fecha relativa, botón de acción rápida y botón de atender.
2. **Centro de Reportes (`resources/js/pages/reports/index.tsx`)**:
   - Selector interactivo de los 12 reportes agrupados en 4 categorías temáticas.
   - Barra de filtros: atajos temporales (Hoy, 7 Días, Este Mes, Este Año), fechas personalizadas, selector de sucursal y buscador.
   - Tarjetas KPI dinámicas según el reporte activo.
   - Botón de descarga directa a **Excel (.xlsx)**.
   - Botón de **Vista Imprimible (A4)** que abre el visor [`DocumentPreviewModal`](file:///d:/inversiones/huarcaya/resources/js/components/document-preview-modal.tsx) dentro de la aplicación sin abrir pestañas nuevas.
3. **Navegación (`resources/js/components/app-sidebar.tsx`)**:
   - Nuevo ítem **"Alertas"** con icono `AlertTriangle` y badge reactivo con el conteo de alertas activas.
   - Nuevo ítem **"Reportes"** con icono `BarChart3`.

---

## 5. Pruebas Automatizadas y Verificación

Se desarrollaron y ejecutaron las pruebas automatizadas Pest PHP:
- [`tests/Feature/AlertTest.php`](file:///d:/inversiones/huarcaya/tests/Feature/AlertTest.php): **6 pruebas pasadas**.
  - Acceso autenticado y permisos.
  - Detección de `OUT_OF_STOCK` y `LOW_STOCK`.
  - Detección de `OVERDUE_RECEIVABLE`.
  - Marcar como leída y marcar todas como leídas.
  - Aislamiento por sucursal y bloqueo `403 Forbidden` en sucursales ajenas.
- [`tests/Feature/ReportTest.php`](file:///d:/inversiones/huarcaya/tests/Feature/ReportTest.php): **5 pruebas pasadas**.
  - Acceso y carga de reporte por defecto (`sales`).
  - Consulta exitosa de los 12 tipos de reporte.
  - Exportación streaming a Excel (`.xlsx`).
  - Renderizado de vista imprimible A4 con logotipo.
  - Aislamiento por sucursal y bloqueo `403 Forbidden` ante intentos de consulta o exportación de sedes ajenas.

**Resultado Global de la Suite:**
- **29/29 pruebas pasadas** (355 aserciones exitosas).
- **Laravel Pint**: 100% de los archivos formateados bajo los estándares del proyecto.
- **Compilación Frontend**: `npm run build` finalizado con código de salida 0.
