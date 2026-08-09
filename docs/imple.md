Plan de Implementación General del Sistema (Actualizado)
Este documento describe la hoja de ruta estructurada en fases para desarrollar el Sistema Centralizado de Inventario, Ventas y PWA. En esta versión se han mapeado explícitamente las 81 tablas lógicas aprobadas para garantizar que ningún aspecto del diseño quede fuera durante el desarrollo.

IMPORTANT

Revisión del Usuario Requerida Por favor, verifica que la distribución de las tablas en las 7 fases sea la adecuada antes de proceder a la ejecución y creación de migraciones.

Fases de Implementación
Fase 1: Instalación de Librerías y Seguridad (Organización)
Objetivo: Preparar la infraestructura de Laravel y React (Starter Kit), instalar librerías externas y crear el esquema base de seguridad y organización.
Instalación de Librerías:
Backend: spatie/laravel-permission
Frontend: vite-plugin-pwa, dexie, dexie-react-hooks, zod, uuid.
Tablas a implementar (8 tablas propias/extendidas + Spatie):
companies, branches
users (extender la nativa de Laravel con uuid, company_id, etc.)
user_branches
devices, device_users
(La tabla sessions la provee Laravel y las 5 tablas de roles/permisos las provee Spatie).
Fase 2: Catálogo de Productos y Kits
Objetivo: Construir el catálogo maestro y la infraestructura para manejar kits.
Tablas a implementar (13 tablas):
Catálogo: brands, categories, units, products, product_aliases, product_prices, product_min_prices, product_min_stocks, warehouse_locations.
Kits y Armado: kit_versions, kit_components, assembly_orders, assembly_order_components.
Fase 3: Entidades Comerciales, Compras y Núcleo de Inventario
Objetivo: Definir clientes/proveedores e implementar el ingreso de mercadería, generación de lotes y el corazón del Kardex.
Tablas a implementar (14 tablas):
Comercial Base: suppliers, customers.
Compras y Entradas: purchases, purchase_lines, inventory_entries, inventory_entry_lines.
Inventario Central: inventories, lots, inventory_reservations, inventory_reservation_allocations.
Movimientos y Kardex: inventory_movements, inventory_movement_lines, lot_allocations, kardex_entries.
Fase 4: Ventas, Cuentas por Cobrar y Pagos
Objetivo: Desarrollar el flujo comercial de salida, control de deudas y flujo de caja.
Tablas a implementar (11 tablas):
Ventas y Devoluciones: sales, sale_lines, customer_returns, customer_return_lines.
Cobros y Pagos: receivables, payment_methods, payments, payment_method_lines, payment_allocations, refunds, refund_method_lines.
Fase 5: Transferencias, Otras Salidas, Ajustes y Cierres Diarios
Objetivo: Completar el movimiento interno de mercadería, regularizaciones físicas y los cortes de caja del día.
Tablas a implementar (19 tablas):
Otras Salidas: inventory_exits, inventory_exit_lines.
Transferencias: transfers, transfer_lines, transfer_shipments, transfer_shipment_lines, transfer_receipts, transfer_receipt_lines, transfer_differences.
Ajustes y Conteos: inventory_counts, inventory_count_lines, inventory_count_attempts, inventory_adjustments, inventory_adjustment_lines.
Cierres Diarios: daily_closings, daily_closing_versions, daily_closing_cash_counts.
Fase 6: Control, Configuración, Auditoría e Importación
Objetivo: Sentar las bases transversales para parámetros del sistema, correlativos, adjuntos, auditoría de cambios y migraciones de datos históricos.
Tablas a implementar (11 tablas):
Control: approvals, alerts, reason_codes, document_sequences, attachments.
Configuración y Auditoría: settings, setting_values, audit_events.
Importación: import_batches, import_batch_rows.
Fase 7: Motor PWA Offline y Sincronización
Objetivo: Implementar la infraestructura backend necesaria para recibir y resolver la cola de operaciones generadas sin conexión a internet.
Tablas a implementar (4 tablas):
sync_batches, sync_operations, sync_operation_dependencies, conflicts.
Verificación
Para cada fase:

Se crearán las migraciones exactas.
Se crearán los Modelos Eloquent con sus relaciones.
Se ejecutarán pruebas (Pest) si corresponde a lógica crítica (como PEPS y Promedio Ponderado en Fase 3).
