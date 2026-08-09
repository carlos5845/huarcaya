22. Un pago real reembolsado permanece confirmado\.
23. Reembolsos tendrán métodos de salida separados\.
24. Ajustes de CxC distintos de pagos usarán receivable\_adjustments\.
25. Devoluciones/anulaciones pueden reducir deuda mediante ajustes\.
26. Si una reducción comercial supera la deuda pendiente, el exceso puede convertirse en reembolso\.
27. Aplicaciones no se borran al anular un pago\.
28. Saldos agregados deben actualizarse transaccionalmente\.
29. Concurrencia de pagos bloqueará las CxC afectadas\.
30. Cierre utilizará la sucursal receptora y métodos del pago\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 7 de 12: Otras salidas, devoluciones, conteos y ajustes de inventario__\.

Aplicaremos además la regla que acabamos de acordar: __antes de crear una tabla nueva, intentaremos reutilizar las estructuras que ya existen__\. En este bloque podemos reutilizar bastante del núcleo de inventario, especialmente inventory\_movements, inventory\_movement\_lines, lot\_allocations, kardex\_entries, inventory\_entries, receivables y receivable\_adjustments\.

__Etapa 4\.2 — Bloque 7: Salidas, devoluciones, conteos y ajustes__

Propongo __9 tablas nuevas__:

inventory\_exits

inventory\_exit\_lines

customer\_returns

customer\_return\_lines

inventory\_counts

inventory\_count\_lines

inventory\_count\_attempts

inventory\_adjustments

inventory\_adjustment\_lines

Con ellas pasaríamos de __47 a 56 tablas formalmente diseñadas__\.

__1\. inventory\_exits__

__Propósito__

Representar salidas físicas que __no son ventas ni transferencias normales__\.

Reutilizaremos una sola cabecera para:

- Uso interno\.
- Pérdida\.
- Baja definitiva por daño\.
- Devolución a proveedor\.
- Entrega no comercial\.
- Otras salidas autorizadas\.

No crearemos una tabla diferente para cada una\.

__Campos__

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE, NOT NULL

company\_id

BIGINT

FK

branch\_id

BIGINT

FK → branches\.id

exit\_number

VARCHAR

NOT NULL

exit\_type

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

supplier\_id

BIGINT

FK → suppliers\.id, NULL

source\_type

VARCHAR

NULL

source\_id

BIGINT

NULL

reason\_id

BIGINT

FK → reason\_codes\.id, NOT NULL

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK users\.id

approved\_by

BIGINT

FK users\.id, NULL

confirmed\_by

BIGINT

FK users\.id, NULL

device\_id

BIGINT

FK devices\.id, NULL

created\_offline

BOOLEAN

DEFAULT FALSE

confirmed\_at

TIMESTAMPTZ

NULL

cancelled\_at

TIMESTAMPTZ

NULL

cancelled\_by

BIGINT

FK users\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__2\. Tipos de salida__

Propongo:

INTERNAL\_USE

PERMANENT\_DAMAGE

LOSS

SUPPLIER\_RETURN

NON\_COMMERCIAL\_DELIVERY

OTHER\_AUTHORIZED

No incluiría aquí:

SALE

TRANSFER

INVENTORY\_ADJUSTMENT

KIT\_ASSEMBLY

porque ya tienen sus propios procesos\.

__3\. Daño físico vs baja por daño__

Esta diferencia sigue siendo importante\.

Marcar:

Disponible → Dañado

no usa inventory\_exits\.

Porque el producto sigue físicamente en almacén\.

Solo cuando se decide:

darlo de baja definitivamente

creamos:

inventory\_exits\.exit\_type = PERMANENT\_DAMAGE

y entonces sí:

stock físico ↓

inventory movement OUT

Kardex OUT

__4\. Pérdida__

exit\_type = LOSS

deberá ser una operación sensible\.

Normalmente requerirá:

- motivo,
- responsable,
- aprobación,
- evidencia si corresponde,
- auditoría\.

No permitiremos una pérdida simplemente escribiendo una cantidad negativa en inventario\.

__5\. Devolución a proveedor__

Utilizamos:

exit\_type = SUPPLIER\_RETURN

supplier\_id NOT NULL

y source\_type/source\_id podrá apuntar a:

- compra,
- entrada,
- lote original,

según la implementación final\.

Ya habíamos definido que la devolución a proveedor debe utilizar __lote específico de la compra original__, no PEPS automático\.

__6\. Tabla inventory\_exit\_lines__

__Propósito__

Representar los productos que salen\.

__Campos__

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

inventory\_exit\_id

BIGINT

FK

product\_id

BIGINT

FK products\.id

quantity

NUMERIC

NOT NULL

source\_purchase\_line\_id

BIGINT

FK purchase\_lines\.id, NULL

source\_entry\_line\_id

BIGINT

FK inventory\_entry\_lines\.id, NULL

source\_lot\_id

BIGINT

FK lots\.id, NULL

official\_unit\_cost

NUMERIC

NULL

official\_total\_cost

NUMERIC

NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__7\. Cantidad__

Siempre:

quantity > 0

El producto debe respetar además su unidad de medida\.

__8\. Costo__

Antes de confirmar:

official\_unit\_cost = NULL

Al confirmar:

official\_unit\_cost =

inventories\.average\_cost

para una salida normal\.

No lo ingresa el usuario\.

__9\. Devolución proveedor y costo__

Aunque físicamente devolvamos un lote comprado a:

S/130

el costo oficial de salida del Kardex seguirá normalmente el:

average\_cost actual

porque esa es nuestra política oficial de valorización\.

Pero conservamos:

- compra original,
- costo original,
- lote original,

para análisis y conciliación con proveedor\.

__10\. Salida → movimiento__

Una salida confirmada genera normalmente:

inventory\_exit

     ↓

inventory\_movement OUT

     ↓

inventory\_movement\_lines

     ↓

lot\_allocations

     ↓

Kardex

No creamos otro sistema de Kardex\.

__11\. Selección de lote__

Según tipo:

__Uso interno__

PEPS sugerido\.

__Entrega no comercial__

PEPS sugerido\.

__Pérdida__

Lote específico cuando se conoce\.

__Baja por daño__

Lote dañado específico\.

__Devolución proveedor__

Lote original específico\.

__12\. Estados de inventory\_exits__

Propongo:

DRAFT

PENDING\_APPROVAL

CONFIRMED

CANCELLED

REJECTED

CONFLICT

Solo CONFIRMED modifica inventario\.

__13\. Offline__

De acuerdo con lo definido:

Podemos permitir provisionalmente offline:

INTERNAL\_USE

NON\_COMMERCIAL\_DELIVERY

bajo condiciones\.

Reporte de daño/pérdida puede capturarse offline, pero __la baja definitiva oficial no__\.

No permitiría offline oficial:

SUPPLIER\_RETURN

PERMANENT\_DAMAGE

LOSS confirmada

en V1\.

__14\. customer\_returns__

Ahora entramos en las devoluciones de clientes\.

Esta sí merece entidad propia porque:

- se relaciona con venta,
- puede afectar inventario,
- puede afectar deuda,
- puede generar reembolso,
- puede ser parcial,
- necesita estado físico\.

__Tabla customer\_returns__

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

company\_id

BIGINT

FK

branch\_id

BIGINT

FK

sale\_id

BIGINT

FK → sales\.id

customer\_id

BIGINT

FK → customers\.id

return\_number

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

return\_type

VARCHAR

NOT NULL

commercial\_amount

NUMERIC

NOT NULL

debt\_reduction\_amount

NUMERIC

NOT NULL DEFAULT 0

refund\_amount

NUMERIC
