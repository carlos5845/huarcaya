# Documentación Técnica: Arquitectura Offline-First (PWA), Motor de Sincronización, Gestión de Borradores y Mejoras de UX/UI

**Fecha de Publicación:** 22 de Septiembre de 2026  
**Rama:** `feature/etapa-10-transferencias`  
**Estado:** Completo / Verificado con Tests Automatizados y Build en Producción  

---

## 1. Resumen Ejecutivo

En este hito se diseñó e implementó la arquitectura **Offline-First** y capacidades **PWA (Progressive Web App)** del sistema SIMAQ, permitiendo que la plataforma continúe operando sin interrupción ante caídas de red o en condiciones de baja conectividad. 

Asimismo, se resolvieron problemas críticos de experiencia de usuario y consistencia de datos:
1. **PWA y Soporte Offline:** Service Worker con precaché de recursos estáticos, manifiesto web e instalación en dispositivos.
2. **Persistencia Local con IndexedDB:** Estructura de almacenamiento reactivo con Dexie.js para productos, clientes, ventas, compras y cola transaccional de sincronización.
3. **Estado Fusionado (Merged State):** Integración transparente de registros locales pendientes con datos remotos del servidor en los listados y resúmenes de Ventas y Compras.
4. **Ciclo de Vida y Edición de Borradores Offline:** Prevención de pérdida accidental de borradores al abrir vistas de edición o regresar sin guardar.
5. **Adjuntos y Comprobantes Offline:** Serialización de archivos adjuntos (facturas, boletas) a Base64 en IndexedDB, previsualización/descarga local, y decodificación automática en el servidor durante la sincronización.
6. **Normalización de Zona Horaria:** Corrección definitiva del desfase de fecha (UTC-5 America/Lima) que adelantaba los registros en un día al operar en horas de la tarde/noche.
7. **Acceso Rápido al Modo Oscuro/Claro:** Reubicación del selector de temas en la barra superior junto al centro de notificaciones.

---

## 2. Arquitectura Offline-First y PWA

### 2.1 Service Worker y Manifiesto Web
* **Archivo de Manifiesto (`public/manifest.webmanifest`):** Define los parámetros de aplicación web instalable (nombre, orientación, temas de color corporativo e iconos).
* **Service Worker (`public/sw.js`):**
  * **Estrategia Cache-First / Stale-While-Revalidate:** Cachea activos estáticos compilados (JS, CSS, fuentes e imágenes).
  * **Network-Only con Fallback:** Para rutas dinámicas de Inertia y APIs, garantizando que el navegador nunca sirva respuestas HTML obsoletas cuando se recupera la conexión.
  * **Registro del SW:** Inicializado en `resources/js/app.tsx` mediante `navigator.serviceWorker.register('/sw.js')`.

### 2.2 Base de Datos Local IndexedDB (`resources/js/lib/db.ts`)
Implementada mediante **Dexie.js** con esquema versionado:
* `products`: Catálogo local de repuestos y productos con stock, precios, códigos y relaciones para búsqueda instantánea en modo offline.
* `customers`: Directorio local de clientes y empresas para selección rápida y creación en ventanilla sin internet.
* `offlineSales`: Ventas creadas o modificadas sin conexión (tanto borradores como confirmadas).
* `offlinePurchases`: Compras creadas o modificadas en modo offline, con detalle de líneas, lotes y comprobantes.
* `syncQueue`: Cola transaccional FIFO de operaciones (`CREATE_CUSTOMER`, `CREATE_SUPPLIER`, `CREATE_SALE`, `CREATE_PURCHASE`, etc.) con payload y estado de sincronización.

---

## 3. Estado Fusionado (Merged State) en la Interfaz

Para que la experiencia del usuario sea continua, la interfaz de usuario no depende exclusivamente de los datos devueltos por el backend:

### 3.1 Hooks React Personalizados
* **`useMergedSales(serverSales)`:** Combina en tiempo real las ventas enviadas por Inertia con los registros almacenados en `db.offlineSales`. Asigna la insignia visual `"Pendiente de Sincronización"` a los registros creados sin internet.
* **`useMergedPurchases(serverPurchases)`:** Fusiona las compras del servidor con `db.offlinePurchases`, manteniendo coherencia visual en el resumen de compras.
* **`useMergedCustomers(serverCustomers)`:** Permite buscar y autocompletar clientes combinando la base de datos central con los clientes nuevos registrados localmente.
* **`useNetworkStatus()`:** Monitorea eventos `online` y `offline` del navegador y gestiona la cola de sincronización.

### 3.2 Indicador de Conexión (`NetworkStatusBadge.tsx`)
Ubicado en el encabezado global de la aplicación:
* Muestra el estado actual: `Online` (verde) u `Offline` (ámbar con icono de desconexión).
* Informa el número de transacciones pendientes en la cola local.
* Ofrece un botón de **"Sincronizar ahora"** que activa el envío en lote cuando se detecta conexión a internet.

---

## 4. Motor de Sincronización Bidireccional (Batch Sync Engine)

### 4.1 Endpoint Centralizado
* **Ruta:** `POST /api/sync/batch` (Controlador `app/Http/Controllers/Api/SyncController.php`).
* **Autenticación:** Protegido por sesión web o Sanctum (`auth:sanctum` / `web`).

### 4.2 Lógica Transaccional (`app/Services/SyncEngineService.php`)
1. **Transacciones Atómicas:** Cada lote de sincronización se ejecuta dentro de un `DB::transaction()` con bloqueo pesimista según aplique.
2. **Mapeo de IDs Temporales (Client-Side UUID -> Server ID):**
   * Cuando se crea un cliente offline con UUID temporal `temp-cust-123`, el servicio lo crea en la base de datos PostgreSQL, genera su `id` real y lo mapea:
     ```php
     $idMap['customer'][$tempId] = $realCustomer->id;
     ```
   * Si en el mismo lote existe una venta asociada a `temp-cust-123`, el servicio sustituye automáticamente el ID antes de persistir la venta.
3. **Manejo de Stock e Inventario:** Si la venta offline se registró como confirmada, se invoca `SaleConfirmationService` para reservar stock, generar entradas en Kardex y actualizar lotes.

---

## 5. Gestión y Edición de Borradores Offline

### 5.1 Prevención de Descarte Accidental
* **Problema Identificado:** Al abrir un borrador offline para editarlo (`/sales/{id}/edit` o `/purchases/{id}/edit`), el sistema borraba la entidad local al cargar el formulario y, si el usuario regresaba al listado sin presionar "Guardar", la venta o compra desaparecía.
* **Solución Implementada:**
  * Se configuró un mecanismo de borrado diferido (*deferred discard*).
  * La entidad en `offlineSales` u `offlinePurchases` se conserva intacta mientras el usuario navega o edita.
  * Solo se actualiza o elimina de la tabla temporal una vez que el usuario confirma el formulario o pulsa explícitamente "Descartar".

### 5.2 Diálogos de Detalle Offline
Se crearon componentes dedicados para inspeccionar transacciones que aún no existen en el servidor:
* `OfflineSaleDetailDialog.tsx`: Visualiza comprobante, cliente, detalle de artículos, subtotales, IGV y estado local.
* `OfflinePurchaseDetailDialog.tsx`: Muestra proveedor, número de comprobante, líneas de compra, fechas y comprobante adjunto.

---

## 6. Comprobantes y Adjuntos Offline en Compras

### 6.1 Codificación y Persistencia Local
* Cuando el usuario adjunta una factura o boleta (PDF, PNG, JPG) en modo offline:
  * El archivo se lee en el cliente mediante `FileReader` y se convierte a Base64.
  * Se guarda en IndexedDB con la estructura:
    ```ts
    attachment: {
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64String,
    }
    ```
* Al reabrir el formulario de edición en compras (`purchases/edit.tsx`), los datos Base64 se reconstruyen a un objeto `File` nativo mediante `fetch(base64).blob()` y se inyectan en el estado del formulario.
* Permite previsualizar y descargar el comprobante adjunto directamente desde el navegador, aun estando sin conexión.

### 6.2 Procesamiento en el Servidor
* En `SyncEngineService.php`, si el payload de la compra contiene `document_file_base64`:
  1. Se decodifican los datos binarios.
  2. Se valida el tipo MIME y extensión.
  3. Se almacena físicamente en el disco público (`storage/app/public/purchases/`).
  4. Se guarda la ruta en `purchases.document_file_path`.

---

## 7. Normalización de Zona Horaria (UTC vs America/Lima)

### 7.1 Diagnóstico de la Falla
En compras y ventas, las fechas se generaban en el cliente utilizando:
```ts
new Date().toISOString().split('T')[0]
```
`toISOString()` siempre devuelve la fecha en formato UTC (GMT 0). En Perú (UTC-5), cualquier transacción realizada a partir de las 19:00 horas (7:00 PM) tomaba la fecha del día siguiente.

### 7.2 Solución Aplicada
1. **Helper de Fecha Local en Frontend (`resources/js/lib/utils.ts`):**
   ```ts
   export function getLocalDateString(dateInput?: Date | string | null): string {
     const date = dateInput ? new Date(dateInput) : new Date();
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const day = String(date.getDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
   }
   ```
2. **Formateo Seguro (`formatAppDate`):** Previene que cadenas `YYYY-MM-DD` sufran conversiones arbitrarias por zona horaria al ser mostradas en tablas y modales.
3. **Cast de Modelos en Backend:**
   * En `Purchase.php` y `Sale.php`, se definieron los casts como `'date:Y-m-d'` para garantizar que la serialización JSON mantenga la fecha exacta del registro.

---

## 8. Experiencia de Usuario: Selector Rápido de Tema

* **Reubicación de Control:** Se creó el componente `ThemeToggle` (`resources/js/components/theme-toggle.tsx`) y se colocó en la barra de navegación superior (`app-sidebar-header.tsx`), a la izquierda del botón de notificaciones.
* **Opciones Disponibles:** Claro (Light), Oscuro (Dark) y Sistema (System) mediante menú desplegable accesible con un solo clic.
* **Limpieza de Ajustes:** Se retiró la pestaña redundante de "Apariencia" en la navegación de configuración (`resources/js/layouts/settings/layout.tsx`) y se añadió redirección de seguridad desde `/settings/appearance` hacia `/settings/profile`.

---

## 9. Pruebas Automatizadas y Verificación

### 9.1 Cobertura de Pruebas
* **`tests/Feature/SyncBatchTest.php`:**
  * Prueba de sincronización en lote de clientes offline.
  * Prueba de sincronización de compras con comprobantes en base64.
  * Prueba de sincronización de ventas con resolución de dependencias de IDs temporales.
  * Prueba de confirmación y afectación de inventario/Kardex en sincronización.
  * Resultado: **6 tests pasados, 63 aserciones exitosas**.
* **`tests/Feature/ReceivablePaymentCancelTest.php`:**
  * Verificación de anulación controlada de pagos de cuentas por cobrar.

### 9.2 Calidad de Código y Compilación
* **Formateo PHP:** Ejecutado `vendor/bin/pint --format agent` con 0 incidencias.
* **Compilación Frontend:** Ejecutado `npm run build` con Vite, finalizando de manera exitosa sin advertencias ni errores TypeScript.
