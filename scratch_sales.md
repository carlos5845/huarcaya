
en customers\.

Campo adicional:

__Campo__

__Tipo__

merged\_into\_customer\_id

BIGINT FK → customers\.id, NULL

Así podemos preservar clientes duplicados históricos\.

Regla:

merged\_into\_customer\_id <> id

Un cliente MERGED no recibe nuevas ventas\.

__10\. credit\_limit__

Ya definimos que el límite de crédito:

no será obligatorio en V1\.

Por eso:

credit\_limit = NULL

significa que la política de límite no está aplicada al cliente\.

No interpretaremos NULL como cero\.

__11\. Saldo del cliente__

No tendremos:

customers\.balance

como fuente oficial editable\.

El saldo se obtiene de:

receivables

\-

payment\_allocations

En el futuro podríamos mantener un agregado cacheado, pero no será la fuente contable\.

__12\. Tabla sales__

Esta es una de las tablas transaccionales más importantes\.

__Propósito__

Representar la operación comercial de venta\.

No será directamente el Kardex\.

Relaciones:

customer

   ↓

sale

   ↓

sale\_lines

   ↓

inventory\_movement

__13\. Campos propuestos de sales__

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

branch\_id

BIGINT

FK → branches\.id, NOT NULL

customer\_id

BIGINT

FK → customers\.id, NOT NULL

sale\_number

VARCHAR

NOT NULL

sale\_type

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

subtotal\_amount

NUMERIC

NOT NULL

discount\_amount

NUMERIC

NOT NULL DEFAULT 0

tax\_amount

NUMERIC

NOT NULL DEFAULT 0

total\_amount

NUMERIC

NOT NULL

initial\_payment\_amount

NUMERIC

NOT NULL DEFAULT 0

credit\_amount

NUMERIC

NOT NULL DEFAULT 0

due\_date

DATE

NULL

status

VARCHAR

NOT NULL

payment\_status\_snapshot

VARCHAR

NULL

external\_document\_type

VARCHAR

NULL

external\_document\_series

VARCHAR

NULL

external\_document\_number

VARCHAR

NULL

customer\_name\_snapshot

VARCHAR

NOT NULL

customer\_document\_snapshot

VARCHAR

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

approved\_by

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

__14\. Tipo de venta__

Propongo:

CASH

CREDIT

PARTIAL

__CASH__

Debe quedar totalmente pagada al confirmar\.

__CREDIT__

No existe pago inicial obligatorio\.

__PARTIAL__

Existe:

initial\_payment\_amount > 0

credit\_amount > 0

__15\. ¿Necesitamos guardar sale\_type?__

Sí\.

Aunque matemáticamente pueda derivarse del pago y saldo, es importante conservar la intención comercial original\.

Por ejemplo:

sale\_type = CREDIT

es relevante para reportes y auditoría\.

__16\. initial\_payment\_amount__

Aquí hay una precisión importante:

No será la fuente oficial del pago\.

El pago real será una fila en:

payments

que diseñaremos en el Bloque 6\.

El campo en sales puede mantenerse como __snapshot/resumen transaccional__\.

Otra opción es no tenerlo y derivarlo siempre\.

Mi recomendación:

conservarlo porque facilita validación atómica al confirmar una venta, pero debe coincidir con el/los pagos iniciales relacionados\.

__17\. credit\_amount__

Igualmente:

credit\_amount

es el monto que originalmente quedó a crédito\.

No representa el saldo actual\.

Ejemplo:

Venta total = 1,500

Pago inicial = 500

credit\_amount = 1,000

Después de pagos:

saldo actual = 400

pero:

sales\.credit\_amount

continúa siendo 1,000\.

Esto conserva la fotografía comercial original\.

__18\. Fecha de vencimiento__

Regla:

credit\_amount > 0

→ due\_date NOT NULL

Mientras:

sale\_type = CASH

→ due\_date normalmente NULL

__19\. Estado de venta__

De acuerdo con la Etapa 3:

DRAFT

PENDING\_AUTHORIZATION

CONFIRMED

CANCELLED

REJECTED

CONFLICT

Podemos considerar posteriormente REVERSING como estado técnico transitorio, pero no es necesario en modelo lógico principal\.

__20\. Estado financiero__

No debe mezclarse con sales\.status\.

Por ejemplo:

sale\.status = CONFIRMED

puede coexistir con:

payment status = PARTIAL

Por eso no tendremos estados como:

SALE\_PARTIALLY\_PAID

mezclados con la vida operativa de la venta\.

__21\. payment\_status\_snapshot__

Este campo es discutible\.

La fuente oficial estará en receivables/payments\.

Guardar un snapshot actualizado puede mejorar consultas, pero introduce riesgo de desincronización\.

Mi recomendación final:

No guardar payment\_status\_snapshot en sales como fuente persistente salvo que exista una razón de rendimiento demostrada\.

Por ahora lo __retiro de la propuesta final de sales__\.

Los estados financieros se consultarán mediante receivables\.

__22\. Número interno de venta__

Ejemplo:

VEN\-MZK\-2026\-000125

Generado mediante:

document\_sequences

Restricción:

UNIQUE\(branch\_id, sale\_number\)

UUID sigue siendo identidad idempotente\.

__23\. Documento externo/comercial__

Separamos:

external\_document\_type

external\_document\_series

external\_document\_number

para permitir:

- boleta,
- factura,
- nota/documento interno,

sin convertir todavía el sistema en solución de facturación electrónica\.

__24\. Venta sin documento externo__

Debe poder existir inicialmente\.

Porque el documento interno:

sale\_number

siempre identifica la operación\.

__25\. Snapshot del cliente__

Es importante conservar:

customer\_name\_snapshot

customer\_document\_snapshot

al confirmar\.

¿Por qué?

Porque el cliente podría cambiar posteriormente:

- dirección,
- razón social,
- nombre comercial\.

Una venta histórica debe conservar la información usada en ese momento\.

__26\. Cliente genérico y contado__

Regla:

customers\.is\_generic = true

solo puede utilizarse cuando:

sale\_type = CASH

No permitimos:

GENERIC \+ CREDIT

ni:

GENERIC \+ PARTIAL con saldo pendiente

__27\. Cliente bloqueado__

Un cliente BLOCKED debe bloquear o condicionar nuevas ventas según la política configurada\.

Si la causa es morosidad, ya definimos que inicialmente la política será principalmente advertir\.

Pero el estado administrativo BLOCKED es más fuerte y puede impedir operaciones\.

__28\. Tabla sale\_lines__

__Propósito__

Representar cada ítem comercial vendido\.

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

sale\_id

BIGINT

FK → sales\.id, NOT NULL

product\_id

BIGINT

FK → products\.id, NOT NULL

kit\_version\_id

BIGINT

FK → kit\_versions\.id, NULL

product\_type\_snapshot

VARCHAR

NOT NULL

product\_reference\_snapshot

VARCHAR

NOT NULL

product\_name\_snapshot

VARCHAR

NOT NULL

quantity

NUMERIC

NOT NULL

suggested\_unit\_price

NUMERIC

NOT NULL

minimum\_unit\_price

NUMERIC

NULL

final\_unit\_price

NUMERIC

NOT NULL

discount\_amount

NUMERIC

NOT NULL DEFAULT 0

discount\_percentage

NUMERIC

NOT NULL DEFAULT 0

subtotal\_amount

NUMERIC

NOT NULL

total\_amount

NUMERIC

NOT NULL

price\_id

BIGINT

FK → product\_prices\.id, NULL

price\_version

BIGINT

NULL

min\_price\_id

BIGINT

FK → product\_min\_prices\.id, NULL

min\_price\_version

BIGINT

NULL

requires\_price\_approval

BOOLEAN

NOT NULL DEFAULT FALSE

price\_approval\_id

BIGINT

FK → approvals\.id, NULL

official\_unit\_cost

NUMERIC

NULL

official\_total\_cost

