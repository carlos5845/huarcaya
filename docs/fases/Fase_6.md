# Fase 6: Cierre de Caja, Sincronización PWA y Herramientas Transversales

## Objetivo
Implementar los bloques 10, 11 y 12 del Modelo Lógico para finalizar la arquitectura base del sistema. Esta fase consolida el control financiero diario (cajas y cierres), prepara la estructura necesaria para que la PWA funcione offline (colas de sincronización y resolución de conflictos) y establece los módulos transversales (alertas, configuraciones, auditoría y secuencias de documentos).

## Tablas Implementadas (19 tablas)

### 1. Control de Caja y Cierres Diarios (Bloque 10)
- **Cajas (`cash_registers`)**: Administra las cajas físicas o virtuales asignadas a una sucursal.
- **Movimientos de Caja (`cash_movements`)**: Registra aperturas, cierres, ingresos, retiros y depósitos vinculados a una caja.
- **Cierre Diario (`daily_closings`)**: Cabecera del proceso de cuadre de caja al final del día.
- **Versiones de Cierre (`daily_closing_versions`)**: Permite guardar "fotos" (snapshots) en formato JSON del estado de ventas e ingresos, facilitando auditorías si los totales cambian tras el cierre.
- **Conteo Físico de Dinero (`daily_closing_cash_counts`)**: Registra cuánto dinero/baucher hay físicamente desglosado por método de pago frente a lo esperado por el sistema.

### 2. Sincronización PWA Offline (Bloque 11)
- **Operaciones de Sincronización (`sync_operations`)**: Cola de peticiones (CREATE, UPDATE, DELETE) generadas offline en los dispositivos móviles.
- **Dependencias de Sincronización (`sync_operation_dependencies`)**: Asegura que las operaciones se procesen en el orden correcto (por ejemplo, crear el cliente antes de crear su venta).
- **Conflictos (`conflicts`)**: Almacena colisiones (por ejemplo, dos vendedores modificaron el mismo producto estando offline) para resolución manual o automática.
- **Log de Cambios (`sync_change_logs`)**: Registro auditable de mutaciones generadas por la sincronización.

### 3. Herramientas Transversales y Auditoría (Bloque 12)
- **Códigos de Motivo (`reason_codes`)**: Catálogo unificado de razones (ej. motivo de anulación, motivo de ajuste, motivo de devolución).
- **Aprobaciones (`approvals`)**: Sistema genérico para requerir autorización de un supervisor en acciones críticas (ej. ajustes negativos altos).
- **Alertas (`alerts`)**: Notificaciones internas del sistema (stock bajo, cierre con descuadre, errores de sincronización).
- **Secuencias de Documentos (`document_sequences`)**: Controladores de correlativos (ej. F001-00001) para ventas y guías.
- **Archivos Adjuntos (`attachments`)**: Tabla polimórfica para adjuntar imágenes/PDFs a cualquier entidad (productos, salidas, cierres).
- **Configuraciones (`settings` y `setting_values`)**: Variables de entorno del sistema (globales o específicas por empresa/sucursal).
- **Auditoría Estricta (`audit_events`)**: Registro detallado de quién hizo qué en acciones altamente críticas, guardando el "antes" (`old_values`) y "después" (`new_values`).
- **Importaciones Masivas (`import_batches` y `import_batch_rows`)**: Gestión asíncrona de cargas masivas de datos (Excel/CSV).

## Características Clave
- **Versiones Inmutables:** El uso de JSONB en `snapshot_data` de los cierres de caja evita problemas si un usuario modifica una venta histórica, el cuadre original permanece intacto.
- **PWA Ready:** El esquema de dependencias y payloads JSONB en `sync_operations` es la piedra angular para soportar una PWA que funcione en zonas sin conexión a internet.
- **Polimorfismo:** Las tablas como `attachments`, `audit_events` y `approvals` fueron diseñadas de forma agnóstica para poder conectarse con literalmente cualquier tabla de la base de datos de manera limpia.

## Estado Final
Con la conclusión de esta Fase 6, se ha implementado el **100% de la Base de Datos Transaccional** descrita en el documento `Diseño_de_tablas_PostgreSQL.md`. El sistema ahora cuenta con el modelo ORM (Eloquent) y la integridad referencial a nivel de base de datos para soportar todas las operaciones logísticas y financieras del ERP.
