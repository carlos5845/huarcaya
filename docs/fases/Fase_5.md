# Fase 5: Salidas, transferencias y armado de kits

## Objetivo
Implementar los bloques 7 y 8 del Modelo Lógico para gestionar la salida física de mercadería no ligada a ventas (mermas, consumos, robos, vencimientos), devoluciones al proveedor, procesos de inventario físico (conteos y ajustes) y el traslado de mercadería entre sucursales de la misma empresa. El armado de kits (Bloque 9) ya cuenta con la estructura base implementada en fases previas, por lo que esta etapa se centra en la parte operativa.

## Tablas Implementadas (16 tablas)

### 1. Salidas y Devoluciones a Proveedores (Bloque 7)
- **Salidas Diversas (`inventory_exits` / `inventory_exit_lines`)**: Registra la merma, consumo interno, donación, robo o descarte por caducidad (exit_type).
- **Devolución a Proveedor (`supplier_returns` / `supplier_return_lines`)**: Gestiona formalmente la anulación o retorno de productos originalmente recibidos en una Orden de Compra (`purchase_id`).

### 2. Conteos y Ajustes Físicos (Bloque 7)
- **Conteos de Inventario (`inventory_counts` / `inventory_count_lines`)**: Planificación y ejecución de un conteo físico (Cíclico, Parcial o Total).
- **Intentos de Conteo (`inventory_count_attempts`)**: Permite que múltiples contadores intenten hacer el conteo (conteo 1, conteo 2, conteo 3) hasta llegar a un consenso sobre la fila.
- **Ajustes de Inventario (`inventory_adjustments` / `inventory_adjustment_lines`)**: Registra contablemente la regularización a favor (positivo) o en contra (negativo) derivada de la diferencia hallada en un conteo.

### 3. Transferencias entre Sucursales (Bloque 8)
- **Solicitud de Traslado (`transfers` / `transfer_lines`)**: Establece la intención administrativa de mover productos de `source_branch_id` a `destination_branch_id`.
- **Despachos (`transfer_shipments` / `transfer_shipment_lines`)**: Registra la salida física de mercadería de la sucursal origen. La mercadería se pone "en tránsito".
- **Recepciones (`transfer_receipts` / `transfer_receipt_lines`)**: Registra la entrada física de la mercadería en la sucursal de destino.
- **Diferencias (`transfer_differences`)**: Si la cantidad recibida no coincide con la cantidad despachada (p. ej. un producto se perdió o dañó en el camino), se registra aquí para investigación y resolución.

## Características Clave
- **Alta trazabilidad de envíos:** La transferencia no es un salto instantáneo entre inventarios; pasa por `transfers` (intención) -> `transfer_shipments` (salida) -> `transfer_receipts` (llegada). Esto resuelve el problema físico de "mercadería en tránsito".
- **Precisión:** Al igual que en la fase 4, todas las cantidades y costos se configuraron en `DECIMAL(15, 6)`.
- **Auditoría de conteo:** Conservamos el historial de todos los intentos de conteo (`inventory_count_attempts`) por usuario para evitar fraudes en las regularizaciones de caja/bodega.

## Próximos Pasos (Siguiente Fase)
Fase 6: Cierre de Caja, Sincronización PWA y Herramientas Transversales (Bloques 10, 11 y 12 del Diseño Lógico).
