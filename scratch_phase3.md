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
