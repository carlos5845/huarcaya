# Fase 4: Ventas, Cuentas por Cobrar y Pagos

## Objetivo
Implementar las entidades principales correspondientes al Bloque 5 y 6 del Modelo Lógico, encargadas de registrar las transacciones de ventas, cuentas por cobrar, pagos, devoluciones de clientes y reembolsos.

## Tablas Implementadas (11 tablas)

1. **Ventas (`sales`)**
   - Maneja las transacciones comerciales de salida al cliente (CASH, CREDIT, PARTIAL).
   - Incluye referencias a documentos externos y snapshots del nombre y documento del cliente en el momento de la venta.

2. **Líneas de Venta (`sale_lines`)**
   - Detalle de los productos vendidos, cantidad, precio unitario, descuentos e impuestos.

3. **Devoluciones de Clientes (`customer_returns`)**
   - Transacción mediante la cual el cliente devuelve productos asociados a una venta original.

4. **Líneas de Devolución (`customer_return_lines`)**
   - Detalle de los productos devueltos y su condición física de retorno (GOOD, DAMAGED, etc.).

5. **Cuentas por Cobrar (`receivables`)**
   - Representa el estado financiero real y oficial de lo que debe el cliente (saldo). Es actualizado mediante los pagos y asignaciones.

6. **Métodos de Pago (`payment_methods`)**
   - Catálogo de métodos aceptados por la empresa (Efectivo, Tarjeta, Transferencia, etc.), indicando si afectan la caja (is_cash).

7. **Pagos (`payments`)**
   - Transacción comercial que registra la recepción de dinero por parte de un cliente.

8. **Líneas de Método de Pago (`payment_method_lines`)**
   - Desglose del pago por método utilizado (p. ej., un pago dividido en Efectivo y Tarjeta).

9. **Asignaciones de Pago (`payment_allocations`)**
   - Tabla de cruce que distribuye un pago (`payment_id`) a una o más cuentas por cobrar (`receivable_id`).

10. **Reembolsos (`refunds`)**
    - Salida de dinero de la empresa al cliente, generalmente originado por una devolución (`customer_return`).

11. **Líneas de Método de Reembolso (`refund_method_lines`)**
    - Desglose del reembolso según el método por el que se devolvió el dinero.

## Características Clave
- **Integridad:** Las tablas incluyen restricciones `restrictOnDelete` para evitar la eliminación accidental de transacciones financieras ligadas a catálogos (clientes, sucursales).
- **Tipado Fuerte (Casts):** Todas las columnas de dinero están configuradas como `DECIMAL(15, 6)` garantizando que en PHP se consuman y procesen adecuadamente para reportes financieros y cierres.
- **Inmutabilidad Relativa:** Los datos principales, como `customer_name_snapshot` en la venta, garantizan que los reportes de ventas no cambien en el futuro si se altera la razón social del cliente.

## Próximos Pasos (Siguiente Fase)
Fase 5: Salidas, transferencias y armado de kits (Bloques 7, 8 y 9 del Diseño Lógico).
