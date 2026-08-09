- Pago con varios métodos\.
- Cobro de una deuda en otra sucursal\.
- No permitir sobrepagos\.
- Anulación de pagos\.
- Reembolsos\.
- Estado vencido/vigente\.
- Operación offline y conflictos de saldo\.

Las tablas principales serán:

- receivables
- payment\_methods
- payments
- payment\_method\_lines
- payment\_allocations
- refunds
- refund\_method\_lines

Con estas __7 tablas nuevas__, pasaríamos de __39 a 46 tablas formalmente diseñadas__\.

__1\. Tabla receivables__

__Propósito__

Representar una deuda concreta pendiente de cobro\.

No representa el saldo global del cliente\.

Relación principal:

customer

   ↓

receivable

   ↑

sale

Una venta puede generar una cuenta por cobrar cuando queda saldo\.

__Campos propuestos__

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

FK → companies\.id, NOT NULL

customer\_id

BIGINT

FK → customers\.id, NOT NULL

origin\_branch\_id

BIGINT

FK → branches\.id, NOT NULL

sale\_id

BIGINT

FK → sales\.id, NULL

origin\_type

VARCHAR

NOT NULL

origin\_reference

VARCHAR

NULL

original\_amount

NUMERIC

NOT NULL

paid\_amount

NUMERIC

NOT NULL DEFAULT 0

outstanding\_amount

NUMERIC

NOT NULL

currency\_code

CHAR\(3\)

NOT NULL

issue\_date

DATE

NOT NULL

due\_date

DATE

NOT NULL

status

VARCHAR

NOT NULL

created\_by

BIGINT

FK → users\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__2\. Origen de una deuda__

origin\_type permite diferenciar:

SALE

INITIAL\_BALANCE

OTHER\_AUTHORIZED

Esto es importante porque ya definimos que una deuda migrada __no debe necesitar una venta histórica falsa__\.

Ejemplo:

origin\_type = INITIAL\_BALANCE

sale\_id = NULL

__3\. Venta y cuenta por cobrar__

Para una venta normal a crédito:

origin\_type = SALE

sale\_id = sales\.id

La relación esperada será:

sales 1 ─── 0\.\.1 receivables

Para V1 recomiendo una sola cuenta por cobrar por venta\.

__4\. Restricción sale\_id__

Cuando:

origin\_type = SALE

entonces:

sale\_id NOT NULL

Cuando es saldo inicial:

sale\_id = NULL

__5\. Monto original__

Ejemplo:

Venta total = 1,500

Pago inicial = 500

Entonces:

receivable\.original\_amount = 1,000

No debe ser el total de la venta, sino el monto que realmente quedó financiado\.

__6\. Saldo de la deuda__

Tendremos:

paid\_amount

outstanding\_amount

Aunque ambos puedan derivarse de payment\_allocations\.

¿Por qué mantenerlos?

Porque son valores operativos consultados constantemente\.

Pero deben ser __agregados controlados__, nunca editables manualmente\.

La verdad histórica serán las aplicaciones de pagos y sus anulaciones\.

__7\. Invariantes de deuda__

Siempre:

original\_amount > 0

paid\_amount >= 0

outstanding\_amount >= 0

Y normalmente:

original\_amount

=

paid\_amount

\+

outstanding\_amount

considerando también devoluciones o reducciones comerciales que más adelante puedan modificar exigibilidad mediante operaciones explícitas\.

No se modifica el monto original para ocultar una devolución\.

__8\. Estado financiero de receivables__

Propongo:

PENDING

PARTIAL

PAID

CANCELLED

__PENDING__

paid\_amount = 0

outstanding\_amount > 0

__PARTIAL__

0 < paid\_amount < original\_amount

__PAID__

outstanding\_amount = 0

__CANCELLED__

La deuda dejó de ser exigible debido a una operación válida como anulación de venta\.

No significa que se haya pagado\.

__9\. Estado de vencimiento__

No recomiendo mezclar:

OVERDUE

dentro de status\.

Porque una deuda puede ser:

PARTIAL \+ OVERDUE

El vencimiento debe ser derivado:

outstanding\_amount > 0

AND due\_date < fecha actual

→ vencida\.

Podemos materializarlo posteriormente si rendimiento lo exige, pero conceptualmente es derivado\.

__10\. Fecha de vencimiento obligatoria__

Toda receivable activa debe tener:

due\_date NOT NULL

porque ya acordamos que cuando queda saldo pendiente la fecha de vencimiento es obligatoria\.

__11\. Deuda y sucursal__

origin\_branch\_id responde:

¿Dónde nació la deuda?

Esto nunca cambia aunque el cliente pague en otra sucursal\.

Ejemplo:

Deuda originada = Juliaca

Cobro = Mazuko

La deuda sigue perteneciendo comercialmente a Juliaca\.

__12\. Tabla payment\_methods__

__Propósito__

Catálogo configurable de métodos de pago\.

Ejemplos:

CASH

BANK\_TRANSFER

DEPOSIT

YAPE

PLIN

CARD

OTHER

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

company\_id

BIGINT

FK → companies\.id

code

VARCHAR

NOT NULL

name

VARCHAR

NOT NULL

is\_cash

BOOLEAN

NOT NULL DEFAULT FALSE

requires\_reference

BOOLEAN

NOT NULL DEFAULT FALSE

offline\_allowed

BOOLEAN

NOT NULL DEFAULT TRUE

display\_order

INTEGER

NOT NULL DEFAULT 0

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

Restricción:

UNIQUE\(company\_id, code\)

__13\. is\_cash__

Es importante para cierre diario\.

Ejemplo:

EFFECTIVE

is\_cash = true

mientras:

YAPE

is\_cash = false

Así el cierre puede distinguir efectivo físico de cobros electrónicos\.

__14\. Referencia obligatoria__

Ejemplo:

BANK\_TRANSFER

requires\_reference = true

podría exigir número de operación\.

Mientras efectivo:

requires\_reference = false

__15\. Método desactivado__

Un método INACTIVE:

- no puede seleccionarse en nuevas operaciones,
- sigue apareciendo históricamente\.

__16\. Tabla payments__

__Propósito__

Representar un evento real de recepción de dinero\.

No representa inventario\.

__Campos propuestos__

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

FK, NOT NULL

receiving\_branch\_id

BIGINT

FK → branches\.id, NOT NULL

customer\_id

BIGINT

FK → customers\.id, NOT NULL

payment\_number

VARCHAR

NOT NULL

payment\_type

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

currency\_code

CHAR\(3\)

NOT NULL

exchange\_rate

NUMERIC

NULL

total\_amount

NUMERIC

NOT NULL

status

VARCHAR

NOT NULL

reference\_note

TEXT

NULL

notes

TEXT

NULL

created\_by

BIGINT

FK → users\.id, NOT NULL

confirmed\_by

BIGINT

FK → users\.id, NULL

device\_id

BIGINT

FK → devices\.id, NULL

created\_offline

BOOLEAN

NOT NULL DEFAULT FALSE

confirmed\_at

TIMESTAMPTZ

NULL

cancelled\_at

TIMESTAMPTZ

NULL

cancelled\_by

BIGINT

FK → users\.id, NULL

cancellation\_reason\_id

BIGINT

FK → reason\_codes\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__17\. Tipos de pago__

Propongo:

SALE\_PAYMENT

INITIAL\_PAYMENT

DEBT\_COLLECTION

MULTI\_DEBT\_COLLECTION

OTHER\_AUTHORIZED

No porque tengan lógicas financieras distintas, sino para reportes y trazabilidad\.

Podemos simplificar posteriormente si comprobamos que algunos son redundantes\.

__18\. Número interno__

Ejemplo:

PAG\-MZK\-2026\-000125

Restricción:

UNIQUE\(receiving\_branch\_id, payment\_number\)

UUID sigue siendo identidad para idempotencia\.

__19\. Sucursal receptora__

receiving\_branch\_id representa:

dónde se recibió el dinero\.

No necesariamente dónde nació la deuda\.

Esto soporta cobros cruzados\.

__20\. Cliente del pago__

Un pago pertenece a un cliente\.

No permitiremos en V1 un pago genérico sin cliente si se va a aplicar a deuda\.

Para venta al contado con CLIENTE VARIOS, el pago también puede relacionarse con ese cliente genérico\.

__21\. Estados del pago__

Propongo:

DRAFT

PENDING

CONFIRMED

CANCELLED

CONFLICT

REJECTED

Solo CONFIRMED afecta saldos oficiales y cierre\.

__22\. Pago confirmado__

Una vez confirmado:

no se edita monto ni métodos\.

Si fue erróneo:

- anulación de pago, o
- reembolso,

según lo que ocurrió realmente\.

__23\. Tabla payment\_method\_lines__

__Propósito__

Representar __cómo se recibió el dinero__\.

Ejemplo:

Pago S/1,000

Efectivo S/400

Yape     S/600

Dos filas\.

__Campos__

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

payment\_id

BIGINT

FK → payments\.id, NOT NULL

payment\_method\_id

BIGINT

FK → payment\_methods\.id, NOT NULL

amount

NUMERIC

NOT NULL

reference

VARCHAR

NULL

operation\_reference\_date

DATE

NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__24\. Regla de métodos__

Debe cumplirse:

SUM\(payment\_method\_lines\.amount\)

=

payments\.total\_amount

antes de confirmar\.

__25\. Pago mixto__

No necesitamos varias filas en payments\.

Ejemplo:

payments \#100 = S/1,000

con:

payment\_method\_lines

├── CASH 400

└── YAPE 600

Eso mantiene una sola operación de cobro\.

__26\. Referencia por método__

Si:

payment\_methods\.requires\_reference = true

entonces:

payment\_method\_lines\.reference NOT NULL

La validación se hará en aplicación porque depende de otra tabla\.

__27\. Tabla payment\_allocations__

__Propósito__

Representar __a qué deuda se aplicó el dinero__\.

Ejemplo:

Pago S/1,000

↓

Deuda A → 700

Deuda B → 300

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

payment\_id

BIGINT

FK → payments\.id, NOT NULL

receivable\_id

BIGINT

FK → receivables\.id, NOT NULL

amount

NUMERIC

NOT NULL

application\_order

INTEGER

NOT NULL DEFAULT 1

created\_at

TIMESTAMPTZ

NOT NULL

Restricción:

UNIQUE\(payment\_id, receivable\_id\)

para evitar dos aplicaciones separadas del mismo pago sobre la misma deuda sin necesidad\.

__28\. Monto aplicado__

Siempre:

amount > 0

Y al confirmar:

amount <= saldo oficial restante de la deuda

__29\. Sobrepagos__

Regla V1:

No se permiten\.

Ejemplo:

saldo = 400

pago = 401

rechazado\.

No se genera:

saldo a favor = 1

__30\. Suma de aplicaciones__

Para un pago destinado totalmente a deudas:

SUM\(payment\_allocations\.amount\)

=

payments\.total\_amount

¿Siempre?

Para nuestras reglas actuales, prácticamente sí\.

Una venta al contado también puede conceptualmente generar un pago aplicado directamente a la propia venta sin crear receivable\.

Aquí aparece una decisión importante\.

__31\. ¿Venta al contado debe crear receivable de saldo cero?__

Tenemos dos posibilidades\.

__Opción A__

No crear deuda para contado\.

Entonces el pago contado necesita relación directa a la venta\.

__Opción B__

Crear una deuda efímera/zero balance para toda venta\.

Eso simplifica relación pago↔venta, pero contamina receivables con miles de ventas que nunca fueron deuda\.

Mi recomendación sigue siendo:

__No crear receivable para ventas totalmente pagadas\.__

Por tanto necesitamos que payments pueda relacionarse directamente a una venta cuando se trata de pago de contado o pago inicial\.

__32\. Relación de pago con venta__

Propongo agregar a payments:

__Campo__

__Tipo__

__Regla__

sale\_id

BIGINT

FK → sales\.id, NULL

Esto indica una relación comercial directa\.

Ejemplos:

__Venta contado__

payment\.sale\_id = venta

payment\_allocations = vacío

__Pago inicial parcial__

payment\.sale\_id = venta

y la cuenta por cobrar se crea únicamente por el saldo restante\.

__Pago posterior__

payment\.sale\_id = NULL

payment\_allocations → receivable

__33\. ¿Un pago posterior puede cubrir varias ventas?__

Sí\.

Entonces:

payment\.sale\_id = NULL

y:

payment\_allocations

determina las deudas\.

__34\. ¿Un pago puede ser inicial y aplicarse a deuda?__

No debería ser necesario\.

En la venta parcial:

Venta = 1500

Pago inicial = 500

Deuda inicial = 1000

No crearemos deuda de 1500 para después aplicar 500\.

Crearemos:

payment inicial = 500

receivable\.original\_amount = 1000

Esto refleja mejor la operación comercial que definimos\.

__35\. Venta al crédito sin pago inicial__

payment = ninguno

receivable = total crédito

__36\. Venta al contado__

payment confirmado = total

receivable = ninguno

Todo en la misma transacción de confirmación\.

__37\. Pago posterior de deuda__

Ejemplo:

receivable saldo = 1000

payment = 600

allocation = 600

Después:

paid\_amount = 600

outstanding\_amount = 400

status = PARTIAL

__38\. Pago de varias deudas__

Cliente tiene:

A = 300

B = 500

C = 400

Paga:

700

Aplicación manual:

A = 300

B = 400

o automática siguiendo política\.

__39\. Aplicación automática__

Ya habíamos aprobado una posible regla opcional:

1. Deuda vencida más antigua\.
2. Después otra vencida\.
3. Después vigente más antigua\.

No necesitamos guardar una entidad adicional\.

El algoritmo produce filas en payment\_allocations\.

La pantalla debe mostrar al usuario cómo quedó distribuido antes de confirmar cuando corresponda\.

__40\. Aplicación manual__

También permitida\.

Pero siempre:

total aplicado <= pago

y ninguna deuda puede superar su saldo\.

__41\. Concurrencia de pagos__

Este es un escenario crítico\.

Deuda:

saldo = 500

Dispositivo A cobra 400\.

Dispositivo B cobra 300 simultáneamente\.

Debemos bloquear:

receivables

en orden determinístico antes de aplicar\.

Resultado:

- uno confirma,
- el otro debe fallar/conflicto por saldo insuficiente\.

Nunca:

paid\_amount = 700

__42\. Operación atómica de pago__

Conceptualmente:

BEGIN

1\. Bloquear payment

2\. Validar cliente

3\. Validar métodos

4\. Bloquear receivables afectadas

5\. Recalcular saldos

6\. Validar no sobrepago

7\. Crear payment\_allocations

8\. Actualizar receivables

9\. Confirmar payment

COMMIT

__43\. Pago cruzado entre sucursales__

Ejemplo:

receivable\.origin\_branch\_id = Juliaca

payment\.receiving\_branch\_id = Mazuko

Esto es válido\.

El cierre de Mazuko incluye:

cobro = 500

pero sus ventas del día no aumentan por ese pago\.

__44\. Reporte financiero por sucursal__

Debemos poder diferenciar:

__Venta__

sales\.branch\_id

__Deuda originada__

receivables\.origin\_branch\_id

__Dinero recibido__

payments\.receiving\_branch\_id

Esta separación es deliberada\.

__45\. Pago y Kardex__

Nunca:

payment → inventory\_movement

Pagos no afectan inventario\.

Esto debe mantenerse absolutamente separado\.

__46\. Pago offline__

payments ya tiene:

uuid

device\_id

created\_offline

operation\_date

Pero la fila oficial en PostgreSQL solo será confirmada después de revalidación\.

La PWA puede mantener una operación provisional en IndexedDB\.

__47\. Conflicto por sobrepago offline__

Ejemplo:

Dispositivo tenía saldo:

500

Otro usuario cobra:

400

Offline intenta:

300

Servidor encuentra saldo:

100

Resultado:

CONFLICT\_PAYMENT\_EXCEEDS\_BALANCE

No aplicar automáticamente 100\.

__48\. ¿Por qué no aplicación parcial automática?__

Porque el usuario puede haber recibido físicamente S/300\.

Aplicar solo S/100 produciría:

- S/200 sin explicación,
- descuadre de caja,
- confusión con cliente\.

Debe resolverse explícitamente\.

__49\. Duplicidad de pago__

UUID es primera defensa:

UNIQUE\(payments\.uuid\)

Pero también puede existir una advertencia heurística por:

customer

amount

method

reference

operation\_date

No será una restricción dura porque dos pagos reales pueden ser idénticos\.

__50\. Tabla refunds__

__Propósito__

Representar dinero que efectivamente se devuelve al cliente\.

No es lo mismo que cancelar un pago erróneo\.

__Campos propuestos__

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

FK, NOT NULL

branch\_id

BIGINT

FK → branches\.id, NOT NULL

customer\_id

BIGINT

FK → customers\.id, NOT NULL

payment\_id

BIGINT

FK → payments\.id, NULL

sale\_id

BIGINT

FK → sales\.id, NULL

customer\_return\_id

BIGINT

FK futura, NULL

refund\_number

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

currency\_code

CHAR\(3\)

NOT NULL

total\_amount

NUMERIC

NOT NULL

status

VARCHAR

NOT NULL

reason\_id

BIGINT

FK → reason\_codes\.id, NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK users\.id, NOT NULL

approved\_by

BIGINT

FK users\.id, NULL

confirmed\_at

TIMESTAMPTZ

NULL

cancelled\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__51\. ¿Por qué varias referencias?__

Un reembolso puede originarse por:

- devolución de producto,
- anulación de venta pagada,
- corrección financiera\.

Por eso puede apuntar a:

payment\_id

sale\_id

customer\_return\_id

según el caso\.

No todas serán obligatorias a la vez\.

__52\. Estados del reembolso__

Propongo:

DRAFT

PENDING\_APPROVAL

CONFIRMED

CANCELLED

REJECTED

Por su sensibilidad, normalmente requiere más permisos que registrar un pago\.

__53\. Monto del reembolso__

Siempre:

total\_amount > 0

Y no puede exceder el dinero efectivamente elegible para devolución según las operaciones relacionadas\.

La validación no puede ser un simple CHECK, porque depende de pagos/reembolsos anteriores\.

__54\. Tabla refund\_method\_lines__

__Propósito__

Registrar cómo salió el dinero\.

Ejemplo:

Reembolso 500

├── efectivo 300

└── transferencia 200

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

refund\_id

BIGINT

FK → refunds\.id, NOT NULL

payment\_method\_id

BIGINT

FK → payment\_methods\.id, NOT NULL

amount

NUMERIC

NOT NULL

reference

VARCHAR

NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

Debe cumplirse:

SUM\(refund\_method\_lines\.amount\)

=

refunds\.total\_amount

__55\. Reembolso y cierre__

Un reembolso en efectivo:

payment\_method\.is\_cash = true

reduce efectivo esperado del cierre de la sucursal que realizó el reembolso\.

No modifica ventas históricas directamente\.

__56\. Anulación de pago vs reembolso__

Esta distinción queda reflejada técnicamente:

__Pago registrado por error__

payments\.status = CANCELLED

y se revierten las aplicaciones\.

__Pago real recibido y dinero devuelto__

payments\.status = CONFIRMED

\+

refunds\.status = CONFIRMED

El pago original permanece\.

__57\. Anular un pago aplicado a deuda__

Ejemplo:

Deuda:

1000

Pago:

600

Saldo quedó:

400

Si el pago se anula correctamente:

paid\_amount = 0

outstanding\_amount = 1000

y payment\.status = CANCELLED\.

No eliminamos la aplicación históricamente; debemos poder conservarla\.

__58\. ¿Qué hacemos con payment\_allocations al anular?__

No debemos borrarlas\.

Tenemos dos opciones:

__A__

Agregar estado a cada aplicación\.

__B__

Considerar válida solamente si payment\.status = CONFIRMED\.

La opción B es más simple, pero dificulta parcialmente operaciones de reversión individual\.

Para V1, como no permitimos cancelar solo una parte de un pago confirmado, recomiendo:

Las aplicaciones permanecen inmutables y su efectividad depende del estado del pago\.

El saldo agregado de receivables se ajusta cuando se cancela el pago\.

__59\. ¿Agregar status a payment\_allocations?__

No lo considero necesario inicialmente\.

Una aplicación pertenece totalmente a la vida del pago\.

Si pago se anula:

allocation histórica permanece

payment CANCELLED

__60\. Reembolso no revierte aplicación automáticamente__

Esto es importante\.

Si el cliente pagó una deuda y luego recibe devolución comercial porque devolvió producto:

la deuda/venta debe ajustarse por el flujo de devolución comercial correspondiente\.

No debemos asumir:

refund → abrir automáticamente deuda

Cada caso debe resolver primero la razón financiera\.

__61\. Devolución comercial con deuda pendiente__

Ejemplo:

Venta:

1000

Saldo deuda = 600

Cliente devuelve producto por valor comercial:

300

Ya definimos que primero se reduce el saldo exigible:

600 → 300

No necesariamente hay reembolso de dinero\.

Eso requerirá en Bloque 7 una operación que ajuste/reduzca la deuda\.

__62\. ¿Necesitamos una tabla receivable\_adjustments?__

Aquí aparece una entidad que inicialmente no habíamos contado\.

Para soportar correctamente:

- devolución comercial que reduce deuda,
- anulación de venta,
- saldo inicial corregido,
- reducción autorizada,

no deberíamos modificar receivables\.original\_amount arbitrariamente\.

Podríamos necesitar:
