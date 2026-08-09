# Fase 3: Entidades Comerciales, Compras y Núcleo de Inventario

## Objetivo
Implementar la estructura base para el manejo comercial de proveedores y clientes, el flujo de compras (órdenes de compra y recepción), el inventario físico y su valorización (lotes y promedio ponderado), las reservas de inventario y el Kardex general de la empresa.

## Tablas Implementadas (14)
Se crearon y configuraron las siguientes tablas con sus respectivas migraciones y modelos Eloquent:

### Comercial Base
1. `suppliers`: Proveedores globales de la empresa.
2. `customers`: Clientes globales de la empresa.

### Compras y Entradas
3. `purchases`: Representa una orden de compra comercial a proveedor.
4. `purchase_lines`: Líneas de los productos comprados y sus costos.
5. `inventory_entries`: Recepción física de inventario autorizada (compras, ajustes, etc.).
6. `inventory_entry_lines`: Detalles de los productos recibidos y condición (GOOD/DAMAGED).

### Inventario Físico y Lotes
7. `inventories`: Inventario centralizado por sucursal, producto y ubicación. Maneja stock físico, disponible y costo promedio.
8. `lots`: Trazabilidad específica (fecha de manufactura/vencimiento, cantidades iniciales y disponibles) para productos que requieren lote.

### Reservas
9. `inventory_reservations`: Reservas de stock lógicas para procesos que comprometen mercadería (pedidos, etc.).
10. `inventory_reservation_allocations`: Detalle de las unidades reservadas por producto.

### Movimientos y Kardex
11. `inventory_movements`: Agrupador transaccional de movimientos físicos.
12. `inventory_movement_lines`: Registros de entrada/salida (IN/OUT) que afectan el físico.
13. `lot_allocations`: Consumo específico de lotes en movimientos de salida.
14. `kardex_entries`: Historial inmutable y secuencial del valor y cantidad de stock (entradas, salidas, saldos).

## Detalles Técnicos Relevantes
- **Costo Promedio Ponderado**: Los modelos y tablas están preparados (`unit_cost_base`, `average_cost`, `total_cost`) para soportar cálculos con precisión de 6 decimales.
- **Relaciones Eloquent**: Se establecieron relaciones de integridad `Cascade` para deletes donde correspondía, y `Restrict` para impedir el borrado de catálogos maestros si existen transacciones asociadas (ej. `product_id` en `purchase_lines`).
- **Estados (Status)**: Se implementaron columnas de estado `status` en minúscula/mayúscula estándar (`DRAFT`, `CONFIRMED`, `ACTIVE`, `BLOCKED`, etc.).

## Estado de la Fase
Migraciones generadas: `COMPLETO`
Modelos configurados: `COMPLETO`
