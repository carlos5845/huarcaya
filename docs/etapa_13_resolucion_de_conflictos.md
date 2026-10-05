# Documentación Técnica: Etapa 13 - Resolución de Conflictos de Sincronización

**Fecha:** Octubre 2026  
**Rama:** `feature/etapa-10-transferencias` / Principal  
**Sistema:** Inversiones Huarcaya S.A.C.  
**Estado:** Completo / Validado con 51 Tests de Dominio y Build en Producción  

---

## 1. Resumen Ejecutivo de la Etapa 13

La **Etapa 13 (Resolución de Conflictos)** del plan de trabajo maestro establece los mecanismos técnicos y operativos para gestionar y auditar las operaciones originadas en dispositivos sin conexión (modo offline) que entran en contradicción con la realidad del servidor central y del inventario Kardex al momento de sincronizar.

Entre los incidentes contemplados se encuentran:
1. **Stock Insuficiente (`INSUFFICIENT_STOCK`)**: Cuando se emite una venta offline de unidades de un producto que ya no cuenta con stock físico disponible en el servidor.
2. **Operaciones Duplicadas (`DUPLICATE_OPERATION`)**: Reenvíos o dobles confirmaciones de una misma transacción.
3. **Productos Inactivos o Desactivados (`INACTIVE_PRODUCT`)**: Artículos descontinuados durante la desconexión de la terminal.
4. **Datos Desactualizados (`OUTDATED_DATA`)**: Precios o condiciones alteradas.
5. **Deudas ya Canceladas (`ALREADY_PAID`)**: Pagos aplicados a cuentas por cobrar saldadas previamente por otra caja.

---

## 2. Arquitectura y Componentes Implementados

### 2.1 Backend

1. **Modelo `Conflict` (`app/Models/Conflict.php`)**:
   - Enlace directo con `SyncOperation` y con el usuario resolutor (`resolver`).
   - Scopes optimizados: `scopePending()`, `scopeResolved()`, `scopeRejected()`.
   - Accessors para determinar la sucursal implicada y el cajero emisor.

2. **Servicio `ConflictResolutionService` (`app/Services/ConflictResolutionService.php`)**:
   - **`reject(Conflict $conflict, User $user, string $notes)`**:
     Marca el conflicto como `REJECTED`, la operación como `FAILED`, guarda la justificación y notifica a la terminal para liberar la cola local sin alterar Kardex.
   - **`resolveWithCorrection(Conflict $conflict, array $newPayload, User $user, string $notes)`**:
     Permite ajustar cantidades o precios al stock real disponible y reprocesa la venta de forma idempotente en `SyncEngineService`.
   - **`resolveWithForceAuthorization(Conflict $conflict, User $user, string $notes)`**:
     Vía administrativa para cuando la venta sí ocurrió físicamente en tienda. Genera un **Ajuste de Regularización Positivo en Kardex** (`AJUSTE_POSITIVO`) por las unidades faltantes con firma del auditor y luego confirma la venta, garantizando que el saldo de Kardex se mantenga 100% cuadrado y trazable.

3. **Controlador `ConflictController` (`app/Http/Controllers/ConflictController.php`)**:
   - `index`: Listado paginado con KPIs de conflictos (Pendientes, Resueltos, Rechazados, Total) y filtros por estado, tipo, sucursal, fecha y texto.
   - `show`: Vista comparativa lado a lado entre los datos enviados por la terminal y el estado real del servidor.
   - `reject`, `correct`, `force`: Endpoints transaccionales protegidos por roles y permisos (`view_conflicts` / `Super Admin`).

4. **Middleware `HandleInertiaRequests`**:
   - Comparte globalmente `pending_conflicts_count` para alimentar en tiempo real el badge numérico del menú lateral.

---

## 3. Interfaz de Usuario (Frontend)

1. **Bandeja de Conflictos (`resources/js/pages/conflicts/index.tsx`)**:
   - Tarjetas KPI con indicador de alerta para conflictos pendientes de atención.
   - Tabla interactiva con desglose de sucursal, terminal, cajero, entidad y tipo de incidente.
   - Filtros rápidos reactivos por estado y tipo de conflicto.

2. **Comparador Lado a Lado (`resources/js/pages/conflicts/show.tsx`)**:
   - **Panel Izquierdo (Terminal Local)**: Datos del comprobante, cliente, productos, precios cobrados y cajero.
   - **Panel Derecho (Servidor Central)**: Stock físico, stock disponible en la sucursal, estado en catálogo y déficit exacto.
   - **Acciones con Modales de Seguridad**:
     - *Rechazar Operación* con justificación obligatoria.
     - *Corregir y Reprocesar* con edición en línea de cantidades/precios.
     - *Autorizar Excepción* con aviso de regularización en Kardex.
   - **Auditoría**: Tarjeta con fecha, usuario resolutor y notas de justificación para incidentes ya cerrados.

3. **Menú Lateral (`resources/js/components/app-sidebar.tsx` & `nav-main.tsx`)**:
   - Acceso directo a **"Conflictos"** con icono `ShieldAlert` y badge dinámico de alerta en ámbar cuando existen conflictos pendientes.

---

## 4. Pruebas y Control de Calidad

- **Pest Feature Tests (`tests/Feature/ConflictTest.php`)**:
  - `can list synchronization conflicts in the admin tray with metrics` (PASS)
  - `can view side-by-side conflict detail with client and server context` (PASS)
  - `can reject an offline conflict with mandatory resolution notes` (PASS)
  - `can resolve conflict with corrected data and reprocess` (PASS)
  - `can force authorize conflict with automatic kardex regularization` (PASS)
  - `requires notes with at least 5 characters to reject or authorize` (PASS)
- **Suite de Dominio**: 51 pruebas ejecutadas y aprobadas (`51 passed, 377 assertions`).
- **Pint Code Formatter**: 100% conforme con estándares PSR/Laravel.
- **Vite & TypeScript Compilation**: `npm run build` ejecutado con éxito en 18.37s.
