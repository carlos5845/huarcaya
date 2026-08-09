__Modelo lógico PostgreSQL__\.

Aquí ya vamos a transformar el modelo conceptual aprobado en __tablas reales__, teniendo en cuenta todos los módulos y reglas definidas hasta ahora\. No diseñaremos cada tabla aislada: primero fijaremos las convenciones globales y el mapa lógico completo, y después iremos dominio por dominio detallando columnas, PK, FK, UUID, obligatoriedad, restricciones y cardinalidades\.

__Etapa 4\.2 — Modelo lógico PostgreSQL__

__1\. Principios generales del modelo__

Antes de crear la primera tabla, fijamos estas reglas\.

__Identificador interno__

Las tablas transaccionales y maestras importantes tendrán normalmente:

id          BIGINT

uuid        UUID

id será la PK interna eficiente para relaciones PostgreSQL\.

uuid será la identidad pública/distribuida utilizada especialmente para:

- PWA\.
- Sincronización\.
- Idempotencia\.
- APIs\.
- Operaciones offline\.

Por tanto:

id   → relaciones internas

uuid → identificación externa/sincronización

No utilizaremos referencias comerciales como claves primarias\.

__2\. UUID__

Para operaciones creadas desde PWA utilizaremos conceptualmente:

UUID v7

Ejemplo:

venta\.uuid

pago\.uuid

cliente\.uuid

sync\_operation\.uuid

Debe existir una restricción:

UNIQUE\(uuid\)

Esto será fundamental para evitar duplicados durante sincronización\.

__3\. Nombres de tablas__

Propongo utilizar nombres en inglés, plurales y snake\_case, coherentes con Laravel:

branches

products

customers

sales

payments

inventory\_movements

Mientras que la interfaz seguirá estando en español\.

Esto nos da un código técnico más estándar sin afectar al usuario\.

__4\. Fechas estándar__

En general tendremos:

created\_at

updated\_at

pero las operaciones de negocio tendrán además sus propias fechas\.

Ejemplo:

operation\_date

confirmed\_at

cancelled\_at

synced\_at

No debemos utilizar created\_at como sustituto de la fecha real de operación\.

Esto es especialmente importante para offline\.

__5\. Eliminaciones__

No utilizaremos eliminación física indiscriminadamente\.

Para maestros como:

- Productos\.
- Clientes\.
- Sucursales\.
- Usuarios\.

preferiremos:

status

como:

ACTIVE

INACTIVE

BLOCKED

Las operaciones confirmadas:

__Nunca se borran\.__

Para borradores podremos decidir posteriormente si usamos eliminación lógica o estado CANCELLED\.

__6\. Cantidades y dinero__

Nunca utilizaremos FLOAT para:

- Cantidades importantes\.
- Costos\.
- Precios\.
- Valores\.
- Saldos\.

Utilizaremos PostgreSQL:

NUMERIC / DECIMAL

La precisión exacta la cerraremos al detallar campos\.

__7\. Estados__

Cada operación tendrá su propio estado controlado\.

Ejemplo:

sales\.status

podrá contener:

DRAFT

PENDING\_AUTHORIZATION

CONFIRMED

CANCELLED

REJECTED

CONFLICT

En este punto todavía podemos representarlo lógicamente como un campo controlado\.

Después decidiremos si conviene:

- VARCHAR \+ CHECK,
- PostgreSQL ENUM,
- catálogo\.

Mi inclinación inicial para la mayoría de estados transaccionales es __VARCHAR/SMALLINT controlado desde aplicación \+ CHECK cuando sea estable__, evitando demasiados ENUM PostgreSQL difíciles de evolucionar\.

__8\. Moneda__

Tendremos moneda base corporativa, inicialmente PEN\.

Las operaciones monetarias podrán guardar:

currency\_code

exchange\_rate

amount\_original

amount\_base

cuando corresponda\.

No todas las tablas necesitarán esos cuatro campos\.

__9\. Sucursal__

Toda entidad operativa que dependa de una sucursal tendrá una FK explícita:

branch\_id

Nunca dependeremos únicamente de la sucursal del usuario\.

Ejemplo:

sale\.branch\_id

define dónde ocurrió la venta\.

__10\. Usuario creador y autorizador__

No utilizaremos un único:

user\_id

para representar cualquier acción\.

Cuando corresponda tendremos:

created\_by

confirmed\_by

approved\_by

cancelled\_by

resolved\_by

porque pueden ser personas diferentes\.

__11\. Mapa lógico global de tablas__

Con todo lo definido hasta ahora, la primera propuesta global queda así\.

__Organización y seguridad__

companies

branches

users

roles

permissions

role\_permissions

user\_roles

user\_branches

user\_permissions       \(solo si necesitamos excepciones\)

sessions

devices

device\_users

__Catálogo__

brands

categories

units

products

product\_aliases

product\_prices

product\_min\_prices

product\_min\_stocks

warehouse\_locations

__Kits__

kit\_versions

kit\_components

assembly\_orders

assembly\_order\_components

__Proveedores y clientes__

suppliers

customers

__Núcleo de inventario__

inventories

lots

inventory\_reservations

inventory\_reservation\_allocations

inventory\_movements

inventory\_movement\_lines

lot\_allocations

kardex\_entries

Aquí existe una decisión arquitectónica importante que adelanto:

Recomiendo que inventory\_movements sea la cabecera y inventory\_movement\_lines los productos afectados\.

Por ejemplo una venta de cinco productos puede originar:

1 inventory\_movement

5 inventory\_movement\_lines

Y cada línea puede utilizar varios lotes\.

__12\. Relación del núcleo de inventario__

La estructura será aproximadamente:

inventory\_movements

        │

        │ 1:N

        ▼

inventory\_movement\_lines

        │

        ├───────────────┐

        │               │

        │ 1:N           │ 1:1 normalmente

        ▼               ▼

lot\_allocations    kardex\_entries

        │

        ▼

       lots

Esto es mucho más limpio que hacer una infraestructura distinta para cada módulo\.

__13\. Compras y entradas__

Propongo separar la operación comercial de la entrada física cuando sea necesario\.

Tablas:

purchases

purchase\_lines

inventory\_entries

inventory\_entry\_lines

¿Por qué no usar únicamente purchases?

Porque ya definimos entradas que __no son compras__:

- Inventario inicial\.
- Devolución de cliente\.
- Ajuste positivo\.
- Recepción de transferencia\.
- Armado de kit\.
- Recuperación\.

Por tanto:

COMPRA

   │

   └── puede generar ENTRADA

pero

ENTRADA

   │

   └── no siempre proviene de COMPRA

Esta separación es muy importante\.

__14\. Ventas__

sales

sale\_lines

Una venta confirmada podrá producir:

sales

   │

   ├── sale\_lines

   │

   ├── inventory\_movements

   │

   ├── receivable

   │

   └── payment\(s\)

dependiendo del tipo de venta\.

__15\. Cuentas por cobrar__

accounts\_receivable

o, con un nombre más compacto:

receivables

Mi recomendación será probablemente:

receivables

Cada registro representa una deuda concreta\.

Podrá originarse:

sale\_id

o:

initial\_balance\_import\_id

según corresponda\.

Una deuda migrada no estará obligada a tener una venta ficticia\.

__16\. Pagos__

Necesitaremos:

payment\_methods

payments

payment\_method\_lines

payment\_allocations

Observe las dos tablas hijas distintas\.

__payment\_method\_lines__

Responde:

¿Cómo recibimos el dinero?

Ejemplo:

Efectivo S/400

Yape     S/600

__payment\_allocations__

Responde:

¿A qué deuda aplicamos el dinero?

Ejemplo:

Deuda A S/700

Deuda B S/300

Por tanto:

                  payments

                 /        \\

                /          \\

payment\_method\_lines    payment\_allocations

        │                       │

payment\_methods             receivables

Esta separación soporta correctamente pagos mixtos y múltiples deudas\.

__17\. Reembolsos__

refunds

refund\_method\_lines

Porque un reembolso puede necesitar registrar:

- Monto\.
- Método utilizado\.
- Pago original\.
- Venta/devolución relacionada\.
- Autorizador\.

No debe confundirse con payments\.status = CANCELLED\.

__18\. Otras salidas__

inventory\_exits

inventory\_exit\_lines

Servirán para:

- Uso interno\.
- Pérdida\.
- Baja por daño\.
- Devolución proveedor\.
- Entrega no comercial\.
- Otras salidas\.

Los ajustes tendrán su propio flujo porque nacen de conteos\.

__19\. Transferencias__

Necesitaremos al menos:

transfers

transfer\_lines

transfer\_reservations / inventory\_reservations

transfer\_shipments

transfer\_shipment\_lines

transfer\_receipts

transfer\_receipt\_lines

transfer\_differences

Aquí no debemos exagerar el número de tablas\.

Mi propuesta inicial es reutilizar:

inventory\_reservations

en vez de crear transfer\_reservations\.

Así:

transfer

   ↓

inventory\_reservation

y mantenemos una única infraestructura de reservas\.

__20\. ¿Por qué transfer\_shipments?__

Porque conceptualmente una transferencia y su envío físico no son exactamente lo mismo\.

Esto deja abierta la posibilidad de:

Transferencia 10 unidades

↓

Envío 1 → 6

Envío 2 → 4

Incluso si en V1 normalmente hacemos un solo envío\.

Es una estructura más robusta\.

__21\. Recepciones__

Una transferencia puede tener varias recepciones:

transfers

    │

    └── transfer\_receipts

             │

             └── transfer\_receipt\_lines

Esto soporta:

- Recepción parcial\.
- Varias fechas\.
- Diferentes responsables\.

__22\. Diferencias de transferencia__

transfer\_differences

Relacionado con:

- Transferencia\.
- Recepción\.
- Producto\.
- Cantidad\.
- Tipo de diferencia\.
- Resolución\.

No alteraremos el dato original para ocultar diferencias\.

__23\. Devoluciones de clientes__

customer\_returns

customer\_return\_lines

Cada línea deberá poder apuntar a:

sale\_line\_id

para controlar:

- Cantidad vendida\.
- Cantidad ya devuelta\.
- Costo original\.
- Producto\.
- Kit\.

__24\. Ajustes y conteos__

Necesitaremos:

inventory\_counts

inventory\_count\_lines

inventory\_count\_attempts

y:

inventory\_adjustments

inventory\_adjustment\_lines

¿Por qué inventory\_count\_attempts?

Para poder conservar:

Primer conteo = 8

Reconteo = 9

Cantidad aprobada = 9

sin sobrescribir resultados anteriores\.

__25\. Relación conteo → ajuste__

inventory\_counts

       │

       └── inventory\_adjustments

                 │

                 ▼

         inventory\_movements

                 │

                 ▼

              Kardex

El conteo nunca modifica stock directamente\.

__26\. Kits__

Como kit sigue siendo producto, __no crearemos una tabla kits independiente__\.

Tendremos:

products

   │

   └── type = KIT\_COMPONENTS

             │

             ▼

        kit\_versions

             │

             ▼

       kit\_components

kit\_components tendrá conceptualmente:

kit\_version\_id

component\_product\_id

quantity\_required

__27\. Armados__

assembly\_orders

assembly\_order\_components

Una orden de armado se relacionará con:

kit\_version

branch

Al confirmarse generará:

movimientos salida componentes

\+

movimiento entrada kit terminado

\+

nuevo lote

__28\. Devolución/desarmado de kit__

No crearé todavía una tabla separada de desarmado para V1\.

El modelo podrá soportarlo posteriormente mediante:

assembly\_orders

con un tipo adicional o mediante una futura:

disassembly\_orders

pero la funcionalidad permanecerá desactivada inicialmente\.

Esto sigue nuestra decisión de no complicar V1 innecesariamente\.

__29\. Cierres diarios__

Propongo:

daily\_closings

daily\_closing\_versions

daily\_closing\_cash\_counts

Además podríamos tener:

daily\_closing\_snapshots

pero debemos evaluar si realmente es necesario\.

Mi recomendación inicial:

daily\_closings

       │

       └── daily\_closing\_versions

Cada versión guarda el resumen necesario\.

__30\. Diferencias de caja__

Podrían formar parte directamente de la versión del cierre si solo existe una moneda/caja principal\.

Pero como pueden existir:

- Fondo\.
- Efectivo esperado\.
- Efectivo contado\.
- Diferencia\.

Recomiendo permitir:

daily\_closing\_cash\_counts

especialmente si en el futuro existen múltiples cajas\.

__31\. Alertas__

alerts

Con una relación flexible hacia:

- Producto\.
- Cliente\.
- Deuda\.
- Transferencia\.
- Dispositivo\.
- Conflicto\.

Aquí tendremos que decidir posteriormente entre FK específicas o referencia polimórfica\.

__32\. Configuración__

No recomiendo una única tabla gigantesca con columnas como:

max\_discount

max\_offline

currency

cash\_tolerance

\.\.\.

porque crecería de forma rígida\.

Propongo:

settings

setting\_values

Conceptualmente:

setting

    │

    ├── key

    ├── datatype

    ├── scope

    └── reglas

setting\_value

    │

    ├── setting\_id

    ├── branch\_id opcional

    ├── value

    ├── effective\_from

    └── version

Esto permite:

global

o:

por sucursal

sin agregar columnas constantemente\.

__33\. Motivos__

reason\_codes

Ejemplos:

SALE\_CANCELLATION

INVENTORY\_ADJUSTMENT

LOSS

REFUND

FIFO\_OVERRIDE

CLOSING\_REOPEN

Un motivo podrá pertenecer a una categoría/tipo de operación\.

__34\. Numeraciones__

document\_sequences

Ejemplo lógico:

branch\_id

document\_type

prefix

year

current\_number

Los correlativos los asigna exclusivamente PostgreSQL/Laravel de forma transaccional\.

__35\. Autorizaciones__

Aquí propongo una decisión importante\.

Podemos crear:

approvals

como infraestructura común\.

Sirve para:

- Precio bajo mínimo\.
- Ajustes\.
- Pérdidas\.
- Reembolsos\.
- Excepciones\.

Conceptualmente:

approvals

\- requester

\- approver

\- type

\- status

\- reason

\- target

Pero no debe sustituir campos específicos importantes\.

Por ejemplo una venta podrá guardar además su:

approved\_by

si es relevante\.

approvals conserva el flujo completo\.

__36\. Adjuntos__

Propongo una infraestructura común:

attachments

Cada archivo tendrá:

- Identidad\.
- Ruta/storage\.
- Nombre\.
- MIME\.
- Tamaño\.
- Hash opcional\.
- Usuario creador\.

Y una relación hacia su operación\.

Posteriormente decidiremos si usamos:

attachable\_type

attachable\_id

o tablas puente específicas\.

__37\. PWA y dispositivos__

Tablas:

devices

device\_users

sync\_batches

sync\_operations

sync\_operation\_dependencies

sync\_conflicts

Esto permite representar exactamente:

Cliente

   ↓

Venta

   ↓

Pago

en la cola offline\.

__38\. sync\_batches__

Representará una sincronización enviada por un dispositivo\.

Ejemplo:

Batch B001

Device: Caja Mazuko 01

10 operaciones

__39\. sync\_operations__

Cada operación mantiene:

- UUID\.
- Tipo\.
- Estado\.
- Payload original\.
- Resultado\.
- Reintentos\.
- Entidad oficial creada\.

Conceptualmente podrá relacionarse después con:

sale\_id

payment\_id

customer\_id

\.\.\.

o utilizar una referencia genérica\.

__40\. Dependencias__

sync\_operation\_dependencies

Relación muchos\-a\-muchos autorreferencial:

sync\_operation

       │

       └── depende de otra sync\_operation

Ejemplo:

P1 depende de V1

V1 depende de C1

__41\. Conflictos__

Tenemos dos opciones:

__A__

sync\_conflicts solamente\.

__B__

Una entidad general conflicts y sync\_conflicts como detalle\.

Como la Etapa 3 contempla también conflictos no exclusivamente offline, recomiendo:

conflicts

como entidad principal\.

Y posteriormente:

sync\_operations\.conflict\_id

puede apuntar a ella\.

Así evitamos dos sistemas de conflictos\.

__42\. Conflicto general__

conflicts

podrá representar:

- Stock\.
- Pago\.
- Día cerrado\.
- Cliente duplicado\.
- Kit\.
- Transferencia\.
- Dispositivo\.

Y tendrá relación opcional con sync\_operation\.

Esta me parece más correcta que duplicar sync\_conflicts\.

Por tanto refinamos:

sync\_batches

sync\_operations

sync\_operation\_dependencies

conflicts

y no necesitamos necesariamente una tabla independiente sync\_conflicts\.

__43\. Auditoría__

audit\_events

Será transversal\.

Conceptualmente:

actor\_user\_id

branch\_id

device\_id

event\_type

entity\_type

entity\_id

before\_data

after\_data

metadata

created\_at

Los campos JSONB pueden ser apropiados para before\_data, after\_data y metadata, pero lo decidiremos formalmente al detallar la tabla\.

__44\. Migración__

Para soportar nuestra estrategia:

import\_batches

import\_batch\_rows

o:

migration\_batches

migration\_records

Prefiero import\_batches, porque también puede reutilizarse para futuras importaciones administrativas\.

Cada fila podrá tener:

VALID

WARNING

ERROR

REVIEW

IMPORTED

__45\. Mapa lógico consolidado__

La primera versión del esquema completo queda así:

ORGANIZACIÓN / SEGURIDAD

companies

branches

users

roles

permissions

role\_permissions

user\_roles

user\_branches

user\_permissions

sessions

devices

device\_users

CATÁLOGO

brands

categories

units

products

product\_aliases

product\_prices

product\_min\_prices

product\_min\_stocks

warehouse\_locations

KITS

kit\_versions

kit\_components

assembly\_orders

assembly\_order\_components

PARTES COMERCIALES

suppliers

customers

INVENTARIO

inventories

lots

inventory\_reservations

inventory\_reservation\_allocations

inventory\_movements

inventory\_movement\_lines

lot\_allocations

kardex\_entries

inventory\_counts

inventory\_count\_lines

inventory\_count\_attempts

inventory\_adjustments

inventory\_adjustment\_lines

COMPRAS / ENTRADAS

purchases

purchase\_lines

inventory\_entries

inventory\_entry\_lines

VENTAS

sales

sale\_lines

customer\_returns

customer\_return\_lines

CUENTAS POR COBRAR / PAGOS

receivables

payment\_methods

payments

payment\_method\_lines

payment\_allocations

refunds

refund\_method\_lines

OTRAS SALIDAS

inventory\_exits

inventory\_exit\_lines

TRANSFERENCIAS

transfers

transfer\_lines

transfer\_shipments

transfer\_shipment\_lines

transfer\_receipts

transfer\_receipt\_lines

transfer\_differences

CIERRES

daily\_closings

daily\_closing\_versions

daily\_closing\_cash\_counts

CONTROL

approvals

alerts

conflicts

reason\_codes

document\_sequences

attachments

PWA / SYNC

sync\_batches

sync\_operations

sync\_operation\_dependencies

CONFIGURACIÓN / AUDITORÍA

settings

setting\_values

audit\_events

IMPORTACIÓN

import\_batches

import\_batch\_rows

Son muchas tablas, pero eso no significa complejidad innecesaria\. El negocio que diseñamos tiene:

- inventario multi\-sucursal,
- lotes,
- PEPS,
- valorización,
- crédito,
- pagos,
- kits,
- transferencias parciales,
- offline,
- auditoría\.

Intentar meter todo eso en 15 tablas produciría justamente una base difícil de mantener\.

__46\. Relaciones cardinales fundamentales__

Estas deberán mantenerse durante todo el diseño lógico\.

__Empresa → sucursales__

companies 1 ───── N branches

__Sucursal ↔ usuario__

users N ───── N branches

mediante:

user\_branches

__Roles ↔ permisos__

roles N ───── N permissions

mediante:

role\_permissions

__Producto → aliases__

products 1 ───── N product\_aliases

__Producto \+ sucursal → inventario__

products 1 ───── N inventories

branches 1 ───── N inventories

y:

UNIQUE\(product\_id, branch\_id\)

__47\. Producto → lotes__

products 1 ───── N lots

branches 1 ───── N lots

Cada lote pertenece a un producto y una sucursal\.

__48\. Movimiento → líneas__

inventory\_movements 1 ───── N inventory\_movement\_lines

Cada línea:

N ───── 1 product

N ───── 1 branch

__49\. Línea → lotes__

inventory\_movement\_lines 1 ───── N lot\_allocations

lots                     1 ───── N lot\_allocations

Esto produce una relación muchos\-a\-muchos controlada:

movement line ↔ lots

__50\. Línea → Kardex__

Normalmente:

inventory\_movement\_lines 1 ───── 1 kardex\_entries

para cada producto\+sucursal afectado\.

Podrían existir excepciones técnicas, pero conceptualmente debe ser una relación muy estrecha\.

__51\. Venta__

customers 1 ───── N sales

branches  1 ───── N sales

users     1 ───── N sales

sales     1 ───── N sale\_lines

products  1 ───── N sale\_lines

__52\. Venta → deuda__

Normalmente:

sales 1 ───── 0\.\.1 receivables

Una venta totalmente pagada puede no necesitar una deuda activa, aunque podríamos crearla con saldo cero\.

Mi recomendación inicial:

Crear receivable solamente cuando exista saldo pendiente\.

Esto reduce registros innecesarios\.

Lo verificaremos al diseñar esa tabla\.

__53\. Pagos ↔ deudas__

payments    N ───── N receivables

mediante:

payment\_allocations

__54\. Pago ↔ métodos__

payments        1 ───── N payment\_method\_lines

payment\_methods 1 ───── N payment\_method\_lines

__55\. Transferencia__

branches\(origin\)      1 ───── N transfers

branches\(destination\) 1 ───── N transfers

transfers 1 ───── N transfer\_lines

__56\. Transferencia → envío → recepción__

transfers

   │

   ├── 1:N transfer\_shipments

   │

   └── 1:N transfer\_receipts

Cada uno tiene sus líneas\.

__57\. Kit__

products 1 ───── N kit\_versions

kit\_versions 1 ───── N kit\_components

products\(component\) 1 ───── N kit\_components

__58\. Conteos__

inventory\_counts 1 ───── N inventory\_count\_lines

inventory\_count\_lines 1 ───── N inventory\_count\_attempts

Esto mantiene cada reconteo\.

__59\. Ajuste__

inventory\_counts 1 ───── 0\.\.N inventory\_adjustments

Normalmente será uno por proceso aprobado, pero permitimos flexibilidad para ajustes parciales correctamente trazados\.

__60\. Dispositivo → sync__

devices 1 ───── N sync\_batches

sync\_batches 1 ───── N sync\_operations

__61\. Dependencias de sincronización__

sync\_operations N ───── N sync\_operations

mediante:

sync\_operation\_dependencies

__62\. Primeras restricciones estructurales que ya podemos fijar__

Aunque el análisis profundo de restricciones será un punto posterior, hay algunas fundamentales que deben influir desde ahora:

__Inventario único__

UNIQUE\(product\_id, branch\_id\)

__UUID__

UNIQUE\(uuid\)

en entidades sincronizables\.

__Cantidades__

No permitir cantidades negativas donde semánticamente no correspondan\.

__Sucursal origen ≠ destino__

Para transferencias:

origin\_branch\_id <> destination\_branch\_id

__Aplicaciones de pago__

amount > 0

__Componentes de kit__

quantity\_required > 0

__Stock negativo__

No se garantizará únicamente mediante CHECK\.

Debe protegerse mediante:

- transacción,
- bloqueo de fila,
- validación,
- actualización atómica\.

Esto es importante: un CHECK\(quantity >= 0\) es una última defensa, no nuestra única estrategia de concurrencia\.

__63\. Decisión sobre tablas genéricas__

Tenemos que evitar los dos extremos\.

__Demasiado específicas__

sale\_stock\_movements

purchase\_stock\_movements

transfer\_stock\_movements

❌ No\.

__Demasiado genéricas__

Una sola:

operations

con 100 columnas nulas para todo\.

❌ Tampoco\.

La solución será:

__Tablas comerciales específicas \+ infraestructura común de inventario, pagos, auditoría y sincronización\.__

Ejemplo:

sales

purchases

transfers

son específicas\.

Pero todas generan:

inventory\_movements

Esta será una de las decisiones centrales del diseño\.

__64\. Regla de integridad más importante__

Nunca tendremos:

sales\.stock

purchases\.stock

transfers\.stock

como tres fuentes\.

La fuente agregada actual será:

inventories

y su trazabilidad:

lots

\+

inventory\_movements

\+

kardex\_entries

__65\. Regla financiera equivalente__

Tampoco tendremos:

customer\.current\_debt

como única verdad editable\.

La deuda se deriva de:

receivables

\-

payment\_allocations

Aunque posteriormente podamos mantener un total cacheado para rendimiento\.

__66\. Regla de transferencia__

No tendremos una sucursal artificial llamada:

EN\_TRANSITO

El tránsito pertenece al flujo de transferencia\.

__67\. Regla de kits__

No tendremos inventario físico simultáneamente para un KIT\_COMPONENTES potencial y sus componentes\.

Solo existe stock físico de kit cuando:

fue prearmado

y entonces existe un producto/lote terminado real\.

La cantidad armable será calculada\.

__68\. Estado del Modelo Lógico__

Con esto tenemos la __arquitectura lógica global de la base de datos__, pero aún no considero el Punto 2 terminado\.

Ahora debemos realizar la parte más importante:

__Tomar cada grupo de tablas y definirlas realmente\.__

Es decir, comenzar a especificar:

branches

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-

id                  BIGINT          PK

uuid                UUID            UNIQUE

code                VARCHAR\(\.\.\.\)    NOT NULL

name                VARCHAR\(\.\.\.\)    NOT NULL

\.\.\.

y luego sus:

- PK\.
- FK\.
- NOT NULL\.
- opcionales\.
- UNIQUE\.
- estados\.
- cardinalidades\.
- comportamiento histórico\.

Mi propuesta es hacerlo en este orden, porque minimiza cambios posteriores:

__Bloque 1 — Organización y seguridad__  
companies, branches, users, roles, permissions, asignaciones, sesiones y dispositivos\.

__Bloque 2 — Catálogo__  
brands, categories, units, products, aliases, precios, mínimos y ubicaciones\.

__Bloque 3 — Núcleo de inventario__  
inventories, lots, reservas, movimientos, líneas, asignaciones de lote y Kardex\.

Después entramos a compras, ventas, pagos, transferencias, kits, cierres y sincronización\.

Así que el siguiente paso concreto es __Modelo lógico — Bloque 1: Organización y Seguridad__, ya definiendo tabla por tabla con sus columnas y relaciones PostgreSQL\.

Perfecto\. Empezamos con el __Modelo lógico — Bloque 1: Organización y Seguridad__\.

Aquí ya vamos a definir las tablas con una estructura suficientemente concreta para que luego pueda convertirse casi directamente en migraciones Laravel\.

__Etapa 4\.2 — Bloque 1: Organización y Seguridad__

Tablas que vamos a definir en este bloque:

- companies
- branches
- users
- roles
- permissions
- role\_permissions
- user\_roles
- user\_branches
- user\_permissions — opcional/controlado
- sessions
- devices
- device\_users

La idea es cubrir:

- empresa,
- sucursales,
- usuarios,
- roles,
- permisos,
- alcance por sucursal,
- sesiones,
- dispositivos autorizados,
- operación offline\.

__1\. Tabla companies__

Aunque inicialmente tendremos una sola empresa, recomiendo conservar esta entidad porque organiza correctamente el modelo y evita asumir que todo es global sin contexto\.

__Propósito__

Representar la empresa propietaria del sistema\.

companies

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

legal\_name

VARCHAR

NOT NULL

trade\_name

VARCHAR

NULL

tax\_id

VARCHAR

NULL

base\_currency

CHAR\(3\)

NOT NULL

timezone

VARCHAR

NOT NULL

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

Valores iniciales conceptuales:

base\_currency = PEN

timezone = America/Lima

status = ACTIVE

__Observación__

Aunque la moneda base será configurable, no deberá cambiarse libremente una vez que existan movimientos valorizados\.

__2\. Tabla branches__

__Propósito__

Representar cada sucursal física\.

companies 1 ─── N branches

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

FK → companies\.id, NOT NULL

code

VARCHAR

NOT NULL

name

VARCHAR

NOT NULL

address

VARCHAR/TEXT

NULL

is\_main

BOOLEAN

NOT NULL DEFAULT FALSE

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__Restricciones__

UNIQUE\(company\_id, code\)

El nombre podría repetirse accidentalmente, pero el código no\.

Estados:

ACTIVE

INACTIVE

__Regla importante__

Una sucursal inactiva:

- conserva historial,
- no recibe nuevas operaciones normales,
- continúa disponible en reportes\.

__3\. Tabla users__

__Propósito__

Representar personas con acceso al sistema\.

Laravel tendrá su autenticación sobre esta tabla\.

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

FK, NOT NULL

name

VARCHAR

NOT NULL

email

VARCHAR

NULL

username

VARCHAR

NOT NULL

password

VARCHAR

NOT NULL

phone

VARCHAR

NULL

status

VARCHAR

NOT NULL

must\_change\_password

BOOLEAN

NOT NULL DEFAULT FALSE

last\_login\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__Restricciones__

UNIQUE\(company\_id, username\)

Si usamos email para autenticación:

UNIQUE\(company\_id, email\)

solo cuando no sea NULL\.

__Estados__

ACTIVE

BLOCKED

INACTIVE

__Regla__

No se eliminará un usuario que tenga historial transaccional\.

__4\. ¿Sucursal directamente en users?__

No recomiendo:

users\.branch\_id

como única relación\.

¿Por qué?

Porque ya definimos que algunos usuarios podrán trabajar en varias sucursales\.

Por eso usaremos:

user\_branches

Sin embargo, podríamos tener adicionalmente:

default\_branch\_id

en users\.

Esto sería solo para conveniencia de interfaz\.

__Propuesta__

Agregar:

__Campo__

__Tipo__

__Regla__

default\_branch\_id

BIGINT

FK → branches\.id, NULL

No representa la seguridad completa\.

__5\. Tabla roles__

__Propósito__

Definir perfiles base\.

Ejemplos iniciales:

ADMIN

BRANCH\_MANAGER

WAREHOUSE

SELLER

__Campos__

__Campo__

__Tipo__

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

code

VARCHAR

NOT NULL

name

VARCHAR

NOT NULL

description

TEXT

NULL

is\_system

BOOLEAN

DEFAULT FALSE

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__Restricción__

UNIQUE\(company\_id, code\)

__6\. Tabla permissions__

__Propósito__

Definir permisos atómicos\.

Ejemplos:

products\.view

products\.create

products\.update

inventory\.view

inventory\.costs\.view

inventory\.adjust\.confirm

sales\.create

sales\.cancel

sales\.price\_below\_min\.approve

payments\.create

payments\.cancel

payments\.refund

transfers\.request

transfers\.approve

transfers\.ship

transfers\.receive

closings\.confirm

closings\.reopen

conflicts\.resolve

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

code

VARCHAR

UNIQUE, NOT NULL

name

VARCHAR

NOT NULL

description

TEXT

NULL

module

VARCHAR

NOT NULL

status

VARCHAR

NOT NULL

Aquí no veo necesario un UUID porque son registros técnicos internos, aunque podría añadirse por consistencia\.

__7\. Tabla role\_permissions__

Relación:

roles N ─── N permissions

__Campos__

__Campo__

__Tipo__

__Regla__

role\_id

BIGINT

FK, NOT NULL

permission\_id

BIGINT

FK, NOT NULL

PK compuesta o UNIQUE:

UNIQUE\(role\_id, permission\_id\)

No necesita id obligatoriamente\.

__8\. Tabla user\_roles__

Relación:

users N ─── N roles

Aunque inicialmente cada usuario probablemente tenga un solo rol principal, recomiendo permitir múltiples\.

__Campos__

__Campo__

__Tipo__

__Regla__

user\_id

BIGINT

FK

role\_id

BIGINT

FK

assigned\_by

BIGINT

FK → users\.id, NULL

assigned\_at

TIMESTAMPTZ

NOT NULL

Restricción:

UNIQUE\(user\_id, role\_id\)

__9\. ¿Un usuario puede tener varios roles?__

Sí estructuralmente\.

Ejemplo futuro:

Warehouse

\+

Sales

Pero en la interfaz administrativa inicialmente podríamos simplificar a:

un rol principal \+ permisos adicionales\.

La base queda preparada\.

__10\. Tabla user\_branches__

Esta es crítica para la seguridad multi\-sucursal\.

Relación:

users N ─── N branches

__Campos__

__Campo__

__Tipo__

__Regla__

user\_id

BIGINT

FK

branch\_id

BIGINT

FK

is\_default

BOOLEAN

DEFAULT FALSE

status

VARCHAR

NOT NULL

assigned\_by

BIGINT

FK users\.id, NULL

assigned\_at

TIMESTAMPTZ

NOT NULL

Restricción:

UNIQUE\(user\_id, branch\_id\)

__Estados__

ACTIVE

INACTIVE

__11\. Una sola sucursal por defecto__

Debemos asegurar conceptualmente que un usuario tenga máximo una:

is\_default = true

Esto puede resolverse con un índice único parcial en PostgreSQL posteriormente\.

Ejemplo conceptual:

UNIQUE\(user\_id\)

WHERE is\_default = true

Esto lo formalizaremos cuando lleguemos a restricciones e índices\.

__12\. Tabla user\_permissions__

Esta tabla requiere cuidado\.

Sirve para excepciones individuales\.

Ejemplo:

Encargado normal:

sales\.price\_below\_min\.approve = NO

Encargado Luis:

sales\.price\_below\_min\.approve = SÍ

__Propuesta__

user\_permissions

__Campo__

__Tipo__

__Regla__

user\_id

BIGINT

FK

permission\_id

BIGINT

FK

effect

VARCHAR

NOT NULL

assigned\_by

BIGINT

FK users\.id

reason

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

effect:

ALLOW

DENY

Restricción:

UNIQUE\(user\_id, permission\_id\)

__13\. Orden de evaluación de permisos__

Recomiendo una regla clara:

DENY individual

↓

ALLOW individual

↓

roles

↓

DENY por defecto

Es decir:

si no existe permiso explícito ni por rol, no puede hacerlo\.

Principio de mínimo privilegio\.

__14\. Alcance de sucursal y permiso__

El permiso responde:

¿puede hacer la acción?

user\_branches responde:

¿en qué sucursal?

Ejemplo:

sales\.cancel = sí

no significa que pueda cancelar una venta de cualquier sucursal\.

Laravel deberá comprobar ambas cosas:

permiso

\+

alcance branch

__15\. ¿Necesitamos permisos específicos por sucursal?__

Inicialmente no\.

No recomiendo una tabla compleja como:

user\_branch\_permissions

desde V1\.

Primero usamos:

rol/permisos globales del usuario

\+

branches asignadas

Si en el futuro surge el caso:

puede ajustar en Mazuko pero no en Huepetuhe,

podemos incorporar un override por sucursal\.

No compliquemos la primera versión sin necesidad\.

__16\. Tabla sessions__

Laravel puede manejar sesiones/tokens mediante sus mecanismos estándar, pero necesitamos conceptualmente poder consultar sesiones activas\.

__Campos lógicos__

__Campo__

__Tipo__

__Regla__

id

UUID/BIGINT

PK

user\_id

BIGINT

FK

device\_id

BIGINT

FK, NULL

ip\_address

INET/VARCHAR

NULL

user\_agent

TEXT

NULL

last\_activity\_at

TIMESTAMPTZ

NOT NULL

expires\_at

TIMESTAMPTZ

NULL

revoked\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

Aquí debemos integrar correctamente con:

- Laravel Sanctum,
- sesiones web,
- PWA\.

La estructura exacta técnica se ajustará a la estrategia de autenticación, pero conceptualmente necesitamos esa información\.

__17\. Tabla devices__

Esta es fundamental para offline\.

__Campos__

__Campo__

__Tipo__

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

FK, NULL

name

VARCHAR

NOT NULL

device\_type

VARCHAR

NULL

status

VARCHAR

NOT NULL

authorized\_at

TIMESTAMPTZ

NULL

authorized\_by

BIGINT

FK users\.id, NULL

blocked\_at

TIMESTAMPTZ

NULL

revoked\_at

TIMESTAMPTZ

NULL

last\_seen\_at

TIMESTAMPTZ

NULL

last\_synced\_at

TIMESTAMPTZ

NULL

app\_version

VARCHAR

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__18\. Estados de dispositivo__

PENDING

AUTHORIZED

BLOCKED

REVOKED

__Semántica__

PENDING  
Conocido pero todavía no habilitado\.

AUTHORIZED  
Puede operar\.

BLOCKED  
Bloqueo temporal\.

REVOKED  
Ya no debe utilizarse\.

__19\. branch\_id en device__

Para un terminal de almacén:

branch\_id = Mazuko

Para un dispositivo administrativo global:

branch\_id = NULL

o podría pertenecer a Juliaca pero el usuario tener alcance global\.

Mi recomendación:

branch\_id representa la sucursal operativa principal del dispositivo, no el alcance total de seguridad\.

El alcance sigue en user\_branches\.

__20\. Tabla device\_users__

Relación:

devices N ─── N users

Esto permite una PC compartida físicamente por varios trabajadores sin compartir cuenta\.

__Campos__

__Campo__

__Tipo__

__Regla__

device\_id

BIGINT

FK

user\_id

BIGINT

FK

status

VARCHAR

NOT NULL

authorized\_at

TIMESTAMPTZ

NOT NULL

authorized\_by

BIGINT

FK users\.id

Restricción:

UNIQUE\(device\_id, user\_id\)

__21\. Usuario vs dispositivo__

Esto nos permite exactamente el modelo que queríamos:

Caja Mazuko 01

   │

   ├── Juan

   ├── Pedro

   └── Luis

Cada uno con su propia sesión\.

No necesitan compartir contraseña\.

__22\. Dispositivo revocado y operaciones pendientes__

No borramos relaciones históricas\.

Si un dispositivo pasa a:

REVOKED

se mantiene:

- UUID\.
- historial,
- sincronizaciones,
- operaciones originadas\.

Esto es necesario para auditoría\.

__23\. Primera relación con sincronización__

Aunque las tablas sync las diseñaremos después, desde ya dejamos:

devices 1 ─── N sync\_batches

y:

devices 1 ─── N audit\_events

cuando corresponda\.

__24\. created\_by y usuarios inactivos__

Las FK históricas hacia users no deben utilizar:

ON DELETE CASCADE

porque eliminar un usuario no debe borrar ventas, auditoría o configuraciones\.

De hecho, como regla general:

usuarios con historial no se eliminan\.

__25\. Estrategia de FK__

Para este dominio:

__Empresa__

branches\.company\_id → companies\.id

users\.company\_id → companies\.id

roles\.company\_id → companies\.id

devices\.company\_id → companies\.id

__Usuario__

user\_roles\.user\_id → users\.id

user\_branches\.user\_id → users\.id

sessions\.user\_id → users\.id

device\_users\.user\_id → users\.id

__Sucursal__

user\_branches\.branch\_id → branches\.id

devices\.branch\_id → branches\.id

__26\. Reglas de eliminación recomendadas__

En términos lógicos:

__companies__

No eliminar en producción\.

__branches__

No eliminar con historial\.

__users__

No eliminar con historial\.

__roles__

Puede desactivarse\.

__permissions__

Normalmente son del sistema; no eliminar\.

__devices__

No eliminar si existen operaciones/sync\.

Esto significa que usaremos principalmente:

status

en vez de cascadas destructivas\.

__27\. ¿Soft deletes?__

Mi recomendación inicial:

__No usar SoftDeletes indiscriminadamente\.__

Porque:

deleted\_at

no expresa bien la diferencia entre:

- bloqueado,
- inactivo,
- revocado\.

Para entidades maestras importantes, un status explícito es mejor\.

Podría haber deleted\_at solo en registros secundarios sin historial, pero lo evaluaremos tabla por tabla\.

__28\. Auditoría de cambios de permisos__

Toda modificación de:

- roles,
- permisos,
- sucursales de usuario,
- dispositivo,

deberá generar un evento en:

audit\_events

La auditoría la diseñaremos después, pero estas tablas serán fuentes de eventos\.

__29\. Separación entre autenticación y autorización__

Es importante dejarlo formalizado\.

__Autenticación__

Responde:

¿Quién eres?

Tablas/servicios:

users

sessions

devices

__Autorización__

Responde:

¿Qué puedes hacer?

Tablas:

roles

permissions

role\_permissions

user\_roles

user\_permissions

user\_branches

__30\. Regla para admin general__

No recomiendo programar simplemente:

if \($user\->id === 1\)

El administrador deberá tener:

role = ADMIN

y los permisos correspondientes\.

Puede existir un permiso global:

system\.full\_access

o resolverlo mediante rol protegido del sistema\.

Pero nunca por ID fijo\.

__31\. Roles del sistema__

roles\.is\_system = true permitirá proteger roles como:

ADMIN

BRANCH\_MANAGER

WAREHOUSE

SELLER

Podrán editarse sus asignaciones/permisos según política, pero no eliminarlos accidentalmente\.

__32\. Permisos del sistema__

También podemos tener:

permissions\.is\_system

si queremos evitar eliminar permisos requeridos por código\.

Entonces permissions podría ampliarse con:

__Campo__

__Tipo__

is\_system

BOOLEAN

Recomiendo incorporarlo\.

__33\. Posible tabla login\_attempts__

No la considero necesaria como tabla de negocio\.

Los intentos fallidos pueden manejarse con:

- Laravel Rate Limiting\.
- logs/auditoría de seguridad\.

Solo crearíamos una tabla dedicada si necesitamos investigación avanzada\.

No es V1\.

__34\. Posible tabla password\_reset\_tokens__

Laravel ya utiliza infraestructura propia\.

No necesitamos incorporarla al modelo de negocio principal\.

__35\. Posible tabla personal\_access\_tokens__

Laravel Sanctum probablemente utilizará:

personal\_access\_tokens

Esta será una tabla técnica de framework\.

Debe distinguirse de nuestras tablas del dominio\.

__36\. Tablas técnicas Laravel__

Durante implementación probablemente existirán además:

migrations

cache

jobs

job\_batches

failed\_jobs

personal\_access\_tokens

según configuración\.

No las considero parte de nuestro modelo empresarial\.

__37\. Resumen de relaciones__

companies

   │

   ├── branches

   ├── users

   ├── roles

   └── devices

users

   │

   ├── user\_roles ───── roles

   │                       │

   │                 role\_permissions

   │                       │

   │                  permissions

   │

   ├── user\_permissions ─ permissions

   │

   ├── user\_branches ─── branches

   │

   ├── sessions

   │

   └── device\_users ───── devices

Este será el fundamento de seguridad para el resto del sistema\.

__38\. Decisiones cerradas de este bloque__

Podemos considerar aprobadas conceptualmente estas decisiones:

1. companies existirá aunque inicialmente haya una empresa\.
2. Las sucursales pertenecen a empresa\.
3. Usuarios serán globales dentro de empresa\.
4. Usuario podrá tener varias sucursales\.
5. No utilizaremos users\.branch\_id como único alcance\.
6. Roles y permisos estarán separados\.
7. Roles ↔ permisos será N:M\.
8. Usuarios ↔ roles podrá ser N:M\.
9. Usuarios podrán tener permisos individuales excepcionales\.
10. Usuario ↔ sucursal será N:M\.
11. Permisos y alcance de sucursal se validan separadamente\.
12. Dispositivos tendrán identidad UUID propia\.
13. Dispositivo podrá estar asociado a una sucursal operativa\.
14. Múltiples usuarios pueden utilizar el mismo dispositivo\.
15. Cada trabajador mantiene su propia cuenta\.
16. Usuarios, sucursales y dispositivos históricos no se borran\.
17. Revocación/bloqueo se representa mediante estado\.
18. Sesiones estarán relacionadas opcionalmente a dispositivos\.
19. Toda autorización real se validará en Laravel\.
20. React no será la capa de seguridad\.

__39\. Tablas definitivas del Bloque 1__

Por ahora quedan:

companies

branches

users

roles

permissions

role\_permissions

user\_roles

user\_permissions

user\_branches

sessions

devices

device\_users

Más adelante se agregarán las relaciones desde estas tablas hacia:

- ventas,
- cierres,
- auditoría,
- sincronización,
- aprobaciones,
- movimientos\.

__40\. Criterio de aceptación del Bloque 1__

Este bloque está correctamente diseñado si podemos responder:

__¿Qué sucursales puede usar Juan?__

user\_branches

__¿Qué roles tiene?__

user\_roles

__¿Puede ver costos?__

roles/permissions \+ user\_permissions

__¿Puede hacerlo en Mazuko?__

permiso \+ user\_branches

__¿Desde qué dispositivo trabajó?__

sessions/device

__¿El dispositivo está autorizado?__

devices\.status

__¿Puede revocarse sin perder historial?__

Sí\.

__¿Puede un equipo ser usado por varias personas sin compartir usuario?__

Sí, mediante device\_users\.

__Resultado__

Queda definida la primera parte real del modelo lógico:

__Bloque 1 — Organización y Seguridad: diseñado ✅__

El siguiente bloque debe ser __Catálogo maestro__, donde definiremos ya de forma lógica y tabla por tabla:

brands, categories, units, products, product\_aliases, precios generales/locales, precios mínimos, stock mínimo y ubicaciones de almacén\.

Ese bloque será especialmente importante porque tendremos que resolver correctamente __referencia original vs normalizada, alias, producto global, tipos SIMPLE/KIT, unidades decimales y versionado de precios__, antes de entrar al núcleo de inventario\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 2: Catálogo maestro__\.

Este bloque debe cubrir todo lo relacionado con la identidad comercial y clasificación de los productos, sin mezclar todavía el stock físico\.

Las tablas que vamos a definir son:

- brands
- categories
- units
- products
- product\_aliases
- product\_prices
- product\_min\_prices
- product\_min\_stocks
- warehouse\_locations

Con este bloque quedaríamos en __21 tablas formalmente definidas__ acumuladas\.

__Etapa 4\.2 — Bloque 2: Catálogo maestro__

__1\. Tabla brands__

__Propósito__

Representar las marcas de los repuestos\.

Ejemplos:

CATERPILLAR

KOMATSU

SKF

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

code

VARCHAR

NULL

name

VARCHAR

NOT NULL

normalized\_name

VARCHAR

NOT NULL

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__Restricción__

Conviene impedir duplicados exactos normalizados dentro de una empresa:

UNIQUE\(company\_id, normalized\_name\)

Por ejemplo:

Caterpillar

CATERPILLAR

CATERPILLAR 

deberían representar una sola marca\.

__2\. Tabla categories__

__Propósito__

Clasificar productos\.

Ejemplos futuros:

- Rodamientos\.
- Retenes\.
- Filtros\.
- Sellos\.
- Motor\.
- Hidráulica\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

company\_id

BIGINT

FK, NOT NULL

parent\_id

BIGINT

FK → categories\.id, NULL

code

VARCHAR

NULL

name

VARCHAR

NOT NULL

normalized\_name

VARCHAR

NOT NULL

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__¿Por qué parent\_id?__

Para poder soportar una jerarquía futura:

MOTOR

 ├── Pistones

 ├── Anillos

 └── Empaquetaduras

No es obligatorio utilizar niveles desde V1, pero la estructura queda preparada\.

__Restricción__

UNIQUE\(company\_id, parent\_id, normalized\_name\)

o una variante equivalente considerando NULL\.

__3\. Tabla units__

__Propósito__

Definir las unidades de medida\.

Ejemplos:

UNIDAD

JUEGO

KIT

METRO

CAJA

__Campos__

__Campo__

__Tipo__

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

code

VARCHAR

NOT NULL

name

VARCHAR

NOT NULL

symbol

VARCHAR

NULL

allows\_decimals

BOOLEAN

NOT NULL DEFAULT FALSE

quantity\_scale

SMALLINT

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

__Ejemplo__

UN

Unidad

allows\_decimals = false

quantity\_scale = 0

Mientras:

M

Metro

allows\_decimals = true

quantity\_scale = 3

__4\. Tabla products__

Esta es una de las tablas maestras más importantes de todo el sistema\.

__Propósito__

Representar un producto global de la empresa\.

__Campos principales__

__Campo__

__Tipo__

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

internal\_code

VARCHAR

UNIQUE por empresa

primary\_reference

VARCHAR

NOT NULL

normalized\_reference

VARCHAR

NOT NULL

name

VARCHAR

NOT NULL

normalized\_name

VARCHAR

NOT NULL

description

TEXT

NULL

brand\_id

BIGINT

FK → brands\.id, NULL/NOT NULL según política

category\_id

BIGINT

FK → categories\.id, NULL

unit\_id

BIGINT

FK → units\.id, NOT NULL

product\_type

VARCHAR

NOT NULL

status

VARCHAR

NOT NULL

requires\_lot\_tracking

BOOLEAN

NOT NULL DEFAULT TRUE

fifo\_enabled

BOOLEAN

NOT NULL DEFAULT TRUE

created\_by

BIGINT

FK → users\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__5\. product\_type__

Estados/tipos definidos funcionalmente:

SIMPLE

KIT\_SINGLE

KIT\_COMPONENTS

Equivalentes a:

- SIMPLE
- KIT\_UNICO
- KIT\_COMPONENTES

La UI seguirá mostrando español\.

__6\. primary\_reference__

Debe guardarse exactamente como se definió comercialmente\.

Ejemplo:

00125

RK\-7027

ABC/50

Nunca numérico\.

__7\. normalized\_reference__

Se utiliza para:

- búsquedas,
- sugerencias,
- detección de posibles duplicados\.

Ejemplo:

primary\_reference:

RK\.7027

normalized\_reference:

RK7027

Pero no será la identidad del producto\.

__8\. ¿Debe normalized\_reference ser UNIQUE?__

No necesariamente\.

Este es un punto importante\.

Dos productos podrían terminar teniendo referencias diferentes que normalicen igual\.

Por tanto, no recomiendo:

UNIQUE\(company\_id, normalized\_reference\)

como regla dura\.

Sí podemos tener un índice para búsqueda y detectar colisiones\.

__9\. ¿Debe primary\_reference ser UNIQUE?__

Aquí tampoco recomiendo imponer desde ya un UNIQUE absoluto sin excepciones\.

Idealmente una referencia principal no debería repetirse dentro de la empresa, pero en datos reales puede haber:

- proveedores diferentes,
- marcas diferentes,
- referencias históricas ambiguas\.

Mi recomendación:

Intentar unicidad funcional en aplicación, pero permitir proceso controlado de revisión/migración antes de establecer una restricción fuerte\.

Más adelante podemos decidir una restricción como:

UNIQUE\(company\_id, primary\_reference\)

si confirmamos que el negocio realmente lo garantiza\.

__10\. internal\_code__

Sí debe ser único dentro de empresa:

UNIQUE\(company\_id, internal\_code\)

porque lo genera el propio sistema\.

Puede ser algo como:

PROD\-000125

__11\. Marca opcional__

En el Excel actual existen productos sin marca\.

Por eso brand\_id debería permitir inicialmente NULL\.

Posteriormente podríamos crear una marca explícita:

SIN MARCA

pero no conviene obligar a inventarla desde base\.

__12\. Categoría opcional__

category\_id puede ser NULL durante la migración inicial\.

No queremos bloquear todo el catálogo porque aún falte clasificación\.

__13\. Unidad obligatoria__

unit\_id sí debería ser NOT NULL\.

Todo producto debe saber si se maneja en:

- unidades,
- juegos,
- metros,
- etc\.

Esto será importante para validar cantidades decimales\.

__14\. Tabla product\_aliases__

__Propósito__

Guardar referencias alternativas\.

Ejemplos:

- referencia de proveedor,
- referencia antigua,
- variante de escritura,
- código comercial alternativo\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

product\_id

BIGINT

FK → products\.id, NOT NULL

alias

VARCHAR

NOT NULL

normalized\_alias

VARCHAR

NOT NULL

alias\_type

VARCHAR

NULL

source

VARCHAR

NULL

status

VARCHAR

NOT NULL

created\_by

BIGINT

FK users\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__alias\_type__

Posibles:

SUPPLIER\_REFERENCE

OLD\_REFERENCE

ALTERNATE\_REFERENCE

SEARCH\_ALIAS

OTHER

__15\. Restricción de alias__

Dentro de un mismo producto no debería repetirse exactamente:

UNIQUE\(product\_id, alias\)

Pero no necesariamente impediremos que el mismo alias aparezca temporalmente en dos productos, porque eso puede ser precisamente un conflicto de catálogo a resolver\.

Podemos generar alerta/revisión\.

__16\. Precios: no guardar dentro de products__

No recomiendo columnas como:

products\.sale\_price

products\.minimum\_price

porque ya definimos:

- historia de precios,
- precio por sucursal,
- vigencia,
- offline versionado\.

Por eso deben ser entidades separadas\.

__17\. Tabla product\_prices__

__Propósito__

Guardar precio de venta sugerido/general o específico por sucursal\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

product\_id

BIGINT

FK, NOT NULL

branch\_id

BIGINT

FK branches\.id, NULL

price\_type

VARCHAR

NOT NULL

currency\_code

CHAR\(3\)

NOT NULL

amount

NUMERIC

NOT NULL

effective\_from

TIMESTAMPTZ

NOT NULL

effective\_to

TIMESTAMPTZ

NULL

version

BIGINT

NOT NULL

status

VARCHAR

NOT NULL

created\_by

BIGINT

FK users\.id

created\_at

TIMESTAMPTZ

NOT NULL

__18\. branch\_id NULL__

Significa:

precio general de empresa

Mientras:

branch\_id = Mazuko

significa:

override específico de Mazuko

La lógica sería:

precio local vigente

↓

si no existe

precio general vigente

__19\. Tipos de precio__

Podemos preparar:

SUGGESTED

RETAIL

WHOLESALE

No todos deben usarse desde el primer día\.

No incluiría MINIMUM aquí porque lo mantendremos separado por razones de seguridad y auditoría\.

__20\. Historia de precios__

No actualizaremos:

amount = nuevo\_valor

destruyendo el anterior\.

En su lugar:

precio viejo → effective\_to

precio nuevo → nueva fila

Así una venta histórica puede conservar la regla vigente en ese momento\.

__21\. Tabla product\_min\_prices__

__Propósito__

Guardar precio mínimo general o por sucursal\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

product\_id

BIGINT

FK

branch\_id

BIGINT

FK, NULL

currency\_code

CHAR\(3\)

NOT NULL

amount

NUMERIC

NOT NULL

effective\_from

TIMESTAMPTZ

NOT NULL

effective\_to

TIMESTAMPTZ

NULL

version

BIGINT

NOT NULL

status

VARCHAR

NOT NULL

created\_by

BIGINT

FK users\.id

reason

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__22\. ¿Por qué separar mínimo del precio sugerido?__

Porque:

- tiene permisos diferentes,
- afecta autorizaciones,
- afecta operación offline,
- es más sensible comercialmente\.

Un usuario puede poder cambiar precio sugerido y no el mínimo\.

__23\. Restricción de precio__

Tanto en precios como mínimos:

amount >= 0

Pero para un precio de venta normal probablemente exigiremos:

amount > 0

salvo situaciones explícitas como muestras gratuitas, que se manejarían por otra lógica comercial y no como precio general cero\.

__24\. Tabla product\_min\_stocks__

__Propósito__

Guardar stock mínimo por producto y sucursal\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

product\_id

BIGINT

FK

branch\_id

BIGINT

FK, NULL o NOT NULL según estrategia

min\_quantity

NUMERIC

NOT NULL

effective\_from

TIMESTAMPTZ

NOT NULL

effective\_to

TIMESTAMPTZ

NULL

status

VARCHAR

NOT NULL

created\_by

BIGINT

FK

created\_at

TIMESTAMPTZ

NOT NULL

__25\. Stock mínimo general \+ local__

Podemos permitir:

branch\_id = NULL

como mínimo general\.

Y uno específico por sucursal como override\.

Ejemplo:

General = 2

Mazuko = 5

Juliaca = 10

__26\. Historial del stock mínimo__

También recomiendo conservar vigencia, porque permite saber:

- cuándo cambió,
- quién lo cambió,
- qué alerta correspondía\.

No es tan crítico como el precio mínimo, pero la estructura ya queda preparada\.

__27\. Tabla warehouse\_locations__

__Propósito__

Representar ubicaciones físicas dentro de una sucursal\.

Ejemplo:

Mazuko

└── Almacén principal

    └── Estante A

        └── Nivel 2

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

branch\_id

BIGINT

FK, NOT NULL

parent\_id

BIGINT

FK → warehouse\_locations\.id, NULL

code

VARCHAR

NOT NULL

name

VARCHAR

NOT NULL

location\_type

VARCHAR

NULL

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__Restricción__

UNIQUE\(branch\_id, code\)

__28\. Ubicación no pertenece directamente al producto__

No recomiendo:

products\.location\_id

porque el mismo producto puede estar en:

- distintas sucursales,
- distintos lotes,
- distintas ubicaciones\.

La ubicación física estará principalmente asociada al lote o a una relación de stock/localización que definiremos en el bloque de inventario\.

__29\. ¿Un lote puede ocupar varias ubicaciones?__

Aquí aparece una decisión que afectará inventario\.

En la Etapa 3 asumimos principalmente:

ubicación a nivel de lote\.

Pero un mismo lote físicamente podría estar repartido entre dos estantes\.

Para V1 tenemos dos opciones:

__Opción simple__

lots\.location\_id

Un lote → una ubicación\.

__Opción robusta__

Crear posteriormente:

lot\_locations

con cantidad por ubicación\.

Dado que el sistema busca trazabilidad física seria y puede crecer, mi recomendación es __no poner location\_id directamente como única verdad en lots__\.

En el bloque de inventario propondré una tabla:

lot\_location\_stocks

o similar\.

Eso permitirá:

Lote A

├── Estante 1 → 5

└── Estante 2 → 3

sin crear lotes ficticios\.

Por ahora warehouse\_locations queda preparada\.

__30\. Productos inactivos__

products\.status:

ACTIVE

INACTIVE

BLOCKED

REVIEW

Podríamos diferenciar:

__INACTIVE__

No se usa comercialmente, pero no hay emergencia\.

__BLOCKED__

No debe operarse por una razón crítica\.

__REVIEW__

Pendiente de revisión administrativa\.

Esto puede ayudar especialmente a la sincronización offline\.

__31\. Producto inactivo con stock__

Puede ocurrir\.

Desactivar producto no debe eliminar inventario\.

Simplemente impedirá nuevas operaciones según política\.

El stock tendrá que:

- transferirse,
- agotarse,
- devolverse,
- regularizarse,

según el caso\.

__32\. Producto con movimientos históricos__

No se elimina físicamente\.

Siempre:

status

en vez de borrar\.

__33\. Productos duplicados__

No agregaremos todavía:

merged\_into\_product\_id

directamente en products sin analizar el flujo completo\.

Pero probablemente será útil\.

Una opción lógica futura:

__Campo__

__Tipo__

merged\_into\_product\_id

BIGINT NULL

Entonces:

Producto B

status = MERGED

merged\_into\_product\_id = A

y sus referencias pasan como aliases de A\.

Mi recomendación es incorporarlo desde ahora, porque ya definimos funcionalmente el proceso de fusión\.

__34\. Ajuste propuesto a products__

Agregar:

__Campo__

__Tipo__

__Regla__

merged\_into\_product\_id

BIGINT

FK → products\.id, NULL

Regla:

merged\_into\_product\_id <> id

Solo se usa cuando:

status = MERGED

Esto preserva trazabilidad de duplicados\.

__35\. Estados actualizados de producto__

Propongo:

ACTIVE

INACTIVE

BLOCKED

REVIEW

MERGED

MERGED no podrá recibir nuevas operaciones\.

__36\. Producto canónico y alias__

Ejemplo:

Producto 10

primary\_reference = RK\-7027

status = ACTIVE

Producto duplicado:

Producto 55

primary\_reference = RK\.7027

status = MERGED

merged\_into\_product\_id = 10

Además:

RK\.7027

puede quedar como alias del producto 10\.

Así no perdemos la historia del registro 55\.

__37\. Búsqueda__

El catálogo debe soportar búsquedas por:

- internal\_code
- primary\_reference
- normalized\_reference
- name
- normalized\_name
- marca
- alias
- normalized\_alias

Los índices concretos los definiremos en el bloque de rendimiento\.

PostgreSQL puede usar posteriormente:

- B\-tree,
- pg\_trgm,
- índices GIN/GiST según necesidad\.

__38\. normalized\_name__

También recomiendo almacenarlo\.

Ejemplo:

name:

RETEN CIGÜEÑAL DELANTERO

normalized\_name:

RETEN CIGUENAL DELANTERO

Pero no sustituye el nombre original mostrado al usuario\.

__39\. ¿Necesitamos tabla de imágenes del producto?__

No específicamente\.

Usaremos la infraestructura común:

attachments

que diseñaremos después\.

Así un producto puede tener:

attachments

de tipo imagen sin otra tabla paralela\.

__40\. ¿Proveedor y referencia de proveedor?__

product\_aliases\.source puede ser suficiente inicialmente para alias generales\.

Pero si posteriormente necesitamos saber:

Proveedor X → referencia ABC123 → Producto RK\-7027

de forma estructurada, podría existir:

supplier\_product\_references

No la introduciría aún porque en Etapa 3 no se definió como necesidad obligatoria\.

Podemos evolucionar después\.

__41\. Precios y versión offline__

Una venta offline deberá conservar evidencia de:

product\_price\_id/version

product\_min\_price\_id/version

o los valores efectivos usados\.

Por eso product\_prices y product\_min\_prices tienen:

version

effective\_from

effective\_to

Este diseño soporta la política offline definida anteriormente\.

__42\. Restricción de versiones__

Dentro de una combinación lógica:

product \+ branch \+ price\_type

la versión debe incrementarse\.

Conceptualmente:

UNIQUE\(product\_id, branch\_id, price\_type, version\)

con tratamiento especial de branch\_id IS NULL\.

Lo refinaremos luego\.

__43\. Una sola configuración vigente__

Para cada:

producto \+ sucursal \+ tipo precio

debe existir como máximo una fila vigente\.

Es decir:

effective\_to IS NULL

solo una\.

Esto puede garantizarse con un índice único parcial posteriormente\.

Lo mismo para:

- precio mínimo,
- stock mínimo\.

__44\. Moneda de precio__

Inicialmente:

PEN

Pero mantendremos currency\_code para no hardcodearlo\.

La venta podrá almacenar la moneda usada\.

__45\. Moneda del stock mínimo__

No aplica porque es cantidad, no valor\.

__46\. Cardinalidades del bloque__

__Marca__

brands 1 ───── N products

__Categoría__

categories 1 ───── N products

__Unidad__

units 1 ───── N products

__Producto → aliases__

products 1 ───── N product\_aliases

__Producto → precios__

products 1 ───── N product\_prices

__Producto → mínimos__

products 1 ───── N product\_min\_prices

products 1 ───── N product\_min\_stocks

__Sucursal → precios/minimos__

branches 1 ───── N product\_prices

branches 1 ───── N product\_min\_prices

branches 1 ───── N product\_min\_stocks

pero branch\_id puede ser NULL para reglas globales\.

__47\. Sucursal → ubicaciones__

branches 1 ───── N warehouse\_locations

Y:

warehouse\_locations 1 ───── N warehouse\_locations

mediante parent\_id\.

__48\. Relaciones que llegarán posteriormente__

Desde products se conectarán:

products

 ├── inventories

 ├── lots

 ├── sale\_lines

 ├── inventory\_entry\_lines

 ├── transfer\_lines

 ├── kit\_versions

 ├── kit\_components

 └── kardex\_entries

Esto confirma que products será uno de los centros del ERD\.

__49\. Restricciones lógicas principales__

Para este bloque:

__Marca__

- Nombre obligatorio\.
- No duplicar normalizado dentro de empresa\.

__Categoría__

- Nombre obligatorio\.
- No autorreferencia\.
- Mantener empresa consistente con parent\_id\.

__Unidad__

- Código obligatorio\.
- quantity\_scale >= 0\.
- Si no admite decimales, quantity\_scale = 0\.

__Producto__

- Referencia principal obligatoria\.
- Nombre obligatorio\.
- Unidad obligatoria\.
- Tipo válido\.
- No apuntarse a sí mismo como producto fusionado\.

__Alias__

- No vacío\.
- No repetido dentro del mismo producto\.

__Precio__

amount > 0

__Precio mínimo__

amount >= 0

__Stock mínimo__

min\_quantity >= 0

__50\. Integridad empresa\-sucursal\-producto__

Como tenemos company\_id en productos y sucursales, debemos evitar:

producto empresa A

\+

branch empresa B

en precios/minimos\.

Esto se validará en Laravel y puede reforzarse en DB con estrategias de FK compuestas si decidimos que merece el costo adicional\.

No necesariamente necesitamos duplicar company\_id en todas las tablas hijas\.

__51\. ¿company\_id en todas las tablas?__

No\.

Ejemplo:

product\_aliases

no necesita company\_id si ya llega mediante:

product\_id → products\.company\_id

Duplicarlo sería redundante\.

Lo agregaremos solo cuando ayude realmente a:

- seguridad,
- consultas,
- particionado,
- restricciones\.

En V1 una normalización razonable es preferible\.

__52\. Índices todavía no se cierran__

Sabemos que necesitaremos índices sobre:

products\.primary\_reference

products\.normalized\_reference

products\.normalized\_name

product\_aliases\.normalized\_alias

brand\_id

category\_id

status

pero el diseño formal de índices corresponde al punto posterior\.

__53\. Auditoría__

Los cambios en:

- producto,
- referencia,
- alias,
- precio,
- precio mínimo,
- stock mínimo,
- fusión,

generarán:

audit\_events

No necesitamos columnas de auditoría completa repetidas en cada tabla\.

Sí guardamos created\_by donde sea útil\.

__54\. ¿updated\_by en todas las tablas?__

No recomiendo llenarlo indiscriminadamente\.

La auditoría general ya registrará cambios\.

En registros especialmente sensibles como precios podría ser útil, pero normalmente:

created\_by

\+

audit\_events

será suficiente\.

__55\. Tablas formalmente definidas en el Bloque 2__

Quedan estas 9:

brands

categories

units

products

product\_aliases

product\_prices

product\_min\_prices

product\_min\_stocks

warehouse\_locations

__56\. Conteo acumulado__

Hasta ahora:

__Bloque 1 — Organización y Seguridad__

12 tablas\.

__Bloque 2 — Catálogo maestro__

9 tablas\.

__Total formalmente trabajado__

__21 tablas__

Todavía faltan los bloques más transaccionales, particularmente inventario\.

__57\. Decisiones cerradas del Bloque 2__

1. Producto es global\.
2. Referencias son texto\.
3. Referencia original y normalizada se conservan\.
4. Normalización no fusiona automáticamente\.
5. Alias son entidad separada\.
6. Marca y categoría son catálogos\.
7. Categorías podrán ser jerárquicas\.
8. Unidad indica si permite decimales\.
9. Producto tiene tipo SIMPLE/KIT\_UNICO/KIT\_COMPONENTES\.
10. No guardar precio directamente en producto\.
11. Precios tendrán vigencia e historia\.
12. Precio mínimo tendrá estructura separada\.
13. Precios pueden ser globales o por sucursal\.
14. Stock mínimo puede ser global o por sucursal\.
15. Producto fusionado conservará registro histórico\.
16. Ubicaciones pertenecen a sucursal\.
17. Producto no tendrá una única ubicación global\.
18. La ubicación física final se relacionará con lotes/stock\.
19. Productos con historial no se eliminan\.
20. La búsqueda podrá usar referencias, aliases, nombre y marca\.

__Resultado__

Queda diseñado:

__Modelo lógico — Bloque 2: Catálogo maestro ✅__

El siguiente bloque es el más crítico de toda la base:

__Bloque 3 — Núcleo de inventario__

Ahí definiremos en profundidad:

- inventories
- lots
- la relación lote–ubicación
- inventory\_reservations
- inventory\_reservation\_allocations
- inventory\_movements
- inventory\_movement\_lines
- lot\_allocations
- kardex\_entries

y tendremos que decidir exactamente cómo representamos __físico, disponible, reservado, dañado, tránsito, costo promedio, PEPS y atomicidad__, porque ese núcleo será utilizado después por ventas, compras, transferencias, ajustes, devoluciones y kits\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 3: Núcleo de inventario__, que es probablemente el bloque más crítico de toda la base porque después será reutilizado por ventas, compras, transferencias, ajustes, devoluciones y kits\.

__Etapa 4\.2 — Bloque 3: Núcleo de inventario__

Las tablas principales que definiremos aquí son:

- inventories
- lots
- lot\_location\_stocks
- inventory\_reservations
- inventory\_reservation\_allocations
- inventory\_movements
- inventory\_movement\_lines
- lot\_allocations
- kardex\_entries

Con estas 9 tablas llegaríamos a __30 tablas formalmente diseñadas__ acumuladas\.

__1\. Objetivo del núcleo de inventario__

Este bloque debe garantizar simultáneamente:

stock físico

stock disponible

stock reservado

stock dañado/bloqueado

lotes físicos

PEPS

costo promedio

Kardex

trazabilidad

concurrencia

Y debe existir una sola fuente central de inventario\.

Regla:

Producto \+ Sucursal

        ↓

   inventories

__2\. Tabla inventories__

__Propósito__

Representa el estado agregado actual de un producto en una sucursal\.

No representa un movimiento histórico\.

Es el __saldo actual__\.

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

product\_id

BIGINT

FK → products\.id, NOT NULL

branch\_id

BIGINT

FK → branches\.id, NOT NULL

physical\_quantity

NUMERIC

NOT NULL

reserved\_quantity

NUMERIC

NOT NULL

blocked\_quantity

NUMERIC

NOT NULL

damaged\_quantity

NUMERIC

NOT NULL

available\_quantity

NUMERIC

NOT NULL

average\_cost

NUMERIC

NOT NULL

inventory\_value

NUMERIC

NOT NULL

last\_average\_cost

NUMERIC

NULL

version

BIGINT

NOT NULL DEFAULT 0

last\_movement\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__3\. Restricción principal de inventories__

Debe existir exactamente una fila por:

producto \+ sucursal

Por tanto:

UNIQUE\(product\_id, branch\_id\)

Esta es una de las restricciones más importantes de todo el sistema\.

__4\. physical\_quantity__

Representa existencia física empresarial presente en esa sucursal\.

Por ejemplo:

physical\_quantity = 20

incluye unidades que puedan estar:

- disponibles,
- reservadas,
- dañadas,
- bloqueadas\.

Pero no incluye mercancía aún en tránsito hacia esa sucursal\.

__5\. available\_quantity__

Conceptualmente:

available

=

physical

\- reserved

\- blocked

\- damaged

si esas categorías son mutuamente excluyentes\.

No obstante, no quiero depender únicamente de recalcular esta fórmula en frontend\.

La mantendremos como valor agregado controlado por servidor para consultas rápidas\.

__6\. Invariantes de inventario__

Siempre:

physical\_quantity >= 0

reserved\_quantity >= 0

blocked\_quantity >= 0

damaged\_quantity >= 0

available\_quantity >= 0

Y:

reserved \+ blocked \+ damaged <= physical

Si posteriormente distinguimos estados superpuestos, revisaremos esta fórmula, pero para V1 recomiendo mantener categorías físicas excluyentes\.

__7\. Stock negativo__

La DB debe rechazar estados negativos\.

Pero nuevamente:

un CHECK no será suficiente para manejar concurrencia\.

La operación utilizará:

BEGIN

SELECT \.\.\. FOR UPDATE

validar stock

actualizar inventario

crear movimiento

crear lotes/asignaciones

crear Kardex

COMMIT

Todo atómico\.

__8\. average\_cost__

Es el costo promedio ponderado oficial de:

producto \+ sucursal

Se actualiza con entradas valorizadas\.

Una salida normal:

NO cambia average\_cost

mientras exista stock restante\.

__9\. Stock cero__

Cuando:

physical\_quantity = 0

tendremos:

inventory\_value = 0

Respecto a average\_cost, recomiendo:

average\_cost = 0

y preservar el último costo conocido en:

last\_average\_cost

Así no confundimos costo vigente de stock inexistente con referencia histórica\.

__10\. Próxima entrada después de stock cero__

Ejemplo:

stock = 0

entrada = 5 @ 130

Entonces:

average\_cost = 130

inventory\_value = 650

No mezclamos el costo anterior histórico\.

__11\. version__

Será muy útil para:

- concurrencia optimista,
- sincronización offline,
- saber si el inventario cambió desde la última caché\.

Cada modificación oficial incrementará:

version = version \+ 1

La PWA podrá haber conocido:

inventory version 128

mientras servidor ya está en:

version 135

Eso es una señal útil, aunque no necesariamente genera conflicto por sí sola\.

__12\. Tabla lots__

__Propósito__

Representar cada lote físico interno\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

product\_id

BIGINT

FK, NOT NULL

branch\_id

BIGINT

FK, NOT NULL

code

VARCHAR

NOT NULL

origin\_lot\_id

BIGINT

FK → lots\.id, NULL

source\_type

VARCHAR

NOT NULL

source\_id

BIGINT / referencia lógica

según diseño

original\_entry\_date

DATE/TIMESTAMPTZ

NULL

local\_received\_at

TIMESTAMPTZ

NOT NULL

initial\_quantity

NUMERIC

NOT NULL

physical\_quantity

NUMERIC

NOT NULL

reserved\_quantity

NUMERIC

NOT NULL

blocked\_quantity

NUMERIC

NOT NULL

damaged\_quantity

NUMERIC

NOT NULL

available\_quantity

NUMERIC

NOT NULL

original\_unit\_cost

NUMERIC

NULL

status

VARCHAR

NOT NULL

is\_initial\_lot

BOOLEAN

NOT NULL DEFAULT FALSE

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__13\. Código de lote__

Debe ser único por empresa o por sucursal según patrón\.

Recomiendo:

UNIQUE\(branch\_id, code\)

Ejemplo:

MZK\-20260806\-0001

Aunque UUID sigue siendo identidad técnica\.

__14\. Estado del lote__

Posibles:

AVAILABLE

PARTIALLY\_RESERVED

RESERVED

BLOCKED

DAMAGED

EXHAUSTED

IN\_REVIEW

RETURNED

Pero debemos evitar que status sustituya las cantidades\.

Por ejemplo, un lote puede tener:

10 físicas

3 reservadas

7 disponibles

y no necesitamos un estado complejo para cada combinación\.

El estado será principalmente operacional/general\.

__15\. PEPS__

El orden sugerido será:

original\_entry\_date ASC

local\_received\_at ASC

created\_at ASC

id ASC

Esto preserva antigüedad empresarial\.

Para lotes iniciales cuya fecha real sea desconocida, utilizaremos una política consistente que los coloque antes de nuevas entradas\.

__16\. origin\_lot\_id__

Permite transferencias\.

Ejemplo:

Lote Juliaca A

       ↓

Transferencia

       ↓

Lote Mazuko B

origin\_lot\_id = A

Así conservamos trazabilidad entre sucursales\.

__17\. Costo del lote__

original\_unit\_cost puede conservar el costo de origen\.

Pero:

no será usado como costo oficial de salida ordinaria\.

La salida oficial usa:

inventories\.average\_cost

El costo de lote es informativo/trazable\.

__18\. Ubicación del lote__

Como discutimos anteriormente, no quiero limitar cada lote a una sola ubicación\.

Por eso añadimos una nueva tabla\.

__19\. Tabla lot\_location\_stocks__

__Propósito__

Distribuir físicamente un lote entre ubicaciones\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

lot\_id

BIGINT

FK → lots\.id, NOT NULL

warehouse\_location\_id

BIGINT

FK → warehouse\_locations\.id, NOT NULL

physical\_quantity

NUMERIC

NOT NULL

reserved\_quantity

NUMERIC

NOT NULL DEFAULT 0

blocked\_quantity

NUMERIC

NOT NULL DEFAULT 0

damaged\_quantity

NUMERIC

NOT NULL DEFAULT 0

updated\_at

TIMESTAMPTZ

NOT NULL

Restricción:

UNIQUE\(lot\_id, warehouse\_location\_id\)

__20\. Invariante ubicación ↔ lote__

Para cada lote:

SUM\(lot\_location\_stocks\.physical\_quantity\)

=

lots\.physical\_quantity

si el producto utiliza ubicaciones completas\.

Podemos permitir temporalmente lote sin ubicación durante:

- migración,
- recepción,
- revisión\.

Pero debe aparecer como alerta\.

__21\. Mover producto entre estantes__

Ejemplo:

Estante A \-5

Estante B \+5

Esto:

no genera Kardex\.

Porque no cambia cantidad de sucursal\.

Solo cambia ubicación física\.

Tendremos una operación interna de traslado de ubicación o actualización controlada con auditoría\.

__22\. Tabla inventory\_reservations__

__Propósito__

Representar stock comprometido pero todavía físicamente presente\.

Ejemplos:

- Transferencia aprobada\.
- Componentes reservados para armado\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

branch\_id

BIGINT

FK

reservation\_type

VARCHAR

NOT NULL

status

VARCHAR

NOT NULL

source\_type

VARCHAR

NOT NULL

source\_id

BIGINT/referencia

NOT NULL

expires\_at

TIMESTAMPTZ

NULL

created\_by

BIGINT

FK users\.id

created\_at

TIMESTAMPTZ

NOT NULL

consumed\_at

TIMESTAMPTZ

NULL

released\_at

TIMESTAMPTZ

NULL

__23\. Estados de reserva__

ACTIVE

PARTIALLY\_CONSUMED

CONSUMED

RELEASED

EXPIRED

CANCELLED

Una reserva no se borra al consumirse\.

Se conserva\.

__24\. Tabla inventory\_reservation\_allocations__

__Propósito__

Definir qué producto/lote fue reservado\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

reservation\_id

BIGINT

FK

product\_id

BIGINT

FK

lot\_id

BIGINT

FK, NULL

quantity

NUMERIC

NOT NULL

consumed\_quantity

NUMERIC

NOT NULL DEFAULT 0

released\_quantity

NUMERIC

NOT NULL DEFAULT 0

created\_at

TIMESTAMPTZ

NOT NULL

__25\. Reserva por lote__

Como usamos PEPS y preparación física, recomiendo reservar lote cuando la operación ya esté suficientemente definida\.

Pero conceptualmente podemos permitir inicialmente:

lot\_id = NULL

para una reserva general de producto que después se materializa en lotes\.

Esto puede ser útil en una transferencia:

aprobada → reserva producto

preparación → asignación lotes

__26\. Invariante de reserva__

Siempre:

consumed\_quantity

\+

released\_quantity

<=

quantity

Y:

quantity > 0

__27\. Tabla inventory\_movements__

Esta será una de las tablas centrales de toda la base\.

__Propósito__

Representar un evento oficial que modifica inventario\.

Ejemplos:

SALE

PURCHASE\_ENTRY

TRANSFER\_OUT

TRANSFER\_IN

CUSTOMER\_RETURN

INVENTORY\_ADJUSTMENT

LOSS

KIT\_ASSEMBLY\_CONSUMPTION

KIT\_ASSEMBLY\_OUTPUT

INITIAL\_INVENTORY

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE, NOT NULL

branch\_id

BIGINT

FK, NOT NULL

movement\_type

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

source\_type

VARCHAR

NOT NULL

source\_id

BIGINT

NOT NULL

reversal\_of\_movement\_id

BIGINT

FK self, NULL

status

VARCHAR

NOT NULL

created\_by

BIGINT

FK users\.id

device\_id

BIGINT

FK devices\.id, NULL

created\_offline

BOOLEAN

NOT NULL DEFAULT FALSE

confirmed\_at

TIMESTAMPTZ

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

__28\. Cabecera de movimiento__

Un movimiento puede contener varios productos\.

Ejemplo:

Venta VEN\-001

  ├── Producto A

  ├── Producto B

  └── Producto C

Entonces:

1 inventory\_movement

3 inventory\_movement\_lines

__29\. source\_type y source\_id__

Este es un tema técnico delicado\.

Ejemplo:

source\_type = SALE

source\_id = 125

o:

source\_type = TRANSFER\_RECEIPT

source\_id = 300

Conceptualmente funciona muy bien\.

Pero PostgreSQL no puede aplicar una FK tradicional sobre una relación polimórfica\.

Tenemos tres opciones:

__Opción A — polimórfica__

source\_type

source\_id

Flexible, menos integridad referencial DB\.

__Opción B — muchas FK opcionales__

sale\_id

entry\_id

transfer\_id

adjustment\_id

\.\.\.

Mayor integridad, pero tabla llena de NULL\.

__Opción C — documento/operación común superior__

Crear una entidad común de operaciones\.

Podría mejorar integridad pero agrega arquitectura\.

Mi recomendación provisional:

mantener source\_type \+ source\_id en inventory\_movements, reforzado por servicios de dominio y auditoría\.

Cuando lleguemos al diseño físico final podremos revisar si merece un operation\_documents común\.

__30\. Estado de movimiento__

Un movimiento de inventario oficial debería ser prácticamente:

CONFIRMED

REVERSED

No quiero usar inventory\_movements para borradores\.

Los borradores existen en:

sales

entries

transfers

Solo al confirmar crean movimiento\.

Esto mantiene limpia la tabla\.

__31\. Reversión__

Nunca actualizamos el movimiento original a cero\.

Ejemplo:

Movimiento 100

SALE

\-5

Reversión:

Movimiento 150

SALE\_REVERSAL

\+5

reversal\_of\_movement\_id = 100

El original permanece\.

__32\. Tabla inventory\_movement\_lines__

__Propósito__

Representar cada producto afectado dentro del movimiento\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

inventory\_movement\_id

BIGINT

FK, NOT NULL

inventory\_id

BIGINT

FK → inventories\.id, NOT NULL

product\_id

BIGINT

FK → products\.id, NOT NULL

direction

VARCHAR

NOT NULL

quantity

NUMERIC

NOT NULL

unit\_cost

NUMERIC

NOT NULL

total\_cost

NUMERIC

NOT NULL

stock\_before

NUMERIC

NOT NULL

stock\_after

NUMERIC

NOT NULL

average\_cost\_before

NUMERIC

NOT NULL

average\_cost\_after

NUMERIC

NOT NULL

inventory\_value\_before

NUMERIC

NOT NULL

inventory\_value\_after

NUMERIC

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

__33\. direction__

Valores:

IN

OUT

No utilizaremos cantidades negativas en quantity\.

Así:

direction = OUT

quantity = 5

es más claro que:

quantity = \-5

__34\. Costo de salida__

Para una venta:

unit\_cost = average\_cost\_before

Ejemplo:

average\_cost\_before = 110

quantity = 12

total\_cost = 1320

__35\. Entrada y promedio__

Ejemplo:

Antes:

3 @ promedio 110

valor 330

Entrada:

2 @ 140

valor entrada 280

Después:

5 unidades

valor 610

average\_cost\_after = 122

La línea conserva:

average\_cost\_before = 110

average\_cost\_after = 122

Esto facilita auditoría y Kardex\.

__36\. Duplicar product\_id e inventory\_id__

Podría parecer redundante porque inventory\_id ya lleva a producto\.

Pero recomiendo mantener ambos en inventory\_movement\_lines\.

¿Por qué?

- consultas históricas rápidas,
- integridad semántica,
- claridad,
- futuras particiones/reportes\.

Debe validarse que:

inventory\.product\_id = movement\_line\.product\_id

__37\. Tabla lot\_allocations__

__Propósito__

Indicar qué lotes físicos fueron utilizados por una línea de movimiento\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

inventory\_movement\_line\_id

BIGINT

FK

lot\_id

BIGINT

FK

quantity

NUMERIC

NOT NULL

allocation\_order

INTEGER

NOT NULL

was\_fifo\_suggested

BOOLEAN

NOT NULL

fifo\_overridden

BOOLEAN

NOT NULL DEFAULT FALSE

override\_reason\_id

BIGINT

FK reason\_codes\.id, NULL

override\_by

BIGINT

FK users\.id, NULL

local\_provisional

BOOLEAN

NOT NULL DEFAULT FALSE

created\_at

TIMESTAMPTZ

NOT NULL

__38\. Ejemplo PEPS__

Venta:

12 unidades

Asignaciones:

Line 500

├── Lot A → 10

└── Lot B → 2

Dos filas de lot\_allocations\.

__39\. Entrada y asignación de lote__

Para una entrada, también puede ser útil relacionar la línea con el lote creado\.

Tenemos dos opciones:

- usar lot\_allocations tanto IN como OUT,
- relacionar lote de origen desde la entrada\.

Recomiendo que lot\_allocations soporte ambas direcciones\.

Entonces una entrada:

movement\_line IN

↓

lot\_allocation

↓

nuevo lote

Esto da una traza uniforme\.

__40\. PEPS modificado__

Ejemplo:

Sistema sugiere:

Lot A

Usuario autorizado escoge:

Lot B

Guardamos:

was\_fifo\_suggested = false / o evidencia separada

fifo\_overridden = true

override\_reason\_id

override\_by

Para una auditoría más exacta quizá también necesitemos guardar:

suggested\_lot\_id

pero si son múltiples lotes puede complicarse\.

Mi recomendación es que la secuencia sugerida completa quede en auditoría/metadata, mientras lot\_allocations conserva lo realmente ejecutado\.

__41\. Asignación provisional offline__

La PWA puede haber sugerido:

Lot A

pero servidor confirmar:

Lot B

No debemos reemplazar silenciosamente la evidencia local\.

Por eso conceptualmente tendremos:

- asignación local en payload/sync,
- asignación oficial en lot\_allocations\.

local\_provisional no necesariamente es indispensable en la tabla oficial; podríamos eliminarlo y guardar todo provisional en sync\_operations\.

Mi recomendación final:

lot\_allocations debe guardar solo asignación oficial\.

La asignación provisional queda en sincronización/auditoría\.

Por tanto retiraría local\_provisional de la tabla final\.

__42\. Tabla kardex\_entries__

__Propósito__

Registrar la secuencia valorizada oficial por producto\+sucursal\.

__Campos__

__Campo__

__Tipo__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

inventory\_movement\_line\_id

BIGINT

FK, UNIQUE, NOT NULL

inventory\_id

BIGINT

FK

product\_id

BIGINT

FK

branch\_id

BIGINT

FK

sequence\_number

BIGINT

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

official\_timestamp

TIMESTAMPTZ

NOT NULL

movement\_type

VARCHAR

NOT NULL

input\_quantity

NUMERIC

NOT NULL DEFAULT 0

input\_unit\_cost

NUMERIC

NOT NULL DEFAULT 0

input\_value

NUMERIC

NOT NULL DEFAULT 0

output\_quantity

NUMERIC

NOT NULL DEFAULT 0

output\_unit\_cost

NUMERIC

NOT NULL DEFAULT 0

output\_value

NUMERIC

NOT NULL DEFAULT 0

balance\_quantity

NUMERIC

NOT NULL

average\_cost

NUMERIC

NOT NULL

balance\_value

NUMERIC

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

__43\. Kardex por línea__

La relación será normalmente:

inventory\_movement\_lines 1 ─── 1 kardex\_entries

Restricción:

UNIQUE\(inventory\_movement\_line\_id\)

__44\. Secuencia Kardex__

Debe ser secuencial por:

inventory\_id

No necesariamente global para toda la empresa\.

Restricción lógica:

UNIQUE\(inventory\_id, sequence\_number\)

Esto permite:

Producto A / Mazuko

1

2

3

4

y por separado:

Producto A / Juliaca

1

2

3

__45\. Dos fechas__

Guardamos:

__operation\_date__

Fecha económica/operativa\.

__official\_timestamp__

Momento en que servidor confirmó oficialmente\.

Esto es imprescindible por el modo offline\.

Ejemplo:

operation\_date:

2026\-08\-06 16:20

official\_timestamp:

2026\-08\-06 18:04

__46\. Operación tardía de día cerrado__

La existencia de dos fechas no significa que aceptemos automáticamente una operación antigua\.

Si:

operation\_date

pertenece a un día cerrado, deberá entrar en conflicto según reglas definidas\.

__47\. Kardex y costo__

Ejemplo entrada:

input\_quantity = 5

input\_unit\_cost = 130

input\_value = 650

output\_quantity = 0

Ejemplo venta:

input\_quantity = 0

output\_quantity = 12

output\_unit\_cost = 110

output\_value = 1320

__48\. Kardex nunca se recalcula destructivamente__

Si descubrimos un error posterior:

no reescribimos movimientos históricos silenciosamente\.

Se crea:

- reversión,
- ajuste,
- revalorización excepcional,

según corresponda\.

__49\. ¿Kardex duplica datos de inventory\_movement\_lines?__

Sí, parcialmente, y de manera intencional\.

inventory\_movement\_lines representa el __evento de inventario__\.

kardex\_entries representa la __secuencia contable/valorizada__\.

Esto nos permite tener un libro Kardex estable, eficiente y auditable\.

__50\. Stock en tránsito__

Importante: __no lo almacenaremos dentro de inventories del destino__\.

Tampoco crearemos una sucursal ficticia\.

Se derivará principalmente de transferencias:

sent\_quantity \- received\_quantity \- resolved\_quantity

Cuando diseñemos el bloque de transferencias podremos decidir si necesitamos una tabla materializada de tránsito para rendimiento\.

Por ahora:

inventories

solo representa stock ya perteneciente físicamente a esa sucursal\.

__51\. Dañado y Kardex__

Mover:

AVAILABLE → DAMAGED

dentro de la misma sucursal no cambia la cantidad contable total\.

Por tanto no necesariamente genera una línea Kardex\.

Pero sí debe generar:

- operación de clasificación,
- actualización de lote/inventario,
- auditoría\.

Cuando se da de baja:

physical \-1

entonces sí:

inventory\_movement

\+

kardex\_entry

__52\. Bloqueado__

Similar\.

Bloquear stock:

available ↓

blocked ↑

physical igual

No es salida\.

__53\. ¿Necesitamos tabla de cambios de estado de stock?__

No la introduciría todavía como entidad central\.

La auditoría puede registrar esos cambios y las operaciones específicas de daño/bloqueo podrán detallarse en el módulo de salidas/operaciones\.

No debemos llenar el núcleo con tablas redundantes prematuramente\.

__54\. Invariantes globales__

Después de cada transacción oficial debe cumplirse:

inventories\.physical\_quantity

=

SUM\(lots\.physical\_quantity\)

y, cuando ubicaciones estén completas:

lots\.physical\_quantity

=

SUM\(lot\_location\_stocks\.physical\_quantity\)

Y:

inventories\.physical\_quantity

=

último kardex\.balance\_quantity

__55\. Valor contable__

También:

inventories\.inventory\_value

≈ physical\_quantity × average\_cost

con precisión interna y política de redondeo definida\.

No debemos calcular valor a partir de costo original de los lotes\.

__56\. Transacción de una venta__

Cuando confirmemos una venta normal:

BEGIN

1\. Bloquear inventories afectados

2\. Validar disponibles

3\. Seleccionar lotes PEPS

4\. Bloquear lotes

5\. Crear inventory\_movement

6\. Crear movement\_lines

7\. Crear lot\_allocations

8\. Reducir lots

9\. Reducir lot\_location\_stocks

10\. Actualizar inventories

11\. Crear kardex\_entries

12\. Confirmar venta

COMMIT

Todo o nada\.

__57\. Orden de bloqueos__

Para evitar deadlocks cuando una venta contiene varios productos, debemos bloquear siempre en orden determinístico\.

Ejemplo:

ORDER BY inventory\_id

y dentro de lotes:

ORDER BY FIFO \+ lot\_id

Esto lo profundizaremos en concurrencia, pero el modelo debe permitirlo\.

__58\. Compra/entrada__

Conceptualmente:

BEGIN

crear lote

crear inventory\_movement

crear movement\_line

crear lot\_allocation IN

actualizar inventories

recalcular average\_cost

crear Kardex

COMMIT

__59\. Transferencia de salida__

Origen:

reservation

↓

shipment

↓

movement OUT

↓

lot allocations

↓

Kardex origen

Destino todavía no cambia\.

__60\. Transferencia de entrada__

Solo al recibir:

nuevo lote destino

↓

movement IN

↓

nuevo promedio destino

↓

Kardex destino

__61\. Conteo__

Conteo físico no toca estas tablas inmediatamente\.

Solo cuando existe ajuste aprobado:

inventory\_adjustment

↓

inventory\_movement

↓

Kardex

__62\. KIT\_COMPONENTES vendido al momento__

Ejemplo kit:

A ×2

B ×1

Venta de 1 kit\.

Podrá generar:

1 inventory\_movement

├── OUT A ×2

└── OUT B ×1

Cada línea con su Kardex y asignaciones de lote\.

__63\. Kit prearmado__

Armado:

inventory\_movement

├── OUT componente A

├── OUT componente B

└── IN producto KIT

Podemos hacerlo en un solo movimiento lógico de armado con líneas IN y OUT\.

Esto es una gran ventaja de nuestra estructura cabecera/líneas\.

__64\. Movimiento mixto IN/OUT__

Por eso inventory\_movements no debe tener una dirección única\.

La dirección vive en:

inventory\_movement\_lines\.direction

Así un armado puede contener simultáneamente:

OUT

OUT

IN

__65\. Transferencia entre dos sucursales__

Aquí tenemos un detalle\.

Como inventory\_movements\.branch\_id es una sola sucursal, transferencia completa no debería utilizar un único movimiento con origen y destino simultáneamente\.

Debe generar:

movement OUT origen

y posteriormente:

movement IN destino

conectados mediante la transferencia\.

Eso es correcto porque ocurren en momentos diferentes\.

__66\. branch\_id en movement line__

Si el movimiento tiene una sola sucursal, podría parecer redundante\.

Por eso anteriormente propusimos solo inventory\_id\.

Mi recomendación final para simplificar:

- inventory\_movements\.branch\_id → sucursal del movimiento\.
- inventory\_movement\_lines\.inventory\_id
- inventory\_movement\_lines\.product\_id

No necesitamos branch\_id en la línea\.

El Kardex sí puede conservar branch\_id para lectura histórica rápida\.

__67\. Idempotencia__

inventory\_movements\.uuid será UNIQUE\.

Pero normalmente la idempotencia inicial estará en la operación origen:

sale\.uuid

payment\.uuid

transfer\.uuid

El movimiento se crea una sola vez dentro de la transacción\.

Además podemos asegurar una relación única:

source\_type \+ source\_id \+ movement\_type

cuando semánticamente corresponda\.

No siempre será único porque una operación podría crear más de un movimiento\.

__68\. Estados históricos de lotes__

No eliminamos un lote agotado\.

Queda:

physical\_quantity = 0

status = EXHAUSTED

porque necesitamos trazabilidad para ventas, devoluciones y transferencias antiguas\.

__69\. Lote agotado y devolución__

Si un cliente devuelve una unidad que originalmente salió del lote agotado, podemos:

- reactivar el lote original cuando física y lógicamente corresponda,
- o crear un lote de devolución vinculado al original\.

La operación de devoluciones decidirá según condiciones\.

El modelo soporta ambas\.

__70\. Restricciones clave de lots__

Conceptualmente:

initial\_quantity >= 0

physical\_quantity >= 0

reserved\_quantity >= 0

blocked\_quantity >= 0

damaged\_quantity >= 0

available\_quantity >= 0

Y:

reserved \+ blocked \+ damaged <= physical

__71\. Restricciones de inventory\_movement\_lines__

quantity > 0

unit\_cost >= 0

total\_cost >= 0

stock\_before >= 0

stock\_after >= 0

average\_cost\_before >= 0

average\_cost\_after >= 0

Para OUT:

stock\_after <= stock\_before

Para IN:

stock\_after >= stock\_before

excepto casos especiales de revalorización sin cantidad, que serían otro tipo de movimiento y probablemente no utilizarían línea normal de cantidad cero\.

__72\. Ajuste de valorización sin cantidad__

Ya contemplamos una posible:

VALUATION\_ADJUSTMENT

administrativa excepcional\.

No quiero forzar esa operación dentro de quantity > 0\.

Podemos manejarla posteriormente con:

- un tipo especial que permita quantity = 0,
- o una tabla financiera de revalorización\.

Mi recomendación por ahora:

mantener movimientos normales con quantity > 0 y diseñar VALUATION\_ADJUSTMENT como excepción cuando lleguemos a ajustes\.

__73\. ¿Qué tabla representa la verdad?__

Tenemos tres capas:

__Estado actual__

inventories

lots

lot\_location\_stocks

__Historia operacional__

inventory\_movements

inventory\_movement\_lines

lot\_allocations

__Libro valorizado__

kardex\_entries

No son fuentes competidoras\.

Deben coincidir mediante invariantes\.

__74\. Reconciliación__

El sistema deberá poder ejecutar verificaciones como:

Inventory vs Lots

Kardex vs Inventory

Lot vs Locations

Reservations vs Reserved Quantity

Si no coinciden:

ALERTA CRÍTICA

\+

bloqueo de cierre

según regla definida\.

__75\. Reservas e inventario__

Cuando reservamos 4:

inventories\.reserved\_quantity \+= 4

inventories\.available\_quantity \-= 4

Y en lotes correspondientes:

lots\.reserved\_quantity \+= 4

lots\.available\_quantity \-= 4

No cambia:

physical\_quantity

__76\. Consumir reserva__

Al enviar/usar:

reserved\_quantity \-= cantidad

physical\_quantity \-= cantidad

La reserva queda marcada como consumida\.

__77\. Liberar reserva__

Si se cancela antes de salida:

reserved\_quantity \-= cantidad

available\_quantity \+= cantidad

No Kardex\.

__78\. Ubicaciones y reserva__

Para V1 no necesitamos necesariamente reservar por ubicación además de lote\.

Podemos derivar preparación física de la asignación de lote y seleccionar ubicación\.

Pero como lot\_location\_stocks tiene reserved\_quantity, queda preparado para manejarlo correctamente cuando se prepare físicamente la mercadería\.

__79\. Costo promedio y lotes__

Nunca calcularemos promedio como:

SUM\(lote disponible × costo lote\) / stock

porque los lotes son PEPS físico\.

La autoridad es:

inventories\.average\_cost

actualizada por los movimientos valorizados\.

Esto evita mezclar FIFO físico con valoración\.

__80\. Tablas formalmente definidas del Bloque 3__

Quedan:

inventories

lots

lot\_location\_stocks

inventory\_reservations

inventory\_reservation\_allocations

inventory\_movements

inventory\_movement\_lines

lot\_allocations

kardex\_entries

Total:

__9 nuevas tablas__

__81\. Conteo acumulado del modelo lógico__

Hasta ahora:

__Bloque__

__Tablas__

Organización y seguridad

12

Catálogo maestro

9

Núcleo de inventario

9

__Total__

__30__

__82\. Decisiones cerradas del Bloque 3__

1. inventories será la vista agregada oficial actual por producto\+sucursal\.
2. Existirá UNIQUE\(product\_id, branch\_id\)\.
3. No se permitirá stock negativo\.
4. Inventario tendrá versión para concurrencia/sync\.
5. Lotes serán obligatorios para stock físico\.
6. PEPS se basa en antigüedad original\.
7. Costo de lote no determina costo oficial de salida\.
8. Costo oficial será promedio ponderado\.
9. Un lote podrá estar en varias ubicaciones\.
10. Traslado entre ubicaciones no genera Kardex\.
11. Reservas no disminuyen stock físico\.
12. Reserva tendrá asignaciones a producto/lote\.
13. Movimientos tendrán cabecera \+ líneas\.
14. Movimiento puede tener múltiples productos\.
15. Dirección IN/OUT vive en la línea\.
16. Armado de kit puede generar líneas IN y OUT dentro del mismo movimiento\.
17. Transferencia genera movimiento OUT origen y posteriormente IN destino\.
18. lot\_allocations conectará líneas con lotes\.
19. Kardex tendrá una entrada por línea de movimiento\.
20. Kardex será secuencial por inventario producto\+sucursal\.
21. Se conservarán fecha operacional y fecha oficial\.
22. Movimientos confirmados no se editan\.
23. Reversión crea nuevo movimiento inverso\.
24. Tránsito no será una sucursal artificial\.
25. Daño/bloqueo sin disminución física no genera Kardex de cantidad\.
26. inventories, lots y Kardex deberán poder reconciliarse automáticamente\.
27. Operaciones de stock deberán ejecutarse en transacciones y con bloqueos de fila\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 4: Proveedores, compras y entradas de inventario__\.

Este bloque debe soportar tanto las compras normales como todas las entradas que __no provienen de una compra__, porque ya definimos que una entrada física puede originarse por inventario inicial, devolución de cliente, transferencia recibida, ajuste positivo, armado de kit, recuperación u otros motivos autorizados\.

__Etapa 4\.2 — Bloque 4: Proveedores, compras y entradas__

Las tablas que definiremos aquí son:

- suppliers
- purchases
- purchase\_lines
- inventory\_entries
- inventory\_entry\_lines

Con estas 5 tablas pasaríamos de __30 a 35 tablas formalmente diseñadas__\.

__1\. Tabla suppliers__

__Propósito__

Representar proveedores globales de la empresa\.

No habrá proveedor duplicado por sucursal\.

Relación conceptual:

company

   │

   └── suppliers

            │

            └── purchases

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

document\_type

VARCHAR

NULL

document\_number

VARCHAR

NULL

legal\_name

VARCHAR

NOT NULL

trade\_name

VARCHAR

NULL

phone

VARCHAR

NULL

email

VARCHAR

NULL

address

TEXT

NULL

contact\_name

VARCHAR

NULL

notes

TEXT

NULL

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

__2\. Estados de proveedor__

Propongo:

ACTIVE

INACTIVE

BLOCKED

BLOCKED puede utilizarse para impedir nuevas compras sin perder historial\.

__3\. Documento del proveedor__

Si existe RUC u otro documento:

document\_type

document\_number

La combinación debería ser única dentro de la empresa cuando exista:

UNIQUE\(company\_id, document\_type, document\_number\)

con una restricción parcial que ignore NULL\.

No debemos permitir que diferencias de mayúsculas o espacios creen proveedores duplicados fácilmente\.

__4\. Tabla purchases__

__Propósito__

Representar la operación comercial de compra a proveedor\.

Es importante separar:

PURCHASE

de:

INVENTORY ENTRY

porque pueden existir compras aún no recibidas o recepciones parciales\.

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

supplier\_id

BIGINT

FK → suppliers\.id, NOT NULL

purchase\_number

VARCHAR

NOT NULL

supplier\_document\_type

VARCHAR

NULL

supplier\_document\_series

VARCHAR

NULL

supplier\_document\_number

VARCHAR

NULL

document\_date

DATE

NULL

currency\_code

CHAR\(3\)

NOT NULL

exchange\_rate

NUMERIC

NULL

subtotal\_amount

NUMERIC

NOT NULL

tax\_amount

NUMERIC

NOT NULL DEFAULT 0

total\_amount

NUMERIC

NOT NULL

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

__5\. Número interno de compra__

purchase\_number será un correlativo interno, por ejemplo:

COM\-MZK\-2026\-000125

La identidad técnica sigue siendo:

uuid

y el correlativo se genera mediante document\_sequences\.

__6\. Documento del proveedor__

Ejemplo:

Factura

F001

000458

Por eso conviene separar:

- tipo,
- serie,
- número\.

Esto facilita detectar duplicados\.

__7\. Duplicidad de documento__

Para compras confirmadas debería evitarse que el mismo documento del mismo proveedor se registre dos veces\.

Regla lógica:

supplier\_id

\+

supplier\_document\_type

\+

supplier\_document\_series

\+

supplier\_document\_number

debe ser único cuando esos valores existan\.

En casos excepcionales, un administrador podría requerir un proceso de revisión, pero no una duplicación silenciosa\.

__8\. Estados de compra__

Propongo:

DRAFT

PENDING\_APPROVAL

APPROVED

PARTIALLY\_RECEIVED

RECEIVED

CANCELLED

REJECTED

Importante:

RECEIVED no significa simplemente que se creó la compra; significa que la recepción física quedó completada\.

__9\. Compra vs entrada__

Ejemplo:

Compra:

10 filtros

20 retenes

Puede recibirse:

Recepción 1:

10 filtros

Recepción 2:

20 retenes

Por tanto:

purchases 1 ─── N inventory\_entries

cuando inventory\_entry\_type = PURCHASE\_RECEIPT\.

__10\. Tabla purchase\_lines__

__Propósito__

Representar los productos comprados comercialmente\.

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

purchase\_id

BIGINT

FK → purchases\.id, NOT NULL

product\_id

BIGINT

FK → products\.id, NOT NULL

ordered\_quantity

NUMERIC

NOT NULL

unit\_cost\_original

NUMERIC

NOT NULL

unit\_cost\_base

NUMERIC

NOT NULL

line\_subtotal

NUMERIC

NOT NULL

tax\_amount

NUMERIC

NOT NULL DEFAULT 0

line\_total

NUMERIC

NOT NULL

received\_quantity

NUMERIC

NOT NULL DEFAULT 0

cancelled\_quantity

NUMERIC

NOT NULL DEFAULT 0

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__11\. Cantidades de compra__

Debe cumplirse:

ordered\_quantity > 0

received\_quantity >= 0

cancelled\_quantity >= 0

y:

received\_quantity \+ cancelled\_quantity <= ordered\_quantity

si no permitimos sobrantes comerciales automáticos\.

__12\. unit\_cost\_original y unit\_cost\_base__

Si compra en PEN:

unit\_cost\_original = unit\_cost\_base

Si compra en otra moneda:

unit\_cost\_original = costo moneda documento

unit\_cost\_base = costo convertido a PEN

La valorización de inventario utiliza el costo base oficial\.

__13\. Impuestos__

Aunque facturación electrónica no sea objetivo inicial, conviene dejar estructura mínima:

subtotal

tax

total

No necesitamos todavía un motor tributario completo\.

__14\. ¿Una compra puede tener el mismo producto dos veces?__

Técnicamente sí podría ocurrir por:

- distinta condición,
- distinto costo,
- distinta línea de documento\.

Por eso no recomiendo:

UNIQUE\(purchase\_id, product\_id\)

Una misma compra podría incluir el producto en más de una línea\.

__15\. Tabla inventory\_entries__

Esta es una tabla central del flujo de entradas\.

__Propósito__

Representar una __recepción física autorizada de inventario__\.

No todas las entradas provienen de compra\.

Tipos definidos:

PURCHASE\_RECEIPT

INITIAL\_INVENTORY

TRANSFER\_RECEIPT

CUSTOMER\_RETURN

POSITIVE\_ADJUSTMENT

KIT\_ASSEMBLY\_OUTPUT

RECOVERY

OTHER

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

branch\_id

BIGINT

FK → branches\.id, NOT NULL

entry\_number

VARCHAR

NOT NULL

entry\_type

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

purchase\_id

BIGINT

FK → purchases\.id, NULL

supplier\_id

BIGINT

FK → suppliers\.id, NULL

source\_type

VARCHAR

NULL

source\_id

BIGINT

NULL

external\_document\_type

VARCHAR

NULL

external\_document\_number

VARCHAR

NULL

currency\_code

CHAR\(3\)

NOT NULL

exchange\_rate

NUMERIC

NULL

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK users\.id

confirmed\_by

BIGINT

FK users\.id, NULL

device\_id

BIGINT

FK devices\.id, NULL

created\_offline

BOOLEAN

NOT NULL DEFAULT FALSE

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

__16\. Estado de entrada__

Propongo:

DRAFT

PENDING\_APPROVAL

CONFIRMED

CANCELLED

REJECTED

CONFLICT

Aunque funcionalmente ya definimos que una entrada offline no aumenta stock vendible hasta confirmarse\.

Por tanto:

DRAFT/PENDING

no toca inventario\.

Solo:

CONFIRMED

genera movimiento oficial\.

__17\. purchase\_id__

Será obligatorio solamente cuando:

entry\_type = PURCHASE\_RECEIPT

No debe existir en:

INITIAL\_INVENTORY

POSITIVE\_ADJUSTMENT

KIT\_ASSEMBLY\_OUTPUT

__18\. supplier\_id__

Puede ser útil redundarlo en inventory\_entries para consultas y documentos\.

Pero si existe purchase\_id, técnicamente se deriva\.

Mi recomendación:

- permitir supplier\_id,
- exigir consistencia con purchase\.supplier\_id cuando exista compra\.

Esto también soporta una entrada directa de proveedor sin orden de compra formal si el negocio lo requiere\.

__19\. source\_type \+ source\_id__

Sirve para entradas originadas fuera del módulo de compras\.

Ejemplos:

source\_type = TRANSFER\_RECEIPT

source\_id = 350

source\_type = CUSTOMER\_RETURN

source\_id = 80

source\_type = ASSEMBLY\_ORDER

source\_id = 125

Al igual que con movimientos, es una relación polimórfica\.

__20\. Tabla inventory\_entry\_lines__

__Propósito__

Representar cada producto recibido físicamente\.

__Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

inventory\_entry\_id

BIGINT

FK, NOT NULL

purchase\_line\_id

BIGINT

FK → purchase\_lines\.id, NULL

product\_id

BIGINT

FK → products\.id, NOT NULL

quantity

NUMERIC

NOT NULL

unit\_cost\_original

NUMERIC

NOT NULL

unit\_cost\_base

NUMERIC

NOT NULL

total\_cost\_base

NUMERIC

NOT NULL

condition

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__21\. Condición de entrada__

Posibles valores:

GOOD

DAMAGED

REVIEW

Para compra normal debería ser:

GOOD

Si llega dañada:

DAMAGED

y no debe entrar al disponible\.

__22\. Entrada dañada__

Ejemplo:

5 unidades recibidas

3 buenas

2 dañadas

Tenemos dos opciones:

__A__

Una línea con cantidad 5 y atributos secundarios\.

__B__

Dos líneas:

Producto A / GOOD / 3

Producto A / DAMAGED / 2

Recomiendo __B__\.

Es más simple para:

- lotes,
- disponibilidad,
- trazabilidad\.

__23\. Relación con lotes__

Al confirmar una línea:

inventory\_entry\_line

       ↓

inventory\_movement\_line IN

       ↓

lot\_allocation

       ↓

lot

Normalmente una línea de entrada generará un lote\.

Pero puede generar más de uno si físicamente la recepción viene separada\.

__24\. ¿Debe inventory\_entry\_line guardar lot\_id?__

No recomiendo una FK única:

inventory\_entry\_lines\.lot\_id

porque una línea podría crear múltiples lotes\.

Ya tenemos:

lot\_allocations

como infraestructura común\.

Así evitamos duplicación\.

__25\. Entrada confirmada__

Secuencia:

inventory\_entries

      │

      └── inventory\_entry\_lines

                  │

                  ▼

          inventory\_movements

                  │

                  ▼

       inventory\_movement\_lines

                  │

                  ├── lot\_allocations

                  │       │

                  │       ▼

                  │      lots

                  │

                  ▼

             kardex\_entries

__26\. Compra recibida parcialmente__

Ejemplo:

purchase\_line:

ordered\_quantity = 10

Entrada 1:

quantity = 4

Entonces:

received\_quantity = 4

purchase\.status = PARTIALLY\_RECEIVED

Entrada 2:

quantity = 6

Entonces:

received\_quantity = 10

purchase\.status = RECEIVED

__27\. Recepción superior a lo comprado__

Si:

ordered = 10

received previously = 8

new receipt = 5

no debemos aceptar automáticamente 13\.

Debe generarse:

- advertencia,
- autorización,
- o corrección de la compra,

según política\.

Para V1 recomiendo bloquear recepción mayor a cantidad pendiente salvo una recepción con diferencia explícitamente autorizada\.

__28\. Costo en entrada de compra__

Si está vinculada a purchase\_line, el costo debe venir de la compra\.

No debe escribirse libremente durante recepción normal\.

Podría permitirse corrección autorizada antes de confirmación si el documento real difiere, pero esa corrección debe modificar la compra o generar una revisión\.

__29\. Inventario inicial__

Se representa con:

inventory\_entries\.entry\_type = INITIAL\_INVENTORY

y no necesita una tabla paralela\.

Cada línea tendrá:

- producto,
- cantidad física aprobada,
- costo aprobado\.

Generará:

nuevo lote inicial

\+

inventory movement IN

\+

Kardex INITIAL\_INVENTORY

__30\. Restricciones de inventario inicial__

Solo debe permitirse durante:

- migración,
- apertura de sucursal,
- proceso administrativo extraordinario\.

No debe aparecer como entrada cotidiana de almacén\.

Puede requerir permiso:

inventory\.initial\.confirm

__31\. Entrada por transferencia__

Será creada desde:

transfer\_receipt

Entonces:

entry\_type = TRANSFER\_RECEIPT

source\_type = TRANSFER\_RECEIPT

source\_id = \.\.\.

El costo no lo decide la sucursal destino\.

Viene del costo de transferencia originado en la sucursal de salida\.

__32\. Entrada por devolución de cliente__

Será:

entry\_type = CUSTOMER\_RETURN

Costo recomendado:

costo oficial de salida de la venta original

No el precio pagado por el cliente\.

__33\. Entrada por ajuste positivo__

Será:

entry\_type = POSITIVE\_ADJUSTMENT

Debe relacionarse al ajuste autorizado\.

No permitiremos al usuario crearla como una entrada libre para corregir stock\.

__34\. Entrada por armado__

Será:

entry\_type = KIT\_ASSEMBLY\_OUTPUT

Costo:

consumo componentes

\+

mano de obra autorizada

\+

otros costos autorizados

La orden de armado será el origen\.

__35\. Entrada por recuperación__

Ejemplo:

Producto previamente declarado perdido y posteriormente recuperado\.

No debemos borrar la pérdida histórica\.

Se crea:

entry\_type = RECOVERY

con trazabilidad al evento previo si existe\.

__36\. OTHER__

Debe estar muy restringido\.

No queremos que:

OTHER

se convierta en mecanismo para saltar ajustes o devoluciones\.

Debe requerir:

- permiso especial,
- motivo,
- auditoría\.

__37\. Costo y promedio ponderado__

Ejemplo:

Antes:

Stock = 10

Average cost = 100

Value = 1000

Entrada:

5 @ 130

Entonces la entrada genera:

movement line IN

quantity = 5

unit\_cost = 130

y después:

Stock = 15

Value = 1650

Average cost = 110

Todo dentro de la misma transacción\.

__38\. Entrada con costo cero__

Para producto con cantidad positiva:

unit\_cost\_base = 0

no debería aceptarse en una compra normal\.

Puede existir excepcionalmente:

- muestra,
- bonificación,
- inventario inicial sin costo confiable,

pero requiere una política explícita\.

Nuestra regla de migración ya estableció que un stock inicial positivo debería tener costo aprobado salvo excepción administrativa\.

__39\. Bonificaciones de proveedor__

Si se reciben:

10 compradas @100

\+

2 bonificadas @0

tenemos que decidir comercialmente cómo valorizarlas\.

La base puede soportar líneas separadas\.

Ejemplo:

purchase\_line 1: 10 @100

purchase\_line 2: 2 @0

Pero el efecto del promedio sería real\.

No necesitamos cerrar ahora una política especial mientras no exista requerimiento confirmado\.

__40\. Documentos de entrada__

inventory\_entries puede guardar documento externo cuando no existe compra\.

Ejemplo:

- guía,
- acta,
- documento de transferencia\.

Pero si existe purchase\_id, el documento comercial principal permanece en purchases\.

No debemos duplicar indiscriminadamente\.

__41\. Reversión de entrada__

Una entrada confirmada no se edita\.

Si es reversible de forma segura:

inventory entry

      ↓

reversal movement OUT

y la entrada queda:

CANCELLED / REVERSED

según convención final\.

Pero si el lote ya fue consumido:

la reversión simple debe bloquearse\.

__42\. ¿Guardar reversal\_of\_entry\_id?__

Recomiendo añadirlo\.

En inventory\_entries:

__Campo__

__Tipo__

reversal\_of\_entry\_id

BIGINT FK → inventory\_entries\.id, NULL

Aunque normalmente la reversión podría ser una salida, esta relación ayuda cuando técnicamente creamos una entrada inversa\.

Sin embargo, como una entrada se revierte con un movimiento de salida, puede resultar más limpio relacionarla a una operación de reversión general\.

Mi recomendación provisional:

no agregar todavía reversal\_of\_entry\_id; utilizar la relación de movimiento y auditoría hasta diseñar el bloque de anulaciones/reversiones\.

__43\. Entrada y offline__

De acuerdo con la Etapa 3:

Una sucursal offline puede crear:

DRAFT / PENDING

de recepción\.

Pero:

no aumenta stock vendible hasta que el servidor la confirme\.

Por tanto inventory\_entries\.created\_offline = true puede existir, pero no generará inventory\_movements localmente como verdad oficial\.

__44\. Sincronización de entrada pendiente__

Cuando llega al servidor:

1. Validar usuario/dispositivo\.
2. Validar producto\.
3. Validar compra/origen\.
4. Validar costos\.
5. Validar fecha/cierre\.
6. Confirmar\.
7. Crear lotes\.
8. Recalcular inventario\.
9. Crear Kardex\.

Si falla:

CONFLICT

y no modifica inventario oficial\.

__45\. Compra offline__

No considero necesario permitir crear compras completas offline inicialmente\.

El flujo offline prioritario está en:

- ventas,
- clientes,
- pagos,
- conteos\.

Una recepción puede capturarse como borrador si hace falta\.

Compras administrativas deben preferir conexión\.

__46\. Relación con adjuntos__

purchases e inventory\_entries podrán tener:

attachments

para:

- factura,
- guía,
- fotografía,
- acta\.

No necesitamos columnas específicas para archivos\.

__47\. Relación con aprobación__

Podrán generar:

approvals

por ejemplo:

- entrada excepcional,
- costo cero,
- inventario inicial,
- recepción mayor\.

La infraestructura de aprobación se diseñará después\.

__48\. Relación proveedor → devoluciones__

suppliers también será utilizado posteriormente por:

inventory\_exits

cuando:

exit\_type = SUPPLIER\_RETURN

No crearemos otro catálogo de proveedores\.

__49\. Cardinalidades principales__

companies 1 ─── N suppliers

suppliers 1 ─── N purchases

branches 1 ─── N purchases

purchases 1 ─── N purchase\_lines

products 1 ─── N purchase\_lines

__50\. Compra → entradas__

purchases 1 ─── 0\.\.N inventory\_entries

Porque una compra:

- puede aún no recibirse,
- puede recibirse parcialmente,
- puede recibirse en varias veces\.

__51\. Entrada → líneas__

inventory\_entries 1 ─── N inventory\_entry\_lines

products 1 ─── N inventory\_entry\_lines

__52\. Línea compra → líneas de entrada__

purchase\_lines 1 ─── 0\.\.N inventory\_entry\_lines

Esto permite múltiples recepciones parciales\.

__53\. Entrada → movimiento__

Normalmente:

inventory\_entries 1 ─── 0\.\.1 inventory\_movements

Cuando está en:

DRAFT

no existe movimiento\.

Cuando está:

CONFIRMED

debe existir el movimiento correspondiente\.

__54\. Integridad importante__

Debe ser imposible tener:

inventory\_entry\.status = CONFIRMED

sin que exista su movimiento oficial\.

Esto se garantizará a nivel de servicio/transacción y podrá reforzarse con validaciones de integridad/reconciliación\.

__55\. Restricciones principales de purchases__

subtotal\_amount >= 0

tax\_amount >= 0

total\_amount >= 0

y conceptualmente:

total\_amount = subtotal\_amount \+ tax\_amount

si no introducimos descuentos/fletes separados\.

Si luego agregamos otros cargos, ajustaremos la fórmula\.

__56\. Restricciones de purchase\_lines__

ordered\_quantity > 0

unit\_cost\_original >= 0

unit\_cost\_base >= 0

line\_subtotal >= 0

line\_total >= 0

__57\. Restricciones de inventory\_entry\_lines__

quantity > 0

unit\_cost\_original >= 0

unit\_cost\_base >= 0

total\_cost\_base >= 0

Además:

total\_cost\_base ≈ quantity × unit\_cost\_base

con precisión/rounding controlado\.

__58\. Unidad y cantidades decimales__

Antes de confirmar:

product\.unit\.allows\_decimals

debe validar quantity\.

Ejemplo:

UNIDAD

allows\_decimals = false

No puede recibir:

1\.5

Mientras un producto medido en metros podría hacerlo\.

__59\. Producto inactivo__

Una compra o entrada no debería confirmarse si producto está:

BLOCKED

MERGED

Para INACTIVE, podría existir una excepción administrativa si estamos liquidando/regularizando stock\.

La política exacta se implementará según estado\.

__60\. Sucursal inactiva__

No debe recibir nuevas compras/entradas\.

Historia permanece\.

__61\. Proveedor inactivo__

Una compra nueva no debería usarlo\.

Una compra histórica sí conserva la FK\.

__62\. Documento y referencia histórica__

No debemos depender de que el proveedor cambie luego su nombre\.

Puede ser conveniente guardar snapshots como:

supplier\_name\_snapshot

supplier\_document\_snapshot

en compra\.

¿Es necesario?

No estrictamente, porque proveedor histórico no se elimina\.

Pero si se cambia razón social, un documento antiguo debería mostrar el nombre de aquella época\.

Mi recomendación es considerar snapshots comerciales en las operaciones importantes\.

__63\. ¿Añadimos snapshots ahora?__

Para purchases, recomiendo agregar:

supplier\_name\_snapshot

supplier\_document\_snapshot

opcionales pero rellenados al confirmar\.

Así la impresión histórica no depende de datos actuales del proveedor\.

Esto mismo probablemente lo haremos más adelante en ventas con cliente/producto\.

__64\. Descripción del producto histórica__

purchase\_lines puede conservar:

product\_reference\_snapshot

product\_name\_snapshot

Esto es útil porque el producto puede cambiar de nombre posteriormente\.

Recomiendo incorporarlos\.

__Campos adicionales en purchase\_lines__

__Campo__

__Tipo__

product\_reference\_snapshot

VARCHAR

product\_name\_snapshot

VARCHAR

No son fuente del catálogo; son evidencia histórica\.

__65\. Snapshot en entradas__

inventory\_entry\_lines no necesita repetir toda la descripción si ya se relaciona con purchase\_line\.

Pero para entradas sin compra puede ser útil\.

Podemos mantener solo product\_id y obtener historia desde movimientos/auditoría\.

No sobrecarguemos tablas innecesariamente\.

__66\. purchase\_number único__

Debe existir:

UNIQUE\(branch\_id, purchase\_number\)

o posiblemente empresa\+document type\.

Como el correlativo incluye sucursal, esa restricción es suficiente\.

__67\. entry\_number único__

Igualmente:

UNIQUE\(branch\_id, entry\_number\)

Ejemplo:

ENT\-MZK\-2026\-000001

__68\. Compras multi\-sucursal__

Una compra pertenece a una sucursal operativa\.

Si una factura abastece físicamente a dos sucursales, recomiendo que:

- se registre en la sucursal receptora principal,
- o se divida operativamente según recepción\.

No debemos convertir una sola purchase en origen de múltiples sucursales sin necesidad, porque complicaría costos, documentos y cierres\.

Si el negocio demuestra que compra centralmente para distribución directa, podremos extender\.

__69\. Compra central y posterior distribución__

El flujo más limpio es:

Compra en Juliaca

↓

Entrada Juliaca

↓

Transferencias a sucursales

Eso mantiene trazabilidad de inventario empresarial\.

__70\. Estado de recepción__

Podemos derivar:

purchase\.status

a partir de cantidades recibidas\.

Por ejemplo:

0 recibido          → APPROVED

0 < recibido < total → PARTIALLY\_RECEIVED

total recibido       → RECEIVED

No debería actualizarse manualmente sin relación con líneas\.

__71\. Cancelación de compra pendiente__

Si todavía no hay entradas:

purchase → CANCELLED

sin efecto de inventario\.

Si ya existen recepciones confirmadas:

no se puede simplemente cancelar la compra y borrar las entradas\.

Debe resolverse con devoluciones/reversiones apropiadas\.

__72\. Cancelación de entrada borrador__

Sin efecto\.

Puede pasar a:

CANCELLED

__73\. Entrada confirmada__

No se cancela borrando\.

Se revierte mediante flujo autorizado\.

__74\. Reconciliación compra vs entradas__

Debe poder calcularse:

purchase\_line\.received\_quantity

=

SUM\(inventory\_entry\_lines\.quantity confirmadas vinculadas\)

Idealmente received\_quantity será un agregado materializado/cacheado para rendimiento\.

La verdad histórica son las entradas confirmadas\.

__75\. ¿Guardar received\_quantity entonces?__

Sí, porque facilita:

- pantalla de compra,
- pendientes,
- concurrencia\.

Pero debe actualizarse transaccionalmente, nunca manualmente\.

__76\. Concurrencia en recepciones__

Si dos usuarios intentan recibir simultáneamente el saldo restante de una misma compra, debemos bloquear:

purchase\_line

antes de calcular el pendiente\.

Ejemplo:

Pendiente = 2

Usuario A recibe 2

Usuario B recibe 2

Solo una operación puede completar las dos unidades\.

__77\. Costo promedio y transacción__

Durante confirmación de entrada debemos bloquear también:

inventories

porque dos entradas simultáneas con costos diferentes deben producir un promedio determinístico\.

Ejemplo:

stock previo 10 @100

Entrada A: 5 @120

Entrada B: 5 @140

Ambas deben serializarse correctamente para producir el mismo valor final independientemente del orden, aunque los Kardex intermedios cambien según secuencia oficial\.

__78\. Orden oficial__

El servidor asignará la secuencia Kardex durante la transacción\.

No confiaremos en timestamps del dispositivo para ordenar contablemente\.

__79\. Auditoría__

Eventos importantes:

- proveedor creado/modificado/bloqueado,
- compra creada/aprobada/cancelada,
- entrada confirmada,
- costo corregido,
- documento duplicado detectado,
- entrada excepcional autorizada\.

__80\. Tablas formalmente definidas en este bloque__

Quedan:

suppliers

purchases

purchase\_lines

inventory\_entries

inventory\_entry\_lines

__81\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

Organización y seguridad

12

12

Catálogo maestro

9

21

Núcleo de inventario

9

30

Compras y entradas

5

__35__

Por ahora tenemos:

__35 tablas formalmente trabajadas\.__

__82\. Decisiones cerradas del Bloque 4__

1. Proveedor será global\.
2. Compra y entrada física serán entidades diferentes\.
3. Una compra puede tener varias recepciones\.
4. Una entrada no necesariamente proviene de compra\.
5. Inventario inicial reutiliza inventory\_entries\.
6. Transferencia recibida reutiliza inventory\_entries\.
7. Devolución de cliente reutiliza inventory\_entries\.
8. Ajuste positivo reutiliza inventory\_entries\.
9. Armado de kit reutiliza inventory\_entries\.
10. Las entradas confirmadas generan movimientos, lotes y Kardex\.
11. Las entradas pendientes no aumentan stock\.
12. Recepción parcial estará soportada\.
13. Se controlará cantidad recibida vs comprada\.
14. Compra conservará documento del proveedor\.
15. Documento duplicado será validado\.
16. Costos comerciales podrán guardar moneda original y base\.
17. Costo oficial de inventario será en moneda base\.
18. Producto puede aparecer varias veces en una compra si existen líneas comercialmente distintas\.
19. Una línea de entrada puede crear uno o varios lotes\.
20. El vínculo con lotes se hará mediante la infraestructura común\.
21. Entrada confirmada no se edita\.
22. Reversión dependerá de que no rompa inventario ya consumido\.
23. Recepciones offline serán provisionales hasta confirmación servidor\.
24. Cantidades respetarán la unidad de medida\.
25. Se conservarán snapshots comerciales importantes en compras\.

__Resultado__

Queda diseñado:

__Modelo lógico — Bloque 4: Proveedores, compras y entradas ✅__

El siguiente bloque recomendable es __Bloque 5: Clientes, ventas y detalle de ventas__, donde definiremos customers, sales y sale\_lines, incluyendo contado/crédito, precios, descuentos, precio mínimo, kits, snapshots históricos, autorización de precios y la conexión con inventory\_movements\. Después de ese bloque podremos diseñar receivables y pagos sobre una base comercial ya estable\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 5 de 12: Clientes, ventas y detalle de ventas__\.

Este bloque debe soportar correctamente:

- Cliente obligatorio\.
- CLIENTE VARIOS para contado\.
- Venta al contado\.
- Venta al crédito\.
- Venta con pago inicial\.
- Descuentos\.
- Precio sugerido\.
- Precio mínimo\.
- Autorizaciones\.
- SIMPLE\.
- KIT\_UNICO\.
- KIT\_COMPONENTES\.
- Operación offline\.
- Anulación/reversión posterior\.
- Relación con inventario, lotes y Kardex\.

En este bloque definiremos inicialmente __3 tablas nuevas__:

- customers
- sales
- sale\_lines

Las cuentas por cobrar y pagos se diseñarán en el __Bloque 6__, pero dejaremos desde ahora las relaciones preparadas\.

Con estas 3 tablas pasaríamos de __35 a 38 tablas formalmente diseñadas__\.

__Etapa 4\.2 — Bloque 5: Clientes y ventas__

__1\. Tabla customers__

__Propósito__

Representar a los clientes de manera global para toda la empresa\.

Un cliente __no pertenece exclusivamente a una sucursal__\.

Puede:

- Comprar en Juliaca\.
- Pagar posteriormente en Mazuko\.
- Tener deudas originadas en distintas sucursales\.

La sucursal solamente registra dónde se creó originalmente el cliente\.

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

origin\_branch\_id

BIGINT

FK → branches\.id, NULL

customer\_type

VARCHAR

NOT NULL

document\_type

VARCHAR

NULL

document\_number

VARCHAR

NULL

normalized\_document\_number

VARCHAR

NULL

legal\_name

VARCHAR

NOT NULL

normalized\_name

VARCHAR

NOT NULL

trade\_name

VARCHAR

NULL

phone

VARCHAR

NULL

email

VARCHAR

NULL

address

TEXT

NULL

credit\_limit

NUMERIC

NULL

is\_generic

BOOLEAN

NOT NULL DEFAULT FALSE

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK → users\.id, NULL

device\_id

BIGINT

FK → devices\.id, NULL

created\_offline

BOOLEAN

NOT NULL DEFAULT FALSE

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__2\. Tipo de cliente__

Propongo:

PERSON

COMPANY

GENERIC

El cliente especial:

CLIENTE VARIOS

se representará además mediante:

is\_generic = true

No dependeremos de que el nombre sea exactamente "CLIENTE VARIOS"\.

__3\. Documento del cliente__

Para clientes identificados tendremos:

document\_type

document\_number

Ejemplos:

DNI

RUC

CE

OTRO

No conviene hardcodear todos los documentos permanentemente; podremos tener configuración/catálogo posteriormente\.

__4\. Documento normalizado__

normalized\_document\_number permitirá eliminar diferencias triviales de formato para buscar duplicados\.

Ejemplo:

document\_number:

20\-12345678\-9

normalized:

20123456789

cuando la política del tipo documental permita esa normalización\.

__5\. Unicidad del documento__

Para documentos identificatorios reales:

company\_id

\+

document\_type

\+

normalized\_document\_number

debería ser único cuando exista documento\.

Esto responde a la regla funcional:

Documento exacto duplicado no debe crear dos clientes\.

Podremos aplicar un índice único parcial posteriormente\.

__6\. Cliente sin documento__

Debe permitirse para determinadas ventas al contado o clientes no formalizados\.

Entonces:

document\_type = NULL

document\_number = NULL

Pero si se solicita crédito, la política podría exigir cliente identificado\.

Funcionalmente ya acordamos que __crédito requiere un cliente real identificado__, no CLIENTE VARIOS\.

__7\. Clientes con nombres similares__

No se fusionan automáticamente\.

Ejemplo:

JUAN PEREZ

JUAN PÉREZ QUISPE

puede generar advertencia de similitud\.

Pero solo el documento exacto dará una condición segura de duplicado\.

__8\. Estados del cliente__

Propongo:

ACTIVE

INACTIVE

BLOCKED

MERGED

Podríamos necesitar REVIEW para sincronización/importación, pero no necesariamente como estado comercial permanente\.

__ACTIVE__

Puede operar normalmente\.

__INACTIVE__

No se recomienda para nuevas operaciones\.

__BLOCKED__

Existe una restricción administrativa\.

__MERGED__

Fue consolidado con otro cliente\.

__9\. Fusión de clientes__

De forma equivalente a productos, recomiendo preparar:

merged\_into\_customer\_id

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

NUMERIC

NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__29\. Cantidad__

Debe cumplir:

quantity > 0

y respetar:

products\.unit\_id

→ units\.allows\_decimals

__30\. Precio sugerido__

suggested\_unit\_price representa el precio que el sistema propuso al momento de crear/confirmar la venta\.

Debe conservarse aunque el precio maestro cambie posteriormente\.

__31\. Precio mínimo histórico__

minimum\_unit\_price conserva la regla comercial aplicada a esa línea\.

Esto es especialmente importante para:

- auditoría,
- venta offline,
- autorizaciones\.

__32\. Precio final__

final\_unit\_price es el precio realmente acordado\.

Regla:

final\_unit\_price >= 0

Para ventas ordinarias será:

> 0

Una entrega gratuita no debe ocultarse poniendo arbitrariamente precio cero; debería seguir un flujo distinto si el negocio lo necesita\.

__33\. Descuento__

Podemos almacenar ambos:

discount\_amount

discount\_percentage

aunque uno pueda derivarse\.

Esto conserva la evidencia exacta y simplifica reportes\.

Pero debe existir consistencia matemática\.

__34\. Precio mínimo y autorización__

Ejemplo:

suggested = 200

minimum = 180

final = 175

Entonces:

requires\_price\_approval = true

price\_approval\_id NOT NULL

La aprobación debe estar:

APPROVED

antes de confirmar venta\.

__35\. Venta exactamente al mínimo__

final = minimum

se permite normalmente\.

No requiere autorización adicional por estar justo en el mínimo\.

__36\. Descuento máximo del vendedor__

Además del mínimo puede existir:

max\_discount\_percentage

por rol/sucursal\.

No necesitamos guardar ese límite en sale\_lines\.

La configuración aplicada queda en auditoría/aprobación y podemos guardar el porcentaje usado\.

La validación ocurre antes de confirmar\.

__37\. price\_id y price\_version__

Esto soporta venta offline\.

Ejemplo:

price\_id = 80

price\_version = 4

El dispositivo puede demostrar:

esta venta utilizó la versión de precio que tenía sincronizada\.

__38\. min\_price\_id y min\_price\_version__

Mismo principio\.

El servidor puede saber qué mínimo conocía legítimamente el dispositivo\.

Esto será central para resolver conflictos de precio offline\.

__39\. Precio cambiado durante offline__

Ejemplo:

PWA tenía:

minimum = 180

version = 5

Servidor cambia después a:

minimum = 190

version = 6

Venta offline hecha legítimamente a:

185

podrá revisarse usando la versión 5 almacenada\.

No deberíamos evaluarla ciegamente contra el precio actual\.

__40\. Costo oficial de la línea__

official\_unit\_cost y official\_total\_cost deben ser:

- NULL mientras la venta está en borrador\.
- establecidos por servidor al confirmar\.

El vendedor no los introduce\.

__41\. ¿Por qué guardar costo en sale\_lines si existe Kardex?__

Porque es útil para:

- margen histórico,
- devoluciones,
- reportes comerciales,
- no depender siempre de recorrer Kardex\.

Pero debe provenir exactamente del movimiento oficial\.

Entonces:

sale\_line\.official\_total\_cost

=

SUM\(costos de movement lines asociadas a esa línea comercial\)

__42\. SIMPLE__

Para un producto:

product\_type = SIMPLE

una sale\_line normalmente genera:

1 inventory\_movement\_line OUT

más sus lot\_allocations\.

__43\. KIT\_UNICO__

Se comporta igual que un producto físico normal:

sale\_line

↓

inventory\_movement\_line OUT del kit

↓

lot\_allocations

↓

Kardex del kit

__44\. KIT\_COMPONENTES__

Aquí la venta comercial y el inventario físico son diferentes\.

Ejemplo:

Sale line:

KIT MOTOR × 1

pero inventario genera:

OUT componente A ×2

OUT componente B ×1

OUT componente C ×4

Por tanto no podemos asumir:

sale\_line 1 → exactamente 1 movement\_line

__45\. Relación venta comercial → movimiento físico__

Necesitamos poder relacionar una sale\_line con una o varias inventory\_movement\_lines\.

¿Crear una tabla puente?

Podríamos añadir:

sale\_line\_inventory\_movement\_lines

Pero antes de crear otra tabla, existe una opción más general\.

Agregar en:

inventory\_movement\_lines

una referencia de origen a la línea comercial\.

Sin embargo, eso volvería a introducir relaciones específicas dentro del núcleo común\.

Mi recomendación es __crear una tabla puente genérica posteriormente__ para enlazar líneas transaccionales con líneas de inventario, o permitir un origen de línea\.

Para ventas, la opción explícita y segura sería:

sale\_line\_inventory\_lines

Pero eso sería una tabla nueva\.

__46\. ¿La necesitamos realmente?__

Sí, porque necesitamos responder de forma inequívoca:

¿Qué movimientos físicos generó esta línea de venta?

Especialmente para:

- KIT\_COMPONENTES,
- devoluciones,
- costo histórico,
- auditoría\.

Por tanto propongo incorporar una __cuarta tabla en este bloque__:

sale\_line\_inventory\_lines

__47\. Tabla sale\_line\_inventory\_lines__

__Propósito__

Relacionar una línea comercial de venta con una o varias líneas de movimiento físico\.

__Campos__

__Campo__

__Tipo__

__Regla__

sale\_line\_id

BIGINT

FK → sale\_lines\.id, NOT NULL

inventory\_movement\_line\_id

BIGINT

FK → inventory\_movement\_lines\.id, NOT NULL

relationship\_type

VARCHAR

NOT NULL

Restricción:

UNIQUE\(sale\_line\_id, inventory\_movement\_line\_id\)

__48\. Tipo de relación__

Ejemplos:

DIRECT\_PRODUCT

KIT\_COMPONENT

PREASSEMBLED\_KIT

Esto permitirá distinguir el motivo físico\.

__49\. Ejemplo SIMPLE__

sale\_line \#10

Producto A ×5

Relación:

sale\_line\_inventory\_lines

10 → movement\_line 500

DIRECT\_PRODUCT

__50\. Ejemplo KIT\_COMPONENTES__

sale\_line \#20

KIT MOTOR ×1

puede tener:

20 → movement\_line 510 / KIT\_COMPONENT

20 → movement\_line 511 / KIT\_COMPONENT

20 → movement\_line 512 / KIT\_COMPONENT

Así podemos reconstruir costo y devolución con precisión\.

__51\. Kit parcialmente prearmado \+ componentes__

Ya habíamos definido que si existen kits prearmados y también armables, se recomienda utilizar prearmado primero\.

Ejemplo venta:

2 KIT MOTOR

Stock:

1 kit prearmado

\+

componentes suficientes para 1

Una única sale\_line podría generar:

OUT KIT terminado ×1

OUT componente A ×2

OUT componente B ×1

\.\.\.

La tabla puente soporta perfectamente este escenario\.

__52\. kit\_version\_id__

Será obligatorio cuando la línea comercial sea:

KIT\_COMPONENTS

para congelar la receta utilizada\.

Para KIT\_UNICO, podría ser NULL, porque funciona como producto terminado y no necesita consumir receta al vender\.

__53\. Versión histórica de kit__

Nunca debemos resolver una venta histórica leyendo:

kit actual

La línea apunta a:

kit\_version\_id

utilizado al momento de venta\.

__54\. Venta de kit offline__

El dispositivo deberá tener:

- producto\.
- versión de kit\.
- componentes\.
- stock estimado\.
- precios/minimos\.

La venta guardará la kit\_version\_id o su UUID/versionado local equivalente\.

Servidor revalidará\.

__55\. Cálculo del costo de KIT\_COMPONENTES__

official\_total\_cost de sale\_lines será la suma de todos los movimientos físicos relacionados:

SUM\(inventory\_movement\_lines\.total\_cost\)

que correspondan a sus componentes/kit físico\.

El precio comercial del kit sigue siendo independiente\.

__56\. Una venta genera un movimiento de inventario__

Para mantener atomicidad, recomiendo que una venta confirmada genere normalmente:

1 inventory\_movement

en la misma sucursal, con todas sus líneas físicas\.

Ejemplo:

Venta V100

├── Producto A

├── Producto B

└── KIT COMPONENTES

Puede generar:

Inventory movement M100

├── OUT A

├── OUT B

├── OUT componente C

├── OUT componente D

└── \.\.\.

__57\. Relación sales → inventory\_movements__

Podemos apoyarnos en:

inventory\_movements\.source\_type = SALE

inventory\_movements\.source\_id = sales\.id

Por tanto no necesitamos inventory\_movement\_id directamente en sales\.

Aunque podría acelerar consultas, sería redundante\.

__58\. Confirmación de venta__

Debe ocurrir en una sola transacción\.

Conceptualmente:

BEGIN

1. Bloquear venta\.
2. Validar estado\.
3. Validar cliente\.
4. Validar sucursal\.
5. Validar precios/versiones\.
6. Validar autorizaciones\.
7. Bloquear inventarios\.
8. Validar stock disponible\.
9. Resolver KIT\_COMPONENTES\.
10. Seleccionar lotes PEPS\.
11. Crear movimiento\.
12. Crear líneas de movimiento\.
13. Crear asignaciones de lotes\.
14. Reducir lotes/ubicaciones\.
15. Actualizar inventarios\.
16. Crear Kardex\.
17. Crear CxC si corresponde\.
18. Crear pago inicial/contado si corresponde\.
19. Actualizar costo oficial de líneas\.
20. Confirmar venta\.

COMMIT

Si cualquier paso falla:

ROLLBACK

__59\. Venta al contado__

Regla:

sale\_type = CASH

Entonces:

credit\_amount = 0

initial\_payment\_amount = total\_amount

due\_date = NULL

y debe existir pago confirmado por el total dentro de la misma operación lógica\.

__60\. Venta al crédito__

sale\_type = CREDIT

Entonces:

initial\_payment\_amount = 0

credit\_amount = total\_amount

due\_date NOT NULL

Generará receivable en Bloque 6\.

__61\. Venta parcial__

sale\_type = PARTIAL

Entonces:

0 < initial\_payment\_amount < total\_amount

credit\_amount = total\_amount \- initial\_payment\_amount

due\_date NOT NULL

Genera:

- pago inicial,
- cuenta por cobrar por saldo\.

__62\. Restricción matemática de la venta__

Debe cumplirse:

total\_amount

=

initial\_payment\_amount

\+

credit\_amount

para las modalidades que estamos modelando, salvo diferencias tributarias/redondeos que deben calcularse antes\.

Y:

initial\_payment\_amount >= 0

credit\_amount >= 0

__63\. Totales de líneas__

Idealmente:

sales\.subtotal\_amount

=

SUM\(sale\_lines\.subtotal\_amount\)

y posteriormente:

total =

subtotal

\- descuentos

\+ impuestos

según la regla final comercial\.

El servidor calcula; frontend solo presenta\.

__64\. Venta con varios métodos de pago__

No cambia sales\.

Ejemplo contado:

Total = 1,000

Pago:

Efectivo = 400

Yape = 600

Eso será:

1 payment

2 payment\_method\_lines

en el Bloque 6\.

__65\. Venta con varios pagos iniciales__

También puede soportarse\.

Por ejemplo:

Pago inicial:

Efectivo 200

Yape 300

continúa siendo conceptualmente un pago inicial total de 500 con componentes de método\.

__66\. Venta offline__

Campos necesarios ya están presentes:

uuid

device\_id

created\_offline

operation\_date

price versions

kit version

La venta local puede existir antes de tener un id oficial gracias al UUID\.

__67\. UUID generado en cliente__

En una venta offline:

uuid

se genera en dispositivo\.

Servidor conserva ese mismo UUID\.

No genera uno diferente al sincronizar\.

__68\. Estado local vs estado servidor__

No debemos introducir estados de sincronización dentro de sales\.status\.

Por ejemplo:

PENDIENTE\_SYNC

no es estado de negocio de venta\.

La sincronización vive en:

sync\_operations

La venta local todavía no oficial puede estar en IndexedDB\.

Cuando llega al servidor:

- confirmada,
- conflicto,
- rechazada,

según resultado\.

__69\. Venta con stock insuficiente al sincronizar__

No se crea venta confirmada parcial\.

Resultado:

CONFLICT

en la infraestructura sync/conflictos\.

No se produce:

- movimiento,
- Kardex,
- CxC,
- pago oficial\.

__70\. Reasignación de lote__

Si la cantidad total sigue disponible pero el lote provisional se agotó:

- servidor puede reasignar PEPS\.
- lot\_allocations guarda asignación oficial\.
- sync\_operation conserva payload original\.

No necesitamos guardar lote provisional en sale\_lines\.

__71\. Venta bajo mínimo offline__

Ya definimos:

no debe autorizarse una nueva excepción bajo mínimo estando offline\.

Pero puede aceptarse una venta que respetó legítimamente la versión mínima cacheada, según política\.

Esto es posible gracias a:

min\_price\_id

min\_price\_version

minimum\_unit\_price

en la línea\.

__72\. Anulación de borrador__

Si:

status = DRAFT

cancelar no toca:

- inventario,
- Kardex,
- CxC,
- pagos\.

Podría simplemente pasar a:

CANCELLED

__73\. Anulación de venta confirmada__

No debemos eliminar:

sales

sale\_lines

La operación de reversión:

- crea movimiento inverso,
- afecta CxC,
- puede requerir reembolso si hubo dinero\.

El bloque específico de devoluciones/reversiones detallará el vínculo\.

__74\. cancelled\_at y cancelled\_by__

Aunque la anulación real tenga una operación de reversión, estos campos son útiles en sales para consultar rápidamente que la venta fue anulada\.

Debe existir además trazabilidad hacia la reversión\.

Probablemente agregaremos posteriormente:

reversal\_id

o una relación mediante tabla de devoluciones/reversiones\.

No hace falta decidirlo aún\.

__75\. Restricción de anulación__

El vendedor:

NO

puede anular venta sincronizada/confirmada\.

Encargado:

- mismo día,
- sucursal local,
- día abierto,
- permiso,
- motivo\.

Administrador:

- mayor alcance,
- reglas de día cerrado\.

Esto no requiere más columnas aparte de usuarios, motivo y auditoría\.

__76\. Venta y día cerrado__

Al confirmar:

operation\_date

debe verificarse contra:

daily\_closings

Si día cerrado:

rechazar/conflicto

según origen online/offline\.

__77\. Cliente creado offline__

customers\.uuid permite:

C1 local

↓

sale\.customer UUID C1

Durante sincronización:

1. Crear/reconciliar cliente\.
2. Obtener ID servidor\.
3. Crear venta\.

La dependencia formal estará en sync\_operation\_dependencies\.

__78\. Cliente duplicado offline__

Si documento coincide exactamente con cliente existente:

- no crear segundo cliente,
- asociar venta al cliente canónico,
- registrar resolución\.

Esto no modifica la estructura sales\.

__79\. Venta y utilidad__

La utilidad bruta de línea podrá calcularse:

sale\_line\.total\_amount

\-

sale\_line\.official\_total\_cost

considerando devoluciones/descuentos según reporte\.

No debe mostrarse al vendedor si no tiene permiso\.

__80\. Costo oculto__

Que official\_unit\_cost exista en DB no significa que cualquier usuario pueda verlo\.

Backend aplicará:

inventory\.costs\.view

o equivalente\.

Nunca depender exclusivamente de ocultar una columna en React\.

__81\. Snapshot de producto__

Conservamos:

product\_reference\_snapshot

product\_name\_snapshot

product\_type\_snapshot

porque una referencia/nombre podría cambiar posteriormente\.

La FK product\_id sigue manteniendo identidad real\.

__82\. ¿Marca snapshot?__

No la añadiría inicialmente\.

Si posteriormente es necesario imprimir marca histórica exacta podemos obtenerla de auditoría o agregarla\.

No debemos duplicar todos los atributos maestros en cada línea\.

Referencia y nombre sí tienen mayor valor documental\.

__83\. ¿Precio sugerido puede ser NULL?__

Para una venta ordinaria, recomiendo:

suggested\_unit\_price NOT NULL

incluso si fue igual al final\.

Eso nos permite auditar diferencias\.

__84\. Precio mínimo puede ser NULL__

Sí\.

Por ejemplo un producto todavía puede no tener mínimo configurado\.

Entonces:

minimum\_unit\_price = NULL

min\_price\_id = NULL

La política podría posteriormente bloquear ventas de productos sin mínimo, pero no es obligatorio actualmente\.

__85\. Descuento porcentual__

Debe respetar:

0 <= discount\_percentage <= 100

aunque un descuento de 100% probablemente debería requerir flujo especial\.

__86\. Cantidad devuelta__

¿Guardamos returned\_quantity en sale\_lines?

Podría ser útil\.

Ejemplo:

quantity = 10

returned\_quantity = 3

Pero la verdad histórica serán:

customer\_return\_lines

Podemos mantener returned\_quantity como agregado cacheado para validar rápidamente\.

Mi recomendación:

añadir returned\_quantity NUMERIC DEFAULT 0\.

Esto facilitará impedir devoluciones superiores a lo vendido\.

__87\. Campo adicional en sale\_lines__

Agregamos:

__Campo__

__Tipo__

__Regla__

returned\_quantity

NUMERIC

NOT NULL DEFAULT 0

Invariante:

0 <= returned\_quantity <= quantity

Se actualiza solo mediante devoluciones confirmadas\.

__88\. ¿Cantidad anulada?__

No\.

Si se anula la venta completa, no necesitamos modificar cantidades originales\.

La venta queda anulada y existe reversión\.

__89\. Cardinalidades__

__Empresa → clientes__

companies 1 ─── N customers

__Sucursal de origen__

branches 1 ─── N customers

pero es solo metadata de creación\.

__Cliente → ventas__

customers 1 ─── N sales

__Sucursal → ventas__

branches 1 ─── N sales

__Venta → líneas__

sales 1 ─── N sale\_lines

__Producto → líneas__

products 1 ─── N sale\_lines

__90\. Línea comercial ↔ líneas de inventario__

sale\_lines 1 ─── N sale\_line\_inventory\_lines

y:

inventory\_movement\_lines 1 ─── N sale\_line\_inventory\_lines

Normalmente una línea física pertenecerá a una sola línea comercial de venta, pero la tabla puente deja la relación explícita\.

__91\. Restricción del puente__

Una inventory\_movement\_line de una venta no debería relacionarse accidentalmente con dos sale\_lines diferentes\.

Podemos probablemente imponer:

UNIQUE\(inventory\_movement\_line\_id\)

en sale\_line\_inventory\_lines\.

¿Siempre?

Para el flujo actual, sí\.

Una línea física representa un producto/componente consumido por una línea comercial concreta\.

Por tanto recomiendo:

UNIQUE\(inventory\_movement\_line\_id\)

además de la combinación\.

__92\. ¿Qué pasa con un componente compartido entre dos kits vendidos?__

Ejemplo:

Sale line 1: Kit A

Sale line 2: Kit B

ambos consumen producto C\.

El movimiento puede crear dos líneas físicas separadas de producto C para mantener trazabilidad por venta, aunque técnicamente podrían agregarse\.

Recomiendo __no consolidarlas__ si provienen de líneas comerciales distintas\.

Así:

movement\_line C1 → Kit A

movement\_line C2 → Kit B

Esto mantiene costos y devoluciones claros\.

__93\. Sale line y precio__

Una línea no debe permitir cambiar precio después de:

sale\.status = CONFIRMED

Para corregir:

- devolución,
- anulación,
- nota/operación correctiva,

según caso\.

__94\. updated\_at en sale\_lines__

Podemos incluirlo mientras sea borrador\.

Después de confirmar debería quedar funcionalmente congelada\.

Recomiendo añadir:

updated\_at

para Laravel, aunque las reglas de aplicación eviten editar tras confirmación\.

__95\. status en sale\_lines__

No considero necesario inicialmente\.

El estado está en cabecera\.

Las devoluciones parciales se derivan mediante returned\_quantity\.

No agreguemos un estado por línea sin requerimiento\.

__96\. Venta multi\-sucursal__

Una venta pertenece exactamente a:

1 branch

No debe vender inventario de varias sucursales en la misma venta\.

Si Mazuko no tiene producto:

- consultar otra sucursal,
- generar transferencia,
- vender cuando esté disponible,

pero no descontar remotamente inventario de Juliaca desde una venta Mazuko\.

Esto simplifica y protege el control de stock/cierre\.

__97\. Venta y reserva__

En V1 acordamos evitar reservas complejas para ventas ordinarias\.

Por tanto un borrador de venta:

NO

reserva stock normalmente\.

Solo al confirmar se bloquea/transacciona\.

Esto evita stock “secuestrado” por carritos abandonados\.

__98\. Validaciones antes de confirmar__

La venta debe validar al menos:

- sucursal activa,
- usuario autorizado,
- dispositivo autorizado si aplica,
- cliente válido,
- cliente no genérico si hay crédito,
- productos válidos,
- cantidades válidas,
- precio válido,
- descuento permitido,
- mínimo,
- aprobación si corresponde,
- kit/versiones,
- stock disponible,
- lotes,
- día abierto,
- UUID no procesado\.

__99\. Idempotencia__

Debe existir:

UNIQUE\(sales\.uuid\)

Si dispositivo reenvía la misma venta:

Servidor devuelve la venta existente\.

No crea:

- segunda venta,
- segundo movimiento,
- segundo Kardex,
- segunda deuda\.

__100\. Validación de sale\_number__

UNIQUE\(branch\_id, sale\_number\)

Pero UUID sigue siendo la garantía para solicitudes repetidas\.

__101\. Venta offline confirmada localmente__

En UI podemos decir al usuario que la venta está:

PENDIENTE DE SINCRONIZACIÓN

pero eso corresponde a IndexedDB/sync\.

En PostgreSQL no existirá como venta oficial confirmada hasta aceptar la operación\.

Esto mantiene clara la autoridad\.

__102\. Relación futura con receivables__

En el Bloque 6 tendremos:

sales 1 ─── 0\.\.1 receivables

para ventas que dejan saldo\.

__103\. Relación futura con payments__

Una venta podrá estar relacionada con pagos:

- pago de contado,
- inicial,
- posteriores a través de CxC\.

No recomiendo poner:

payment\_id

en sales\.

Eso rompería pagos múltiples\.

__104\. Relación futura con devoluciones__

sales 1 ─── N customer\_returns

y:

sale\_lines 1 ─── N customer\_return\_lines

Eso se diseñará en Bloque 7\.

__105\. Relación futura con aprobaciones__

Ya usamos:

sale\_lines\.price\_approval\_id

Esto supone la tabla approvals que diseñaremos en Bloque 12\.

La FK podrá agregarse mediante una migración posterior o crearse la tabla antes físicamente durante implementación\.

El orden lógico no tiene que ser exactamente el orden de migraciones\.

__106\. Integridad de cliente genérico__

Podemos reforzar mediante lógica:

IF customers\.is\_generic

THEN sales\.credit\_amount = 0

Como esto cruza tablas, no se resuelve fácilmente con un CHECK simple\.

Se validará transaccionalmente en Laravel\.

__107\. Integridad empresa__

Debe cumplirse:

sale\.company\_id

=

branch\.company\_id

=

customer\.company\_id

y productos pertenecen a la misma empresa\.

Estas relaciones se validarán en servicio y, donde sea conveniente, con restricciones adicionales\.

__108\. ¿company\_id en sales es redundante?__

Sí, porque podría derivarse de branch\_id\.

Pero recomiendo conservarlo en grandes tablas transaccionales como sales por:

- consultas,
- seguridad,
- futuros índices,
- posible evolución multiempresa\.

Debe mantenerse consistente con branch\.

__109\. company\_id en sale\_lines__

No hace falta\.

Se deriva:

sale\_line → sale → company

__110\. Restricciones de customers__

Entre otras:

legal\_name <> ''

Si:

is\_generic = true

debe existir un solo cliente genérico activo por empresa\.

Posteriormente podemos crear un índice parcial:

UNIQUE\(company\_id\)

WHERE is\_generic = true AND status = 'ACTIVE'

__111\. Restricciones de sales__

subtotal\_amount >= 0

discount\_amount >= 0

tax\_amount >= 0

total\_amount > 0

initial\_payment\_amount >= 0

credit\_amount >= 0

Y:

discount\_amount <= subtotal\_amount

según estructura final tributaria\.

__112\. Restricciones de sale\_lines__

quantity > 0

suggested\_unit\_price >= 0

minimum\_unit\_price >= 0 OR NULL

final\_unit\_price >= 0

discount\_amount >= 0

official\_unit\_cost >= 0 OR NULL

official\_total\_cost >= 0 OR NULL

returned\_quantity >= 0

returned\_quantity <= quantity

__113\. Costo antes de confirmación__

En borrador:

official\_unit\_cost = NULL

official\_total\_cost = NULL

No cero\.

Porque cero significaría que el costo oficial realmente fue cero\.

__114\. Producto sin costo__

Si existe stock con costo promedio desconocido/cero por excepción:

Para ventas simples podríamos permitir según política administrativa, pero generaría margen no confiable\.

Para KIT\_COMPONENTES ya habíamos acordado que componente sin costo conocido debería bloquear normalmente la venta oficial salvo excepción especial\.

Esto se resolverá en validación\.

__115\. Venta confirmada y movimientos__

Debe cumplirse:

sale\.status = CONFIRMED

→ existe el inventory\_movement correspondiente, salvo venta excepcional sin salida física que no está contemplada como venta normal\.

Además, si:

credit\_amount > 0

→ existe su receivable\.

Y si:

initial\_payment\_amount > 0

→ existen pagos correspondientes\.

__116\. Venta y transacción atómica__

Esto significa que nunca aceptaremos estados como:

Venta CONFIRMED

pero no descontó inventario

o:

Venta crédito CONFIRMED

pero no existe deuda

Si falla cualquier parte:

ROLLBACK

__117\. Auditoría__

Eventos importantes:

- cliente creado,
- cliente fusionado,
- venta creada,
- precio modificado,
- descuento aplicado,
- autorización solicitada,
- autorización aceptada,
- venta confirmada,
- venta rechazada,
- venta anulada,
- venta sincronizada,
- lote reasignado\.

La tabla audit\_events se diseñará después\.

__118\. Tablas formalmente definidas en este bloque__

Inicialmente íbamos a agregar 3, pero por la necesidad de relacionar correctamente kits con movimientos físicos hemos incorporado una cuarta:

customers

sales

sale\_lines

sale\_line\_inventory\_lines

Por tanto:

__4 nuevas tablas\.__

__120\. Decisiones cerradas del Bloque 5__

1. Cliente será global\.
2. Cliente tendrá sucursal de origen, no sucursal exclusiva\.
3. Documento exacto normalizado será controlado\.
4. Clientes similares no se fusionan automáticamente\.
5. CLIENTE VARIOS se identifica por is\_generic\.
6. Solo podrá utilizarse sin saldo pendiente\.
7. Cliente podrá fusionarse conservando historial\.
8. Saldo no se almacenará como verdad en customers\.
9. Venta tendrá una sola sucursal\.
10. Venta tendrá UUID idempotente\.
11. Venta y pago serán entidades separadas\.
12. Venta y movimiento de inventario serán entidades separadas\.
13. Venta podrá ser CASH, CREDIT o PARTIAL\.
14. Crédito requiere fecha de vencimiento\.
15. Pago inicial y crédito original quedarán registrados\.
16. Estado financiero no se mezclará con estado operativo de venta\.
17. Venta conservará snapshot del cliente\.
18. Línea conservará snapshot de referencia/nombre/tipo de producto\.
19. Precio sugerido/final/mínimo quedarán evidenciados\.
20. Versiones de precio/minimo quedarán vinculadas\.
21. Costo oficial se asigna en servidor\.
22. SIMPLE y KIT\_UNICO generan salida física directa\.
23. KIT\_COMPONENTES puede generar múltiples líneas físicas\.
24. Se crea sale\_line\_inventory\_lines para trazar esa relación\.
25. Venta puede mezclar kit prearmado y armado desde componentes\.
26. Cada kit compuesto conserva su kit\_version\_id\.
27. Venta confirmada se ejecutará atómicamente\.
28. Borrador no reserva stock por defecto\.
29. Offline no crea una segunda verdad de ventas en PostgreSQL\.
30. UUID evita duplicidad de sincronización\.
31. Anulación no elimina venta ni líneas\.
32. Devoluciones posteriores se relacionarán con líneas originales\.
33. returned\_quantity se mantendrá como agregado controlado\.
34. Costos y utilidad estarán protegidos por permisos\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 6 de 12: Cuentas por cobrar, pagos y reembolsos__\.

Este bloque debe soportar:

- Venta al crédito\.
- Pago parcial\.
- Pago total\.
- Pago inicial\.
- Cobros de deudas antiguas\.
- Pago de varias deudas con un solo pago\.
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

receivable\_adjustments

como historial de aumentos/reducciones de exigibilidad\.

__63\. Evaluación__

Tenemos dos enfoques:

__Enfoque simple__

receivables guarda:

original\_amount

paid\_amount

outstanding\_amount

y las devoluciones/anulaciones actualizan outstanding\_amount, quedando trazadas en sus propias tablas\.

__Enfoque robusto__

Crear:

receivable\_adjustments

para registrar cada modificación no proveniente de pago\.

Dado que estamos construyendo un sistema auditable y ya tenemos devoluciones, anulaciones y migración, recomiendo __incorporar esta tabla__\.

__64\. Tabla receivable\_adjustments__

__Propósito__

Registrar cambios al monto exigible de una cuenta por cobrar que no son pagos\.

Ejemplos:

CUSTOMER\_RETURN

SALE\_CANCELLATION

AUTHORIZED\_CORRECTION

INITIAL\_BALANCE\_CORRECTION

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

receivable\_id

BIGINT

FK → receivables\.id, NOT NULL

adjustment\_type

VARCHAR

NOT NULL

direction

VARCHAR

NOT NULL

amount

NUMERIC

NOT NULL

source\_type

VARCHAR

NOT NULL

source\_id

BIGINT

NOT NULL

reason\_id

BIGINT

FK → reason\_codes\.id, NULL

created\_by

BIGINT

FK → users\.id, NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

__65\. Dirección__

Valores:

INCREASE

DECREASE

Para V1 la mayoría serán:

DECREASE

por devolución/anulación\.

__66\. Nuevo cálculo conceptual del saldo__

Entonces el saldo se compone de:

original\_amount

\+ ajustes que aumentan

\- ajustes que reducen

\- pagos confirmados aplicados

y debe resultar igual a:

outstanding\_amount

Así obtenemos una trazabilidad mucho más limpia\.

__67\. Ejemplo devolución__

Deuda:

original = 1000

pagado = 400

saldo = 600

Devolución comercial:

receivable\_adjustment

direction = DECREASE

amount = 300

Nuevo saldo:

300

Sin inventar un pago\.

__68\. Devolución superior al saldo__

Ejemplo:

saldo = 200

devolución comercial = 300

Entonces:

receivable adjustment = 200

refund = 100

como ya definimos funcionalmente\.

Perfectamente trazable\.

__69\. Cambio en el conteo de tablas__

Con receivable\_adjustments este bloque ya no tiene 7, sino:

__8 tablas nuevas__

Quedan:

receivables

receivable\_adjustments

payment\_methods

payments

payment\_method\_lines

payment\_allocations

refunds

refund\_method\_lines

__70\. Pago en distinta moneda__

La estructura contempla:

currency\_code

exchange\_rate

Pero para V1, siendo PEN la moneda base, podemos restringir operativamente los cobros normales a moneda de la deuda o moneda base\.

No necesitamos implementar compensaciones cambiarias complejas ahora\.

__71\. Deuda en moneda distinta__

Si permitimos una compra/venta en otra moneda, debemos guardar moneda de la deuda\.

Los pagos cruzados de moneda requieren reglas de conversión y diferencias cambiarias\.

Eso no fue definido funcionalmente en profundidad\.

Por tanto:

El modelo queda preparado, pero V1 debería preferiblemente exigir pago en la misma moneda de la deuda o limitar ventas a PEN hasta definir la política cambiaria completa\.

No inventaremos contabilidad multimoneda avanzada\.

__72\. payment\_number__

Lo genera el servidor\.

Una operación offline puede tener UUID antes de recibir número oficial\.

Esto es importante:

UUID = identidad desde dispositivo

payment\_number = correlativo oficial servidor

__73\. Idempotencia__

payments\.uuid:

UNIQUE

Si un timeout hace reenviar la operación:

servidor devuelve el pago ya creado\.

No aplica dos veces a la deuda\.

__74\. Reembolsos y UUID__

Igualmente:

refunds\.uuid UNIQUE

aunque los reembolsos inicialmente serán operaciones online sensibles\.

__75\. Pagos offline y número interno__

El dispositivo no necesita reservar correlativos oficiales\.

Puede mostrar temporalmente algo como:

PENDIENTE / UUID corto

y al sincronizar recibe:

PAG\-MZK\-2026\-000125

Así evitamos colisiones de numeración offline\.

__76\. Clientes morosos__

No necesitamos columna:

customers\.is\_overdue

Se deriva de:

EXISTS receivables

WHERE outstanding\_amount > 0

AND due\_date < today

La política determina luego si:

- advertir,
- autorizar,
- bloquear crédito\.

__77\. Crédito límite__

Si en futuro activamos customers\.credit\_limit, el cálculo debe considerar:

SUM\(outstanding\_amount de receivables activas\)

No un campo de saldo manual\.

__78\. Índices futuros evidentes__

Sin cerrar aún el bloque formal de índices, sabemos que necesitaremos búsqueda rápida por:

receivables\.customer\_id

receivables\.origin\_branch\_id

receivables\.status

receivables\.due\_date

payments\.customer\_id

payments\.receiving\_branch\_id

payments\.operation\_date

payments\.status

payment\_allocations\.receivable\_id

Los detallaremos después\.

__79\. Integridad empresa__

Debe cumplirse:

receivable\.company\_id

=

customer\.company\_id

=

origin\_branch\.company\_id

Y para pago:

payment\.company\_id

=

customer\.company\_id

=

receiving\_branch\.company\_id

__80\. Cliente fusionado__

Si un cliente fue fusionado posteriormente, las deudas/pagos históricos pueden continuar apuntando al ID original para preservar historia, mientras consultas consolidadas siguen la relación merged\_into\_customer\_id\.

No debemos reescribir indiscriminadamente todos los registros históricos\.

__81\. Pago a cliente incorrecto__

No se corrige cambiando:

payments\.customer\_id

después de confirmar\.

Se anula el pago erróneo y se registra correctamente\.

__82\. Aplicación a deuda de otro cliente__

Debe bloquearse\.

Una payment\_allocation solo puede apuntar a una receivable cuyo:

customer\_id = payments\.customer\_id

salvo algún caso empresarial futuro explícito que hoy no existe\.

__83\. Aplicación cruzada de sucursal__

Sí se permite:

receivable\.origin\_branch\_id \!= payment\.receiving\_branch\_id

porque ya fue una decisión funcional\.

__84\. Pago con saldo inicial migrado__

Funciona exactamente igual:

receivable\.origin\_type = INITIAL\_BALANCE

y posteriormente:

payment\_allocations

lo reduce\.

No hay necesidad de venta falsa\.

__85\. Cancelación de venta con deuda no pagada__

Ejemplo:

receivable original = 1000

paid = 0

saldo = 1000

Anulación de venta:

receivable\_adjustment DECREASE 1000

y deuda queda:

outstanding = 0

status = CANCELLED

__86\. Venta parcialmente pagada y anulada__

Ejemplo:

original debt = 1000

paid = 400

outstanding = 600

Anulación:

- se reduce exigibilidad restante 600,
- pagos de 400 no se borran,
- debe determinarse reembolso de 400\.

Eso coincide exactamente con nuestras reglas funcionales\.

__87\. Reembolso parcial__

Puede existir:

refund\.total\_amount = 200

aunque el pago original fuera 400\.

El sistema deberá controlar cuánto ya fue reembolsado\.

__88\. ¿Guardar refunded\_amount en payments?__

Podría facilitar consultas\.

Pero la verdad está en:

refunds

Recomiendo no agregarlo inicialmente como campo maestro\.

Se puede calcular:

SUM\(refunds CONFIRMED vinculados\)

y cachear posteriormente si hace falta\.

__89\. Estado de pago después de reembolso__

Un pago reembolsado sigue:

CONFIRMED

porque el dinero realmente fue recibido\.

El reembolso es otra operación\.

Esto es fundamental\.

__90\. Cierre y pagos__

El cierre utilizará:

payments\.receiving\_branch\_id

payments\.operation\_date

payment\_method\_lines

para calcular cobros\.

Y:

refunds\.branch\_id

refund\_method\_lines

para salidas de dinero\.

__91\. Efectivo esperado__

El método:

payment\_methods\.is\_cash

permitirá sumar únicamente efectivo real\.

Y para reembolsos:

is\_cash = true

resta\.

__92\. Pago confirmado fuera de fecha/cierre__

Antes de confirmar:

- revisar fecha operativa,
- revisar cierre de sucursal receptora\.

Una operación offline que llega tarde a fecha ya cerrada entra en conflicto\.

__93\. Tabla de pagos no es caja__

Importante:

payments registra cobros a clientes\.

No debemos usarla para:

- retiro de caja,
- fondo inicial,
- ingreso extraordinario\.

Eso se diseñará en Bloque 10 mediante movimientos de caja\.

Así no mezclamos cobros comerciales con caja general\.

__94\. Restricciones lógicas de receivables__

original\_amount > 0

paid\_amount >= 0

outstanding\_amount >= 0

due\_date >= issue\_date

Podríamos permitir vencimiento mismo día\.

__95\. Restricciones de payments__

total\_amount > 0

y una venta/pago debe utilizar moneda válida\.

__96\. Restricciones de métodos__

payment\_method\_lines\.amount > 0

__97\. Restricciones de aplicaciones__

payment\_allocations\.amount > 0

y:

SUM\(allocations\) <= payment\.total\_amount

Para cobro de deuda completo, igualdad\.

__98\. Restricciones de ajustes de deuda__

receivable\_adjustments\.amount > 0

Una reducción nunca puede producir:

outstanding\_amount < 0

Si la devolución supera saldo, el exceso va por reembolso\.

__99\. Restricciones de reembolso__

refunds\.total\_amount > 0

y:

SUM\(refund\_method\_lines\.amount\)

=

refunds\.total\_amount

__100\. Transacción de venta parcial__

Con lo diseñado en Bloques 5 y 6 ya podemos expresar la operación completa:

Venta S/1,500

Pago inicial S/500

Saldo S/1,000

Una sola transacción crea:

sales

sale\_lines

inventory\_movement

inventory\_movement\_lines

lot\_allocations

kardex\_entries

payments = 500

payment\_method\_lines

receivables = 1000

Todo o nada\.

__101\. Transacción de venta contado__

sales

sale\_lines

inventory movement

Kardex

payment

payment\_method\_lines

No crea receivable\.

__102\. Venta crédito pura__

sales

sale\_lines

inventory movement

Kardex

receivable

No crea pago inicial\.

__103\. Costo e información financiera__

Las CxC y pagos no necesitan conocer costo de inventario\.

Separación:

sale → commercial amount

inventory movement → cost

receivable → amount owed

payment → money received

Esto es limpio contablemente\.

__104\. Auditoría__

Eventos relevantes:

- deuda creada,
- deuda vencida \(puede ser evento automático si se requiere\),
- pago creado,
- pago confirmado,
- aplicación realizada,
- aplicación automática propuesta,
- pago cancelado,
- deuda ajustada,
- reembolso solicitado,
- reembolso aprobado,
- reembolso confirmado,
- conflicto de pago\.

__105\. Tablas formalmente definidas en Bloque 6__

Quedan:

receivables

receivable\_adjustments

payment\_methods

payments

payment\_method\_lines

payment\_allocations

refunds

refund\_method\_lines

Total:

__8 tablas nuevas__

__106\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

1\. Organización y seguridad

12

12

2\. Catálogo maestro

9

21

3\. Núcleo de inventario

9

30

4\. Proveedores, compras y entradas

5

35

5\. Clientes y ventas

4

39

6\. CxC, pagos y reembolsos

8

__47__

El conteo sube a __47__, no 46, porque durante el diseño identificamos la necesidad real de receivable\_adjustments\.

Actualmente tenemos:

__6 de 12 bloques diseñados ✅__  
__47 tablas formalmente trabajadas__

__107\. Decisiones cerradas del Bloque 6__

1. Una deuda se representa individualmente en receivables\.
2. No existe saldo global editable en cliente\.
3. Venta al contado no crea CxC\.
4. Venta con saldo genera una CxC\.
5. Saldo inicial migrado puede generar CxC sin venta\.
6. Vencimiento es separado del estado financiero\.
7. Pago es una entidad independiente\.
8. Pago no afecta inventario/Kardex\.
9. Un pago puede utilizar varios métodos\.
10. Un pago puede aplicarse a varias deudas\.
11. Una deuda puede recibir múltiples pagos\.
12. Cobros entre sucursales están permitidos\.
13. Se distingue sucursal origen de deuda y sucursal receptora del dinero\.
14. No se permiten sobrepagos\.
15. Pago offline excesivo entra completo en conflicto\.
16. No existe aplicación parcial automática ante conflicto\.
17. UUID protege idempotencia\.
18. Venta contado/pago inicial puede vincular directamente payment\.sale\_id\.
19. Pago posterior usa payment\_allocations\.
20. El cliente del pago debe coincidir con el de las deudas\.
21. Anulación de pago no equivale a reembolso\.
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

NOT NULL DEFAULT 0

status

VARCHAR

NOT NULL

reason\_id

BIGINT

FK reason\_codes\.id

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

confirmed\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__15\. Tipo de devolución__

Podemos usar:

FULL

PARTIAL

Aunque técnicamente puede derivarse de cantidades, conservarlo facilita reportes\.

__16\. Venta original obligatoria__

En V1:

customer\_returns\.sale\_id NOT NULL

No queremos devoluciones sin saber qué venta originó el producto\.

Si aparece una situación histórica excepcional, puede resolverse administrativamente como otra entrada, no como devolución normal\.

__17\. Cliente__

Debe coincidir:

customer\_returns\.customer\_id

=

sales\.customer\_id

No se selecciona libremente\.

__18\. Tabla customer\_return\_lines__

__Propósito__

Registrar cada artículo realmente devuelto\.

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

customer\_return\_id

BIGINT

FK

sale\_line\_id

BIGINT

FK → sale\_lines\.id

product\_id

BIGINT

FK products\.id

quantity

NUMERIC

NOT NULL

condition

VARCHAR

NOT NULL

original\_sale\_unit\_price

NUMERIC

NOT NULL

commercial\_return\_amount

NUMERIC

NOT NULL

original\_official\_unit\_cost

NUMERIC

NOT NULL

inventory\_entry\_line\_id

BIGINT

FK → inventory\_entry\_lines\.id, NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__19\. Condición del producto__

Valores:

GOOD

DAMAGED

REVIEW

__GOOD__

Puede regresar a disponible\.

__DAMAGED__

Regresa físicamente pero no disponible\.

__REVIEW__

Regresa en condición pendiente de inspección\.

__20\. Cantidad máxima__

Debe cumplirse:

cantidad devuelta acumulada

<=

cantidad vendida

Usaremos:

sale\_lines\.returned\_quantity

como agregado rápido\.

Pero la historia oficial está en:

customer\_return\_lines

confirmadas\.

__21\. Concurrencia de devoluciones__

Ejemplo:

Venta = 1 unidad

Dos usuarios intentan devolver simultáneamente esa misma unidad\.

Debemos bloquear:

sale\_line

antes de validar returned\_quantity\.

Solo una puede confirmarse\.

__22\. Devolución y costo__

La entrada física utilizará:

original\_official\_unit\_cost

derivado de la venta original\.

No el precio comercial\.

Ejemplo:

Precio venta = 200

Costo oficial salida = 110

Devolución buena:

entrada inventario a costo 110

__23\. Devolución buena__

Generará reutilizando lo ya existente:

customer\_return

      ↓

inventory\_entry

type = CUSTOMER\_RETURN

      ↓

inventory\_entry\_lines

      ↓

inventory\_movement IN

      ↓

lot

      ↓

Kardex

No necesitamos crear otra infraestructura física\.

__24\. Devolución dañada__

También genera entrada física, pero:

damaged\_quantity ↑

available\_quantity no aumenta

El lote/estado correspondiente será dañado\.

__25\. Devolución REVIEW__

Entra físicamente a una condición no vendible\.

Después una inspección autorizada puede clasificar:

REVIEW → GOOD

o:

REVIEW → DAMAGED

sin inventar otra entrada\.

__26\. Devolución y dinero__

Supongamos:

Valor comercial devuelto = 300

Saldo pendiente = 500

Entonces:

receivable\_adjustment

DECREASE = 300

y:

refund = 0

__27\. Devolución mayor que deuda__

Ejemplo:

Valor devolución = 300

Saldo = 100

Entonces:

receivable\_adjustment DECREASE = 100

refund = 200

La tabla customer\_returns puede guardar:

debt\_reduction\_amount = 100

refund\_amount = 200

como resumen\.

__28\. Venta totalmente pagada__

Si:

saldo = 0

y devolución comercial = 300:

debt\_reduction\_amount = 0

refund\_amount = 300

Debe existir un refund real cuando el dinero se devuelva\.

__29\. ¿Devolución crea automáticamente reembolso?__

No necesariamente en el mismo instante\.

Podría existir:

customer\_return = CONFIRMED

refund pendiente de autorización

El sistema debe mostrar que existe monto a reembolsar\.

La relación vendrá mediante:

refunds\.customer\_return\_id

que ya dejamos preparado\.

__30\. KIT\_UNICO devuelto__

Se comporta como producto normal\.

customer\_return\_line

product = KIT\_UNICO

y entra el kit físico\.

__31\. KIT\_COMPONENTES devuelto__

Aquí no podemos suponer que regresó el kit completo\.

Por eso una sale\_line de kit puede originar varias líneas de devolución física\.

Ejemplo:

Venta:

KIT MOTOR

A ×2

B ×1

Cliente devuelve solamente:

A ×1

B ×1

customer\_return\_lines deberá poder representar componentes reales\.

__32\. Problema con sale\_line\_id \+ product\_id__

Esto justamente permite:

sale\_line\_id = KIT MOTOR

product\_id = componente A

aunque el producto comercial vendido fuera el kit\.

Así podemos registrar componentes reales retornados\.

__33\. Validación KIT\_COMPONENTES__

La cantidad devuelta de componentes debe compararse con los movimientos históricos vinculados mediante:

sale\_line\_inventory\_lines

No con la receta actual del kit\.

Esto respeta la versión histórica\.

__34\. Valor comercial de devolución de kit incompleto__

Ya habíamos dejado esto como política sensible\.

No existe una regla universal para prorratear automáticamente el precio comercial entre componentes\.

Por tanto:

devolución incompleta de KIT\_COMPONENTES requerirá cálculo/política explícita o autorización\.

La base soporta guardar:

commercial\_return\_amount

por línea\.

__35\. Conteos físicos__

Ahora definimos las tablas que habíamos identificado conceptualmente pero aún no formalizado\.

__inventory\_counts__

__Propósito__

Representar una sesión de conteo físico\.

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

branch\_id

BIGINT

FK

count\_number

VARCHAR

NOT NULL

count\_type

VARCHAR

NOT NULL

scope\_type

VARCHAR

NOT NULL

warehouse\_location\_id

BIGINT

FK, NULL

operation\_date

TIMESTAMPTZ

NOT NULL

blind\_count

BOOLEAN

DEFAULT FALSE

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK

started\_at

TIMESTAMPTZ

NULL

completed\_at

TIMESTAMPTZ

NULL

reviewed\_by

BIGINT

FK, NULL

approved\_by

BIGINT

FK, NULL

created\_offline

BOOLEAN

DEFAULT FALSE

device\_id

BIGINT

FK devices\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__36\. Tipos de conteo__

Propongo:

SPOT

PARTIAL

LOCATION

FULL

__SPOT__

Uno o pocos productos\.

__PARTIAL__

Grupo definido\.

__LOCATION__

Una ubicación física\.

__FULL__

Inventario general de sucursal\.

__37\. Estados de conteo__

DRAFT

IN\_PROGRESS

COMPLETED

WITH\_DIFFERENCES

UNDER\_REVIEW

APPROVED

CANCELLED

El conteo aprobado no necesariamente significa que hubo ajuste\.

Si todo coincide:

ajuste = ninguno

__38\. Conteo ciego__

blind\_count = true

significa que el usuario no ve el stock teórico antes de ingresar cantidad\.

Útil para auditorías\.

__39\. Tabla inventory\_count\_lines__

__Propósito__

Representar qué productos/lotes se cuentan\.

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

inventory\_count\_id

BIGINT

FK

product\_id

BIGINT

FK

lot\_id

BIGINT

FK lots\.id, NULL

warehouse\_location\_id

BIGINT

FK, NULL

system\_quantity\_snapshot

NUMERIC

NOT NULL

final\_counted\_quantity

NUMERIC

NULL

difference\_quantity

NUMERIC

NULL

status

VARCHAR

NOT NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__40\. Snapshot del sistema__

Cuando se inicia/fija la línea:

system\_quantity\_snapshot

conserva cuánto esperaba el sistema\.

Pero el conteo puede durar tiempo\.

Por eso, antes de ajustar, debemos verificar si hubo movimientos posteriores\.

__41\. Movimientos durante conteo__

Este es un tema importante\.

Ejemplo:

Conteo inicia:

Sistema = 10

Durante conteo:

Venta = 2

Usuario cuenta físicamente = 8

La diferencia real puede ser cero\.

Por eso no debemos calcular ciegamente:

8 \- 10 = \-2

sin considerar movimientos ocurridos entre el snapshot y la validación\.

__42\. Estrategia__

Cada conteo deberá conservar:

- momento de snapshot,
- cantidad snapshot,
- movimientos posteriores\.

Al revisar, el sistema calcula el saldo teórico ajustado a la hora efectiva del conteo cuando sea posible\.

Para conteos generales puede existir una política de congelamiento operativo, pero no quiero hacerla obligatoria en V1\.

__43\. Tabla inventory\_count\_attempts__

__Propósito__

Conservar todos los conteos/reconteos realizados\.

__Campos__

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

inventory\_count\_line\_id

BIGINT

FK

attempt\_number

INTEGER

NOT NULL

counted\_quantity

NUMERIC

NOT NULL

counted\_by

BIGINT

FK users\.id

device\_id

BIGINT

FK devices\.id, NULL

counted\_at

TIMESTAMPTZ

NOT NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

Restricción:

UNIQUE\(inventory\_count\_line\_id, attempt\_number\)

__44\. Ejemplo de reconteo__

Sistema ajustado = 10

Conteo 1 = 8

Conteo 2 = 9

Conteo 3 = 9

Podemos establecer:

final\_counted\_quantity = 9

sin borrar que inicialmente alguien contó 8\.

__45\. Conteo por producto vs lote__

La política funcional definida fue:

Primero producto; lotes especialmente cuando exista discrepancia o se requiera precisión\.

Por eso:

lot\_id = NULL

está permitido\.

Si posteriormente necesitamos determinar qué lote tiene la diferencia, se hace conteo/revisión por lote\.

__46\. Conteo no modifica inventario__

Aunque exista:

difference\_quantity = \-3

no hacemos:

inventories\.physical\_quantity \-= 3

todavía\.

Primero:

review

↓

approval

↓

inventory\_adjustment

__47\. Tabla inventory\_adjustments__

__Propósito__

Representar un ajuste oficial de inventario autorizado\.

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

branch\_id

BIGINT

FK

adjustment\_number

VARCHAR

NOT NULL

inventory\_count\_id

BIGINT

FK → inventory\_counts\.id, NULL

adjustment\_type

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

NOT NULL

reason\_id

BIGINT

FK reason\_codes\.id

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK

approved\_by

BIGINT

FK, NULL

confirmed\_by

BIGINT

FK, NULL

confirmed\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__48\. Tipos de ajuste__

POSITIVE

NEGATIVE

MIXED

VALUATION

__POSITIVE__

Solo aumentos\.

__NEGATIVE__

Solo disminuciones\.

__MIXED__

Un conteo general puede tener productos sobrantes y faltantes\.

__VALUATION__

Excepcional, sin cambio físico, si finalmente decidimos habilitar revalorización administrativa\.

__49\. Ajustes deben provenir de conteo__

Para ajustes normales de cantidad:

recomiendo exigir inventory\_count\_id\.

Es decir:

POSITIVE/NEGATIVE/MIXED

→ inventory\_count\_id NOT NULL

Así evitamos el botón peligroso:

“Cambiar stock”\.

__50\. Excepciones__

VALUATION podría no provenir de conteo físico porque corrige valor, no cantidad\.

Requeriría nivel administrador\.

__51\. Tabla inventory\_adjustment\_lines__

__Propósito__

Definir cada producto ajustado\.

__Campo__

__Tipo lógico__

__Regla__

id

BIGINT

PK

uuid

UUID

UNIQUE

inventory\_adjustment\_id

BIGINT

FK

inventory\_count\_line\_id

BIGINT

FK, NULL

product\_id

BIGINT

FK

lot\_id

BIGINT

FK, NULL

direction

VARCHAR

NOT NULL

quantity

NUMERIC

NOT NULL

unit\_cost

NUMERIC

NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__52\. Dirección__

IN

OUT

Como en movimientos\.

quantity siempre positiva\.

__53\. Ajuste negativo__

Ejemplo:

Sistema = 10

Conteo aprobado = 8

Entonces:

direction = OUT

quantity = 2

y genera:

inventory\_movement OUT

Kardex INVENTORY\_ADJUSTMENT

__54\. Ajuste positivo__

Sistema = 8

Conteo aprobado = 10

Entonces:

direction = IN

quantity = 2

y reutilizaremos además:

inventory\_entries

entry\_type = POSITIVE\_ADJUSTMENT

o podríamos generar directamente el movimiento\.

Aquí debemos evitar duplicación innecesaria\.

__55\. ¿Ajuste positivo necesita inventory\_entries?__

En el Bloque 4 definimos explícitamente:

inventory\_entries\.entry\_type = POSITIVE\_ADJUSTMENT

Por tanto debemos respetar esa decisión\.

El flujo será:

inventory\_adjustment

      ↓

inventory\_entry

      ↓

inventory\_movement IN

para el lado positivo\.

__56\. Ajuste negativo__

Para lado negativo, no necesitamos crear inventory\_exit genérica adicional si el origen es el propio ajuste\.

Podemos generar directamente:

inventory\_adjustment

↓

inventory\_movement OUT

porque ya existe una entidad específica de ajuste\.

No debemos duplicarlo como inventory\_exit\.

__57\. Ajuste mixto__

Un mismo ajuste podría generar:

movement

├── OUT producto A

├── IN producto B

└── OUT producto C

Nuestro núcleo soporta movimientos con líneas IN/OUT\.

Sin embargo, para líneas positivas necesitamos crear lotes\.

Eso se puede hacer directamente desde el movimiento/ajuste, aunque conceptualmente habíamos asociado entradas positivas con inventory\_entries\.

Para mantener una sola regla, recomiendo:

un ajuste mixto genera una inventory\_entry para sus líneas positivas y un movimiento de ajuste negativo para sus líneas negativas, ambos vinculados al mismo inventory\_adjustment\.

Esto deja más trazabilidad, aunque implica dos movimientos físicos\.

__58\. Alternativa más simple__

También podríamos permitir:

inventory\_adjustment

↓

1 inventory\_movement mixto

con líneas IN/OUT y crear lotes para IN\.

Eso es técnicamente más limpio\.

Entonces inventory\_entries no sería obligatorio para ajustes positivos, pese a lo planteado inicialmente\.

¿Cuál conviene?

Para evitar duplicar cabeceras, __prefiero ahora refinar la decisión__:

Los ajustes de inventario utilizarán directamente inventory\_adjustments → inventory\_movements\.

No crearán inventory\_entries adicionales\.

inventory\_entries\.entry\_type = POSITIVE\_ADJUSTMENT puede mantenerse para importaciones/otros flujos o eliminarse como tipo posteriormente\.

Esto reduce duplicación\.

__59\. Decisión de simplificación__

Entonces:

inventory\_adjustment

     ↓

inventory\_movement

     ├── IN

     └── OUT

Para una línea IN, el mismo movimiento crea el nuevo lote\.

Esto es perfectamente compatible con el núcleo que diseñamos\.

Por tanto en revisión final podremos retirar:

POSITIVE\_ADJUSTMENT

de inventory\_entries\.entry\_type si comprobamos que ya no se usa\.

Este es justamente el tipo de simplificación que queríamos hacer\.

__60\. Costo de ajuste positivo__

Si existe stock:

unit\_cost recomendado = average\_cost actual

Si stock = 0:

no tenemos promedio oficial vigente\.

Entonces debe:

- utilizar costo autorizado,
- posiblemente last\_average\_cost como sugerencia,
- requerir aprobación\.

No debemos inventar costo automáticamente\.

__61\. Costo de ajuste negativo__

Usa:

average\_cost actual

como cualquier salida oficial\.

__62\. Lotes de ajuste__

__Positivo__

Crea lote nuevo de ajuste\.

__Negativo__

Si el conteo identificó lote:

lot\_id específico

Si solo sabemos diferencia total, debe realizarse una regularización controlada de lotes antes/como parte del ajuste\.

No debemos reducir inventario agregado sin cuadrar lotes\.

__63\. Ajuste y ubicación__

Si conteo se hizo en una ubicación específica:

warehouse\_location\_id

la corrección debe reflejarse también en:

lot\_location\_stocks

para que siga cumpliéndose:

lote = suma ubicaciones

__64\. Estados de ajuste__

DRAFT

PENDING\_APPROVAL

APPROVED

CONFIRMED

CANCELLED

REJECTED

Solo CONFIRMED afecta inventario\.

__65\. Ajuste offline__

Conteo:

✅ Puede registrarse offline\.

Ajuste oficial:

❌ No debe confirmarse offline en V1\.

El servidor necesita:

- revisar saldo actual,
- movimientos ocurridos,
- lotes,
- cierre,
- autorizador\.

__66\. Conflicto de conteo offline__

Supongamos:

PWA:

stock conocido = 10

conteo físico = 9

pero antes de sincronizar existe venta oficial de 1\.

Servidor ahora tiene:

stock = 9

Entonces:

diferencia real = 0

No debe generar ajuste \-1 automáticamente\.

El conteo se reevalúa contra movimientos posteriores\.

__67\. Ajustes confirmados son inmutables__

Si ajuste fue incorrecto:

no editamos cantidad\.

Se realiza:

- nuevo conteo,
- nuevo ajuste correctivo,

o una reversión autorizada cuando sea segura\.

__68\. Reversión de otras salidas__

Ejemplo uso interno registrado por error:

inventory\_exit CONFIRMED

Si físicamente el producto sigue disponible, reversión genera:

inventory\_movement IN

restaurando lote original si es coherente\.

No se elimina el registro original\.

__69\. Pérdida recuperada__

No anulamos la pérdida si realmente ocurrió\.

Creamos una operación de recuperación:

inventory movement IN

con trazabilidad\.

Podría utilizar:

inventory\_entries\.entry\_type = RECOVERY

que ya definimos\.

Aquí sí tiene sentido conservar ese tipo de entrada\.

__70\. Devolución proveedor después de consumo parcial__

Debe verificarse el lote específico\.

Ejemplo:

Compra lote A = 10

Disponible lote A = 3

No puede devolver al proveedor:

5

aunque exista stock de otros lotes\.

Máximo:

3 de ese lote

si la devolución está vinculada a ese lote\.

__71\. Devolución proveedor y compra__

inventory\_exit\_lines\.source\_purchase\_line\_id permite controlar:

cantidad devuelta acumulada

<=

cantidad recibida relacionada

considerando existencias físicas\.

__72\. source\_lot\_id__

Para devoluciones/problemas específicos, ayuda a garantizar que la causa se refiere al lote correcto\.

Las asignaciones oficiales siguen quedando en:

lot\_allocations

__73\. ¿Necesitamos tabla específica de devolución a proveedor?__

No por ahora\.

Podemos representar correctamente:

inventory\_exits

exit\_type = SUPPLIER\_RETURN

más:

supplier\_id

source\_purchase\_line\_id

source\_lot\_id

Por tanto __reutilizamos__ y evitamos una tabla extra\.

__74\. ¿Necesitamos tabla para daño?__

Tampoco para la baja\.

inventory\_exits soporta baja definitiva\.

El estado dañado temporal vive en inventario/lote\.

Si necesitamos registrar el reporte inicial de daño con fotos, podemos usar una operación/incidencia y attachments, pero no hace falta crear una tabla nueva ahora\.

__75\. Efecto de una devolución en venta__

Una devolución confirmada actualizará:

sale\_lines\.returned\_quantity

transaccionalmente\.

Nunca:

sale\_lines\.quantity \-= returned

La cantidad vendida original permanece\.

__76\. Venta parcialmente devuelta__

Ejemplo:

sale\_line\.quantity = 10

returned\_quantity = 3

La venta original sigue diciendo:

10 vendidas

y reportes netos pueden calcular:

10 \- 3 = 7 netas

según reporte\.

__77\. Estados de customer\_returns__

Propongo:

DRAFT

PENDING\_APPROVAL

CONFIRMED

CANCELLED

REJECTED

CONFLICT

Solo confirmada produce efectos físicos/financieros\.

__78\. Devolución offline__

Por seguridad:

- puede crearse borrador offline,
- puede registrar inspección provisional,
- confirmación oficial debería ser online inicialmente\.

Esto coincide con la política conservadora definida\.

__79\. Transacción de devolución__

Una devolución confirmada puede tocar múltiples subsistemas\.

Debe ser atómica:

BEGIN

1\. Bloquear venta/líneas

2\. Validar cantidad retornable

3\. Validar cliente

4\. Calcular valor comercial

5\. Crear customer\_return

6\. Crear entrada física

7\. Crear lotes

8\. Actualizar inventario

9\. Crear Kardex

10\. Actualizar returned\_quantity

11\. Reducir receivable si existe saldo

12\. Determinar monto a reembolsar

13\. Dejar refund pendiente/confirmarlo según flujo

14\. Confirmar devolución

COMMIT

No debe ocurrir que el producto regrese pero la deuda no se ajuste por un error intermedio\.

__80\. Transacción de ajuste__

Igualmente:

BEGIN

1\. Bloquear inventory\_count

2\. Validar conteo aprobado

3\. Bloquear inventories

4\. Recalcular diferencia vigente

5\. Bloquear lotes

6\. Crear inventory\_adjustment

7\. Crear inventory\_movement

8\. Crear líneas IN/OUT

9\. Crear/consumir lotes

10\. Actualizar inventario

11\. Crear Kardex

12\. Confirmar ajuste

COMMIT

__81\. Relación conteo → ajuste__

inventory\_counts 1 ─── 0\.\.N inventory\_adjustments

Normalmente será uno, pero permitir varios ajustes parciales puede ser útil en conteos grandes\.

__82\. Línea de conteo → línea de ajuste__

inventory\_count\_lines 1

        │

        └── 0\.\.N inventory\_adjustment\_lines

Esto permite saber exactamente qué discrepancia originó la corrección\.

__83\. Conteo sin diferencia__

difference\_quantity = 0

No genera ajuste\.

Se conserva como evidencia del control físico\.

__84\. Conteo con diferencia no aprobada__

No afecta stock\.

Puede terminar:

CANCELLED

o:

UNDER\_REVIEW

hasta aclararlo\.

__85\. Diferencia material y cierre__

Si el conteo revela diferencia material pendiente:

daily closing

podrá bloquearse según umbral/configuración\.

Eso será utilizado posteriormente por el Bloque 10\.

__86\. Reconciliación posterior al ajuste__

Después de confirmar:

inventories\.physical\_quantity

=

SUM\(lots\.physical\_quantity\)

y:

último Kardex

=

inventories

deben seguir coincidiendo\.

El ajuste no es excusa para desalinear lotes\.

__87\. Numeraciones__

Podremos tener:

SAL\-MZK\-2026\-\.\.\.

DEV\-MZK\-2026\-\.\.\.

CON\-MZK\-2026\-\.\.\.

AJU\-MZK\-2026\-\.\.\.

generadas mediante:

document\_sequences

que diseñaremos formalmente en Bloque 12\.

__88\. Auditoría__

Eventos especialmente sensibles:

- Pérdida creada\.
- Pérdida aprobada\.
- Baja por daño\.
- Devolución proveedor\.
- Lote específico cambiado\.
- Devolución cliente\.
- Estado físico devuelto\.
- Conteo iniciado\.
- Conteo/reconteo\.
- Diferencia detectada\.
- Ajuste aprobado\.
- Ajuste confirmado\.
- Reversión\.

__89\. Nuevas tablas del Bloque 7__

Finalmente quedan:

inventory\_exits

inventory\_exit\_lines

customer\_returns

customer\_return\_lines

inventory\_counts

inventory\_count\_lines

inventory\_count\_attempts

inventory\_adjustments

inventory\_adjustment\_lines

Son:

__9 tablas nuevas__

__90\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

1\. Organización y seguridad

12

12

2\. Catálogo maestro

9

21

3\. Núcleo de inventario

9

30

4\. Compras y entradas

5

35

5\. Clientes y ventas

4

39

6\. CxC, pagos y reembolsos

8

47

7\. Salidas, devoluciones, conteos y ajustes

9

__56__

Actualmente:

__7 de 12 bloques diseñados ✅__  
__56 tablas formalmente definidas__

__91\. Decisiones cerradas del Bloque 7__

1. Otras salidas utilizarán una sola infraestructura inventory\_exits\.
2. No habrá una tabla diferente para pérdida, daño, uso interno y devolución proveedor\.
3. Venta y transferencia no utilizan inventory\_exits\.
4. Baja por daño es distinta de marcar stock como dañado\.
5. Devolución a proveedor usa lote específico\.
6. Salidas confirmadas generan movimientos y Kardex comunes\.
7. Devolución de cliente tendrá entidad propia\.
8. Toda devolución normal estará vinculada a la venta original\.
9. Devoluciones parciales estarán soportadas\.
10. Producto devuelto puede estar GOOD, DAMAGED o REVIEW\.
11. Costo de entrada de devolución usa costo oficial de salida original\.
12. Devolución comercial y reembolso son operaciones diferentes\.
13. Se reutilizará receivable\_adjustments para reducir deuda\.
14. El exceso respecto de deuda pendiente puede convertirse en refund\.
15. KIT\_COMPONENTES registra componentes realmente devueltos\.
16. El conteo físico no modifica stock\.
17. Se conservarán todos los reconteos\.
18. Ajuste normal debe originarse en conteo aprobado\.
19. Ajustes positivos y negativos usarán directamente el núcleo inventory\_movements\.
20. Evitaremos crear una entrada adicional solo para ajuste positivo\.
21. Ajustes pueden contener líneas IN y OUT\.
22. Ajuste positivo con stock cero requiere costo autorizado\.
23. Ajustes oficiales no se confirman offline\.
24. Conteos sí pueden capturarse offline\.
25. Conteo offline se revalida contra movimientos posteriores\.
26. Stock/lotes/Kardex deben seguir reconciliados después de cualquier ajuste\.
27. Operaciones confirmadas permanecen inmutables\.

__Resultado__

Queda diseñado:

__Modelo lógico — Bloque 7: Otras salidas, devoluciones, conteos y ajustes ✅__

El siguiente será el __Bloque 8 de 12: Transferencias entre sucursales__, donde definiremos solicitud, aprobación, reserva, preparación, envíos, tránsito, recepciones parciales, diferencias, lotes origen/destino y sus movimientos OUT/IN sin crear una sucursal ficticia de tránsito\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 8 de 12: Transferencias entre sucursales__\.

Aquí vamos a aprovechar al máximo lo ya construido: inventory\_reservations, inventory\_movements, inventory\_movement\_lines, lot\_allocations, lots, inventories, kardex\_entries, warehouse\_locations y reason\_codes\.

No crearemos una “sucursal en tránsito”\.

__Etapa 4\.2 — Bloque 8: Transferencias entre sucursales__

Propongo __7 tablas nuevas__:

- transfers
- transfer\_lines
- transfer\_shipments
- transfer\_shipment\_lines
- transfer\_receipts
- transfer\_receipt\_lines
- transfer\_differences

Con ellas pasaríamos de __56 a 63 tablas formalmente definidas__\.

__1\. Tabla transfers__

__Propósito__

Representar la operación completa de traslado entre una sucursal origen y una sucursal destino\.

Una transferencia puede originarse por:

- solicitud de la sucursal destino,
- redistribución iniciada por la sucursal origen\.

__Campos principales__

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

transfer\_number

VARCHAR

NOT NULL

origin\_branch\_id

BIGINT

FK → branches\.id, NOT NULL

destination\_branch\_id

BIGINT

FK → branches\.id, NOT NULL

initiation\_type

VARCHAR

NOT NULL

request\_date

TIMESTAMPTZ

NOT NULL

status

VARCHAR

NOT NULL

reason\_id

BIGINT

FK → reason\_codes\.id, NULL

notes

TEXT

NULL

requested\_by

BIGINT

FK → users\.id, NULL

approved\_by

BIGINT

FK → users\.id, NULL

prepared\_by

BIGINT

FK → users\.id, NULL

sent\_by

BIGINT

FK → users\.id, NULL

received\_by

BIGINT

FK → users\.id, NULL

device\_id

BIGINT

FK → devices\.id, NULL

created\_offline

BOOLEAN

DEFAULT FALSE

approved\_at

TIMESTAMPTZ

NULL

prepared\_at

TIMESTAMPTZ

NULL

sent\_at

TIMESTAMPTZ

NULL

completed\_at

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

__2\. Regla origen ≠ destino__

Debe existir:

origin\_branch\_id <> destination\_branch\_id

Nunca permitiremos una transferencia de una sucursal hacia sí misma\.

__3\. Tipo de inicio__

Propongo:

DESTINATION\_REQUEST

ORIGIN\_REDISTRIBUTION

Esto conserva quién inició operacionalmente la necesidad\.

__4\. Estados de transferencia__

Tomando lo ya definido funcionalmente:

DRAFT

REQUESTED

APPROVED

IN\_PREPARATION

PREPARED

SENT

IN\_TRANSIT

PARTIALLY\_RECEIVED

RECEIVED

RECEIVED\_WITH\_DIFFERENCE

REJECTED

CANCELLED

CONFLICT

No todos los estados tienen que ser escritos manualmente; varios se derivarán de los eventos físicos\.

__5\. Cancelación__

Se permite normalmente antes de SENT\.

Una vez enviada:

no se cancela directamente\.

Debe resolverse mediante recepción, diferencia o transferencia de retorno\.

__6\. Tabla transfer\_lines__

__Propósito__

Representar qué productos forman parte de la transferencia\.

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

transfer\_id

BIGINT

FK → transfers\.id, NOT NULL

product\_id

BIGINT

FK → products\.id, NOT NULL

requested\_quantity

NUMERIC

NOT NULL

approved\_quantity

NUMERIC

NOT NULL DEFAULT 0

prepared\_quantity

NUMERIC

NOT NULL DEFAULT 0

sent\_quantity

NUMERIC

NOT NULL DEFAULT 0

received\_quantity

NUMERIC

NOT NULL DEFAULT 0

difference\_quantity

NUMERIC

NOT NULL DEFAULT 0

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__7\. Cantidades acumuladas__

Estas cantidades ayudan a consultar rápidamente el estado de cada línea\.

Ejemplo:

requested = 10

approved = 8

prepared = 8

sent = 8

received = 6

difference = 0

Entonces quedan 2 todavía pendientes de recepción\.

__8\. Restricciones__

requested\_quantity > 0

approved\_quantity >= 0

prepared\_quantity >= 0

sent\_quantity >= 0

received\_quantity >= 0

Normalmente:

approved <= requested

prepared <= approved

sent <= prepared

aunque una diferencia autorizada podría requerir revisar estas reglas en casos excepcionales\.

__9\. Producto repetido__

No recomiendo permitir el mismo producto varias veces en una misma transferencia salvo una razón real\.

Aquí sí podemos utilizar:

UNIQUE\(transfer\_id, product\_id\)

porque los lotes se manejarán en preparación/envío, no creando varias líneas del mismo producto\.

__10\. Aprobación parcial__

Ejemplo:

requested = 10

approved = 6

Eso es completamente válido\.

Las 4 no aprobadas no quedan reservadas\.

__11\. Reserva de stock__

Cuando una transferencia llega a APPROVED, reutilizamos:

inventory\_reservations

inventory\_reservation\_allocations

No creamos transfer\_reservations\.

Relación conceptual:

transfer

   ↓

inventory\_reservation

   ↓

inventory\_reservation\_allocations

__12\. Origen de la reserva__

Podremos usar:

reservation\_type = TRANSFER

source\_type = TRANSFER

source\_id = transfers\.id

Así reutilizamos la infraestructura común\.

__13\. Preparación física__

Durante IN\_PREPARATION:

- se seleccionan lotes PEPS,
- se pueden confirmar ubicaciones,
- un usuario autorizado puede cambiar lotes con motivo\.

La reserva puede pasar de producto general a lote específico\.

No necesitamos una tabla adicional de preparación si inventory\_reservation\_allocations conserva los lotes preparados\.

Sin embargo, para conservar lo efectivamente __enviado__, sí necesitamos estructura de envío separada\.

__14\. Tabla transfer\_shipments__

__Propósito__

Representar una salida física real de mercadería hacia la sucursal destino\.

Aunque en V1 normalmente exista un solo envío por transferencia, permitimos varios\.

Ejemplo:

Transferencia = 10

Envío 1 = 6

Envío 2 = 4

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

transfer\_id

BIGINT

FK

shipment\_number

VARCHAR

NOT NULL

shipment\_date

TIMESTAMPTZ

NOT NULL

status

VARCHAR

NOT NULL

external\_document\_type

VARCHAR

NULL

external\_document\_number

VARCHAR

NULL

transport\_reference

VARCHAR

NULL

notes

TEXT

NULL

created\_by

BIGINT

FK users\.id

confirmed\_by

BIGINT

FK users\.id, NULL

confirmed\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__15\. Estados de envío__

Propongo:

DRAFT

CONFIRMED

CANCELLED

Una vez CONFIRMED, produjo salida física y no se edita\.

__16\. Tabla transfer\_shipment\_lines__

__Propósito__

Definir qué cantidades y productos salieron en cada envío\.

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

transfer\_shipment\_id

BIGINT

FK

transfer\_line\_id

BIGINT

FK

product\_id

BIGINT

FK

quantity

NUMERIC

NOT NULL

transfer\_unit\_cost

NUMERIC

NULL antes de confirmar

transfer\_total\_cost

NUMERIC

NULL antes de confirmar

created\_at

TIMESTAMPTZ

NOT NULL

__17\. Costo de transferencia__

Al confirmar el envío:

transfer\_unit\_cost =

average\_cost de la sucursal origen

No el costo individual del lote FIFO\.

Ejemplo:

Promedio origen = 110

Cantidad enviada = 5

Valor transferencia = 550

__18\. Envío → movimiento de salida__

Un envío confirmado genera:

inventory\_movement

movement\_type = TRANSFER\_OUT

branch = origin

con sus:

- inventory\_movement\_lines
- lot\_allocations
- kardex\_entries

La relación puede utilizar:

source\_type = TRANSFER\_SHIPMENT

source\_id = transfer\_shipments\.id

__19\. Lotes realmente enviados__

No necesitamos otra tabla transfer\_shipment\_lots\.

Ya existe:

lot\_allocations

relacionada con las líneas del movimiento TRANSFER\_OUT\.

Por tanto podemos reconstruir exactamente:

shipment

→ inventory movement

→ movement line

→ lot allocations

Reutilizamos infraestructura existente\.

__20\. Consumo de la reserva__

Cuando se confirma el envío:

inventory\_reservations

se consume total o parcialmente\.

Ejemplo:

Reserva = 10

Envío = 6

queda:

consumed = 6

remaining reserved = 4

__21\. Estado en tránsito__

Después del envío:

sent\_quantity > received\_quantity

esa diferencia está en tránsito\.

No se suma al inventario del destino\.

Tampoco sigue físicamente en origen\.

__22\. Cómo calcular tránsito__

Por línea:

in\_transit\_quantity =

confirmed\_sent\_quantity

\- confirmed\_received\_quantity

\- quantities\_resolved\_as\_returned/lost/etc\.

En V1, inicialmente:

sent \- received

más resolución de diferencias cuando exista\.

No necesitamos una tabla inventories\_in\_transit como fuente oficial\.

__23\. ¿Conviene materializar tránsito?__

Para reportes podría resultar útil más adelante mantener un agregado\.

Pero no lo considero necesario en este momento\.

La fuente será el flujo de transferencia\.

Esto evita otra verdad de stock\.

__24\. Tabla transfer\_receipts__

__Propósito__

Representar cada recepción física realizada por la sucursal destino\.

Una transferencia puede tener varias\.

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

transfer\_id

BIGINT

FK

receipt\_number

VARCHAR

NOT NULL

destination\_branch\_id

BIGINT

FK

receipt\_date

TIMESTAMPTZ

NOT NULL

status

VARCHAR

NOT NULL

notes

TEXT

NULL

created\_by

BIGINT

FK

confirmed\_by

BIGINT

FK, NULL

confirmed\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__25\. Sucursal destino__

Aunque se derive de transfers, recomiendo guardar destination\_branch\_id para:

- claridad,
- seguridad,
- consultas\.

Debe coincidir con transfers\.destination\_branch\_id\.

__26\. Estados de recepción__

Propongo:

DRAFT

PENDING\_REVIEW

CONFIRMED

CONFIRMED\_WITH\_DIFFERENCE

CANCELLED

Una recepción confirmada genera entrada física\.

__27\. Tabla transfer\_receipt\_lines__

__Propósito__

Registrar qué se recibió realmente\.

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

transfer\_receipt\_id

BIGINT

FK

transfer\_line\_id

BIGINT

FK

product\_id

BIGINT

FK

received\_quantity

NUMERIC

NOT NULL

good\_quantity

NUMERIC

NOT NULL DEFAULT 0

damaged\_quantity

NUMERIC

NOT NULL DEFAULT 0

review\_quantity

NUMERIC

NOT NULL DEFAULT 0

transfer\_unit\_cost

NUMERIC

NOT NULL

inventory\_entry\_line\_id

BIGINT

FK → inventory\_entry\_lines\.id, NULL

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__28\. Cuadre de recepción__

Debe cumplirse:

received\_quantity

=

good\_quantity

\+ damaged\_quantity

\+ review\_quantity

Todas no negativas\.

__29\. Precio/costo en destino__

El receptor no puede editar:

transfer\_unit\_cost

Debe venir de los envíos relacionados\.

Si una recepción mezcla unidades provenientes de diferentes envíos/costos, debemos conservar el costo correcto por porción\.

Esto podría implicar varias transfer\_receipt\_lines para el mismo transfer\_line\_id si provienen de envíos distintos\.

__30\. ¿Necesitamos vínculo recepción → envío?__

Sí, esta revisión muestra que debemos saber qué envío concreto se está recibiendo, especialmente si permitimos varios envíos\.

Podemos agregar a transfer\_receipt\_lines:

transfer\_shipment\_line\_id

FK → transfer\_shipment\_lines\.id\.

Esto es mejor que intentar inferirlo\.

__Campo adicional__

__Campo__

__Tipo__

transfer\_shipment\_line\_id

BIGINT FK

Así:

shipment line

   ↓

receipt line

sabemos exactamente qué cantidad enviada fue recibida\.

__31\. Recepciones parciales de un envío__

Una transfer\_shipment\_line puede tener varias transfer\_receipt\_lines\.

Ejemplo:

Enviado = 10

Recepción 1 = 6

Recepción 2 = 4

Perfectamente soportado\.

__32\. Validación de recepción máxima__

Debe cumplirse:

SUM\(received\_quantity confirmada\)

<=

shipment\_line\.quantity

salvo sobrante físico, que __no entra automáticamente__\.

Si físicamente llegan 11 cuando se enviaron 10:

- registramos 10 como recepción vinculada,
- 1 como diferencia OVERAGE,
- no lo hacemos stock disponible sin resolución\.

__33\. Recepción → entrada de inventario__

Ya tenemos:

inventory\_entries\.entry\_type = TRANSFER\_RECEIPT

Aquí sí tiene sentido reutilizarlo\.

Una recepción confirmada generará:

transfer\_receipt

      ↓

inventory\_entry

type = TRANSFER\_RECEIPT

      ↓

inventory\_entry\_lines

      ↓

inventory\_movement TRANSFER\_IN

      ↓

lots destino

      ↓

Kardex destino

__34\. ¿Por qué no crear movimiento directo desde receipt?__

Podríamos, pero como ya diseñamos inventory\_entries específicamente para recepciones físicas y transferencias, reutilizarlo mantiene una única infraestructura para entradas\.

Además facilita:

- documento de entrada,
- inspección,
- trazabilidad de recepción\.

Aquí sí conservamos esa decisión\.

__35\. Lote destino__

Al recibir:

lote destino

origin\_lot\_id = lote origen

Tenemos que conocer qué lotes origen conformaron el envío\.

Eso ya está en:

shipment

→ movement TRANSFER\_OUT

→ lot\_allocations

Cuando recibimos una parte, podemos preservar esa genealogía\.

__36\. Recepción distribuida por lote origen__

Supongamos envío:

5 unidades

├── Lote A: 3

└── Lote B: 2

Destino recibe 5\.

Lo correcto es crear lotes destino vinculados:

Lote DA ← origen A, qty 3

Lote DB ← origen B, qty 2

No crear necesariamente un único lote mezclado si queremos trazabilidad PEPS real\.

__37\. Recepción parcial__

Si se reciben solo 4:

Debemos determinar qué lotes físicos llegaron\.

Idealmente la recepción indica:

A = 3

B = 1

El usuario no debería tener que entender costos, pero almacén sí puede confirmar etiquetas/lotes\.

Si no es identificable, necesitaremos una política de asignación\.

Recomendación: utilizar la secuencia de lote enviada como sugerencia y permitir corrección con motivo\.

__38\. Fecha original del lote__

Destino conserva:

original\_entry\_date

del lote origen\.

Mientras:

local\_received\_at

es la fecha de recepción destino\.

Así PEPS no “rejuvenece” el producto por transferirlo\.

__39\. Costo en destino__

Cada unidad recibida entra al costo de transferencia del origen\.

Después PostgreSQL/Laravel recalcula:

destination\.inventory\.average\_cost

con el stock ya existente del destino\.

__40\. Ejemplo__

Destino:

5 @ promedio 130

valor = 650

Recibe:

5 @ transferencia 110

valor = 550

Nuevo:

10 unidades

valor = 1200

promedio = 120

El origen y destino pueden terminar con promedios diferentes\.

__41\. Tabla transfer\_differences__

__Propósito__

Registrar cualquier discrepancia física detectada durante recepción\.

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

transfer\_id

BIGINT

FK

transfer\_receipt\_id

BIGINT

FK, NULL

transfer\_shipment\_line\_id

BIGINT

FK, NULL

transfer\_line\_id

BIGINT

FK

expected\_product\_id

BIGINT

FK products\.id

actual\_product\_id

BIGINT

FK products\.id, NULL

difference\_type

VARCHAR

NOT NULL

quantity

NUMERIC

NOT NULL

status

VARCHAR

NOT NULL

reason\_id

BIGINT

FK reason\_codes\.id, NULL

resolution\_type

VARCHAR

NULL

resolution\_notes

TEXT

NULL

resolved\_by

BIGINT

FK users\.id, NULL

resolved\_at

TIMESTAMPTZ

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__42\. Tipos de diferencia__

Propongo:

SHORTAGE

OVERAGE

DAMAGED

WRONG\_PRODUCT

OTHER

__SHORTAGE__

Se enviaron 10, llegaron 8\.

__OVERAGE__

Se enviaron 10, físicamente llegaron 11\.

__DAMAGED__

Llegó pero en condición dañada\.

__WRONG\_PRODUCT__

Se esperaba A y llegó B\.

__43\. Daño: ¿es diferencia si sí llegó?__

Sí, porque operacionalmente no llegó en la condición esperada\.

Puede existir simultáneamente:

received\_quantity = 10

good = 8

damaged = 2

y una diferencia:

DAMAGED = 2

Esto permite abrir resolución administrativa sin perder el hecho físico de que las 2 unidades sí llegaron\.

__44\. Estados de diferencia__

OPEN

UNDER\_REVIEW

RESOLVED

REJECTED

CANCELLED

Una diferencia crítica pendiente puede bloquear el cierre correspondiente según regla\.

__45\. Resoluciones posibles__

Dependiendo del tipo:

ACCEPT\_SHORTAGE

SEND\_REMAINDER

RETURN\_TO\_ORIGIN

ACCEPT\_DAMAGED

REGISTER\_OVERAGE\_AFTER\_VALIDATION

CORRECT\_DOCUMENT

OTHER\_AUTHORIZED

No todos necesitan convertirse en enums DB definitivos todavía\.

__46\. Faltante__

Ejemplo:

sent = 10

received = 8

Las 2 unidades:

permanecen en tránsito hasta que exista resolución\.

No desaparecen automáticamente del stock empresarial consolidado\.

__47\. Resolución de faltante como pérdida__

Si investigación confirma pérdida real durante traslado:

se necesitará una salida/resolución empresarial autorizada\.

No debemos simplemente cambiar:

sent\_quantity = 8

porque físicamente salieron 10 del origen\.

El envío original permanece\.

__48\. Sobrante__

Si llegan 11 habiendo enviado 10:

No ponemos:

received\_quantity = 11

contra una línea enviada de 10\.

Registramos:

linked receipt = 10

difference OVERAGE = 1

La unidad adicional requiere identificar:

- origen,
- producto,
- lote,
- costo,

antes de entrar oficialmente\.

__49\. Producto equivocado__

Ejemplo:

expected\_product\_id = A

actual\_product\_id = B

quantity = 1

No se cambia silenciosamente la línea de transferencia\.

Debe resolverse\.

__50\. Transferencia completa__

Una transferencia se puede marcar RECEIVED cuando:

- todas las cantidades enviadas fueron recibidas,
- no quedan cantidades en tránsito,
- no hay diferencias pendientes relevantes\.

__51\. Recibida con diferencia__

Si la recepción final se completa físicamente pero existe una diferencia aceptada/pendiente:

RECEIVED\_WITH\_DIFFERENCE

permite distinguirla de una recepción limpia\.

__52\. Transferencia parcial__

Si:

received < sent

y todavía se espera el resto:

PARTIALLY\_RECEIVED

o IN\_TRANSIT según el flujo\.

__53\. Rechazo antes de envío__

Una solicitud puede pasar:

REQUESTED → REJECTED

sin tocar stock\.

__54\. Cancelación después de aprobación pero antes de envío__

Debe:

1. liberar inventory\_reservations,
2. devolver reservado a disponible,
3. marcar transferencia cancelada\.

No genera Kardex\.

__55\. Después de SENT__

No:

CANCELLED

directamente\.

Si mercadería debe volver, se crea una nueva transferencia inversa después de su tratamiento físico correspondiente\.

__56\. Transferencia de retorno__

Ejemplo:

Mazuko → Juliaca

será una nueva fila en transfers\.

Puede contener:

source\_transfer\_id

para vincularla con transferencia anterior\.

Esto sería útil\.

Propongo agregar:

__Campo__

__Tipo__

source\_transfer\_id

BIGINT FK → transfers\.id, NULL

Así podemos indicar:

return transfer

sin crear otra tabla\.

__57\. ¿Necesitamos transfer\_type?__

Podemos agregar:

NORMAL

RETURN

o derivarlo de source\_transfer\_id\.

Prefiero un campo:

transfer\_type

porque facilita reportes\.

Agregar a transfers:

transfer\_type VARCHAR NOT NULL DEFAULT NORMAL

source\_transfer\_id BIGINT NULL

__58\. KIT\_UNICO__

Se transfiere como producto normal:

transfer\_line\.product\_id = KIT\_UNICO

y usa sus lotes\.

__59\. KIT\_COMPONENTES no prearmado__

No se transfiere “stock virtual de kit”\.

Se transfieren los componentes reales como líneas normales\.

__60\. KIT\_COMPONENTES prearmado__

Si ya existe stock físico del kit terminado, se comporta como producto inventariable real y puede transferirse como tal\.

__61\. Stock disponible durante aprobación__

Al aprobar:

approved\_quantity <= available\_quantity

y se crea reserva\.

No basta con validar cuando se crea el borrador porque el stock puede haber cambiado\.

__62\. Concurrencia al aprobar__

Dos transferencias pueden intentar reservar las mismas últimas unidades\.

Debemos bloquear:

inventories

en orden determinístico\.

Resultado:

- una reserva,
- la otra se rechaza o queda con cantidad menor si el usuario explícitamente aprueba parcial\.

Nunca sobre\-reservar\.

__63\. Concurrencia al enviar__

Debemos bloquear:

- reserva,
- inventario,
- lotes,
- ubicaciones\.

Antes de convertir reserva en salida física\.

__64\. Concurrencia al recibir__

Debemos bloquear:

- transfer\_shipment\_lines,
- cantidades ya recibidas,
- inventarios destino\.

Así no se puede recibir dos veces la misma unidad\.

__65\. UUID e idempotencia__

Todas las cabeceras operativas:

transfers\.uuid

transfer\_shipments\.uuid

transfer\_receipts\.uuid

transfer\_differences\.uuid

deben ser únicas\.

Esto protege reintentos\.

__66\. Transferencias offline__

Según nuestra política V1:

__Permitido offline__

- Consultar transferencias cacheadas\.
- Crear solicitud/borrador\.
- Preparar físicamente una transferencia ya aprobada, bajo condiciones\.

__Requiere online__

- Aprobación oficial\.
- Confirmación de envío\.
- Confirmación de recepción\.
- Resolución de diferencias\.

Esto evita inconsistencias graves entre sucursales\.

__67\. Solicitud offline__

Puede existir en IndexedDB con UUID\.

Al sincronizar:

- valida sucursales,
- productos,
- usuario,
- estado,
- crea transfer\.

No reserva stock hasta aprobación oficial\.

__68\. Preparación offline__

Si una transferencia aprobada fue cacheada previamente, almacén puede marcar provisionalmente:

- lotes preparados,
- cantidades,

pero SENT no se confirma sin servidor\.

Las asignaciones locales se guardan en sync/payload, no como verdad oficial de lot\_allocations\.

__69\. Transferencia y cierre del origen__

Una transferencia ya:

SENT / IN\_TRANSIT

válida no bloquea el cierre\.

Su salida ya está registrada y valorizada\.

Una transferencia con conflicto crítico sí puede bloquear\.

__70\. Transferencia y cierre destino__

Si está en tránsito pero aún no llegó:

no forma parte del inventario del destino y no debería impedir su cierre\.

Si existe una recepción local pendiente de sincronizar:

sí puede bloquear porque físicamente la mercadería puede estar allí sin entrada oficial\.

__71\. Valor empresarial consolidado__

Durante tránsito:

origen stock ↓

destino stock todavía no ↑

tránsito ↑

En un reporte consolidado debemos sumar tránsito como activo empresarial\.

Esto se derivará de transferencias enviadas no totalmente recibidas/resueltas\.

__72\. Kardex origen__

Al enviar:

TRANSFER\_OUT

Costo:

average\_cost origen

PEPS físico:

lot\_allocations

__73\. Kardex destino__

Al recibir:

TRANSFER\_IN

Entrada valorizada al costo transferido\.

Después calcula promedio destino\.

__74\. No recalcular retrospectivamente transferencia__

Si el costo promedio origen cambia después del envío por otras operaciones:

el costo de transferencia ya confirmado no cambia\.

transfer\_shipment\_lines\.transfer\_unit\_cost congela el costo oficial usado\.

__75\. Lote origen y destino__

Genealogía:

lots destino\.origin\_lot\_id

permite seguir la historia\.

Si un lote se transfiere varias veces:

A → B → C

podemos recorrer la cadena\.

__76\. Cantidad recibida dañada__

Ejemplo:

sent = 5

received = 5

good = 3

damaged = 2

En destino:

physical \+5

available \+3

damaged \+2

No quedan 2 en tránsito porque sí llegaron\.

Se registra diferencia DAMAGED\.

__77\. Cantidad en revisión__

Igual:

physical aumenta

available no

review/bloqueado aumenta

hasta inspección\.

Tenemos que representar review\_quantity con una categoría disponible en lotes/inventario\. En el núcleo actual tenemos blocked\_quantity\.

Recomiendo que REVIEW se materialice temporalmente como:

blocked\_quantity

con estado del lote IN\_REVIEW\.

No agregamos una nueva columna agregada en inventories\.

__78\. Transferencia y ubicación destino__

En recepción puede seleccionarse:

warehouse\_location

para el lote destino\.

Si no se conoce inmediatamente:

- lote puede quedar sin ubicación,
- alerta posterior\.

No bloquea necesariamente la recepción\.

__79\. Documentos/adjuntos__

Podremos vincular mediante attachments:

- guía,
- fotografía,
- acta de recepción,
- evidencia de daño\.

No creamos tablas específicas de documentos\.

__80\. Auditoría__

Debe registrar:

- solicitud,
- aprobación,
- aprobación parcial,
- reserva,
- lotes preparados,
- cambio de PEPS,
- envío,
- costo de transferencia,
- recepción,
- diferencia,
- resolución,
- retorno\.

__81\. Restricciones principales de transfers__

origin\_branch\_id <> destination\_branch\_id

y ambas sucursales deben:

- pertenecer a la misma empresa,
- estar habilitadas para la operación\.

__82\. Restricciones de líneas__

requested\_quantity > 0

approved\_quantity >= 0

prepared\_quantity >= 0

sent\_quantity >= 0

received\_quantity >= 0

__83\. Restricciones de shipment line__

quantity > 0

transfer\_unit\_cost >= 0 OR NULL antes de confirmar

Al confirmar:

transfer\_unit\_cost NOT NULL

__84\. Restricciones de receipt line__

received\_quantity > 0

good\_quantity >= 0

damaged\_quantity >= 0

review\_quantity >= 0

y:

good \+ damaged \+ review = received

__85\. Restricciones de diferencias__

quantity > 0

No debe existir diferencia de cero\.

__86\. Relación transfer → shipment__

transfers 1 ─── N transfer\_shipments

__87\. Shipment → lines__

transfer\_shipments 1 ─── N transfer\_shipment\_lines

__88\. Transfer line → shipment lines__

transfer\_lines 1 ─── N transfer\_shipment\_lines

Esto permite múltiples envíos parciales\.

__89\. Transfer → receipts__

transfers 1 ─── N transfer\_receipts

__90\. Shipment line → receipt lines__

transfer\_shipment\_lines 1 ─── N transfer\_receipt\_lines

Con esto controlamos exactamente cuánto de cada envío fue recibido\.

__91\. Recepción → diferencias__

transfer\_receipts 1 ─── 0\.\.N transfer\_differences

También una diferencia podría existir durante inspección sin recepción final, por eso transfer\_receipt\_id puede ser nullable en casos especiales\.

__92\. Relación con inventory\_entries__

Una recepción confirmada tendrá normalmente:

transfer\_receipts 1 ─── 1 inventory\_entries

No necesariamente necesitamos FK directa en transfer\_receipts; inventory\_entries\.source\_type/source\_id puede apuntar a ella\.

__93\. Relación con movimiento origen__

transfer\_shipments:

inventory\_movements\.source\_type = TRANSFER\_SHIPMENT

__94\. Relación con movimiento destino__

inventory\_entries generado por transfer\_receipt crea:

TRANSFER\_IN

__95\. ¿Necesitamos tabla transfer\_lots?__

No\.

Ya tenemos:

- reserva/lotes preparados,
- lot\_allocations del movimiento OUT,
- genealogía de lots destino\.

Crear otra tabla duplicaría información\.

__96\. ¿Necesitamos tabla transit\_inventory?__

No como fuente oficial\.

El tránsito se deriva\.

Si más adelante rendimiento requiere una proyección materializada, será una optimización, no una nueva verdad de negocio\.

__97\. ¿Necesitamos tabla transfer\_requests separada?__

No\.

transfers\.status = REQUESTED y initiation\_type cubren el requerimiento\.

Otra tabla solo duplicaría la cabecera\.

__98\. ¿Necesitamos tabla de aprobación parcial?__

No\.

Se guarda:

transfer\_lines\.approved\_quantity

más approved\_by, approved\_at y auditoría\.

Si después queremos aprobaciones múltiples, approvals podrá guardar historial\.

__99\. Secuencia transaccional completa__

Una transferencia típica:

transfers

   ↓

transfer\_lines

   ↓

inventory\_reservation

   ↓

PREPARATION

   ↓

transfer\_shipments

   ↓

TRANSFER\_OUT movement

   ↓

IN TRANSIT

   ↓

transfer\_receipts

   ↓

inventory\_entry

   ↓

TRANSFER\_IN movement

   ↓

destination lots

__100\. Caso completo con diferencia__

Juliaca envía 10

↓

TRANSFER\_OUT 10

↓

tránsito 10

↓

Mazuko recibe 8

↓

TRANSFER\_IN 8

↓

tránsito restante 2

↓

transfer\_difference SHORTAGE 2

Hasta resolver la diferencia, las 2 siguen teniendo una situación empresarial pendiente\.

__101\. Caso dañado__

envía 10

recibe 10

8 GOOD

2 DAMAGED

Entonces:

tránsito = 0

destino físico = \+10

destino disponible = \+8

destino dañado = \+2

difference DAMAGED = 2

Perfectamente consistente\.

__102\. Caso recepción parcial legítima__

envío = 10

recepción 1 = 6

No necesariamente es una diferencia\.

Puede ser simplemente:

PARTIALLY\_RECEIVED

in\_transit = 4

Solo se crea SHORTAGE si se declara que deberían haber llegado las 10 y faltan 4\.

Eso es importante\.

__103\. Diferencia vs pendiente__

Por tanto:

__Cantidad pendiente de recepción no es automáticamente una diferencia\.__

La diferencia surge cuando existe constatación física/documental de discrepancia\.

__104\. Número de transferencia__

Ejemplo:

TRA\-JUL\-2026\-000125

generado por document\_sequences\.

Restricción:

UNIQUE\(company\_id, transfer\_number\)

o por sucursal origen dependiendo del patrón final\.

__105\. Número de envío__

Ejemplo:

ENV\-JUL\-2026\-000125

__106\. Número de recepción__

Ejemplo:

REC\-MZK\-2026\-000125

Todos tendrán UUID independiente\.

__107\. Tabla transfers y company\_id__

Aquí sí recomiendo conservar company\_id porque une dos sucursales y facilita validar que ambas sean de la misma empresa\.

__108\. Operación atómica de aprobación__

BEGIN

lock transfer

lock transfer lines

lock inventories origen

validate available

create/update reservation

set approved quantities

status APPROVED

COMMIT

__109\. Operación atómica de envío__

BEGIN

lock transfer/reservation

lock inventories

lock lots/locations

validate prepared quantities

consume reservation

create shipment

create TRANSFER\_OUT movement

create lot allocations

update origin inventory

create Kardex

set sent quantities

COMMIT

__110\. Operación atómica de recepción__

BEGIN

lock shipment lines

validate remaining in transit

create receipt

classify GOOD/DAMAGED/REVIEW

create inventory\_entry

create destination lots linked to origin lots

create TRANSFER\_IN movement

recalculate destination average

create Kardex

update received quantities

create differences if declared

COMMIT

__111\. Recepción con diferencia y atomicidad__

Si una unidad está dañada, eso no debe provocar que las buenas queden sin recibir\.

La recepción completa puede confirmarse con:

- cantidades buenas,
- dañadas,
- diferencia registrada,

todo en la misma transacción\.

__112\. Resolución posterior__

La resolución administrativa de una diferencia puede ser otra transacción posterior\.

No tiene que bloquear necesariamente el ingreso de las unidades físicamente recibidas correctamente\.

__113\. Tablas nuevas del Bloque 8__

Quedan:

transfers

transfer\_lines

transfer\_shipments

transfer\_shipment\_lines

transfer\_receipts

transfer\_receipt\_lines

transfer\_differences

Son:

__7 tablas nuevas__

__114\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

1\. Organización y seguridad

12

12

2\. Catálogo maestro

9

21

3\. Núcleo de inventario

9

30

4\. Compras y entradas

5

35

5\. Clientes y ventas

4

39

6\. CxC, pagos y reembolsos

8

47

7\. Salidas, devoluciones, conteos y ajustes

9

56

8\. Transferencias

7

__63__

Actualmente:

__8 de 12 bloques diseñados ✅__  
__63 tablas formalmente definidas__

__115\. Decisiones cerradas del Bloque 8__

1. Transferencia tendrá una sola cabecera entre origen y destino\.
2. Solicitud y redistribución usan la misma tabla\.
3. Origen y destino nunca pueden coincidir\.
4. La aprobación puede ser parcial\.
5. Reservas reutilizan inventory\_reservations\.
6. No creamos tabla específica de reserva de transferencia\.
7. Una transferencia puede tener varios envíos\.
8. Un envío confirmado genera TRANSFER\_OUT\.
9. Costo del envío es promedio ponderado del origen\.
10. PEPS se usa para lotes físicos enviados\.
11. Mercadería enviada deja el stock físico del origen\.
12. No aumenta destino hasta recepción\.
13. Tránsito no será una sucursal artificial\.
14. Tránsito se deriva del flujo enviado/recibido/resuelto\.
15. Una transferencia puede tener varias recepciones\.
16. Cada recepción puede ser parcial\.
17. transfer\_receipt\_lines se vincula con el envío concreto\.
18. Destino no edita costo de transferencia\.
19. Recepción genera inventory\_entries tipo TRANSFER\_RECEIPT\.
20. Destino recalcula su promedio con el costo transferido\.
21. Lotes destino preservan vínculo con lote origen\.
22. Fecha original del lote se conserva para PEPS\.
23. Faltante pendiente no es automáticamente diferencia\.
24. Sobrante no entra automáticamente a stock\.
25. Daño se registra explícitamente\.
26. Producto equivocado no reemplaza silenciosamente el esperado\.
27. Después de envío no existe cancelación directa\.
28. Un retorno se hace como nueva transferencia vinculada\.
29. KIT\_UNICO/prearmado puede transferirse como producto físico\.
30. KIT\_COMPONENTES no armado se transfiere por componentes\.
31. Acciones críticas de transferencia requieren conexión en V1\.
32. Transferencias válidas en tránsito no bloquean cierre\.
33. Recepciones físicas pendientes de sincronización sí pueden ser críticas\.
34. No necesitamos transfer\_requests, transfer\_lots ni transit\_inventory como nuevas fuentes duplicadas\.

Perfecto\. Continuamos con el __Modelo lógico PostgreSQL — Bloque 9 de 12: Kits, versiones de composición y armado__\.

Aquí debemos reutilizar lo ya diseñado para productos, inventario, lotes, movimientos y Kardex\. No crearemos un “subinventario” para kits\.

__Etapa 4\.2 — Bloque 9: Kits y armado__

Propongo __4 tablas nuevas__:

- kit\_versions
- kit\_components
- assembly\_orders
- assembly\_order\_components

Con ellas pasaríamos de __63 a 67 tablas formalmente definidas__\.

__1\. Punto de partida: un kit sigue siendo un producto__

No crearemos una tabla kits\.

Ya definimos en:

products\.product\_type

los tipos:

SIMPLE

KIT\_SINGLE

KIT\_COMPONENTS

Por tanto:

products

   │

   └── KIT\_COMPONENTS

          │

          └── kit\_versions

KIT\_SINGLE se comporta como un producto físico normal y no necesita receta para venderse\.

__2\. Tabla kit\_versions__

__Propósito__

Guardar cada versión histórica de la composición de un KIT\_COMPONENTS\.

Ejemplo:

KIT MOTOR

v1

├── A ×2

└── B ×1

v2

├── A ×2

├── B ×1

└── C ×1

La venta histórica de v1 seguirá usando v1 aunque posteriormente exista v2\.

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

kit\_product\_id

BIGINT

FK → products\.id, NOT NULL

version\_number

INTEGER

NOT NULL

status

VARCHAR

NOT NULL

effective\_from

TIMESTAMPTZ

NOT NULL

effective\_to

TIMESTAMPTZ

NULL

notes

TEXT

NULL

created\_by

BIGINT

FK → users\.id, NOT NULL

approved\_by

BIGINT

FK → users\.id, NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__3\. Restricción de versión__

UNIQUE\(kit\_product\_id, version\_number\)

No pueden existir dos versiones 3 del mismo kit\.

__4\. Estados de versión__

Propongo:

DRAFT

ACTIVE

INACTIVE

__DRAFT__

Todavía puede modificarse\.

__ACTIVE__

Puede utilizarse en nuevas ventas/armados\.

__INACTIVE__

No puede utilizarse en nuevas operaciones, pero permanece disponible históricamente\.

__5\. Una sola versión activa__

Cada kit debería tener como máximo una versión vigente activa\.

Posteriormente podemos reforzarlo mediante un índice único parcial sobre:

kit\_product\_id

WHERE status = 'ACTIVE'

si la política final lo requiere\.

__6\. Versiones usadas históricamente__

Una versión que ya fue utilizada en:

- venta,
- armado,

no se modifica destructivamente\.

Si cambia la composición:

se crea nueva versión\.

__7\. Tabla kit\_components__

__Propósito__

Definir los componentes requeridos por cada versión\.

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

kit\_version\_id

BIGINT

FK → kit\_versions\.id, NOT NULL

component\_product\_id

BIGINT

FK → products\.id, NOT NULL

quantity\_required

NUMERIC

NOT NULL

sort\_order

INTEGER

NOT NULL DEFAULT 0

notes

TEXT

NULL

created\_at

TIMESTAMPTZ

NOT NULL

__8\. Restricciones de componente__

quantity\_required > 0

y:

UNIQUE\(kit\_version\_id, component\_product\_id\)

No necesitamos repetir el mismo componente dos veces dentro de una misma receta\.

__9\. Kit no puede contenerse a sí mismo__

Debe bloquearse:

component\_product\_id

<>

kit\_versions\.kit\_product\_id

La validación cruza tablas, así que se hará principalmente desde aplicación/servicio\.

__10\. Kits anidados__

Para V1 ya habíamos decidido evitar:

KIT\_COMPONENTS

   ↓

otro KIT\_COMPONENTS

como componente\.

Esto evita:

- ciclos,
- explosiones recursivas,
- problemas de costo,
- dificultades offline\.

Podemos permitir un KIT\_SINGLE físico como componente si el negocio lo requiere, porque ese sí es inventario normal\.

__11\. Dependencias circulares__

Debemos impedir configuraciones como:

Kit A contiene B

Kit B contiene A

aunque inicialmente bloqueemos kits compuestos dentro de kits compuestos\.

La validación de ciclo seguirá siendo recomendable para futuras extensiones\.

__12\. Cantidad armable__

No almacenaremos en una tabla:

kit\_available\_quantity

para KIT\_COMPONENTS no prearmado\.

Se calcula:

MIN\(

 floor\(component\_available / quantity\_required\)

\)

entre todos sus componentes\.

Ejemplo:

A requiere 2, disponible 10 → 5 kits

B requiere 1, disponible 3  → 3 kits

C requiere 4, disponible 20 → 5 kits

Resultado:

armables = 3

__13\. No es inventario físico__

Esos 3 kits armables:

- no aparecen en inventories como tres kits,
- no tienen lotes de kit,
- no generan Kardex hasta que se vendan/armen\.

Solo son una disponibilidad calculada\.

__14\. Venta de KIT\_COMPONENTS__

Ya tenemos:

sale\_lines\.kit\_version\_id

y:

sale\_line\_inventory\_lines

Por tanto una venta puede congelar la versión utilizada y relacionarse con las salidas físicas de componentes\.

No necesitamos ninguna tabla nueva para venta de kit\.

__15\. Componentes consumidos en venta__

Ejemplo:

KIT X ×2

receta:

A ×2

B ×1

Generará:

OUT A = 4

OUT B = 2

mediante:

inventory\_movement\_lines

y lotes PEPS mediante:

lot\_allocations

__16\. Tabla assembly\_orders__

Ahora definimos el armado anticipado\.

__Propósito__

Representar una orden que consume componentes y produce inventario físico de un kit terminado\.

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

assembly\_number

VARCHAR

NOT NULL

kit\_product\_id

BIGINT

FK → products\.id, NOT NULL

kit\_version\_id

BIGINT

FK → kit\_versions\.id, NOT NULL

requested\_quantity

NUMERIC

NOT NULL

assembled\_quantity

NUMERIC

NOT NULL DEFAULT 0

labor\_cost

NUMERIC

NOT NULL DEFAULT 0

other\_cost

NUMERIC

NOT NULL DEFAULT 0

total\_component\_cost

NUMERIC

NULL

total\_assembly\_cost

NUMERIC

NULL

unit\_assembly\_cost

NUMERIC

NULL

status

VARCHAR

NOT NULL

operation\_date

TIMESTAMPTZ

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

prepared\_by

BIGINT

FK users\.id, NULL

confirmed\_by

BIGINT

FK users\.id, NULL

device\_id

BIGINT

FK devices\.id, NULL

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

__17\. Estados de armado__

Tomando lo funcional:

DRAFT

PENDING\_APPROVAL

IN\_PREPARATION

ASSEMBLED

CANCELLED

REJECTED

CONFLICT

Podríamos usar CONFIRMED en vez de ASSEMBLED, pero prefiero ASSEMBLED porque expresa el resultado del proceso\.

__18\. Cantidades__

Debe cumplirse:

requested\_quantity > 0

assembled\_quantity >= 0

y normalmente:

assembled\_quantity <= requested\_quantity

aunque podría permitirse ajustar cantidad final antes de confirmar\.

__19\. Costos__

Hasta confirmar:

total\_component\_cost = NULL

total\_assembly\_cost = NULL

unit\_assembly\_cost = NULL

porque el costo real de componentes depende del promedio oficial al momento de salida\.

__20\. Cálculo del costo del armado__

Al confirmar:

total\_assembly\_cost

=

total\_component\_cost

\+ labor\_cost

\+ other\_cost

y:

unit\_assembly\_cost

=

total\_assembly\_cost / assembled\_quantity

__21\. Mano de obra__

Ya habíamos decidido que:

labor\_cost

es opcional y puede comenzar en cero\.

No obligamos a usar costos de fabricación complejos en V1\.

__22\. Otros costos__

other\_cost permite:

- embalaje,
- preparación,
- otros costos autorizados\.

No debe usarse como campo libre para corregir arbitrariamente costos sin auditoría\.

__23\. Tabla assembly\_order\_components__

__Propósito__

Congelar los componentes requeridos y realmente consumidos en cada orden\.

Aunque ya exista kit\_components, esta tabla es necesaria porque la orden debe preservar su propia ejecución histórica\.

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

assembly\_order\_id

BIGINT

FK → assembly\_orders\.id, NOT NULL

kit\_component\_id

BIGINT

FK → kit\_components\.id, NOT NULL

component\_product\_id

BIGINT

FK → products\.id, NOT NULL

quantity\_required\_per\_kit

NUMERIC

NOT NULL

required\_quantity

NUMERIC

NOT NULL

consumed\_quantity

NUMERIC

NOT NULL DEFAULT 0

official\_unit\_cost

NUMERIC

NULL

official\_total\_cost

NUMERIC

NULL

created\_at

TIMESTAMPTZ

NOT NULL

updated\_at

TIMESTAMPTZ

NOT NULL

__24\. ¿Por qué duplicar quantity\_required\_per\_kit?__

Porque queremos congelar la receta utilizada por la orden\.

Aunque kit\_component\_id ya apunte a la receta histórica, guardar el snapshot facilita:

- auditoría,
- reportes,
- resiliencia\.

No es estrictamente obligatorio, pero tiene valor\.

__25\. Cantidad requerida__

Ejemplo:

requested kits = 5

component A = 2 por kit

Entonces:

required\_quantity = 10

__26\. Cantidad consumida__

Idealmente:

consumed\_quantity = required\_quantity

cuando el armado se completa según receta\.

Si existen mermas o sustituciones futuras, necesitaríamos un flujo adicional\.

Para V1 recomiendo:

no permitir desviaciones silenciosas de receta\.

Si algo cambia, requiere motivo/autorización\.

__27\. Reservas para armado__

No crearemos assembly\_reservations\.

Reutilizamos:

inventory\_reservations

inventory\_reservation\_allocations

con:

reservation\_type = ASSEMBLY

source\_type = ASSEMBLY\_ORDER

source\_id = assembly\_orders\.id

__28\. Preparación__

Al pasar a IN\_PREPARATION, se pueden reservar componentes\.

El sistema sugiere lotes PEPS\.

Almacén autorizado puede ajustar lote con motivo\.

__29\. Confirmación del armado__

Un armado confirmado puede generar __un solo inventory\_movement mixto__:

movement\_type = KIT\_ASSEMBLY

branch = misma sucursal

con líneas:

OUT componente A

OUT componente B

OUT componente C

IN kit terminado

Esto reutiliza exactamente la capacidad que diseñamos en el núcleo\.

__30\. Ejemplo__

Armamos 5 kits\.

Componentes:

A: 10 unidades, costo oficial salida total 600

B: 5 unidades, costo oficial salida total 300

Entonces:

total\_component\_cost = 900

labor\_cost = 100

other\_cost = 0

Resultado:

total\_assembly\_cost = 1000

unit\_assembly\_cost = 200

La línea IN del kit:

quantity = 5

unit\_cost = 200

total\_cost = 1000

__31\. Lote de kit terminado__

La línea IN crea uno o más lotes:

lots

product = kit\_product\_id

source\_type = ASSEMBLY\_ORDER

Ese lote pasa a ser inventario físico normal\.

__32\. Trazabilidad componentes → kit terminado__

Debemos poder reconstruir:

lote kit terminado

    ↓

assembly\_order

    ↓

assembly\_order\_components

    ↓

inventory movement OUT

    ↓

lot\_allocations componentes

No necesitamos una tabla adicional de genealogía porque esa cadena ya es suficiente\.

__33\. Venta posterior del kit prearmado__

Una vez armado:

KIT\_COMPONENTS

tiene una porción física prearmada en inventories/lots\.

Al vender:

1. Preferir kit prearmado disponible\.
2. Si falta, completar con componentes armables\.

Como definimos funcionalmente\.

__34\. ¿Cómo distinguir stock prearmado?__

El inventario físico del producto kit existe porque hubo una entrada de armado\.

Por tanto:

inventories\.product\_id = kit

puede tener cantidad física\.

Ese stock es real\.

La cantidad armable adicional se calcula aparte desde componentes\.

__35\. Ejemplo de disponibilidad mixta__

KIT X:

prearmados disponibles = 2

armables desde componentes = 5

UI puede mostrar:

Disponibles inmediatos: 2

Armables: 5

Potencial total: 7

Pero solo 2 son inventario físico de kit\.

__36\. Venta de 4 kits__

Política sugerida:

2 prearmados

\+

2 armados al vender desde componentes

La sale\_line\_inventory\_lines permite relacionar una sola línea comercial con:

- movimiento OUT kit terminado,
- movimientos OUT componentes\.

__37\. Costo de la venta mixta__

Ejemplo:

2 prearmados @ costo promedio kit 200

2 armados al vender con componentes cuyo costo total = 450

Entonces:

official\_total\_cost sale line = 400 \+ 450 = 850

No necesitamos obligar a un único costo unitario físico homogéneo\.

Podemos guardar:

official\_total\_cost = 850

y un costo unitario promedio comercial:

212\.50

si hace falta para reporte\.

__38\. Costo promedio del kit prearmado__

Cuando armamos nuevos kits y ya existe stock físico anterior del mismo kit, la entrada del armado recalcula:

inventories\.average\_cost

del producto kit\.

Igual que cualquier entrada valorizada\.

__39\. No consumir componentes otra vez__

Cuando se vende un kit prearmado:

solo sale el producto kit\.

No volvemos a descontar sus componentes\.

Los componentes ya salieron cuando se armó\.

__40\. Versiones y lotes prearmados__

Cada lote de kit terminado debe poder rastrearse hacia:

assembly\_order

→ kit\_version

Así sabemos qué composición produjo ese lote\.

__41\. Cambio de receta__

Supongamos:

Kit v1 activo

se reemplaza por:

Kit v2

Los kits físicos prearmados usando v1 siguen existiendo y pueden venderse como producto kit\.

No “se transforman” automáticamente a v2\.

Su historial queda ligado al armado v1\.

__42\. Producto componente inactivo__

Si un componente pasa a INACTIVE:

la versión del kit debe entrar en revisión o no permitir nuevos armados/ventas armadas según política\.

No se modifica automáticamente la receta\.

__43\. Producto componente MERGED__

Si un producto fue fusionado, la receta histórica conserva el componente original\.

Para nuevas versiones se debe utilizar el producto canónico\.

No reescribimos recetas históricas\.

__44\. Componente sin costo__

Para venta/armado oficial:

si un componente tiene stock pero costo oficial desconocido/cero por una excepción irregular:

normalmente bloquear\.

Especialmente si no podemos obtener un costo confiable del kit\.

Puede existir una excepción administrativa futura, pero no debe ser comportamiento normal\.

__45\. Componente sin stock__

Armado:

required > available

→ no se confirma\.

No permitimos stock negativo\.

__46\. Concurrencia__

Dos órdenes pueden intentar consumir los mismos componentes\.

Al confirmar debemos bloquear:

inventories de todos los componentes

en orden determinístico\.

Luego lotes PEPS\.

Solo una operación puede usar las últimas unidades\.

__47\. Concurrencia de venta vs armado__

Ejemplo:

Componente A disponible = 2

Simultáneamente:

- venta de kit necesita 2,
- armado necesita 2\.

Ambas bloquean el mismo inventory\.

Una confirma; la otra falla/revalida\.

Stock nunca queda negativo\.

__48\. Operación atómica de armado__

BEGIN

1\. Bloquear assembly\_order

2\. Validar versión de kit

3\. Bloquear inventories componentes \+ kit resultado

4\. Validar reservas/componentes

5\. Seleccionar lotes PEPS

6\. Crear inventory\_movement KIT\_ASSEMBLY

7\. Crear líneas OUT componentes

8\. Crear lot\_allocations componentes

9\. Calcular costo oficial de componentes

10\. Crear línea IN kit

11\. Crear lote kit terminado

12\. Actualizar inventarios

13\. Crear Kardex de cada línea

14\. Actualizar costos de assembly\_order/components

15\. Consumir reservas

16\. Marcar ASSEMBLED

COMMIT

Todo o nada\.

__49\. Kardex de armado__

Cada componente tendrá:

KIT\_ASSEMBLY\_CONSUMPTION

como salida\.

El kit terminado tendrá:

KIT\_ASSEMBLY\_OUTPUT

como entrada\.

Podemos usar un mismo inventory\_movement de tipo KIT\_ASSEMBLY, mientras kardex\_entries\.movement\_type especifica el efecto por línea si queremos mayor detalle\.

__50\. Armado parcial__

¿Podemos pedir 10 y armar solo 6?

Sí estructuralmente\.

requested\_quantity = 10

assembled\_quantity = 6

Pero antes de confirmar debe quedar claro si la orden:

- se cierra por 6,
- mantiene 4 pendientes\.

Para V1 recomiendo simplificar:

una confirmación arma una cantidad final concreta; si se necesitan más luego, se crea otra orden\.

Así una orden ASSEMBLED queda cerrada\.

__51\. Reservas sobrantes__

Si se reservaron componentes para 10 y finalmente se arman 6:

- consumir reserva correspondiente a 6,
- liberar 4\.

Todo en la misma transacción\.

__52\. Cancelación antes del armado__

Si está:

DRAFT

PENDING\_APPROVAL

IN\_PREPARATION

se puede cancelar según permisos\.

Si había reservas:

release reservation

No Kardex\.

__53\. Después de ASSEMBLED__

No se cancela borrando\.

Requiere:

- reversión segura,
- o desarmado controlado,

según situación\.

__54\. Desarmado__

Ya decidimos que no será una operación rutinaria de V1\.

La base debe quedar preparada conceptualmente, pero no necesito introducir ahora:

disassembly\_orders

Eso añadiría complejidad sin necesidad inmediata\.

__55\. ¿Podríamos reutilizar assembly\_orders para desarmar?__

Futuro:

assembly\_type = ASSEMBLY / DISASSEMBLY

sería una posibilidad\.

Pero como la lógica de valoración de componentes recuperados es diferente, prefiero no mezclarla todavía\.

Cuando se habilite, se diseña específicamente\.

__56\. Devolución de kit prearmado__

La devolución del kit físico bueno puede entrar como kit terminado\.

No necesitamos desarmarlo automáticamente\.

__57\. Devolución de KIT\_COMPONENTS armado al vender__

Se registran componentes reales retornados mediante customer\_return\_lines\.

No modifica receta\.

__58\. Offline__

__Consultar kit__

Sí\.

__Vender KIT\_COMPONENTS__

Solo si:

- versión cacheada válida,
- componentes cacheados,
- stock local estimado suficiente,
- no requiere autorización sensible\.

Servidor revalida\.

__Confirmar armado anticipado offline__

No recomendado para V1\.

Puede crearse borrador/preparación, pero el armado oficial requiere conexión\.

__59\. ¿Por qué armado oficial online?__

Porque modifica simultáneamente:

- varios inventarios de componentes,
- lotes,
- costo,
- inventario del kit,
- Kardex\.

Es una operación de alto riesgo para reconciliación offline\.

__60\. Versionado offline__

La PWA debe cachear:

kit\_version\.uuid/id

version\_number

components

Una venta offline guarda qué versión utilizó\.

Servidor no evalúa utilizando ciegamente la receta actualmente activa\.

__61\. Versión desactualizada__

Si PWA usa v1 y servidor ya tiene v2:

no significa automáticamente rechazo\.

Si v1 era legítimamente válida cuando fue sincronizada y la política permite ventas con esa versión, puede aceptarse\.

Si v1 fue invalidada críticamente por error de composición, entra en conflicto\.

Esto se resolverá en el Bloque 11\.

__62\. Precios de kit__

No necesitamos tablas nuevas\.

Los kits usan las mismas:

product\_prices

product\_min\_prices

que cualquier producto\.

__63\. Precio vs costo del kit__

El precio comercial del kit es independiente de:

suma costo componentes

Pero el sistema puede generar una alerta si:

minimum\_price < costo

o si margen es negativo\.

La alerta se diseñará más adelante\.

__64\. KIT\_SINGLE__

Recordatorio: no utiliza kit\_versions obligatoriamente\.

Es simplemente:

products\.product\_type = KIT\_SINGLE

con:

- inventario,
- lotes,
- costo promedio,
- compras,
- ventas,
- transferencias\.

Si comercialmente quisiéramos guardar qué contiene un KIT\_SINGLE solo como información, eso sería otra característica, no necesaria para su inventario\.

__65\. Restricción de kit\_product\_id__

kit\_versions\.kit\_product\_id debe apuntar a un producto cuyo:

product\_type = KIT\_COMPONENTS

No a SIMPLE\.

Esta validación cruza tablas, por lo que será responsabilidad del dominio\.

__66\. Restricción de orden__

assembly\_orders\.kit\_product\_id debe coincidir con:

kit\_versions\.kit\_product\_id

No se puede seleccionar versión de otro kit\.

__67\. Snapshot adicional__

Podríamos guardar:

kit\_reference\_snapshot

kit\_name\_snapshot

en assembly\_orders\.

No lo considero imprescindible porque es una operación interna y tenemos FK histórica estable\.

Para reportes documentales podríamos agregarlo posteriormente\.

__68\. Número de armado__

Ejemplo:

ARM\-MZK\-2026\-000125

generado mediante document\_sequences\.

Restricción:

UNIQUE\(branch\_id, assembly\_number\)

__69\. Movimientos de inventario relacionados__

inventory\_movements podrá utilizar:

source\_type = ASSEMBLY\_ORDER

source\_id = assembly\_orders\.id

Así no necesitamos guardar inventory\_movement\_id directamente en la orden\.

__70\. ¿Necesitamos tabla de resultado de armado?__

No\.

Inicialmente en el modelo conceptual contemplamos un “resultado de armado”, pero la revisión lógica muestra que sería redundante\.

El resultado ya está representado por:

assembly\_orders\.assembled\_quantity

\+

inventory\_movement\_line IN

\+

lots

Por tanto __no creamos una tabla assembly\_outputs__\.

__71\. ¿Necesitamos tabla de lotes consumidos en armado?__

Tampoco\.

Ya existe:

inventory\_movement\_lines

→ lot\_allocations

No duplicamos\.

__72\. ¿Necesitamos tabla de costos de armado?__

No\.

Los agregados principales están en:

assembly\_orders

assembly\_order\_components

Los costos oficiales históricos además están en movimientos/Kardex\.

__73\. Relación principal__

products \(KIT\_COMPONENTS\)

      │

      └── kit\_versions

              │

              └── kit\_components

                       │

                       └── products

__74\. Armado__

assembly\_orders

      │

      ├── kit\_version

      │

      └── assembly\_order\_components

                    │

                    ▼

             inventory\_movement

             ├── OUT componentes

             └── IN kit terminado

__75\. Venta de kit__

sale\_line

  │

  ├── kit\_version

  │

  └── sale\_line\_inventory\_lines

             │

             ├── OUT kit prearmado

             └── OUT componentes

Esto cubre tanto venta directa como mezcla de inventario prearmado \+ armado al vender\.

__76\. Auditoría__

Eventos importantes:

- versión de kit creada,
- versión activada,
- versión desactivada,
- componente agregado/eliminado en borrador,
- orden creada,
- reserva,
- lotes preparados,
- armado confirmado,
- costo final,
- cambio PEPS,
- cancelación\.

__77\. Restricciones de assembly\_orders__

requested\_quantity > 0

assembled\_quantity >= 0

labor\_cost >= 0

other\_cost >= 0

Cuando ASSEMBLED:

assembled\_quantity > 0

total\_component\_cost NOT NULL

total\_assembly\_cost NOT NULL

unit\_assembly\_cost NOT NULL

__78\. Restricciones de componentes de orden__

quantity\_required\_per\_kit > 0

required\_quantity > 0

consumed\_quantity >= 0

official\_unit\_cost >= 0 OR NULL

official\_total\_cost >= 0 OR NULL

__79\. Inventario del kit terminado__

Una vez armado:

inventories

product\_id = kit\_product\_id

branch\_id = assembly branch

aumenta físicamente\.

Si no existía una fila de inventario para ese producto\+sucursal, se crea/inicializa dentro de la transacción\.

__80\. Stock cero del kit antes de armado__

Si no existía stock físico anterior:

average\_cost nuevo

=

unit\_assembly\_cost

Si ya existía:

se recalcula promedio ponderado\.

__81\. PEPS posterior del kit__

Los lotes de kit terminado se ordenan por su fecha real de armado/entrada física empresarial\.

Su original\_entry\_date será la fecha del armado, salvo que exista una razón específica diferente\.

__82\. Tablas nuevas del Bloque 9__

Quedan:

kit\_versions

kit\_components

assembly\_orders

assembly\_order\_components

Son:

__4 tablas nuevas__

__83\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

1\. Organización y seguridad

12

12

2\. Catálogo maestro

9

21

3\. Núcleo de inventario

9

30

4\. Compras y entradas

5

35

5\. Clientes y ventas

4

39

6\. CxC, pagos y reembolsos

8

47

7\. Salidas, devoluciones, conteos y ajustes

9

56

8\. Transferencias

7

63

9\. Kits y armado

4

__67__

Actualmente:

__9 de 12 bloques diseñados ✅__  
__67 tablas formalmente definidas__

__84\. Decisiones cerradas del Bloque 9__

1. No existirá tabla kits; un kit sigue siendo products\.
2. KIT\_COMPONENTS tendrá versiones\.
3. Las versiones históricas no se sobrescriben\.
4. Una versión contiene varios componentes\.
5. No se permiten cantidades de componente <= 0\.
6. No se permite que un kit se contenga a sí mismo\.
7. Evitamos kits compuestos anidados en V1\.
8. La cantidad armable es calculada, no inventario físico\.
9. Venta de kit reutiliza sale\_lines y movimientos existentes\.
10. sale\_line\_inventory\_lines permite múltiples efectos físicos\.
11. Armado anticipado tendrá assembly\_orders\.
12. La orden congela la versión utilizada\.
13. assembly\_order\_components congela requerimientos y consumos\.
14. Reservas reutilizan la infraestructura común\.
15. Armado confirmado genera un movimiento mixto IN/OUT\.
16. Componentes salen a costo promedio oficial\.
17. Kit terminado entra al costo total del armado\.
18. Mano de obra y otros costos pueden ser cero inicialmente\.
19. El kit terminado crea lote físico\.
20. Ese lote es inventario normal\.
21. Al vender kit prearmado no se vuelven a consumir componentes\.
22. Puede coexistir stock prearmado y capacidad armable\.
23. Se recomienda usar prearmado primero y luego componentes\.
24. No necesitamos assembly\_outputs\.
25. No necesitamos una tabla adicional de lotes consumidos\.
26. No necesitamos disassembly\_orders en V1\.
27. Armado oficial será online inicialmente\.
28. Venta offline de KIT\_COMPONENTS exige versión/stock cacheados y revalidación servidor\.
29. Cambio de receta crea nueva versión, no modifica historia\.
30. Producto/componente sin costo confiable puede bloquear operación oficial\.

__Perfecto\. Continuamos con el Modelo lógico PostgreSQL — Bloque 10 de 12: Cierre diario, caja y control operativo\.__

__Este bloque debe separar claramente tres cosas que suelen mezclarse y causar problemas:__

- __ventas,__
- __cobros,__
- __movimientos reales de caja\.__

__El cierre no debe “inventar” información nueva; debe consolidar y congelar lo ocurrido en una sucursal durante una fecha operativa\.__

__Etapa 4\.2 — Bloque 10: Cierre diario, caja y control operativo__

__Aquí propongo 5 tablas nuevas:__

- __cash\_registers__
- __cash\_movements__
- __daily\_closings__
- __daily\_closing\_versions__
- __daily\_closing\_cash\_counts__

__Con ellas pasaríamos de 67 a 72 tablas formalmente definidas\.__

__1\. Principio central__

__No confundiremos:__

__VENTA__

__≠__

__COBRO__

__≠__

__CAJA__

__Ejemplo:__

__Venta a crédito de S/ 1,000:__

__venta = 1,000__

__cobro del día = 0__

__efectivo = 0__

__Pago de deuda antigua de S/ 500 en efectivo:__

__venta del día = 0__

__cobro = 500__

__efectivo = \+500__

__Retiro de caja de S/ 200:__

__venta = 0__

__cobro cliente = 0__

__caja = \-200__

__El diseño debe preservar esas diferencias\.__

__2\. Tabla cash\_registers__

__Propósito__

__Representar una caja operativa identificable dentro de una sucursal\.__

__Aunque inicialmente una sucursal pueda tener una sola caja, no recomiendo asumir que siempre será así\.__

__Ejemplos futuros:__

__Caja principal__

__Caja mostrador__

__Caja almacén__

__Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__branch\_id__

__BIGINT__

__FK → branches\.id, NOT NULL__

__code__

__VARCHAR__

__NOT NULL__

__name__

__VARCHAR__

__NOT NULL__

__status__

__VARCHAR__

__NOT NULL__

__is\_default__

__BOOLEAN__

__NOT NULL DEFAULT FALSE__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__Restricción:__

__UNIQUE\(branch\_id, code\)__

__3\. ¿Realmente necesitamos cash\_registers?__

__Sí, aunque al inicio haya una sola caja\.__

__Sin esta tabla terminaríamos asociando movimientos únicamente a sucursal y luego sería difícil separar:__

- __cajas distintas,__
- __responsables distintos,__
- __fondos diferentes,__
- __turnos futuros\.__

__Es una tabla pequeña y estable\.__

__4\. Tabla cash\_movements__

__Propósito__

__Registrar entradas y salidas de caja que no son pagos comerciales normales registrados en payments\.__

__Ejemplos:__

__OPENING\_FUND__

__CASH\_IN__

__CASH\_OUT__

__WITHDRAWAL__

__DEPOSIT\_TO\_BANK__

__EXPENSE__

__CORRECTION__

__No registraremos nuevamente los pagos de clientes aquí, porque eso duplicaría el dinero\.__

__5\. Campos de cash\_movements__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK__

__cash\_register\_id__

__BIGINT__

__FK → cash\_registers\.id__

__movement\_number__

__VARCHAR__

__NOT NULL__

__movement\_type__

__VARCHAR__

__NOT NULL__

__direction__

__VARCHAR__

__NOT NULL__

__operation\_date__

__TIMESTAMPTZ__

__NOT NULL__

__amount__

__NUMERIC__

__NOT NULL__

__currency\_code__

__CHAR\(3\)__

__NOT NULL__

__reason\_id__

__BIGINT__

__FK → reason\_codes\.id, NULL__

__reference__

__VARCHAR__

__NULL__

__notes__

__TEXT__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__created\_by__

__BIGINT__

__FK users\.id__

__approved\_by__

__BIGINT__

__FK users\.id, NULL__

__confirmed\_by__

__BIGINT__

__FK users\.id, NULL__

__device\_id__

__BIGINT__

__FK devices\.id, NULL__

__confirmed\_at__

__TIMESTAMPTZ__

__NULL__

__cancelled\_at__

__TIMESTAMPTZ__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__6\. Dirección__

__Valores:__

__IN__

__OUT__

__amount siempre positivo\.__

__Ejemplo:__

__movement\_type = WITHDRAWAL__

__direction = OUT__

__amount = 300__

__No usamos \-300\.__

__7\. Tipos de movimiento de caja__

__Propongo inicialmente:__

__OPENING\_FUND__

__EXTRA\_CASH\_IN__

__WITHDRAWAL__

__EXPENSE__

__BANK\_DEPOSIT__

__CORRECTION\_IN__

__CORRECTION\_OUT__

__OTHER\_AUTHORIZED__

__No incluir:__

__CUSTOMER\_PAYMENT__

__REFUND__

__porque esos ya tienen tablas propias\.__

__El cierre los lee desde sus respectivas fuentes\.__

__8\. Fondo inicial__

__El fondo inicial del día puede representarse como:__

__cash\_movements\.movement\_type = OPENING\_FUND__

__direction = IN__

__Esto evita crear una tabla adicional solo para aperturas\.__

__9\. Un solo fondo inicial por caja y fecha__

__Deberíamos impedir dos fondos iniciales confirmados para la misma:__

__cash\_register__

__\+__

__operating\_date__

__La restricción exacta probablemente será un índice único parcial sobre movimientos confirmados de tipo OPENING\_FUND\.__

__10\. Movimiento de caja confirmado__

__Solo:__

__status = CONFIRMED__

__afecta el cálculo del cierre\.__

__Estados:__

__DRAFT__

__PENDING\_APPROVAL__

__CONFIRMED__

__CANCELLED__

__REJECTED__

__11\. ¿Caja debe permitir offline?__

__Para V1:__

- __consulta de caja: sí,__
- __borrador de gasto/retiro: podría ser,__
- __confirmación de movimiento sensible: preferiblemente online\.__

__Especialmente:__

__WITHDRAWAL__

__EXPENSE__

__CORRECTION__

__requieren revalidación y permiso\.__

__12\. Tabla daily\_closings__

__Propósito__

__Representar el cierre lógico de una sucursal para una fecha operativa\.__

__Una sucursal debe tener como máximo un cierre lógico activo por fecha, aunque pueda tener varias versiones por reapertura\.__

__Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK__

__operating\_date__

__DATE__

__NOT NULL__

__status__

__VARCHAR__

__NOT NULL__

__current\_version\_number__

__INTEGER__

__NOT NULL DEFAULT 1__

__opened\_at__

__TIMESTAMPTZ__

__NULL__

__closed\_at__

__TIMESTAMPTZ__

__NULL__

__closed\_by__

__BIGINT__

__FK users\.id, NULL__

__reopened\_at__

__TIMESTAMPTZ__

__NULL__

__reopened\_by__

__BIGINT__

__FK users\.id, NULL__

__reopen\_reason\_id__

__BIGINT__

__FK reason\_codes\.id, NULL__

__notes__

__TEXT__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__Restricción:__

__UNIQUE\(branch\_id, operating\_date\)__

__13\. Estados del cierre__

__Propongo:__

__OPEN__

__PENDING\_REVIEW__

__CLOSED__

__REOPENED__

__Podríamos simplificar REOPENED como OPEN con versión >1, pero conservarlo explícitamente facilita auditoría\.__

__14\. ¿Cuándo se crea el cierre?__

__No necesariamente a primera hora\.__

__Podemos crearlo:__

- __automáticamente al primer movimiento del día,__
- __o cuando se inicia el cierre\.__

__La fecha operativa es lo importante\.__

__15\. Fecha operativa__

__No depende de:__

__created\_at__

__Ejemplo:__

__Una venta offline realizada:__

__2026\-08\-06 17:40__

__sincroniza:__

__2026\-08\-06 21:15__

__La fecha operativa sigue siendo 6 de agosto\.__

__Pero solo podrá incorporarse si ese día sigue abierto o se autoriza reapertura/regularización\.__

__16\. Cierre bloquea operaciones tardías__

__Cuando:__

__daily\_closings\.status = CLOSED__

__una nueva operación con:__

__operation\_date = esa fecha__

__no se confirma normalmente\.__

__Online:__

__rechazo__

__Offline:__

__conflicto__

__17\. Tabla daily\_closing\_versions__

__Esta es fundamental\.__

__Propósito__

__Conservar cada fotografía oficial del cierre\.__

__Ejemplo:__

__Cierre 06/08__

__v1 cerrado 20:00__

__↓__

__reapertura__

__↓__

__operación regularizada__

__↓__

__v2 cerrado 21:00__

__No sobrescribimos la versión 1\.__

__18\. Campos de daily\_closing\_versions__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__daily\_closing\_id__

__BIGINT__

__FK__

__version\_number__

__INTEGER__

__NOT NULL__

__opening\_cash\_amount__

__NUMERIC__

__NOT NULL__

__cash\_sales\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__credit\_sales\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__partial\_sales\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__total\_sales\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__customer\_collections\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__cash\_collections\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__non\_cash\_collections\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__cash\_refunds\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__non\_cash\_refunds\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__cash\_inputs\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__cash\_outputs\_amount__

__NUMERIC__

__NOT NULL DEFAULT 0__

__expected\_cash\_amount__

__NUMERIC__

__NOT NULL__

__counted\_cash\_amount__

__NUMERIC__

__NOT NULL__

__cash\_difference\_amount__

__NUMERIC__

__NOT NULL__

__pending\_sync\_count__

__INTEGER__

__NOT NULL DEFAULT 0__

__open\_conflicts\_count__

__INTEGER__

__NOT NULL DEFAULT 0__

__inventory\_mismatch\_count__

__INTEGER__

__NOT NULL DEFAULT 0__

__snapshot\_generated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__closed\_by__

__BIGINT__

__FK users\.id__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__Restricción:__

__UNIQUE\(daily\_closing\_id, version\_number\)__

__19\. ¿Por qué guardar tantos totales si pueden calcularse?__

__Porque un cierre es una fotografía histórica oficial\.__

__Si después:__

- __se corrige un catálogo,__
- __cambia una consulta,__
- __se reabre otro día,__
- __se optimiza lógica,__

__queremos conservar exactamente qué cifras fueron cerradas en esa versión\.__

__La fuente histórica detallada siguen siendo ventas/pagos/etc\.; la versión es el resumen congelado\.__

__20\. Ventas del día__

__Debemos separar:__

__cash\_sales\_amount__

__credit\_sales\_amount__

__partial\_sales\_amount__

__pero también:__

__total\_sales\_amount__

__como resumen\.__

__Ejemplo:__

__contado = 2,000__

__crédito = 1,000__

__parcial = 500__

__total ventas = 3,500__

__21\. Cobros del día__

__customer\_collections\_amount incluye dinero realmente recibido de clientes:__

- __ventas contado,__
- __pagos iniciales,__
- __cobro de deudas anteriores\.__

__Pero para cierre necesitamos además distinguir:__

__cash\_collections\_amount__

__non\_cash\_collections\_amount__

__porque solo el primero afecta efectivo físico\.__

__22\. No sumar ventas como efectivo__

__Este es el error que debemos evitar\.__

__Ejemplo:__

__Venta contado = 1,000__

__Pago:__

__Efectivo 400__

__Yape 600__

__Entonces:__

__cash\_sales\_amount = 1,000__

__customer\_collections\_amount = 1,000__

__cash\_collections\_amount = 400__

__non\_cash\_collections\_amount = 600__

__El efectivo esperado aumenta solo 400\.__

__23\. Venta crédito__

__Ejemplo:__

__Venta crédito = 1,000__

__Entonces:__

__credit\_sales\_amount = 1,000__

__customer\_collections\_amount = 0__

__cash\_collections\_amount = 0__

__24\. Pago de deuda antigua__

__Pago deuda = 500 en efectivo__

__Entonces:__

__sales del día \+= 0__

__customer\_collections \+= 500__

__cash\_collections \+= 500__

__25\. Reembolso__

__Si devolvemos:__

__200 efectivo__

__Entonces:__

__cash\_refunds\_amount \+= 200__

__Si fue transferencia:__

__non\_cash\_refunds\_amount \+= 200__

__26\. Movimientos manuales de caja__

__Desde cash\_movements:__

__IN__

__cash\_inputs\_amount__

__OUT__

__cash\_outputs\_amount__

__No incluimos pagos/reembolsos otra vez\.__

__27\. Fórmula del efectivo esperado__

__Como ya definimos funcionalmente:__

__expected\_cash__

__=__

__opening\_cash__

__\+ cash\_collections__

__\- cash\_refunds__

__\+ cash\_inputs__

__\- cash\_outputs__

__Esta será la fórmula principal\.__

__28\. Ejemplo completo__

__Fondo inicial:__

__500__

__Cobros efectivo:__

__2,000__

__Reembolsos efectivo:__

__100__

__Ingreso extraordinario:__

__200__

__Retiro:__

__1,000__

__Entonces:__

__expected\_cash__

__=__

__500 \+ 2000 \- 100 \+ 200 \- 1000__

__=__

__1,600__

__Si se cuentan:__

__1,590__

__diferencia:__

__\-10__

__29\. Diferencia de caja__

__cash\_difference\_amount__

__=__

__counted\_cash\_amount__

__\-__

__expected\_cash\_amount__

__Entonces:__

- __positivo → sobrante,__
- __negativo → faltante,__
- __cero → cuadrado\.__

__30\. Tabla daily\_closing\_cash\_counts__

__Propósito__

__Guardar el conteo físico detallado del efectivo al cerrar\.__

__No quiero conservar solamente:__

__counted\_cash\_amount = 1,590__

__porque para auditoría es útil saber cómo fue contado\.__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__daily\_closing\_version\_id__

__BIGINT__

__FK__

__cash\_register\_id__

__BIGINT__

__FK__

__denomination__

__NUMERIC__

__NOT NULL__

__quantity__

__INTEGER__

__NOT NULL__

__subtotal\_amount__

__NUMERIC__

__NOT NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__31\. Ejemplo de conteo__

__200 × 3 = 600__

__100 × 4 = 400__

__50 × 5  = 250__

__20 × 10 = 200__

__10 × 8  = 80__

__5 × 12  = 60__

__Total:__

__1,590__

__La suma debe coincidir con:__

__daily\_closing\_versions\.counted\_cash\_amount__

__32\. ¿Y monedas?__

__denomination NUMERIC permite:__

__1__

__0\.50__

__0\.20__

__0\.10__

__sin problema\.__

__33\. ¿Necesitamos una tabla catálogo de denominaciones?__

__No para V1\.__

__Sería innecesaria\.__

__La UI puede tener denominaciones PEN configuradas\.__

__Si después se soportan monedas múltiples de caja, puede revisarse\.__

__34\. Varias cajas por sucursal__

__daily\_closing\_cash\_counts\.cash\_register\_id permite contar cada caja\.__

__La versión del cierre conserva el total consolidado\.__

__Podemos consultar:__

__Caja A = 1,000__

__Caja B = 590__

__Total = 1,590__

__35\. ¿Necesitamos una tabla cash\_sessions?__

__Esta es una posibilidad importante\.__

__Podríamos modelar:__

__usuario abre caja__

__trabaja__

__cierra caja__

__mediante cash\_sessions\.__

__Pero funcionalmente todavía no definimos un flujo de turnos/cajeros individual por usuario\.__

__El cierre actual es por:__

__sucursal \+ fecha operativa__

__Por tanto no la agregaría en V1\.__

__Si luego se requiere caja por turno/persona, cash\_sessions será una extensión clara\.__

__36\. ¿Necesitamos cash\_register\_id en payments?__

__Aquí aparece un punto práctico\.__

__Si una sucursal tiene varias cajas, necesitamos saber en cuál cayó el efectivo de un pago\.__

__Actualmente payments tiene receiving\_branch\_id, pero no cash\_register\_id\.__

__Recomiendo agregar:__

__payments\.cash\_register\_id BIGINT NULL__

__cuando un pago tenga al menos un componente efectivo\.__

__37\. ¿Por qué nullable?__

__Porque un pago:__

__100% Yape__

__puede no pasar por caja física\.__

__Sin embargo, podría seguir asignarse a una caja operativa para responsabilidad de usuario\.__

__Para V1 podemos exigir cash\_register\_id solo cuando exista una línea:__

__payment\_method\.is\_cash = true__

__38\. Reembolsos también__

__Igualmente debemos saber de qué caja salió un reembolso efectivo\.__

__Agregar en:__

__refunds\.cash\_register\_id BIGINT NULL__

__cuando existan métodos is\_cash\.__

__Esto no crea tablas nuevas, solo refina las existentes\.__

__39\. cash\_movements\.cash\_register\_id__

__Aquí sí siempre será obligatorio porque la operación es explícitamente de caja\.__

__40\. Fondo inicial y cierre__

__Podemos obtener:__

__opening\_cash\_amount__

__de los movimientos OPENING\_FUND confirmados\.__

__No debe escribirse libremente en el cierre\.__

__La versión simplemente congela el valor calculado\.__

__41\. Si no hay fondo inicial__

__Podemos aceptar:__

__opening\_cash = 0__

__si la política de sucursal así lo permite\.__

__Pero no inventamos una fila OPENING\_FUND 0\.__

__42\. Reapertura__

__Una reapertura no modifica daily\_closing\_versions anterior\.__

__Ejemplo:__

__daily\_closing\.current\_version\_number = 1__

__se cierra\.__

__Luego administrador reabre:__

__status = REOPENED__

__reopened\_by = \.\.\.__

__reopen\_reason = \.\.\.__

__Después del nuevo cierre:__

__current\_version\_number = 2__

__y se crea:__

__daily\_closing\_versions\.version\_number = 2__

__43\. ¿Por qué versionar?__

__Porque sin versiones una reapertura obligaría a sobrescribir:__

- __total ventas,__
- __efectivo esperado,__
- __diferencia,__
- __conflictos\.__

__Eso destruiría evidencia del primer cierre\.__

__44\. Reapertura requiere permiso__

__Ejemplo:__

__closings\.reopen__

__No debe estar disponible a vendedor\.__

__45\. Día cerrado y movimiento de caja__

__Misma regla que ventas/pagos:__

__No puede confirmarse un movimiento nuevo con fecha operativa cerrada sin reapertura/regularización\.__

__46\. Requisitos para cerrar__

__Antes de cerrar debemos validar:__

1. __No haya operaciones críticas pendientes de sincronización\.__
2. __No haya conflictos críticos abiertos\.__
3. __Inventario vs Kardex esté reconciliado\.__
4. __Lotes vs inventario estén reconciliados\.__
5. __Pagos estén consistentes con métodos\.__
6. __Reembolsos estén consistentes con métodos\.__
7. __Caja esté contada\.__
8. __Diferencias importantes tengan explicación/autorización\.__

__47\. Pendientes de sincronización__

__pending\_sync\_count en la versión guarda cuántas operaciones críticas estaban pendientes al evaluar el cierre\.__

__Normalmente para permitir cierre:__

__pending\_sync\_count = 0__

__48\. Conflictos__

__Igualmente:__

__open\_conflicts\_count = 0__

__para conflictos críticos\.__

__Podemos permitir conflictos informativos no bloqueantes según clasificación futura\.__

__49\. Inventario inconsistente__

__Si encontramos:__

__inventories \!= último Kardex__

__o:__

__inventories \!= sum\(lots\)__

__el cierre debería bloquearse\.__

__inventory\_mismatch\_count guarda el resultado de esa validación\.__

__50\. Transferencias en tránsito__

__Una transferencia legítimamente IN\_TRANSIT:__

__no bloquea el cierre\.__

__El inventario origen ya está correctamente reducido y tránsito está explicado\.__

__51\. Transferencia pendiente de recepción__

__Tampoco bloquea automáticamente el destino si la mercadería aún no llegó\.__

__Pero si destino declara que físicamente recibió y tiene una recepción local pendiente de sincronización:__

__sí puede ser crítica\.__

__Eso se detectará por sync\_operations\.__

__52\. Conteos pendientes__

__Un conteo físico simplemente abierto no debería bloquear siempre el cierre\.__

__Pero:__

- __conteo completo con diferencia crítica,__
- __ajuste pendiente,__
- __discrepancia detectada,__

__sí puede bloquear según política\.__

__53\. Diferencia de caja__

__¿Toda diferencia bloquea cierre?__

__No necesariamente\.__

__Ejemplo:__

__diferencia = S/ 0\.10__

__podría aceptarse con tolerancia\.__

__Necesitamos una configuración futura, por ejemplo:__

__cash\_closing\_tolerance__

__Si supera:__

__ABS\(cash\_difference\) > tolerance__

__requiere autorización\.__

__54\. No necesitamos tabla específica de diferencias de caja__

__Inicialmente en el modelo conceptual habíamos considerado una\.__

__Pero:__

__expected\_cash\_amount__

__counted\_cash\_amount__

__cash\_difference\_amount__

__ya viven en daily\_closing\_versions\.__

__Y motivo/aprobación pueden venir de approvals/auditoría\.__

__Por tanto no crearemos cash\_differences\.__

__Esto reduce tablas\.__

__55\. ¿Cómo documentar diferencia grande?__

__Mediante:__

- __daily\_closing\_versions\.cash\_difference\_amount__
- __approvals__
- __reason\_codes__
- __attachments__
- __audit\_events__

__No necesitamos entidad adicional salvo que en futuro haya un flujo financiero específico para recuperar faltantes\.__

__56\. Diferencia no debe generar movimiento automático__

__Si hay:__

__expected = 1000__

__counted = 980__

__difference = \-20__

__no debemos crear automáticamente:__

__cash\_movement OUT 20__

__porque eso ocultaría la diferencia\.__

__Debe permanecer visible como faltante\.__

__57\. Corrección real previa al cierre__

__Si descubrimos que faltaba registrar un retiro real de S/20:__

__entonces se registra correctamente:__

__cash\_movement__

__WITHDRAWAL 20__

__si el día sigue abierto/autorizado\.__

__Luego:__

__expected = 980__

__counted = 980__

__difference = 0__

__Eso sí representa la realidad\.__

__58\. Corrección posterior al cierre__

__Requiere:__

__reapertura__

__\+__

__registro correcto__

__\+__

__nuevo cierre versión 2__

__No editar versión 1\.__

__59\. Cierre y venta anulada__

__Si una venta fue anulada correctamente antes del cierre:__

- __venta bruta puede aparecer en algunos reportes,__
- __venta neta debe descontar anulación/devolución según reporte\.__

__Para el cierre operativo necesitamos definir si total\_sales\_amount representa:__

__ventas netas confirmadas vigentes__

__Mi recomendación: ventas netas operativas vigentes del día\.__

__Auditoría puede mostrar brutas y anuladas aparte\.__

__60\. ¿Agregar cancelled\_sales\_amount?__

__Podría ser muy útil\.__

__Asimismo:__

__returns\_amount__

__para saber qué ocurrió sin consultar detalle\.__

__Propongo añadir a daily\_closing\_versions:__

__cancelled\_sales\_amount__

__customer\_returns\_amount__

__ambos NUMERIC NOT NULL DEFAULT 0\.__

__Así el cierre puede mostrar:__

__Ventas brutas__

__\- anulaciones__

__\- devoluciones__

__= ventas netas__

__61\. Entonces total\_sales\_amount__

__Recomiendo definir:__

__total\_sales\_amount = ventas netas del día__

__Y agregar:__

__gross\_sales\_amount__

__cancelled\_sales\_amount__

__customer\_returns\_amount__

__para mayor claridad\.__

__62\. Campos refinados de ventas en versión__

__Tendríamos:__

__gross\_sales\_amount__

__cancelled\_sales\_amount__

__customer\_returns\_amount__

__total\_sales\_amount__

__y además distribución:__

__cash\_sales\_amount__

__credit\_sales\_amount__

__partial\_sales\_amount__

__Aquí debemos evitar que las categorías se vuelvan ambiguas después de devoluciones\.__

__Por tanto las tres modalidades pueden representar ventas confirmadas brutas por modalidad, mientras total\_sales\_amount es neto\.__

__63\. Cobros y reembolsos__

__Los cobros se miden por dinero recibido, no por venta neta\.__

__Así una venta anulada después de recibir dinero puede generar:__

__payment confirmado__

__\+__

__refund confirmado__

__y ambos aparecen por separado\.__

__64\. Cierre no modifica operaciones__

__Muy importante:__

__daily\_closings nunca:__

- __cambia ventas,__
- __cambia pagos,__
- __cambia inventario,__
- __cambia CxC\.__

__Solo:__

- __valida,__
- __resume,__
- __congela,__
- __bloquea fecha operativa\.__

__65\. Cierre y cuentas por cobrar__

__No necesitamos snapshot completo de cada deuda\.__

__Pero podemos guardar indicadores:__

__credit\_sales\_amount__

__y reportar cuentas originadas ese día\.__

__Saldo total de cartera es otro reporte, no necesariamente parte del cierre de caja\.__

__66\. ¿Guardar receivables\_created\_amount?__

__Podría ser equivalente a crédito originado por ventas parciales/crédito\.__

__No hace falta todavía porque:__

__credit\_amount de sales__

__lo permite consultar\.__

__Evitemos inflar la tabla de cierre\.__

__67\. Cierre con moneda__

__Para V1 base PEN\.__

__daily\_closing\_versions puede asumir moneda base de empresa\.__

__No es necesario agregar currency\_code si el cierre es siempre en moneda base\.__

__Pero si aceptamos pagos multimoneda físicos, entonces necesitaríamos separar caja por moneda\.__

__Como no hemos definido multimoneda completa, V1 cerrará caja en PEN\.__

__68\. Numeración__

__cash\_movements tendrá, por ejemplo:__

__CAJ\-MZK\-2026\-000125__

__El cierre no necesariamente necesita un closing\_number, porque:__

__branch \+ operating\_date__

__lo identifica de forma natural\.__

__Podemos imprimir:__

__CIERRE\-MZK\-20260806\-V1__

__derivado, sin almacenarlo\.__

__69\. Usuario responsable__

__daily\_closing\_versions\.closed\_by conserva quién realizó esa versión\.__

__daily\_closings\.closed\_by puede conservar el último responsable para consulta rápida\.__

__Hay cierta redundancia intencional\.__

__70\. ¿Necesitamos responsable de caja por caja?__

__No para V1\.__

__La auditoría y created\_by de pagos/movimientos permiten rastrear usuarios\.__

__Si se implementan turnos posteriormente, añadiremos cash\_sessions\.__

__71\. Operación de cierre__

__Conceptualmente:__

__BEGIN__

1. __Bloquear daily\_closing\.__
2. __Confirmar que fecha sigue abierta\.__
3. __Verificar sync crítico\.__
4. __Verificar conflictos\.__
5. __Reconciliar inventario\.__
6. __Reconciliar pagos\.__
7. __Reconciliar reembolsos\.__
8. __Calcular ventas\.__
9. __Calcular cobros\.__
10. __Calcular caja\.__
11. __Leer conteo físico\.__
12. __Calcular diferencia\.__
13. __Validar tolerancia/autorización\.__
14. __Crear daily\_closing\_version\.__
15. __Marcar cierre CLOSED\.__

__COMMIT__

__72\. ¿Bloquear toda la sucursal durante el cierre?__

__No necesariamente durante varios minutos\.__

__La estrategia correcta será:__

- __obtener lock lógico corto al finalizar,__
- __asegurarnos de que ninguna operación pueda insertarse “entre” cálculo y cierre definitivo\.__

__Esto se profundizará en diseño técnico/concurrencia\.__

__73\. Carrera cierre vs venta__

__Ejemplo:__

__Usuario A está cerrando\.__

__Usuario B intenta confirmar venta del mismo día\.__

__Solo uno debe ganar el lock/serialización correcta:__

__Si venta confirma primero__

__El cierre debe incluirla\.__

__Si cierre confirma primero__

__La venta debe rechazarse por día cerrado\.__

__Nunca cerrar sin venta y luego dejar que entre silenciosamente\.__

__74\. Carrera cierre vs pago__

__Igual\.__

__Necesitamos serializar por:__

__branch \+ operating\_date__

__al confirmar operaciones críticas\.__

__Esto puede resolverse con:__

- __advisory locks de PostgreSQL,__
- __fila daily\_closings,__
- __estrategia de locking consistente\.__

__Lo detallaremos en restricciones/concurrencia física\.__

__75\. Reapertura y concurrencia__

__Al reabrir:__

- __solo administrador/rol autorizado,__
- __motivo obligatorio,__
- __puede existir restricción si ya hubo cierre posterior\.__

__Ejemplo:__

__No deberíamos reabrir 5 de agosto libremente si 6 y 7 ya están cerrados sin evaluar impacto\.__

__76\. Cierres encadenados__

__Para V1 recomiendo:__

__si se quiere reabrir una fecha anterior a otra fecha ya cerrada, requerir privilegio administrativo superior y validación\.__

__Porque podría alterar:__

- __caja arrastrada,__
- __reportes,__
- __saldos\.__

__77\. Fondo inicial del día siguiente__

__Tenemos dos posibilidades:__

__A\. Manual__

__Se registra nuevo OPENING\_FUND\.__

__B\. Automático desde cierre anterior__

__opening next day = counted/authorized closing cash__

__No necesariamente debe ser automático, porque puede existir retiro nocturno\.__

__Mi recomendación: fondo inicial explícito\.__

__78\. Caja no necesariamente arrastra todo el cierre__

__Ejemplo:__

__Cierre:__

__counted = 5,000__

__Después se deposita al banco:__

__4,500__

__y próximo día:__

__opening fund = 500__

__Por eso no debemos asumir arrastre automático\.__

__79\. Depósito bancario__

__Si ocurre antes del cierre:__

__cash\_movement BANK\_DEPOSIT OUT__

__reduce efectivo esperado\.__

__Si ocurre después del cierre y pertenece al siguiente día operativo, se registra allí según política\.__

__80\. Gasto de caja__

__cash\_movement EXPENSE OUT__

__Debe exigir:__

- __motivo,__
- __posiblemente adjunto,__
- __aprobación según monto\.__

__No es una compra de inventario\.__

__81\. Ingreso extraordinario__

__EXTRA\_CASH\_IN__

__podría representar ingreso de fondos a caja\.__

__Debe estar restringido para evitar “cuadrar” caja artificialmente\.__

__82\. Correcciones de caja__

__CORRECTION\_IN/OUT deberían ser excepcionales y muy auditadas\.__

__No son mecanismo normal para eliminar diferencias\.__

__83\. Estados del cierre y UI__

__La sucursal debería ver claramente:__

__ABIERTO__

__PENDIENTE DE REVISIÓN__

__CERRADO__

__REABIERTO__

__y:__

__Versión actual: 2__

__cuando corresponda\.__

__84\. Datos que puede mostrar el cierre__

__Resumen:__

__Ventas brutas__

__Anulaciones__

__Devoluciones__

__Ventas netas__

__Cobros de clientes__

__\- efectivo__

__\- electrónicos__

__Reembolsos__

__\- efectivo__

__\- electrónicos__

__Fondo inicial__

__Otros ingresos de caja__

__Salidas de caja__

__Efectivo esperado__

__Efectivo contado__

__Diferencia__

__Esto es mucho más útil que simplemente “ventas del día”\.__

__85\. Cierre consolidado de administrador__

__No necesitamos tabla nueva\.__

__Administrador puede consultar:__

__daily\_closings__

__\+__

__daily\_closing\_versions__

__de todas las sucursales\.__

__Ejemplo:__

__Juliaca  CLOSED__

__Mazuko   CLOSED__

__Huepetuhe OPEN__

__\.\.\.__

__86\. Consolidado por fecha__

__Tampoco necesitamos company\_daily\_closings\.__

__Puede ser una consulta/reporte sobre cierres de sucursal\.__

__Crear otra tabla duplicaría datos\.__

__87\. Alertas__

__Si una sucursal no cerró el día:__

__alerts__

__puede generar aviso\.__

__La tabla de alertas será del Bloque 12\.__

__88\. Auditoría__

__Debe registrar:__

- __apertura/fondo inicial,__
- __movimiento de caja,__
- __cancelación,__
- __intento de cierre,__
- __cierre bloqueado,__
- __cierre exitoso,__
- __diferencia,__
- __autorización de diferencia,__
- __reapertura,__
- __motivo,__
- __nueva versión\.__

__89\. Restricciones cash\_movements__

__amount > 0__

__y:__

__direction IN \('IN','OUT'\)__

__Sucursales/cajas deben pertenecer a la misma empresa\.__

__90\. Restricciones daily\_closings__

__UNIQUE\(branch\_id, operating\_date\)__

__current\_version\_number >= 1__

__No hay hard delete\.__

__91\. Restricciones daily\_closing\_versions__

__opening\_cash\_amount >= 0__

__cash\_sales\_amount >= 0__

__credit\_sales\_amount >= 0__

__partial\_sales\_amount >= 0__

__gross\_sales\_amount >= 0__

__cancelled\_sales\_amount >= 0__

__customer\_returns\_amount >= 0__

__total\_sales\_amount >= 0__

__customer\_collections\_amount >= 0__

__cash\_collections\_amount >= 0__

__non\_cash\_collections\_amount >= 0__

__cash\_refunds\_amount >= 0__

__non\_cash\_refunds\_amount >= 0__

__cash\_inputs\_amount >= 0__

__cash\_outputs\_amount >= 0__

__counted\_cash\_amount >= 0__

__cash\_difference\_amount sí puede ser negativo\.__

__92\. Restricción conteo por denominación__

__denomination > 0__

__quantity >= 0__

__subtotal\_amount >= 0__

__y:__

__subtotal\_amount = denomination × quantity__

__93\. Pago anulado__

__Solo pagos CONFIRMED vigentes cuentan en cobros del cierre\.__

__Si un pago fue cancelado antes de cierre, no forma parte del cobro neto\.__

__Pero auditoría puede mostrarlo\.__

__94\. Reembolso cancelado__

__Igual:__

__solo reembolsos CONFIRMED vigentes afectan cierre\.__

__95\. Operaciones de otra sucursal__

__Un pago de deuda originada en Juliaca pero cobrado en Mazuko:__

__receiving\_branch\_id = Mazuko__

__por tanto aparece en el cierre de Mazuko\.__

__No en Juliaca\.__

__Eso respeta nuestra decisión del Bloque 6\.__

__96\. Venta de Juliaca pagada posteriormente en Mazuko__

__Cierre Juliaca del día de venta:__

__venta crédito__

__Cierre Mazuko del día del cobro:__

__cobro__

__Así los reportes no mezclan ventas y caja\.__

__97\. ¿Necesitamos branch\_id en daily\_closing\_versions?__

__No\.__

__Se deriva de:__

__daily\_closing\_id__

__No agreguemos redundancia innecesaria en una tabla relativamente pequeña\.__

__98\. ¿Necesitamos cash\_register\_id en daily\_closings?__

__No\.__

__El cierre es de sucursal\.__

__El detalle por caja se obtiene del conteo y operaciones\.__

__99\. ¿Una caja podría quedar sin contar?__

__Para cerrar sucursal, todas las cajas activas utilizadas ese día deberían quedar incluidas o explícitamente justificadas\.__

__No debemos permitir que una caja con movimientos quede fuera del conteo\.__

__100\. Conteo sin billetes detallados__

__Podríamos permitir un modo simplificado donde solo se ingresa total\.__

__Pero entonces daily\_closing\_cash\_counts no tendría desglose\.__

__Para V1 recomiendo interfaz con denominaciones porque es simple y aporta control\.__

__Podemos permitir una línea especial de “otros” si surge necesidad\.__

__101\. Tabla final refinada de daily\_closing\_versions__

__Los campos principales quedan:__

__opening\_cash\_amount__

__gross\_sales\_amount__

__cash\_sales\_amount__

__credit\_sales\_amount__

__partial\_sales\_amount__

__cancelled\_sales\_amount__

__customer\_returns\_amount__

__total\_sales\_amount__

__customer\_collections\_amount__

__cash\_collections\_amount__

__non\_cash\_collections\_amount__

__cash\_refunds\_amount__

__non\_cash\_refunds\_amount__

__cash\_inputs\_amount__

__cash\_outputs\_amount__

__expected\_cash\_amount__

__counted\_cash\_amount__

__cash\_difference\_amount__

__pending\_sync\_count__

__open\_conflicts\_count__

__inventory\_mismatch\_count__

__Esta es una fotografía operativa bastante completa sin crear decenas de tablas\.__

__102\. ¿Creamos una tabla de detalle de cierre por método de pago?__

__Podríamos crear:__

__daily\_closing\_payment\_method\_totals__

__pero no la considero necesaria\.__

__Se puede consultar desde:__

__payment\_method\_lines__

__refund\_method\_lines__

__y si queremos congelar el desglose exacto podemos guardar un JSON snapshot más adelante\.__

__Por ahora evitamos otra tabla\.__

__103\. ¿JSON en versión de cierre?__

__Podría ser útil un campo:__

__summary\_snapshot JSONB__

__con desglose extendido por método, pero no quiero usar JSONB para sustituir datos relacionales esenciales\.__

__Como información redundante de snapshot podría ser útil\.__

__No lo considero obligatorio en V1\.__

__104\. Tablas nuevas del Bloque 10__

__Quedan:__

__cash\_registers__

__cash\_movements__

__daily\_closings__

__daily\_closing\_versions__

__daily\_closing\_cash\_counts__

__Son:__

__5 tablas nuevas__

__105\. Ajustes a tablas anteriores__

__Además agregamos dos campos a tablas ya existentes:__

__payments\.cash\_register\_id__

__refunds\.cash\_register\_id__

__nullable, pero exigibles cuando interviene efectivo físico\.__

__No cuentan como tablas nuevas\.__

__106\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

__1\. Organización y seguridad__

__12__

__12__

__2\. Catálogo maestro__

__9__

__21__

__3\. Núcleo de inventario__

__9__

__30__

__4\. Compras y entradas__

__5__

__35__

__5\. Clientes y ventas__

__4__

__39__

__6\. CxC, pagos y reembolsos__

__8__

__47__

__7\. Salidas, devoluciones, conteos y ajustes__

__9__

__56__

__8\. Transferencias__

__7__

__63__

__9\. Kits y armado__

__4__

__67__

__10\. Cierre y caja__

__5__

__72__

__Actualmente tenemos:__

__10 de 12 bloques diseñados ✅  
72 tablas formalmente definidas__

__107\. Decisiones cerradas del Bloque 10__

1. __Venta, cobro y caja serán conceptos separados\.__
2. __Existirá catálogo de cajas por sucursal\.__
3. __Pagos de clientes no se duplicarán en cash\_movements\.__
4. __Reembolsos tampoco se duplicarán\.__
5. __cash\_movements será para movimientos reales adicionales de caja\.__
6. __Fondo inicial reutiliza cash\_movements\.__
7. __Cierre será por sucursal \+ fecha operativa\.__
8. __Existirá un solo cierre lógico por sucursal y fecha\.__
9. __Cierres serán versionados\.__
10. __Reapertura no sobrescribe la versión anterior\.__
11. __El cierre congelará totales históricos\.__
12. __Ventas se separarán de cobros\.__
13. __Cobros se separarán en efectivo/no efectivo\.__
14. __Reembolsos se separarán en efectivo/no efectivo\.__
15. __Efectivo esperado seguirá la fórmula definida\.__
16. __Se conservará conteo físico por denominación\.__
17. __Diferencia de caja no crea corrección automática\.__
18. __Diferencia puede requerir autorización según tolerancia\.__
19. __No crearemos una tabla adicional de diferencias de caja\.__
20. __No crearemos cash\_sessions en V1 mientras no exista flujo por turno/cajero\.__
21. __Transferencia válida en tránsito no bloquea cierre\.__
22. __Operaciones críticas pendientes de sync sí pueden bloquear\.__
23. __Conflictos críticos bloquean\.__
24. __Inventario/Kardex inconsistente bloquea\.__
25. __Día cerrado impide nuevas operaciones normales sobre esa fecha\.__
26. __Operación tardía offline entra en conflicto\.__
27. __Reapertura requerirá permiso y motivo\.__
28. __Los pagos/reembolsos en efectivo podrán vincularse a una caja concreta\.__
29. __Consolidado empresarial se obtiene de cierres de sucursal; no necesitamos otra tabla\.__
30. __Cierre nunca modifica ventas, inventario o CxC; solo valida y congela\.__

__Resultado__

__Perfecto\. Continuamos con el Modelo lógico PostgreSQL — Bloque 11 de 12: PWA, sincronización, operaciones offline y conflictos\.__

__Este bloque es distinto a los anteriores porque no representa un nuevo proceso comercial\. Su función es permitir que las mismas ventas, clientes, pagos, conteos y operaciones que ya diseñamos puedan originarse offline sin crear una segunda base de datos oficial\.__

__La regla fundamental será:__

__PostgreSQL continúa siendo la única verdad oficial\. IndexedDB es una copia/cache operacional y una cola temporal de operaciones\.__

__Para hacerlo de forma robusta propongo 5 tablas nuevas:__

- __sync\_batches__
- __sync\_operations__
- __sync\_operation\_dependencies__
- __sync\_change\_log__
- __conflicts__

__Pasaríamos de 72 a 77 tablas formalmente definidas\.__

__Etapa 4\.2 — Bloque 11: PWA y sincronización__

__1\. Arquitectura general__

__Tendremos dos mundos claramente separados:__

__PWA / DISPOSITIVO__

__IndexedDB__

__    │__

__    │ push__

__    ▼__

__Laravel API__

__    │__

__    ▼__

__PostgreSQL__

__VERDAD OFICIAL__

__Y en dirección contraria:__

__PostgreSQL__

__    │__

__    │ cambios oficiales__

__    ▼__

__sync\_change\_log__

__    │__

__    │ pull__

__    ▼__

__IndexedDB__

__IndexedDB no compite con PostgreSQL\.__

__2\. Qué guardará IndexedDB__

__En el dispositivo podremos mantener, por ejemplo:__

__products__

__brands__

__prices__

__minimum prices__

__kit versions/components__

__customers relevantes__

__stock local estimado__

__lots necesarios__

__receivables relevantes__

__operaciones pendientes__

__conflictos__

__último cursor de sincronización__

__Pero esas son estructuras locales de Dexie\.js\.__

__No significa que necesitemos duplicarlas como nuevas tablas PostgreSQL\.__

__3\. Estados locales de una operación__

__Ya habíamos definido:__

__LOCAL__

__PENDING__

__SYNCING__

__SYNCED__

__CONFLICT__

__REJECTED__

__CANCELLED\_LOCAL__

__DUPLICATE__

__Estos estados pertenecen principalmente a la PWA\.__

__En PostgreSQL tendremos evidencia técnica del resultado mediante sync\_operations\.__

__4\. sync\_batches__

__Propósito__

__Representar una sesión/lote de sincronización entre un dispositivo y servidor\.__

__Ejemplo:__

__Un dispositivo vuelve a tener conexión y envía:__

__1 cliente__

__3 ventas__

__2 pagos__

__1 conteo__

__Podemos procesarlos dentro de un:__

__sync\_batch__

__Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__company\_id__

__BIGINT__

__FK → companies\.id, NOT NULL__

__device\_id__

__BIGINT__

__FK → devices\.id, NOT NULL__

__user\_id__

__BIGINT__

__FK → users\.id, NOT NULL__

__branch\_id__

__BIGINT__

__FK → branches\.id, NOT NULL__

__direction__

__VARCHAR__

__NOT NULL__

__started\_at__

__TIMESTAMPTZ__

__NOT NULL__

__completed\_at__

__TIMESTAMPTZ__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__operations\_received__

__INTEGER__

__NOT NULL DEFAULT 0__

__operations\_succeeded__

__INTEGER__

__NOT NULL DEFAULT 0__

__operations\_conflicted__

__INTEGER__

__NOT NULL DEFAULT 0__

__operations\_rejected__

__INTEGER__

__NOT NULL DEFAULT 0__

__client\_app\_version__

__VARCHAR__

__NULL__

__client\_schema\_version__

__INTEGER__

__NULL__

__ip\_address__

__INET__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__5\. Dirección del batch__

__Podemos utilizar:__

__PUSH__

__PULL__

__BIDIRECTIONAL__

__Aunque inicialmente la API probablemente haga push y luego pull dentro de la misma sincronización\.__

__BIDIRECTIONAL puede representar ese ciclo completo\.__

__6\. Estados del batch__

__Propongo:__

__STARTED__

__PROCESSING__

__COMPLETED__

__COMPLETED\_WITH\_ERRORS__

__FAILED__

__Un batch puede terminar correctamente aunque una operación individual quede en conflicto\.__

__Ejemplo:__

__10 operaciones__

__8 aceptadas__

__1 conflicto__

__1 rechazada__

__El batch:__

__COMPLETED\_WITH\_ERRORS__

__pero no hacemos rollback de las 8 operaciones independientes ya aceptadas\.__

__7\. ¿Todo el batch debe ser una sola transacción?__

__No\.__

__Eso sería peligroso\.__

__Si una venta inválida estuviera dentro de 100 operaciones válidas, no queremos perder las otras 99\.__

__La unidad de atomicidad será normalmente:__

__cada operación de negocio individual y sus dependencias internas\.__

__8\. Tabla sync\_operations__

__Esta será la tabla técnica más importante del bloque\.__

__Propósito__

__Registrar cada operación enviada desde un dispositivo\.__

__Ejemplos:__

__CREATE\_CUSTOMER__

__CREATE\_SALE__

__CREATE\_PAYMENT__

__CREATE\_INVENTORY\_COUNT__

__CREATE\_TRANSFER\_REQUEST__

__Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__sync\_batch\_id__

__BIGINT__

__FK → sync\_batches\.id, NOT NULL__

__device\_id__

__BIGINT__

__FK → devices\.id, NOT NULL__

__user\_id__

__BIGINT__

__FK → users\.id, NOT NULL__

__branch\_id__

__BIGINT__

__FK → branches\.id, NOT NULL__

__operation\_type__

__VARCHAR__

__NOT NULL__

__entity\_type__

__VARCHAR__

__NOT NULL__

__entity\_uuid__

__UUID__

__NOT NULL__

__client\_operation\_uuid__

__UUID__

__NOT NULL__

__operation\_date__

__TIMESTAMPTZ__

__NOT NULL__

__client\_created\_at__

__TIMESTAMPTZ__

__NULL__

__received\_at__

__TIMESTAMPTZ__

__NOT NULL__

__processed\_at__

__TIMESTAMPTZ__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__payload__

__JSONB__

__NOT NULL__

__payload\_hash__

__VARCHAR__

__NOT NULL__

__server\_entity\_id__

__BIGINT__

__NULL__

__server\_entity\_uuid__

__UUID__

__NULL__

__server\_response__

__JSONB__

__NULL__

__error\_code__

__VARCHAR__

__NULL__

__error\_message__

__TEXT__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__9\. ¿Por qué payload JSONB?__

__Aquí sí considero que JSONB es correcto\.__

__No estamos sustituyendo tablas comerciales por JSON\.__

__El negocio oficial sigue en:__

__sales__

__sale\_lines__

__payments__

__customers__

__\.\.\.__

__payload conserva exactamente la operación que el dispositivo envió\.__

__Eso es muy útil para:__

- __diagnóstico,__
- __conflicto,__
- __auditoría técnica,__
- __reintentos,__
- __saber qué información conocía el dispositivo\.__

__10\. Ejemplo conceptual de payload__

__Una venta podría enviar:__

__sale UUID__

__customer UUID__

__branch__

__operation date__

__lines__

__price versions__

__kit versions__

__payment__

__local stock versions__

__Servidor la transforma en las tablas normales:__

__sales__

__sale\_lines__

__inventory\_movements__

__kardex\_entries__

__payments__

__\.\.\.__

__11\. client\_operation\_uuid__

__Este UUID identifica el intento lógico generado por la PWA\.__

__Debe existir:__

__UNIQUE\(device\_id, client\_operation\_uuid\)__

__Así, si el dispositivo reenvía la misma cola después de un timeout, no procesamos dos veces\.__

__12\. entity\_uuid__

__Es diferente\.__

__Ejemplo:__

__client\_operation\_uuid = operación sync X__

__entity\_uuid = venta Y__

__La operación de sincronización y la venta son cosas diferentes\.__

__13\. Idempotencia en dos niveles__

__Tenemos:__

__Nivel técnico__

__sync\_operations\.client\_operation\_uuid__

__Nivel negocio__

__sales\.uuid__

__payments\.uuid__

__customers\.uuid__

__\.\.\.__

__Esta doble protección es correcta\.__

__14\. Mismo UUID con payload diferente__

__Caso peligroso:__

__Primera solicitud:__

__sale\.uuid = ABC__

__total = 100__

__Luego llega:__

__sale\.uuid = ABC__

__total = 150__

__No debemos interpretar la segunda como la misma operación válida\.__

__Por eso tenemos:__

__payload\_hash__

__Si el UUID ya fue procesado pero el payload es distinto:__

__IDEMPOTENCY\_PAYLOAD\_MISMATCH__

__→ conflicto/rechazo técnico\.__

__15\. Hash del payload__

__Debe calcularse sobre una representación canónica\.__

__Por ejemplo:__

__SHA\-256__

__No dependemos de orden arbitrario de claves JSON\.__

__La implementación exacta se cerrará posteriormente\.__

__16\. Estados de sync\_operations__

__Propongo:__

__RECEIVED__

__WAITING\_DEPENDENCY__

__PROCESSING__

__APPLIED__

__DUPLICATE__

__CONFLICT__

__REJECTED__

__FAILED__

__APPLIED__

__La operación fue convertida en operación oficial\.__

__DUPLICATE__

__Ya había sido procesada legítimamente\.__

__CONFLICT__

__Necesita resolución empresarial/humana\.__

__REJECTED__

__La operación es inválida y no debe aplicarse\.__

__FAILED__

__Hubo problema técnico, potencialmente reintentable\.__

__17\. Conflicto ≠ error técnico__

__Ejemplo conflicto:__

__stock insuficiente__

__día cerrado__

__saldo de deuda cambió__

__precio sensible desactualizado__

__Ejemplo error técnico:__

__timeout interno__

__deadlock agotó reintentos__

__servicio temporalmente indisponible__

__No debemos mezclarlos\.__

__18\. operation\_type__

__Ejemplos:__

__CUSTOMER\_CREATE__

__SALE\_CONFIRM__

__PAYMENT\_CONFIRM__

__COUNT\_SUBMIT__

__TRANSFER\_REQUEST__

__EXIT\_SUBMIT__

__No necesitamos que cada pequeño cambio UI sea una sync operation\.__

__Solo operaciones de negocio relevantes\.__

__19\. entity\_type__

__Ejemplos:__

__CUSTOMER__

__SALE__

__PAYMENT__

__INVENTORY\_COUNT__

__TRANSFER__

__Esto facilita búsqueda y diagnóstico\.__

__20\. server\_entity\_id y server\_entity\_uuid__

__Después de aceptar:__

__sync operation__

__↓__

__sales\.id = 500__

__sales\.uuid = ABC__

__guardamos esa referencia para poder responder rápidamente al dispositivo\.__

__21\. server\_response__

__Puede guardar datos técnicos relevantes de la respuesta:__

__official number__

__official status__

__official timestamp__

__lot reallocations__

__new balances__

__No debe convertirse en una copia completa permanente de toda la entidad\.__

__22\. Fecha del dispositivo vs fecha oficial__

__Conservamos:__

__operation\_date__

__client\_created\_at__

__received\_at__

__processed\_at__

__Esto permite distinguir:__

- __cuándo ocurrió comercialmente,__
- __cuándo fue creada localmente,__
- __cuándo llegó,__
- __cuándo fue oficializada\.__

__23\. Hora del dispositivo no es autoridad absoluta__

__El servidor debe validar rangos razonables\.__

__Un dispositivo con reloj equivocado no puede enviar:__

__operation\_date = hace 2 años__

__y esperar que el sistema lo acepte\.__

__La política de tolerancia se configurará\.__

__24\. Tabla sync\_operation\_dependencies__

__Propósito__

__Representar dependencias entre operaciones locales\.__

__Ejemplo:__

__crear cliente__

__     ↓__

__crear venta__

__     ↓__

__crear pago inicial__

__Si el cliente no existe todavía en servidor, la venta debe esperar\.__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__sync\_operation\_id__

__BIGINT__

__FK__

__depends\_on\_operation\_id__

__BIGINT__

__FK__

__dependency\_type__

__VARCHAR__

__NOT NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__Restricción:__

__UNIQUE\(sync\_operation\_id, depends\_on\_operation\_id\)__

__25\. Dependencia por UUID antes de crear filas__

__Existe una dificultad:__

__Cuando el batch llega, las operaciones aún pueden no tener IDs internos\.__

__La API puede primero insertar todas las sync\_operations, mapear UUID→ID y después crear las dependencias\.__

__Perfectamente manejable\.__

__26\. Tipos de dependencia__

__Inicialmente basta:__

__REQUIRES\_SUCCESS__

__No necesitamos diseñar un motor complejo de workflows\.__

__27\. Ejemplo__

__Cola local:__

__OP\-1 CREATE CUSTOMER__

__OP\-2 CREATE SALE__

__OP\-3 CREATE PAYMENT__

__Relaciones:__

__OP\-2 depends OP\-1__

__OP\-3 depends OP\-2__

__Servidor procesa:__

__OP\-1__

__↓__

__OP\-2__

__↓__

__OP\-3__

__28\. Si falla el cliente__

__Si OP\-1 entra en conflicto por documento duplicado:__

__podríamos resolverlo automáticamente hacia cliente existente cuando sea seguro\.__

__Entonces OP\-2 puede continuar con el cliente canónico\.__

__29\. Si cliente es rechazado__

__Si no existe resolución segura:__

__OP\-1 = REJECTED/CONFLICT__

__OP\-2 = WAITING\_DEPENDENCY__

__OP\-3 = WAITING\_DEPENDENCY__

__No creamos una venta sin cliente\.__

__30\. Ciclos de dependencias__

__Debe impedirse:__

__A depende B__

__B depende A__

__La PWA debería producir un DAG\.__

__Servidor validará ausencia de ciclos\.__

__31\. Orden de envío local__

__No debemos confiar únicamente en:__

__created\_at__

__La tabla de dependencias define el orden lógico real\.__

__Esto es más robusto\.__

__32\. Tabla conflicts__

__Ya habíamos decidido conceptualmente utilizar una tabla general de conflictos, no una distinta por sincronización\.__

__Propósito__

__Representar situaciones que requieren resolución y pueden originarse:__

- __en sincronización,__
- __en transferencias,__
- __en cierres,__
- __en importaciones,__
- __en conciliaciones\.__

__Por eso no la llamaremos:__

__sync\_conflicts__

__sino:__

__conflicts__

__33\. Campos de conflicts__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__device\_id__

__BIGINT__

__FK devices\.id, NULL__

__sync\_operation\_id__

__BIGINT__

__FK sync\_operations\.id, NULL__

__conflict\_type__

__VARCHAR__

__NOT NULL__

__severity__

__VARCHAR__

__NOT NULL__

__entity\_type__

__VARCHAR__

__NOT NULL__

__entity\_uuid__

__UUID__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__detected\_at__

__TIMESTAMPTZ__

__NOT NULL__

__summary__

__VARCHAR__

__NOT NULL__

__details__

__JSONB__

__NULL__

__resolution\_type__

__VARCHAR__

__NULL__

__resolution\_notes__

__TEXT__

__NULL__

__resolved\_by__

__BIGINT__

__FK users\.id, NULL__

__resolved\_at__

__TIMESTAMPTZ__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__34\. Estados de conflicto__

__Propongo:__

__OPEN__

__UNDER\_REVIEW__

__RESOLVED__

__DISMISSED__

__DISMISSED solo para casos donde se determina que no era realmente un conflicto que exigiera corrección\.__

__No elimina la evidencia\.__

__35\. Severidad__

__INFO__

__WARNING__

__CRITICAL__

__Ejemplos:__

__WARNING__

__Referencia de cliente similar\.__

__CRITICAL__

__Venta offline intenta producir stock negativo\.__

__36\. Tipos de conflicto__

__Podemos tener códigos como:__

__INSUFFICIENT\_STOCK__

__DUPLICATE\_UUID__

__IDEMPOTENCY\_MISMATCH__

__PRODUCT\_INACTIVE__

__CUSTOMER\_DUPLICATE__

__CUSTOMER\_BLOCKED__

__PRICE\_VERSION\_STALE__

__MIN\_PRICE\_VIOLATION__

__KIT\_VERSION\_STALE__

__LOT\_UNAVAILABLE__

__RECEIVABLE\_BALANCE\_CHANGED__

__PAYMENT\_EXCEEDS\_BALANCE__

__DAY\_CLOSED__

__DEVICE\_REVOKED__

__USER\_SCOPE\_INVALID__

__TRANSFER\_STATE\_CHANGED__

__COUNT\_BASE\_CHANGED__

__No necesitamos una tabla por cada uno\.__

__37\. details JSONB__

__Aquí nuevamente JSONB es apropiado\.__

__Ejemplo conflicto de stock:__

__requested\_quantity__

__local\_known\_quantity__

__server\_available\_quantity__

__product\_uuid__

__local\_inventory\_version__

__server\_inventory\_version__

__Eso ayuda a resolver sin crear veinte columnas especializadas\.__

__38\. Conflicto no modifica la operación original__

__Ejemplo:__

__Venta local por 5\.__

__Servidor tiene stock 3\.__

__No hacemos:__

__sale quantity = 3__

__automáticamente\.__

__La operación original permanece registrada en el payload y el conflicto explica por qué no fue aplicada\.__

__39\. Resoluciones seguras automáticas__

__Sí podemos resolver ciertos casos automáticamente\.__

__Ejemplo:__

__Cliente offline:__

__DNI 12345678__

__servidor encuentra exactamente el mismo DNI\.__

__Podemos:__

__usar cliente existente__

__y continuar venta\.__

__No hay pérdida económica ni ambigüedad\.__

__40\. Resoluciones no seguras__

__No automatizamos:__

__venta 5 → venta 3__

__pago 500 → pago 100__

__precio 200 → precio 230__

__porque cambiaríamos unilateralmente el acuerdo comercial\.__

__41\. Tabla sync\_change\_log__

__Esta es la quinta tabla que recomiendo añadir\.__

__Por qué la necesitamos__

__La PWA no solo envía operaciones\.__

__También necesita recibir eficientemente cambios desde servidor:__

__producto modificado__

__precio nuevo__

__cliente actualizado__

__stock cambiado__

__deuda pagada__

__kit actualizado__

__Podríamos consultar cada tabla por updated\_at, pero existen problemas:__

- __empates de timestamp,__
- __muchas tablas diferentes,__
- __cambios de estado,__
- __recuperación después de sincronización incompleta,__
- __necesidad de un cursor determinístico\.__

__Por eso recomiendo un feed técnico de cambios\.__

__42\. Propósito de sync\_change\_log__

__Registrar que una entidad oficial relevante cambió\.__

__No guarda toda la entidad\.__

__Ejemplo:__

__sequence 10001__

__PRODUCT__

__uuid ABC__

__UPDATE__

__sequence 10002__

__INVENTORY__

__uuid XYZ__

__UPDATE__

__La PWA pide:__

__dame cambios después de sequence 10000\.__

__43\. Campos__

__Campo__

__Tipo lógico__

__Regla__

__sequence\_id__

__BIGINT__

__PK monotónico__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__entity\_type__

__VARCHAR__

__NOT NULL__

__entity\_uuid__

__UUID__

__NOT NULL__

__change\_type__

__VARCHAR__

__NOT NULL__

__entity\_version__

__BIGINT__

__NULL__

__changed\_at__

__TIMESTAMPTZ__

__NOT NULL__

__changed\_by__

__BIGINT__

__FK users\.id, NULL__

__source\_operation\_uuid__

__UUID__

__NULL__

__44\. change\_type__

__Inicialmente:__

__CREATE__

__UPDATE__

__DELETE\_TOMBSTONE__

__Aunque nuestros datos históricos normalmente no se eliminan, DELETE\_TOMBSTONE puede utilizarse para entidades cacheables que sí desaparezcan técnicamente o para invalidaciones futuras\.__

__En maestros normalmente veremos cambios de estado\.__

__45\. ¿Duplica audit\_events?__

__No\.__

__Son responsabilidades distintas\.__

__audit\_events__

__Pregunta:__

__¿Quién hizo qué y por qué?__

__sync\_change\_log__

__Pregunta:__

__¿Qué cambió desde el cursor N para actualizar una PWA?__

__El change log debe ser:__

- __pequeño,__
- __secuencial,__
- __rápido\.__

__46\. No guardar payload completo en sync\_change\_log__

__La fila solo anuncia:__

__INVENTORY XYZ cambió__

__La API puede devolver la representación actual de esa entidad\.__

__Esto evita duplicar datos\.__

__47\. Cursor de sincronización__

__Cada dispositivo guarda localmente:__

__last\_change\_sequence__

__Ejemplo:__

__15000__

__Pregunta:__

__GET changes after 15000__

__Servidor responde hasta:__

__15342__

__La PWA solo avanza su cursor a 15342 después de persistir correctamente los cambios en IndexedDB\.__

__48\. ¿Necesitamos tabla device\_sync\_cursors?__

__No inicialmente\.__

__Podemos almacenar en devices campos adicionales:__

__last\_pull\_sequence BIGINT NULL__

__last\_push\_at TIMESTAMPTZ NULL__

__last\_pull\_at TIMESTAMPTZ NULL__

__para observabilidad\.__

__El cursor autoritativo de consumo puede seguir estando local en el dispositivo\.__

__Esto evita una sexta tabla\.__

__49\. Ajustes a devices__

__Agregamos conceptualmente:__

__last\_pull\_sequence__

__last\_push\_at__

__last\_pull\_at__

__Además del:__

__last\_synced\_at__

__que ya habíamos definido\.__

__No son nuevas tablas\.__

__50\. Secuencia global o por empresa__

__Recomiendo un:__

__sequence\_id BIGINT__

__global de DB\.__

__La consulta filtra:__

__company\_id__

__No necesitamos una secuencia independiente por empresa\.__

__51\. Cambio de inventario__

__Después de una venta confirmada podemos publicar:__

__entity\_type = INVENTORY__

__entity\_uuid = inventories\.uuid__

__entity\_version = inventories\.version__

__La PWA recibe el nuevo saldo\.__

__52\. Cambio de precio__

__Cuando se activa una nueva versión:__

__PRODUCT\_PRICE__

__se publica\.__

__La PWA actualiza el precio cacheado\.__

__53\. Cambio de kit__

__Cuando cambia versión:__

__KIT\_VERSION__

__y posiblemente:__

__KIT\_COMPONENTS__

__La API puede entregar la estructura completa del kit correspondiente\.__

__54\. Cambio de cliente__

__Si otro usuario actualiza un cliente:__

__CUSTOMER__

__entra al feed\.__

__55\. Cambio de CxC__

__Después de pago:__

__RECEIVABLE__

__se publica\.__

__Así otro dispositivo que tenga ese cliente cacheado puede actualizar su saldo\.__

__56\. Alcance por sucursal__

__Algunos cambios son globales:__

__products__

__brands__

__customers__

__Entonces:__

__branch\_id = NULL__

__Otros son locales:__

__inventory__

__daily closing__

__transfer receipt__

__Entonces:__

__branch\_id = sucursal correspondiente__

__57\. Filtrado por permisos__

__Que exista un cambio en el feed no significa que todos los dispositivos puedan descargar su contenido\.__

__La API vuelve a validar:__

- __empresa,__
- __usuario,__
- __sucursales,__
- __permisos\.__

__Un vendedor no debe recibir costos solo porque cambió inventario\.__

__58\. Precio mínimo offline__

__Especialmente importante:__

__La PWA puede cachear el mínimo necesario para validar ventas, pero debemos controlar quién puede verlo si se considera información sensible\.__

__Podemos enviar solo el valor necesario para reglas locales si su rol tiene acceso operacional\.__

__La autorización definitiva sigue en servidor\.__

__59\. ¿Qué operaciones permitimos offline en V1?__

__La política que ya definimos queda así:__

__Sí / núcleo offline__

- __consulta de catálogo cacheado,__
- __consulta de último stock conocido,__
- __clientes,__
- __crear cliente básico,__
- __venta,__
- __venta con pago,__
- __pago autorizado,__
- __conteo físico,__
- __borradores,__
- __solicitudes de transferencia\.__

__Condicionadas__

- __KIT\_COMPONENTS con versión cacheada,__
- __algunas salidas de bajo riesgo,__
- __preparación de transferencia\.__

__No confirmación offline oficial__

- __ajustes,__
- __aprobación de transferencia,__
- __envío oficial,__
- __recepción final con diferencias,__
- __resolución de conflictos,__
- __reapertura/cierre final,__
- __cambios de catálogo/precios,__
- __armado oficial sensible\.__

__60\. Stock mostrado offline__

__Nunca mostrar simplemente:__

__Stock: 10__

__como si fuera en tiempo real\.__

__La UI debe indicar algo equivalente a:__

__Stock local estimado: 10__

__Última sincronización: \.\.\.__

__Esto es una regla de UX importante\.__

__61\. Stock local proyectado__

__La PWA puede calcular:__

__último stock servidor__

__\-__

__salidas locales pendientes__

__\+__

__entradas locales provisionalmente reconocidas__

__pero este saldo sigue siendo:__

__estimado local, no oficial\.__

__62\. Reservas locales__

__Una venta offline pendiente no crea una reserva oficial en PostgreSQL\.__

__Puede reducir el stock estimado local del mismo dispositivo para evitar que ese usuario venda dos veces la misma existencia\.__

__Pero otro dispositivo podría estar haciendo lo mismo\.__

__Por eso el servidor revalida\.__

__63\. Ejemplo de conflicto entre dispositivos__

__Servidor inicial:__

__stock = 1__

__Dispositivo A offline vende 1\.__

__Dispositivo B offline vende 1\.__

__Ambos localmente creen que es válido\.__

__Al sincronizar:__

__A → APPLIED__

__stock servidor = 0__

__B → CONFLICT__

__INSUFFICIENT\_STOCK__

__Nunca stock \-1\.__

__64\. Orden de llegada__

__La autoridad final será el orden en el que el servidor logre confirmar transaccionalmente las operaciones válidas\.__

__No intentaremos reconstruir un orden global artificial basándonos solo en la hora del teléfono\.__

__65\. Operación de venta offline aceptada__

__Servidor:__

__BEGIN__

1. __Comprueba idempotencia\.__
2. __Comprueba usuario/dispositivo\.__
3. __Comprueba sucursal\.__
4. __Comprueba día\.__
5. __Comprueba cliente\.__
6. __Comprueba productos\.__
7. __Comprueba versiones\.__
8. __Bloquea inventarios\.__
9. __Valida stock\.__
10. __Selecciona lotes oficiales\.__
11. __Crea venta\.__
12. __Crea movimiento/Kardex\.__
13. __Crea pago/CxC\.__
14. __Marca sync\_operation = APPLIED\.__
15. __Publica cambios en sync\_change\_log\.__

__COMMIT__

__66\. Atomicidad con sync\_operation__

__La fila de operación técnica y la transacción comercial deben quedar coordinadas\.__

__No podemos tener:__

__sale creada__

__pero sync\_operation dice FAILED__

__por un fallo intermedio\.__

__El estado final APPLIED debe actualizarse dentro de la misma transacción o mediante mecanismo seguro posterior\.__

__67\. Deadlocks/reintentos__

__Si PostgreSQL produce un deadlock transitorio:__

__Laravel puede reintentar la transacción\.__

__Gracias al UUID/idempotencia, el reintento es seguro\.__

__No se presenta automáticamente al usuario como conflicto empresarial\.__

__68\. Dispositivo revocado__

__Si:__

__devices\.status = REVOKED__

__y llegan nuevas operaciones:__

__no deben aplicarse automáticamente\.__

__Pero hay un caso delicado:__

__operaciones pudieron haberse creado legítimamente antes de la revocación y haber quedado offline\.__

__Estas deben quedar en revisión si la política lo permite, no simplemente desaparecer\.__

__69\. Revocación y operaciones antiguas__

__Podemos evaluar:__

__client\_created\_at__

__authorized period__

__revoked\_at__

__Si claramente fueron creadas después de revocación:__

__REJECTED__

__Si fueron anteriores pero llegaron después:__

__review / normal validation__

__según seguridad\.__

__70\. Usuario desactivado__

__Mismo principio\.__

__No queremos que una operación vieja legítima se convierta automáticamente en fraude, pero tampoco aceptar ciegamente\.__

__Queda trazabilidad completa\.__

__71\. Sesión expirada__

__Una sesión web expirada no necesariamente invalida una operación offline que fue creada durante una autenticación válida\.__

__El dispositivo tendrá autorización previa y credenciales/token apropiado para sincronización según diseño técnico\.__

__No almacenaremos contraseña en IndexedDB\.__

__72\. Información sensible en IndexedDB__

__No almacenaremos innecesariamente:__

- __contraseñas,__
- __hashes de password,__
- __datos administrativos completos,__
- __información fuera del alcance del usuario\.__

__Cachearemos solo lo necesario para operar\.__

__73\. Borrado local remoto__

__Cuando:__

__device revoked__

__no podemos garantizar borrar físicamente IndexedDB si el dispositivo nunca vuelve a conectarse\.__

__Por eso debemos minimizar los datos cacheados y utilizar controles del navegador/PWA\.__

__En cuanto vuelva a conectarse, servidor rechaza operaciones y la app puede limpiar datos\.__

__74\. Conflicto de día cerrado__

__Ejemplo:__

__Venta local:__

__operation\_date = 06/08__

__Sincroniza después de que 06/08 fue cerrado\.__

__Resultado:__

__DAY\_CLOSED__

__No se mueve automáticamente a 07/08\.__

__Eso cambiaría la fecha económica\.__

__75\. Resolución de día cerrado__

__Un usuario autorizado puede:__

- __reabrir el día,__
- __regularizar formalmente,__
- __rechazar la operación,__

__según caso\.__

__La resolución queda en conflicts\.__

__76\. Conflicto de precio__

__Si dispositivo usó una versión vieja:__

__Servidor analiza:__

- __versión conocida localmente,__
- __cuándo estuvo vigente,__
- __precio final,__
- __mínimo,__
- __autorización requerida\.__

__No se rechaza solo porque existe una versión nueva\.__

__77\. Conflicto de kit__

__Igual\.__

__No usamos simplemente:__

__kit\_version \!= current\_version → reject__

__Debemos conocer si la versión utilizada era válida para el escenario offline\.__

__78\. Conflicto de lote__

__El lote sugerido localmente puede ya no estar disponible\.__

__Si existe cantidad suficiente en otros lotes y la regla permite reasignación:__

__AUTO\_RESOLVE__

__servidor utiliza PEPS actual\.__

__No es necesariamente conflicto humano\.__

__79\. Preservar asignación local__

__El payload conserva:__

__local suggested lots__

__y la operación oficial guarda:__

__lot\_allocations__

__Así podemos saber que hubo reasignación\.__

__80\. Conflicto de pago__

__Saldo local:__

__500__

__Servidor:__

__100__

__Pago recibido offline:__

__300__

__No aplicamos 100\.__

__Generamos conflicto completo\.__

__Esta decisión permanece\.__

__81\. Conteo físico offline__

__El conteo es distinto porque representa una observación física\.__

__Si sistema cambió mientras estaba offline, no rechazamos necesariamente el conteo\.__

__Lo reinterpretamos contra los movimientos oficiales ocurridos\.__

__El ajuste sigue requiriendo revisión/confirmación online\.__

__82\. Sincronización incremental__

__Un ciclo típico:__

__1\. autenticar dispositivo/usuario__

__2\. PUSH operaciones locales__

__3\. resolver dependencias__

__4\. devolver resultados__

__5\. PULL cambios > cursor__

__6\. aplicar IndexedDB__

__7\. actualizar cursor local__

__8\. actualizar devices\.last\_synced\_at__

__83\. Primer inicio de sesión en dispositivo__

__Necesitamos una sincronización inicial mayor:__

__bootstrap__

__que puede traer:__

- __sucursales autorizadas,__
- __catálogo,__
- __precios,__
- __kits,__
- __stock de sucursal,__
- __clientes relevantes,__
- __CxC necesarias\.__

__Después se utiliza sync\_change\_log incremental\.__

__84\. ¿Necesitamos tabla sync\_bootstraps?__

__No\.__

__Es un proceso de API\.__

__sync\_batches puede registrar el batch correspondiente si queremos observabilidad\.__

__No creamos tabla adicional\.__

__85\. Tamaño de catálogo__

__Con aproximadamente miles de productos, el bootstrap completo sigue siendo manejable\.__

__No necesitamos microservicios ni infraestructura compleja\.__

__Podemos:__

- __paginar,__
- __comprimir HTTP,__
- __cachear,__
- __usar cambios incrementales\.__

__86\. Purga del change log__

__No podemos mantenerlo infinitamente sin estrategia\.__

__Ejemplo:__

__Conservar:__

__N meses__

__o una cantidad suficiente para que dispositivos normales puedan ponerse al día\.__

__Si un dispositivo tiene cursor demasiado antiguo:__

__CURSOR\_EXPIRED__

__y ejecuta un nuevo bootstrap\.__

__La retención exacta se definirá en configuración técnica\.__

__87\. Purga de sync\_operations__

__A diferencia del change log, operaciones sincronizadas tienen mayor valor de auditoría técnica\.__

__Podemos conservarlas por un periodo bastante mayor\.__

__Después podrían archivarse\.__

__No hard delete indiscriminado en etapa inicial\.__

__88\. Payload y privacidad__

__Los payloads pueden contener información comercial\.__

__Por tanto:__

- __acceso solo administrador/técnico autorizado,__
- __nunca exponerlos a vendedores como logs,__
- __backups protegidos\.__

__89\. Tamaño de payload__

__No enviar archivos grandes en JSON\.__

__Fotografías/documentos deben ir mediante:__

__attachments__

__y referencias/UUID\.__

__No base64 dentro de sync\_operations\.payload\.__

__90\. Adjuntos offline__

__La PWA puede tener una cola separada de archivos vinculados por UUID\.__

__La operación comercial puede sincronizarse y después/subsecuentemente el archivo, según requerimiento\.__

__La tabla attachments la diseñaremos en Bloque 12\.__

__91\. Dependencia de adjunto__

__No debemos bloquear una venta normal solo porque una foto informativa aún no subió\.__

__Pero si el adjunto es evidencia obligatoria para una operación sensible:__

__la operación puede quedar:__

__WAITING\_DEPENDENCY__

__hasta completar evidencia\.__

__La política se configura por operación\.__

__92\. Conflictos y cierre diario__

__El cierre consulta:__

__conflicts__

__para la sucursal/fecha\.__

__Conflicto crítico abierto:__

__bloquea cierre__

__según lo que ya definimos en Bloque 10\.__

__93\. Sync pendiente y cierre__

__Además debemos conocer operaciones locales no enviadas\.__

__Aquí existe una limitación importante:__

__PostgreSQL no puede saber que un dispositivo totalmente offline tiene tres ventas guardadas si nunca se conectó\.__

__Por eso el cierre debe requerir que los dispositivos operativos de la sucursal hayan sincronizado recientemente cuando la política lo exija\.__

__94\. Control de dispositivos antes del cierre__

__Podemos usar:__

__devices\.last\_synced\_at__

__y estado\.__

__Ejemplo:__

__Dispositivo Caja\-02__

__última sync hace 6 horas__

__El cierre puede advertir:__

__dispositivo activo sin sincronización reciente\.__

__95\. ¿Bloquear siempre?__

__No necesariamente\.__

__Si el dispositivo está:__

__REVOKED__

__OFFLINE\_CONOCIDO__

__se requiere decisión administrativa\.__

__La política exacta será configurable\.__

__Pero debemos visibilizar el riesgo\.__

__96\. sync\_operations\.operation\_date__

__Esto permite contar conflictos por fecha operativa, algo necesario para cerrar correctamente\.__

__97\. Conflicto resuelto__

__Al resolver:__

__status = RESOLVED__

__resolution\_type = \.\.\.__

__resolved\_by__

__resolved\_at__

__resolution\_notes__

__La resolución puede:__

- __aceptar operación,__
- __rechazar,__
- __vincular entidad existente,__
- __requerir nueva operación correctiva\.__

__98\. No editar payload original__

__Nunca modificaremos:__

__sync\_operations\.payload__

__para que “coincida” con la resolución\.__

__Debe permanecer como evidencia de lo originalmente enviado\.__

__La decisión queda en conflicts\.__

__99\. Ejemplo: cliente duplicado__

__Original:__

__cliente offline UUID A__

__DNI 123__

__Servidor:__

__cliente UUID B__

__DNI 123__

__Resolución:__

__USE\_EXISTING\_ENTITY__

__B__

__La venta dependiente se vincula a B\.__

__El payload sigue mostrando A\.__

__100\. Ejemplo: venta rechazada__

__stock local estimado = 3__

__stock servidor = 0__

__Resolución:__

__REJECT\_OPERATION__

__No creamos sales falsa con estado CANCELLED\.__

__La venta nunca fue oficial\.__

__Queda evidencia técnica en sync/conflicto\.__

__101\. Esto evita contaminar tablas de negocio__

__Muy importante\.__

__No todas las operaciones locales rechazadas deben convertirse en filas de:__

__sales__

__payments__

__transfers__

__Una operación que nunca fue aceptada oficialmente puede permanecer únicamente en:__

__sync\_operations__

__conflicts__

__más la evidencia local\.__

__102\. Diferencia entre sales\.status = CONFLICT y sync conflict__

__En bloques anteriores pusimos CONFLICT entre posibles estados de algunas tablas\.__

__Después de este diseño podemos refinarlo\.__

__Si una venta offline todavía no fue aceptada, no conviene insertar una fila oficial sales en conflicto\.__

__Por tanto recomiendo en la revisión final:__

__retirar CONFLICT de varias tablas de negocio cuando el conflicto ocurre antes de la creación oficial\.__

__conflicts será la fuente apropiada\.__

__103\. Cuándo sí podría existir entidad oficial \+ conflicto__

__Ejemplo:__

__Una transferencia ya oficial tiene una diferencia de recepción\.__

__Puede existir:__

__transfer__

__\+__

__conflict__

__porque la transferencia sí existe legítimamente\.__

__Eso es diferente\.__

__104\. Esta es una simplificación importante__

__La regla será:__

__Preconfirmación/offline__

__sync\_operations/conflicts__

__Operación ya oficial__

__tabla de negocio__

__\+__

__conflict si surge problema posterior__

__Esto mantiene las tablas comerciales más limpias\.__

__105\. Seguridad backend__

__Nunca confiar en que porque React oculta un botón el usuario está autorizado\.__

__Cada operación sync vuelve a ejecutar:__

__permission check__

__branch scope check__

__device status__

__user status__

__como una solicitud online normal\.__

__106\. Usuario cambia de sucursal__

__branch\_id del payload no se acepta ciegamente\.__

__Servidor verifica:__

__user\_branches__

__y permisos correspondientes\.__

__107\. Dispositivo asociado a otra sucursal__

__devices\.branch\_id es su base operativa, pero la seguridad final depende del usuario y configuración\.__

__Si se quiere usar dispositivo en otra sucursal debe estar permitido explícitamente\.__

__108\. Versiones de esquema PWA__

__sync\_batches\.client\_schema\_version es importante\.__

__Si después desplegamos una PWA nueva con payload incompatible, servidor puede detectar:__

__CLIENT\_SCHEMA\_TOO\_OLD__

__y exigir actualización antes de ciertas operaciones\.__

__109\. Actualización obligatoria__

__No toda actualización PWA debe bloquear\.__

__Podemos distinguir:__

- __compatible,__
- __deprecated,__
- __unsupported\.__

__La configuración será técnica\.__

__110\. Service Worker__

__Workbox se encargará de:__

- __assets,__
- __app shell,__
- __recursos HTTP apropiados\.__

__Pero:__

__no dependeremos exclusivamente de Background Sync de Workbox para operaciones críticas\.__

__La cola real estará controlada explícitamente con IndexedDB/Dexie y nuestro motor sync\.__

__111\. Dexie\.js__

__Conceptualmente tendremos repositorios locales como:__

__db\.products__

__db\.inventories__

__db\.customers__

__db\.receivables__

__db\.pendingOperations__

__db\.conflicts__

__db\.syncMetadata__

__La estructura exacta de IndexedDB la definiremos posteriormente en el diseño técnico PWA, no como tablas PostgreSQL adicionales\.__

__112\. Zod__

__Los payloads se validarán en cliente usando esquemas Zod para reducir errores\.__

__Pero Laravel vuelve a validarlos\.__

__Nunca confiar solo en Zod\.__

__113\. UUID v7__

__Recomiendo mantener UUID v7 para:__

- __operaciones locales,__
- __ventas,__
- __clientes,__
- __pagos,__
- __transferencias,__
- __conteos\.__

__Ventajas:__

- __generable offline,__
- __orden temporal aproximado,__
- __buena indexación respecto a UUID aleatorio\.__

__114\. Server IDs__

__Después de sincronizar:__

__BIGINT id__

__es interno\.__

__La PWA debería seguir utilizando principalmente:__

__uuid__

__como identidad durable\.__

__No depender del ID autoincremental para entidades creadas offline\.__

__115\. Error de red después de COMMIT__

__Caso clásico:__

__Servidor confirma venta\.__

__Antes de responder:__

__conexión cae__

__PWA cree que falló y reenvía\.__

__Gracias a:__

__client\_operation\_uuid__

__\+__

__sale\.uuid__

__servidor encuentra que ya existe y devuelve:__

__DUPLICATE / APPLIED EXISTING__

__sin segunda venta\.__

__116\. DUPLICATE no es un error empresarial__

__Si payload coincide:__

__es un resultado idempotente normal\.__

__La PWA puede marcar:__

__SYNCED__

__117\. Conflictos que requieren usuario__

__La interfaz administrativa debe presentar algo como:__

__Operación__

__Sucursal__

__Usuario__

__Dispositivo__

__Fecha local__

__Fecha recepción__

__Tipo__

__Motivo__

__Datos locales__

__Datos servidor__

__Opciones permitidas__

__conflicts\.details ayuda a construir esa vista\.__

__118\. Resolución por vendedor__

__No todos los conflictos deben permitir resolución al vendedor\.__

__Ejemplo:__

- __cliente duplicado simple → quizá resolución asistida\.__
- __stock insuficiente → encargado/admin\.__
- __día cerrado → admin\.__
- __pago excedente → responsable financiero\.__
- __precio bajo mínimo → autorizador\.__

__Permisos se aplican por conflict\_type\.__

__119\. Auditoría de resolución__

__conflicts conserva la resolución operacional\.__

__Además, audit\_events del Bloque 12 conservará quién ejecutó la acción administrativa\.__

__No son redundantes:__

__conflict = estado del problema__

__audit = registro transversal del acto__

__120\. Publicación de cambios__

__Cada transacción oficial relevante deberá producir entradas en:__

__sync\_change\_log__

__dentro de la misma transacción o mediante un patrón transaccional seguro\.__

__No queremos:__

__venta confirmada__

__pero cambio de inventario nunca publicado__

__121\. ¿Usar Laravel Events para esto?__

__Podemos utilizar eventos de dominio, pero la persistencia del sync\_change\_log debe mantener garantías transaccionales\.__

__Podría implementarse mediante:__

- __escritura directa dentro de la transacción,__
- __transactional outbox simplificado\.__

__No necesitamos microservicios\.__

__122\. ¿Necesitamos tabla outbox\_events?__

__No todavía\.__

__En un monolito Laravel \+ PostgreSQL, sync\_change\_log ya puede cumplir gran parte de esa función para cambios destinados a PWA\.__

__Si en el futuro integramos sistemas externos, una outbox general podría tener sentido\.__

__No la agregamos ahora\.__

__123\. Índices evidentes__

__Después los formalizaremos, pero este bloque necesitará particularmente:__

__sync\_operations\(device\_id, status\)__

__sync\_operations\(entity\_uuid\)__

__sync\_operations\(client\_operation\_uuid\)__

__conflicts\(branch\_id, status, severity\)__

__conflicts\(sync\_operation\_id\)__

__sync\_change\_log\(company\_id, sequence\_id\)__

__sync\_change\_log\(branch\_id, sequence\_id\)__

__124\. Retención__

__Propuesta conceptual:__

__sync\_change\_log__

__Retención limitada y bootstrap si cursor expira\.__

__sync\_batches__

__Historial técnico por periodo\.__

__sync\_operations__

__Retención más larga por auditoría/soporte\.__

__conflicts__

__Conservar largo plazo, especialmente los resueltos relevantes\.__

__Las fechas exactas vendrán de configuración/política de datos\.__

__125\. Monitoreo__

__Podremos obtener métricas como:__

__operaciones offline por sucursal__

__tasa de conflictos__

__tiempo medio hasta sincronización__

__dispositivos desactualizados__

__errores por versión PWA__

__ventas offline aceptadas/rechazadas__

__sin agregar tablas adicionales de métricas\.__

__126\. Alertas de sincronización__

__El Bloque 12 podrá generar alertas cuando:__

- __dispositivo no sincroniza por demasiado tiempo,__
- __hay demasiados conflictos,__
- __change cursor demasiado viejo,__
- __cola persistente\.__

__No necesitamos sync\_alerts\.__

__127\. Tablas nuevas del Bloque 11__

__Quedan:__

__sync\_batches__

__sync\_operations__

__sync\_operation\_dependencies__

__sync\_change\_log__

__conflicts__

__Son:__

__5 tablas nuevas__

__128\. Ajustes a tabla existente__

__Agregamos a devices:__

__last\_pull\_sequence BIGINT NULL__

__last\_push\_at TIMESTAMPTZ NULL__

__last\_pull\_at TIMESTAMPTZ NULL__

__No son tablas adicionales\.__

__129\. Conteo acumulado__

__Bloque__

__Nuevas__

__Acumulado__

__1\. Organización y seguridad__

__12__

__12__

__2\. Catálogo maestro__

__9__

__21__

__3\. Núcleo de inventario__

__9__

__30__

__4\. Compras y entradas__

__5__

__35__

__5\. Clientes y ventas__

__4__

__39__

__6\. CxC, pagos y reembolsos__

__8__

__47__

__7\. Salidas, devoluciones, conteos y ajustes__

__9__

__56__

__8\. Transferencias__

__7__

__63__

__9\. Kits y armado__

__4__

__67__

__10\. Cierre y caja__

__5__

__72__

__11\. PWA y sincronización__

__5__

__77__

__Actualmente tenemos:__

__11 de 12 bloques diseñados ✅  
77 tablas formalmente definidas__

__130\. Decisiones cerradas del Bloque 11__

1. __PostgreSQL será la única verdad oficial\.__
2. __IndexedDB será cache \+ cola operacional\.__
3. __No duplicaremos tablas comerciales para “modo offline”\.__
4. __Una sincronización puede contener varias operaciones\.__
5. __Cada operación se procesa atómicamente de forma independiente\.__
6. __sync\_operations conservará el payload original\.__
7. __JSONB se usará únicamente como evidencia/transportación técnica, no como sustituto del modelo relacional\.__
8. __Tendremos idempotencia técnica y de negocio\.__
9. __Mismo UUID con payload diferente será detectado\.__
10. __Dependencias entre operaciones serán explícitas\.__
11. __Cliente→venta→pago puede sincronizarse en orden correcto\.__
12. __Dependencias cíclicas se bloquearán\.__
13. __Conflictos usarán una tabla transversal conflicts\.__
14. __No habrá una tabla sync\_conflicts independiente\.__
15. __Conflicto empresarial se distinguirá de error técnico\.__
16. __No permitiremos stock negativo para aceptar una operación offline\.__
17. __No reduciremos automáticamente cantidades de venta\.__
18. __No aplicaremos parcialmente un pago conflictivo\.__
19. __Cliente idéntico por documento sí puede reconciliarse automáticamente\.__
20. __Lotes pueden reasignarse automáticamente si existe una alternativa PEPS segura\.__
21. __Payload local se conserva aunque servidor reasigne lote\.__
22. __Día cerrado genera conflicto, no cambio automático de fecha\.__
23. __Precio/kit se validarán según la versión realmente conocida por el dispositivo\.__
24. __Conteos offline serán reinterpretables respecto de movimientos posteriores\.__
25. __Dispositivo/usuario/permiso se revalidan en servidor\.__
26. __Dispositivo revocado no puede seguir originando operaciones nuevas válidas\.__
27. __Operaciones creadas antes de revocación podrán revisarse según política\.__
28. __No almacenaremos contraseñas en IndexedDB\.__
29. __sync\_change\_log proporcionará sincronización incremental determinística\.__
30. __No utilizaremos solo updated\_at como cursor global\.__
31. __La PWA conservará un last\_change\_sequence\.__
32. __Si el cursor expira se realiza un nuevo bootstrap\.__
33. __Cambios globales y por sucursal compartirán el mismo feed con alcance\.__
34. __El backend seguirá filtrando cada cambio por permisos\.__
35. __No necesitamos device\_sync\_cursors como nueva tabla inicialmente\.__
36. __Ampliaremos devices con información de última sincronización\.__
37. __Workbox no será la única cola de operaciones\.__
38. __Dexie\.js administrará la persistencia operacional local\.__
39. __UUID v7 permitirá crear entidades offline\.__
40. __BIGINT seguirá siendo el PK interno servidor\.__
41. __Operación local rechazada no tiene por qué contaminar sales/payments\.__
42. __Los conflictos preconfirmación vivirán en sync/conflicts\.__
43. __Una entidad ya oficial sí puede posteriormente tener un conflicto\.__
44. __sync\_change\_log y audit\_events tendrán responsabilidades diferentes\.__
45. __Los cambios oficiales relevantes se publicarán transaccionalmente para PWA\.__
46. __No necesitamos microservicios ni una segunda base por sucursal\.__

__Perfecto\. Cerramos el Modelo lógico PostgreSQL — Bloque 12 de 12: Auditoría, aprobaciones, alertas, configuración, motivos, numeraciones, adjuntos e importación\.__

__Este bloque es transversal: no crea inventario ni ventas directamente, sino que da soporte, trazabilidad y control a todos los demás módulos\.__

__Vamos a reutilizar lo máximo posible y propongo 10 tablas nuevas:__

- __reason\_codes__
- __approvals__
- __alerts__
- __document\_sequences__
- __attachments__
- __settings__
- __setting\_values__
- __audit\_events__
- __import\_batches__
- __import\_batch\_rows__

__Con ellas pasaríamos de 77 a 87 tablas formalmente definidas\.__

__Etapa 4\.2 — Bloque 12: Control transversal, auditoría y configuración__

__1\. Tabla reason\_codes__

__Propósito__

__Centralizar motivos estructurados que actualmente aparecen en muchos procesos:__

- __anulación,__
- __pérdida,__
- __ajuste,__
- __diferencia de transferencia,__
- __reapertura de cierre,__
- __cambio PEPS,__
- __reembolso,__
- __baja por daño,__
- __corrección\.__

__No queremos que cada módulo tenga su propia tabla de motivos\.__

__Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__company\_id__

__BIGINT__

__FK → companies\.id, NULL__

__code__

__VARCHAR__

__NOT NULL__

__name__

__VARCHAR__

__NOT NULL__

__description__

__TEXT__

__NULL__

__category__

__VARCHAR__

__NOT NULL__

__requires\_notes__

__BOOLEAN__

__NOT NULL DEFAULT FALSE__

__requires\_attachment__

__BOOLEAN__

__NOT NULL DEFAULT FALSE__

__requires\_approval__

__BOOLEAN__

__NOT NULL DEFAULT FALSE__

__status__

__VARCHAR__

__NOT NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__2\. Motivos globales o por empresa__

__company\_id = NULL puede representar motivos del sistema\.__

__Ejemplos:__

__SYSTEM\_ERROR\_CORRECTION__

__Mientras motivos particulares de la empresa tendrán:__

__company\_id = \.\.\.__

__No es obligatorio usar motivos globales en V1, pero el modelo queda preparado\.__

__3\. Categorías de motivo__

__Ejemplos:__

__SALE\_CANCELLATION__

__PAYMENT\_CANCELLATION__

__INVENTORY\_ADJUSTMENT__

__LOSS__

__DAMAGE__

__FIFO\_OVERRIDE__

__TRANSFER\_DIFFERENCE__

__REFUND__

__CLOSING\_REOPEN__

__CASH\_DIFFERENCE__

__OTHER__

__La categoría ayuda a que un motivo de reapertura no aparezca accidentalmente en una pérdida\.__

__4\. requires\_notes__

__Ejemplo:__

__Motivo: OTRO__

__requires\_notes = true__

__Entonces el usuario debe explicar\.__

__5\. requires\_attachment__

__Puede usarse para casos como:__

- __pérdida,__
- __daño importante,__
- __diferencia de transferencia,__
- __ajuste sensible\.__

__No significa que todos los procesos deban tener fotografía obligatoria\.__

__6\. Tabla approvals__

__Propósito__

__Centralizar autorizaciones sensibles\.__

__Ejemplos:__

- __venta debajo de mínimo,__
- __ajuste,__
- __pérdida,__
- __reembolso,__
- __reapertura de cierre,__
- __recepción excepcional,__
- __diferencia de caja,__
- __aprobación de transferencia si queremos historial detallado\.__

__No crearemos sale\_approvals, adjustment\_approvals, refund\_approvals, etc\.__

__7\. Campos de approvals__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE, NOT NULL__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__approval\_type__

__VARCHAR__

__NOT NULL__

__entity\_type__

__VARCHAR__

__NOT NULL__

__entity\_uuid__

__UUID__

__NOT NULL__

__requested\_by__

__BIGINT__

__FK users\.id__

__requested\_at__

__TIMESTAMPTZ__

__NOT NULL__

__status__

__VARCHAR__

__NOT NULL__

__approved\_by__

__BIGINT__

__FK users\.id, NULL__

__approved\_at__

__TIMESTAMPTZ__

__NULL__

__rejected\_by__

__BIGINT__

__FK users\.id, NULL__

__rejected\_at__

__TIMESTAMPTZ__

__NULL__

__reason\_id__

__BIGINT__

__FK reason\_codes\.id, NULL__

__request\_notes__

__TEXT__

__NULL__

__resolution\_notes__

__TEXT__

__NULL__

__expires\_at__

__TIMESTAMPTZ__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__8\. Estados de aprobación__

__Propongo:__

__PENDING__

__APPROVED__

__REJECTED__

__CANCELLED__

__EXPIRED__

__Una aprobación no se borra después de utilizarse\.__

__9\. Relación polimórfica controlada__

__entity\_type \+ entity\_uuid permite aprobar:__

__SALE__

__SALE\_LINE__

__INVENTORY\_ADJUSTMENT__

__REFUND__

__DAILY\_CLOSING__

__TRANSFER__

__INVENTORY\_EXIT__

__Tiene el mismo compromiso que otras relaciones polimórficas: PostgreSQL no puede poner una FK tradicional única\.__

__Pero aquí es razonable porque approvals es infraestructura transversal\.__

__10\. Aprobación no equivale a ejecutar operación__

__Ejemplo:__

__APPROVED__

__solo significa:__

__está autorizado\.__

__La venta/ajuste/reembolso todavía debe ejecutar sus validaciones normales\.__

__No queremos que una aprobación permita saltarse stock, saldo o día cerrado\.__

__11\. Aprobación puede expirar__

__Esto es útil para:__

- __autorización de precio,__
- __reapertura temporal,__
- __operación excepcional\.__

__Ejemplo:__

__expires\_at = 22:00__

__Una aprobación no debería ser reutilizable indefinidamente\.__

__12\. Una aprobación puede ser de un solo uso__

__No necesitamos inicialmente una tabla de consumos\.__

__Podemos considerar aprobaciones vinculadas a una entidad concreta\.__

__Ejemplo:__

__entity\_uuid = sale\_line\.uuid__

__Eso evita reutilizarla en otra venta\.__

__13\. Tabla alerts__

__Propósito__

__Representar advertencias o incidencias que el sistema necesita mostrar y seguir\.__

__Ejemplos:__

- __stock bajo,__
- __stock inconsistente,__
- __dispositivo sin sincronizar,__
- __deuda vencida,__
- __transferencia con diferencia,__
- __cierre pendiente,__
- __precio por debajo de costo,__
- __producto en revisión\.__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__alert\_type__

__VARCHAR__

__NOT NULL__

__severity__

__VARCHAR__

__NOT NULL__

__entity\_type__

__VARCHAR__

__NULL__

__entity\_uuid__

__UUID__

__NULL__

__title__

__VARCHAR__

__NOT NULL__

__message__

__TEXT__

__NOT NULL__

__status__

__VARCHAR__

__NOT NULL__

__detected\_at__

__TIMESTAMPTZ__

__NOT NULL__

__acknowledged\_by__

__BIGINT__

__FK users\.id, NULL__

__acknowledged\_at__

__TIMESTAMPTZ__

__NULL__

__resolved\_by__

__BIGINT__

__FK users\.id, NULL__

__resolved\_at__

__TIMESTAMPTZ__

__NULL__

__resolution\_notes__

__TEXT__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__14\. Estados de alerta__

__OPEN__

__ACKNOWLEDGED__

__RESOLVED__

__DISMISSED__

__15\. Severidad__

__Podemos reutilizar el mismo vocabulario de conflictos:__

__INFO__

__WARNING__

__CRITICAL__

__16\. Alerta ≠ conflicto__

__Importante\.__

__Un conflicto es:__

__una operación o situación que necesita una resolución para poder avanzar\.__

__Una alerta es:__

__algo que merece atención\.__

__Ejemplo:__

__Stock bajo → ALERT__

__Venta offline sin stock servidor → CONFLICT__

__No deben mezclarse\.__

__17\. ¿Guardar alertas de stock bajo permanentemente?__

__Podemos hacer dos tipos:__

- __generadas dinámicamente,__
- __persistentes\.__

__Para V1, una alerta persistente es útil cuando necesitamos:__

- __reconocimiento,__
- __resolución,__
- __historial\.__

__Pero no necesitamos crear una alerta por cada consulta\.__

__18\. Evitar alertas duplicadas__

__Ejemplo:__

__Producto A permanece bajo mínimo durante 10 días\.__

__No deberíamos crear:__

__100 alertas idénticas__

__Recomendamos una clave lógica, por ejemplo:__

__alert\_type \+ entity\_uuid \+ branch\_id \+ status OPEN__

__y actualizar/reutilizar la misma alerta activa\.__

__La restricción concreta se definirá más adelante\.__

__19\. Tabla document\_sequences__

__Propósito__

__Centralizar numeraciones internas\.__

__Ya tenemos ejemplos como:__

__VEN\-MZK\-2026\-000001__

__ENT\-MZK\-2026\-000001__

__PAG\-MZK\-2026\-000001__

__TRA\-JUL\-2026\-000001__

__AJU\-MZK\-2026\-000001__

__No queremos calcular correlativos con:__

__MAX\(number\) \+ 1__

__porque falla con concurrencia\.__

__20\. Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__document\_type__

__VARCHAR__

__NOT NULL__

__prefix__

__VARCHAR__

__NOT NULL__

__period\_type__

__VARCHAR__

__NOT NULL__

__period\_value__

__VARCHAR__

__NOT NULL__

__current\_value__

__BIGINT__

__NOT NULL DEFAULT 0__

__padding\_length__

__SMALLINT__

__NOT NULL DEFAULT 6__

__status__

__VARCHAR__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__21\. Periodicidad__

__Podemos soportar:__

__YEARLY__

__MONTHLY__

__NONE__

__Ejemplo:__

__document\_type = SALE__

__branch = Mazuko__

__period\_type = YEARLY__

__period\_value = 2026__

__current\_value = 125__

__Siguiente:__

__126__

__22\. Generación atómica__

__La numeración debe asignarse mediante:__

__UPDATE \.\.\. RETURNING__

__o bloqueo de fila\.__

__Nunca:__

__SELECT MAX\(\.\.\.\)__

__23\. Numeración offline__

__El dispositivo no reserva correlativo oficial\.__

__Offline usa UUID\.__

__Cuando sincroniza, servidor asigna:__

__sale\_number__

__payment\_number__

__\.\.\.__

__Esto evita colisiones\.__

__24\. ¿Puede haber huecos?__

__Sí\.__

__Por ejemplo:__

- __transacción obtiene número,__
- __operación posteriormente hace rollback o se invalida\.__

__Si la secuencia se actualiza dentro de la misma transacción, podemos minimizar huecos\.__

__Pero no debemos sacrificar integridad solo para que todos los números sean perfectamente consecutivos\.__

__25\. Tabla attachments__

__Propósito__

__Vincular archivos/evidencias con cualquier entidad\.__

__Ejemplos:__

- __factura proveedor,__
- __guía,__
- __foto de daño,__
- __evidencia de pérdida,__
- __documento de reembolso,__
- __acta de transferencia,__
- __archivo de importación\.__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__entity\_type__

__VARCHAR__

__NOT NULL__

__entity\_uuid__

__UUID__

__NOT NULL__

__attachment\_type__

__VARCHAR__

__NOT NULL__

__original\_filename__

__VARCHAR__

__NOT NULL__

__storage\_disk__

__VARCHAR__

__NOT NULL__

__storage\_path__

__TEXT__

__NOT NULL__

__mime\_type__

__VARCHAR__

__NOT NULL__

__file\_size__

__BIGINT__

__NOT NULL__

__sha256\_hash__

__VARCHAR__

__NULL__

__uploaded\_by__

__BIGINT__

__FK users\.id__

__uploaded\_at__

__TIMESTAMPTZ__

__NOT NULL__

__status__

__VARCHAR__

__NOT NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__26\. No guardar archivos en PostgreSQL__

__No recomiendo:__

__BYTEA__

__para fotografías/PDF normales\.__

__Guardaremos el archivo en almacenamiento:__

- __disco privado,__
- __objeto/S3 compatible,__
- __backup correspondiente,__

__y PostgreSQL guarda metadata/ruta\.__

__27\. Seguridad de adjuntos__

__No deben ser públicos directamente\.__

__La descarga debe pasar por:__

__auth__

__\+__

__permission__

__\+__

__branch scope__

__o mediante URLs firmadas temporales\.__

__28\. Hash de archivo__

__sha256\_hash ayuda a:__

- __detectar duplicados,__
- __verificar integridad,__
- __auditoría\.__

__No es obligatorio para todo archivo pero es recomendable\.__

__29\. Archivo eliminado__

__No debemos borrar silenciosamente evidencia sensible\.__

__Podemos usar:__

__ACTIVE__

__ARCHIVED__

__INVALIDATED__

__y conservar metadata/auditoría\.__

__30\. Tabla settings__

__Propósito__

__Definir qué configuraciones existen\.__

__Ejemplos:__

__cash\_closing\_tolerance__

__offline\_sale\_enabled__

__max\_offline\_age\_hours__

__inventory\_negative\_stock\_allowed__

__fifo\_override\_requires\_reason__

__price\_below\_min\_requires\_approval__

__No queremos columnas nuevas en companies por cada pequeña configuración\.__

__31\. Campos de settings__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__code__

__VARCHAR__

__UNIQUE, NOT NULL__

__name__

__VARCHAR__

__NOT NULL__

__description__

__TEXT__

__NULL__

__module__

__VARCHAR__

__NOT NULL__

__value\_type__

__VARCHAR__

__NOT NULL__

__default\_value__

__JSONB__

__NULL__

__is\_sensitive__

__BOOLEAN__

__NOT NULL DEFAULT FALSE__

__status__

__VARCHAR__

__NOT NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__32\. Tipos de configuración__

__value\_type:__

__BOOLEAN__

__INTEGER__

__DECIMAL__

__STRING__

__JSON__

__33\. ¿Por qué default\_value JSONB?__

__Porque es metadata/configuración, no dato transaccional\.__

__Ejemplos válidos:__

__true__

__5__

__100\.00__

__"America/Lima"__

__La aplicación valida el tipo mediante value\_type\.__

__34\. Tabla setting\_values__

__Propósito__

__Guardar valores efectivos con diferentes alcances\.__

__Ejemplo:__

__cash\_closing\_tolerance__

__puede ser:__

__Empresa = S/5__

__Mazuko = S/2__

__Juliaca = S/10__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__setting\_id__

__BIGINT__

__FK → settings\.id__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__value__

__JSONB__

__NOT NULL__

__version__

__BIGINT__

__NOT NULL__

__effective\_from__

__TIMESTAMPTZ__

__NOT NULL__

__effective\_to__

__TIMESTAMPTZ__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__created\_by__

__BIGINT__

__FK users\.id__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__35\. Herencia de configuración__

__Regla propuesta:__

__branch\-specific__

__↓ si no existe__

__company\-specific__

__↓ si no existe__

__settings\.default\_value__

__Así evitamos duplicar configuración en todas las sucursales\.__

__36\. Configuraciones históricas__

__No sobrescribiremos valores sensibles sin historial\.__

__Ejemplo:__

__cash tolerance:__

__v1 = 5__

__v2 = 10__

__Podemos saber qué regla estaba vigente en una fecha\.__

__37\. Configuraciones que NO deben existir__

__No todo debe volverse configurable\.__

__Ejemplo:__

__allow\_negative\_stock = true__

__Aunque técnicamente podríamos crear la configuración, funcionalmente ya decidimos:__

__no se permite stock negativo en V1\.__

__No debemos convertir reglas fundamentales de integridad en switches peligrosos\.__

__settings es para parámetros operativos, no para desactivar invariantes críticas\.__

__38\. Tabla audit\_events__

__Esta será una de las tablas más importantes para soporte y seguridad\.__

__Propósito__

__Registrar acciones relevantes realizadas en el sistema\.__

__No debe ser una copia de todas las tablas\.__

__Pregunta que responde:__

__¿Quién hizo qué, cuándo, desde dónde y sobre qué entidad?__

__39\. Campos propuestos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__user\_id__

__BIGINT__

__FK users\.id, NULL__

__device\_id__

__BIGINT__

__FK devices\.id, NULL__

__event\_type__

__VARCHAR__

__NOT NULL__

__entity\_type__

__VARCHAR__

__NULL__

__entity\_uuid__

__UUID__

__NULL__

__action__

__VARCHAR__

__NOT NULL__

__description__

__TEXT__

__NULL__

__before\_data__

__JSONB__

__NULL__

__after\_data__

__JSONB__

__NULL__

__metadata__

__JSONB__

__NULL__

__ip\_address__

__INET__

__NULL__

__user\_agent__

__TEXT__

__NULL__

__occurred\_at__

__TIMESTAMPTZ__

__NOT NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__40\. Ejemplos de eventos__

__USER\_LOGIN__

__SALE\_CONFIRMED__

__SALE\_CANCELLED__

__PRICE\_CHANGED__

__FIFO\_OVERRIDDEN__

__TRANSFER\_APPROVED__

__TRANSFER\_DIFFERENCE\_RESOLVED__

__PAYMENT\_CANCELLED__

__CLOSING\_REOPENED__

__CONFLICT\_RESOLVED__

__41\. Auditoría inmutable__

__audit\_events:__

__no se actualiza ni elimina por usuarios normales\.__

__Idealmente ni el administrador funcional debería poder editarla\.__

__42\. before\_data y after\_data__

__No deben guardar indiscriminadamente toda la fila y todas sus relaciones\.__

__Solo campos relevantes\.__

__Ejemplo cambio precio:__

__before:__

__amount 180__

__after:__

__amount 190__

__Esto reduce tamaño y exposición de datos\.__

__43\. Datos sensibles__

__No registrar:__

- __contraseña,__
- __hash de contraseña,__
- __tokens,__
- __secretos,__
- __datos que no aportan a auditoría\.__

__La auditoría no debe convertirse en una fuga de seguridad\.__

__44\. Auditoría vs historial transaccional__

__Ejemplo:__

__Una venta ya tiene:__

__sales__

__sale\_lines__

__inventory\_movements__

__kardex\_entries__

__No necesitamos duplicarla completa en auditoría\.__

__audit\_events solo registra el acto:__

__SALE\_CONFIRMED__

__user X__

__sale UUID__

__time__

__45\. Auditoría vs sync\_operations__

__También son diferentes\.__

__sync\_operations conserva:__

__lo que un dispositivo envió\.__

__audit\_events conserva:__

__la acción oficial/administrativa realizada\.__

__46\. Tabla import\_batches__

__Ahora cubrimos migración de Excel y futuras importaciones\.__

__Propósito__

__Representar cada importación controlada\.__

__Ejemplos:__

__PRODUCTS__

__INITIAL\_INVENTORY__

__CUSTOMERS__

__OPEN\_RECEIVABLES__

__PRICES__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__uuid__

__UUID__

__UNIQUE__

__company\_id__

__BIGINT__

__FK__

__branch\_id__

__BIGINT__

__FK, NULL__

__import\_type__

__VARCHAR__

__NOT NULL__

__source\_filename__

__VARCHAR__

__NOT NULL__

__source\_attachment\_id__

__BIGINT__

__FK attachments\.id, NULL__

__source\_hash__

__VARCHAR__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__total\_rows__

__INTEGER__

__NOT NULL DEFAULT 0__

__valid\_rows__

__INTEGER__

__NOT NULL DEFAULT 0__

__warning\_rows__

__INTEGER__

__NOT NULL DEFAULT 0__

__error\_rows__

__INTEGER__

__NOT NULL DEFAULT 0__

__processed\_rows__

__INTEGER__

__NOT NULL DEFAULT 0__

__started\_by__

__BIGINT__

__FK users\.id__

__approved\_by__

__BIGINT__

__FK users\.id, NULL__

__started\_at__

__TIMESTAMPTZ__

__NULL__

__completed\_at__

__TIMESTAMPTZ__

__NULL__

__notes__

__TEXT__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__47\. Estados de importación__

__Propongo:__

__UPLOADED__

__VALIDATING__

__READY\_FOR\_REVIEW__

__APPROVED__

__PROCESSING__

__COMPLETED__

__COMPLETED\_WITH\_WARNINGS__

__FAILED__

__CANCELLED__

__48\. Importar no significa aplicar inmediatamente__

__El flujo correcto:__

__archivo__

__↓__

__validar__

__↓__

__mostrar errores/advertencias__

__↓__

__revisión humana__

__↓__

__aprobar__

__↓__

__aplicar__

__Esto es especialmente importante para inventario inicial\.__

__49\. Idempotencia de importación__

__source\_hash permite detectar que el mismo archivo fue cargado nuevamente\.__

__Pero no debemos asumir automáticamente que todo archivo idéntico es error; puede ser una reejecución intencional\.__

__La combinación:__

- __batch UUID,__
- __filas,__
- __referencias de destino,__

__ayudará a impedir duplicidad\.__

__50\. Tabla import\_batch\_rows__

__Propósito__

__Guardar el resultado de validación de cada fila de importación\.__

__Campos__

__Campo__

__Tipo lógico__

__Regla__

__id__

__BIGINT__

__PK__

__import\_batch\_id__

__BIGINT__

__FK__

__row\_number__

__INTEGER__

__NOT NULL__

__raw\_data__

__JSONB__

__NOT NULL__

__normalized\_data__

__JSONB__

__NULL__

__status__

__VARCHAR__

__NOT NULL__

__warning\_codes__

__JSONB__

__NULL__

__error\_codes__

__JSONB__

__NULL__

__matched\_entity\_type__

__VARCHAR__

__NULL__

__matched\_entity\_uuid__

__UUID__

__NULL__

__created\_entity\_type__

__VARCHAR__

__NULL__

__created\_entity\_uuid__

__UUID__

__NULL__

__resolution\_notes__

__TEXT__

__NULL__

__processed\_at__

__TIMESTAMPTZ__

__NULL__

__created\_at__

__TIMESTAMPTZ__

__NOT NULL__

__updated\_at__

__TIMESTAMPTZ__

__NOT NULL__

__Restricción:__

__UNIQUE\(import\_batch\_id, row\_number\)__

__51\. raw\_data__

__Conserva literalmente los valores interpretados de la fila de origen\.__

__Ejemplo:__

__REFERENCIA = "RK\.7027"__

__MARCA = "CAT"__

__STOCK = "3"__

__No debemos destruir el dato original cuando normalizamos\.__

__52\. normalized\_data__

__Puede contener:__

__normalized\_reference = "RK7027"__

__brand\_normalized = "CAT"__

__quantity = 3__

__pero el original queda intacto\.__

__53\. Duplicados de referencia__

__Como ya definimos:__

__RK\.7027__

__RK\-7027__

__pueden producir una advertencia de posible duplicado\.__

__No se fusionan automáticamente\.__

__La fila puede quedar:__

__NEEDS\_REVIEW__

__hasta decisión humana\.__

__54\. Estados de fila__

__Propongo:__

__PENDING__

__VALID__

__WARNING__

__ERROR__

__NEEDS\_REVIEW__

__SKIPPED__

__IMPORTED__

__55\. Errores vs advertencias__

__Ejemplo error:__

__cantidad no numérica__

__Ejemplo advertencia:__

__marca no encontrada__

__o:__

__referencia muy similar a producto existente__

__La advertencia puede requerir revisión pero no significa automáticamente rechazo\.__

__56\. Importación de productos__

__Puede crear:__

- __products,__
- __product\_aliases,__
- __marcas/categorías si autorizadas\.__

__Pero recomiendo no crear automáticamente marcas dudosas sin revisión\.__

__57\. Importación de inventario inicial__

__Debe producir las mismas estructuras que una operación oficial:__

__inventory__

__lots__

__inventory\_movements__

__inventory\_movement\_lines__

__lot\_allocations__

__kardex\_entries__

__No hacemos:__

__UPDATE inventories SET physical\_quantity = Excel__

__directamente\.__

__58\. Batch de inventario inicial__

__Cada movimiento inicial puede quedar vinculado al:__

__import\_batch__

__mediante source\_type/source\_id o metadata/auditoría\.__

__Así sabemos exactamente qué migración originó el stock\.__

__59\. Inventario inicial y lotes__

__Si Excel no trae lotes reales, creamos:__

__lote inicial interno__

__con:__

__is\_initial\_lot = true__

__pero no inventamos una fecha histórica de compra que no conocemos\.__

__60\. Costo inicial__

__Debe venir de:__

- __información aprobada,__
- __revisión administrativa\.__

__No de una fórmula Excel potencialmente incorrecta sin validación\.__

__61\. Importación de clientes__

__Documento exacto:__

__match customer existente__

__Nombre parecido sin documento:__

__warning / review__

__Nunca auto\-fusión agresiva\.__

__62\. Importación de saldos por cobrar__

__Puede crear:__

__receivables\.origin\_type = INITIAL\_BALANCE__

__sale\_id = NULL__

__No necesitamos inventar ventas históricas\.__

__63\. ¿Importamos historial completo del Excel?__

__Ya decidimos que no es obligatorio\.__

__La estrategia recomendada para salida a producción:__

- __catálogo depurado,__
- __inventario inicial validado,__
- __saldos por cobrar validados si existen,__
- __inicio limpio\.__

__El Excel permanece como evidencia histórica\.__

__64\. import\_batch\_rows y volumen__

__Aunque sean miles o decenas de miles de filas, PostgreSQL puede manejarlo perfectamente\.__

__Estas filas pueden archivarse después de un periodo si el tamaño crece significativamente\.__

__65\. ¿Necesitamos una tabla de import\_errors?__

__No\.__

__import\_batch\_rows\.error\_codes y warning\_codes son suficientes para V1\.__

__Crear otra tabla solo complicaría la importación\.__

__66\. ¿Necesitamos tabla para resolución de cada fila?__

__Tampoco inicialmente\.__

__Podemos registrar:__

__matched\_entity\_uuid__

__created\_entity\_uuid__

__resolution\_notes__

__status__

__Si en el futuro existe una migración masiva mucho más compleja, se extiende\.__

__67\. Configuración de importación__

__No guardaremos mapeos Excel genéricos de usuario en V1\.__

__Como ya conocemos el formato de origen principal, el importador puede ser específico y controlado\.__

__Eso reduce riesgo\.__

__68\. Integridad entre tablas__

__Este bloque toca prácticamente todo el sistema\.__

__Ejemplos:__

__sales\.price\_approval\_id → approvals\.id__

__inventory\_exits\.reason\_id → reason\_codes\.id__

__daily\_closings\.reopen\_reason\_id → reason\_codes\.id__

__refunds\.reason\_id → reason\_codes\.id__

__import\_batches\.source\_attachment\_id → attachments\.id__

__69\. Orden físico de migraciones__

__Aunque approvals se definió después de sale\_lines, al implementar Laravel podremos ordenar las migraciones correctamente:__

1. __tablas base,__
2. __tablas transversales necesarias,__
3. __transaccionales,__
4. __agregar FKs cruzadas\.__

__El orden conceptual no obliga al mismo orden físico\.__

__70\. Alertas automáticas__

__Ejemplos que podremos generar mediante Laravel Scheduler/Jobs:__

__Stock bajo__

__available\_quantity < product\_min\_stock__

__Deuda vencida__

__receivable outstanding > 0__

__AND due\_date < today__

__Dispositivo atrasado__

__last\_synced\_at demasiado antiguo__

__Cierre pendiente__

__Sucursal con fecha anterior aún OPEN\.__

__71\. Alertas en tiempo real vs periódicas__

__Algunas se generan inmediatamente:__

__inventory mismatch__

__transfer difference__

__Otras mediante scheduler:__

__debt overdue__

__device stale__

__No necesitamos tablas diferentes\.__

__72\. Resolución automática de alertas__

__Ejemplo:__

__Stock mínimo:__

__available = 2__

__min = 5__

__alerta abierta\.__

__Después compra:__

__available = 10__

__el sistema puede marcar:__

__RESOLVED__

__automáticamente\.__

__73\. Auditoría de stock__

__No grabaremos un audit\_event por cada incremento interno de campo si ya existe inventory\_movement\.__

__Eso produciría mucho ruido\.__

__Auditaremos eventos de alto nivel\.__

__74\. Auditoría de lecturas__

__No necesitamos registrar cada vez que alguien abre la pantalla de productos\.__

__Pero sí puede ser necesario auditar lecturas sensibles como:__

- __costos,__
- __exportaciones masivas,__
- __reportes financieros,__

__si el negocio lo exige posteriormente\.__

__No agregamos una tabla aparte\.__

__75\. Aprobación y auditoría__

__Cuando alguien aprueba:__

__approvals\.status = APPROVED__

__y además generamos:__

__audit\_event APPROVAL\_GRANTED__

__Eso es correcto porque una tabla guarda estado y otra guarda evidencia transversal\.__

__76\. Adjuntos y auditoría__

__Al cargar/eliminar/inactivar evidencia sensible:__

__audit\_event__

__también debe registrarse\.__

__77\. Motivos inactivos__

__Si un motivo deja de utilizarse:__

__status = INACTIVE__

__pero operaciones históricas siguen apuntando a él\.__

__No se elimina\.__

__78\. Configuración sensible__

__settings\.is\_sensitive = true puede usarse para:__

- __precios/seguridad,__
- __tolerancias,__
- __parámetros de sincronización sensibles\.__

__La API decide quién puede leer/cambiar esos valores\.__

__79\. Cambio de configuración__

__Un cambio debe generar:__

__new setting\_values row__

__\+__

__audit\_event__

__\+__

__sync\_change\_log__

__cuando afecta PWA\.__

__Ejemplo:__

__offline\_sale\_enabled__

__80\. Configuración y caché PWA__

__Determinados setting\_values pueden formar parte del bootstrap/sync\.__

__Así el dispositivo sabe:__

__si permite ventas offline__

__cuánto tiempo puede trabajar desconectado__

__qué reglas locales aplicar__

__Servidor siempre revalida\.__

__81\. Numeraciones y sucursal__

__Algunos documentos son por sucursal:__

__SALE__

__PAYMENT__

__ENTRY__

__EXIT__

__TRANSFER\_SHIPMENT__

__RECEIPT__

__Otros podrían ser por empresa\.__

__Por eso:__

__branch\_id = NULL__

__está permitido en document\_sequences\.__

__82\. Numeración y año__

__Ejemplo clave:__

__company__

__branch__

__document\_type__

__period\_value__

__debe ser único\.__

__Así no hay dos secuencias distintas de ventas Mazuko 2026 accidentalmente\.__

__83\. Auditoría y particionamiento futuro__

__audit\_events puede crecer bastante\.__

__En PostgreSQL podríamos particionar por fecha en el futuro\.__

__Pero no necesitamos hacerlo desde el día uno\.__

__Primero índices adecuados y retención\.__

__84\. Retención de auditoría__

__Por la naturaleza del sistema:__

- __movimientos/Kardex: largo plazo\.__
- __auditoría relevante: largo plazo\.__
- __logs técnicos de bajo valor: periodo más corto\.__

__No mezclaremos logs técnicos de aplicación con audit\_events\.__

__85\. Logs de Laravel/Nginx__

__No necesitan tabla PostgreSQL\.__

__Pueden vivir en:__

- __archivos rotados,__
- __servicio de logs futuro\.__

__audit\_events no es sustituto de logs de errores\.__

__86\. Tabla final de nuevas entidades del Bloque 12__

__Quedan:__

__reason\_codes__

__approvals__

__alerts__

__document\_sequences__

__attachments__

__settings__

__setting\_values__

__audit\_events__

__import\_batches__

__import\_batch\_rows__

__Son:__

__10 tablas nuevas__

__87\. Conteo acumulado final del modelo lógico__

__Bloque__

__Nuevas__

__Acumulado__

__1\. Organización y seguridad__

__12__

__12__

__2\. Catálogo maestro__

__9__

__21__

__3\. Núcleo de inventario__

__9__

__30__

__4\. Compras y entradas__

__5__

__35__

__5\. Clientes y ventas__

__4__

__39__

__6\. CxC, pagos y reembolsos__

__8__

__47__

__7\. Salidas, devoluciones, conteos y ajustes__

__9__

__56__

__8\. Transferencias__

__7__

__63__

__9\. Kits y armado__

__4__

__67__

__10\. Cierre y caja__

__5__

__72__

__11\. PWA y sincronización__

__5__

__77__

__12\. Control transversal e importación__

__10__

__87__

__Por tanto, al terminar los 12 bloques tenemos:__

__12 de 12 bloques del modelo lógico diseñados ✅  
87 tablas formalmente identificadas/diseñadas ✅__

__88\. Decisiones cerradas del Bloque 12__

1. __Tendremos un solo catálogo transversal de motivos\.__
2. __Los motivos estarán clasificados por categoría\.__
3. __Motivos podrán exigir nota, adjunto o aprobación\.__
4. __Habrá infraestructura común de aprobaciones\.__
5. __No crearemos una tabla de aprobación distinta por cada módulo\.__
6. __Aprobación no salta validaciones de negocio\.__
7. __Las aprobaciones podrán expirar\.__
8. __Las alertas estarán separadas de los conflictos\.__
9. __Alerta representa atención; conflicto representa resolución necesaria\.__
10. __No generaremos alertas duplicadas indefinidamente\.__
11. __Numeraciones utilizarán secuencia transaccional\.__
12. __Nunca utilizaremos MAX\(\)\+1\.__
13. __PWA trabaja con UUID y recibe correlativo al sincronizar\.__
14. __Adjuntos serán una infraestructura transversal\.__
15. __Archivos no se almacenarán normalmente como BYTEA en PostgreSQL\.__
16. __Adjuntos tendrán acceso protegido\.__
17. __Configuración estará dividida entre definición y valores\.__
18. __Podrá haber configuración empresa/sucursal\.__
19. __Configuraciones sensibles se versionarán\.__
20. __No convertiremos invariantes críticas en switches configurables\.__
21. __audit\_events será transversal e inmutable\.__
22. __Auditoría no duplicará movimientos/Kardex completos\.__
23. __No se registrarán secretos en auditoría\.__
24. __Importaciones tendrán cabecera/batch\.__
25. __Cada fila importada conservará dato original y normalizado\.__
26. __Posibles duplicados no se fusionarán automáticamente\.__
27. __Importar inventario inicial generará movimientos/lotes/Kardex normales\.__
28. __No actualizaremos saldo directamente desde Excel\.__
29. __Saldos iniciales de clientes pueden crear receivables sin venta ficticia\.__
30. __No necesitamos tablas adicionales de errores de importación\.__
31. __Configuración relevante podrá sincronizarse con PWA\.__
32. __Logs técnicos no se mezclarán con auditoría funcional\.__

__89\. Resultado de la Etapa 4\.2__

__Con este bloque queda completado:__

__Modelo lógico PostgreSQL — 12 bloques completos ✅__

__Y llegamos a 87 tablas candidatas\.__

__Importante: 87 todavía no significa que vayamos a crear 87 migraciones de negocio exactamente tal cual\. Ahora viene un paso muy importante que yo haría antes de continuar con el modelo físico:__

__Revisión global de simplificación__

__Debemos revisar las 87 tablas buscando:__

- __tablas que puedan fusionarse,__
- __tablas que sean solo cache y no necesiten existir,__
- __estados CONFLICT que podamos quitar de tablas comerciales,__
- __campos redundantes,__
- __relaciones polimórficas que convenga mejorar,__
- __agregados que podamos calcular en lugar de almacenar,__
- __tablas realmente imprescindibles para V1 vs tablas que pueden quedar preparadas para una fase posterior\.__

