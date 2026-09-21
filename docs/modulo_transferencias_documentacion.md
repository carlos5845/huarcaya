# Módulo de Transferencias entre Sucursales

## Resumen del Módulo
El módulo de Transferencias permite gestionar el envío y recepción de productos entre diferentes sucursales de la empresa. Todo el flujo está controlado mediante estados y afecta dinámicamente el Kardex (inventario) de cada sucursal de forma aislada, garantizando un seguimiento estricto de las mercaderías.

## Estados de una Transferencia
Una transferencia pasa por los siguientes estados:
1. **DRAFT (Solicitado):** Se crea el borrador de la transferencia. Aún no hay movimiento en el inventario. Se notifica a la sucursal de Origen.
2. **IN_TRANSIT (En Tránsito / Despachado):** La sucursal de Origen despacha la mercadería. Se descuenta el stock en el Origen y se notifica al Destino.
3. **COMPLETED (Completado):** La sucursal de Destino recibe la mercadería sin problemas. Se suma el stock en el Destino y se notifica al Origen.
4. **WITH_DISCREPANCY (Con Observaciones):** La sucursal de Destino recibe la mercadería, pero reporta faltantes o daños.
5. **CANCELLED (Cancelado):** La transferencia se cancela (solo permitido en DRAFT o IN_TRANSIT). Si estaba en tránsito, el stock regresa al Origen.

## Lógica de Autorización (Roles y Sucursales)
- **Despachar (Enviar):** Solo puede ser realizado por un usuario asignado a la **Sucursal de Origen** (o un Super Admin).
- **Confirmar Recepción:** Solo puede ser realizado por un usuario asignado a la **Sucursal de Destino** (o un Super Admin).
- **Notificaciones en tiempo real:** Cuando un estado cambia, se generan notificaciones vía base de datos que se reflejan en la campana de notificaciones de la barra superior.

## Impacto en el Kardex
El sistema de inventario está diseñado para manejar las transferencias de la siguiente forma:

### Origen (Al Despachar)
- Se registra un movimiento de salida: `TRANSFERENCIA_SALIDA`.
- Se descuenta el stock en la sucursal de Origen.

### Destino (Al Recibir)
Al momento de cotejar el paquete, el recepcionista puede marcar 3 condiciones para cada producto:
- **Recibido OK:** Se registra un movimiento de entrada (`TRANSFERENCIA_ENTRADA`) y el stock del Destino suma las cantidades correctas.
- **Faltante:** Si llegaron menos productos de los enviados, los faltantes NO se registran en el Kardex (el stock no suma). Queda como una discrepancia en la base de datos de la transferencia.
- **Dañado:** Si llegan productos defectuosos, se realiza un **Movimiento Espejo**:
  1. Se registra una entrada (`TRANSFERENCIA_ENTRADA_DANADA`) para confirmar la recepción contable.
  2. Inmediatamente se registra una salida (`AJUSTE_MERMA_RECEPCION`) dando de baja el repuesto dañado. El saldo final es 0 pero queda el rastro para auditoría.

## Interfaz de Usuario
- Búsqueda avanzada de repuestos mostrando su Código (referencia), Nombre, Marca, y el Stock Actual en el Origen.
- Actualización en tiempo real (polling cada 15 segundos) en la vista de lista de transferencias para no tener que refrescar la página.
- Modal de recepción adaptable en tamaño (especialmente en pantallas grandes) con validación automática de sumas y restas (OK + Dañado + Faltante = Enviado).
- Botones adaptables al Modo Oscuro garantizando alto contraste (ej: texto blanco permanente sobre fondos sólidos).
