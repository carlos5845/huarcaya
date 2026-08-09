__Etapa 3 – Diseño funcional__, empezando formalmente con el primer proceso\. La idea será aprobar cada proceso antes de pasar al siguiente para que al terminar esta etapa tengamos reglas suficientemente claras para diseñar la base de datos\.

__Proceso 1: Catálogo y administración de productos__

Este proceso corresponde principalmente al __Módulo 3: Catálogo de repuestos y definición de kits__, aunque posteriormente se relacionará con inventario, compras, ventas, transferencias y Kardex\.

__1\. Objetivo funcional__

Mantener un __catálogo maestro único de productos para toda la empresa__\.

Esto significa que un repuesto se registra una sola vez, independientemente de cuántas sucursales lo tengan\.

Por ejemplo:

PRODUCTO

Referencia:

RK\-428

Nombre:

ACC BLOQUE DE ORBITROL

Marca:

TRANSCALLAO

No tendremos:

RK\-428 Mazuko

RK\-428 Juliaca

RK\-428 Huepetuhe

como tres productos\.

Será:

                    RK\-428

                       │

        ┌──────────────┼───────────────┐

        ↓              ↓               ↓

     Juliaca         Mazuko        Huepetuhe

     Stock 10        Stock 4         Stock 2

El producto es global; el inventario pertenece a cada sucursal\.

__2\. Tipos de productos__

Quedan definidos tres tipos\.

__Producto simple__

Un repuesto individual\.

Ejemplo:

RK\-428

ACC BLOQUE DE ORBITROL

__Kit inventariado como producto único__

Producto que ya existe físicamente como conjunto\.

Ejemplo:

KIT\-001

KIT DE REPARACIÓN BOMBA

Tiene:

- Stock propio\.
- Lotes propios\.
- Costo promedio propio\.
- Precio propio\.
- Kardex propio\.

__Kit armado desde componentes__

Producto comercial compuesto por otros productos\.

Ejemplo:

KIT\-REP\-001

2 × RETÉN

1 × RODAMIENTO

4 × SELLO

Puede:

- Armarse al momento de vender\.
- Armarse anticipadamente y convertirse en stock\.

__3\. Identificación interna del producto__

No utilizaremos la referencia comercial como clave primaria de la base de datos\.

Cada producto tendrá:

ID interno

UUID

Código interno

Referencia comercial

Ejemplo:

id:                 285

uuid:               0198\.\.\.

codigo\_interno:     PRD\-000285

referencia:         RK\-428

nombre:             ACC BLOQUE DE ORBITROL

Internamente las operaciones usarán:

producto\_id = 285

y no:

producto\_id = "RK\-428"

Esto permitirá corregir una referencia en el futuro sin romper ventas, Kardex, transferencias o entradas históricas\.

__4\. Referencia principal__

La referencia comercial seguirá siendo fundamental para el usuario\.

Ejemplos reales encontrados:

RK\-428

11103402

N\-11103241

F\-217411

6013\-C3

32213J2/Q

__Regla__

Todas las referencias se almacenarán como __texto__\.

Nunca como número\.

Esto evita problemas con:

- Ceros iniciales\.
- Guiones\.
- Barras\.
- Letras\.
- Conversión científica\.
- Importaciones desde Excel\.

__5\. Referencia original y normalizada__

El sistema mantendrá dos conceptos\.

__Referencia original__

Exactamente como la empresa decide manejarla:

RK\-428

Será la que aparece en:

- Ventas\.
- Compras\.
- Inventario\.
- Kardex\.
- Transferencias\.
- Reportes\.

__Referencia normalizada__

Se usará internamente para búsqueda y detección de similitudes\.

Ejemplo:

Referencia:

RK\-428

Normalización para búsqueda:

RK428

Entonces si alguien busca:

rk428

RK 428

RK\.428

RK\-428

podremos detectar que probablemente está buscando:

RK\-428

__6\. No fusionar referencias automáticamente__

Esta regla queda establecida\.

Por ejemplo:

11103241

N\-11103241

no se considerarán automáticamente el mismo producto\.

Tampoco:

PVG\-100

PVG100

El sistema mostrará:

Existe una referencia similar\. Revise antes de crear un producto nuevo\.

El usuario autorizado decidirá\.

__7\. Alias y referencias alternativas__

Recomiendo incorporarlo desde la primera versión porque el análisis del Excel mostró que puede ser bastante útil\.

Un producto podrá tener:

Referencia principal:

RK\-428

Referencias alternativas:

RK 428

RK\.428

ORB\-428

Código proveedor ABC: X428

Conceptualmente:

PRODUCTO

   │

   ├── RK\-428      PRINCIPAL

   ├── RK 428      ALIAS HISTÓRICO

   ├── ORB\-428     PROVEEDOR A

   └── X428        PROVEEDOR B

Esto permitirá buscar utilizando cualquiera de ellas\.

__8\. Búsqueda de productos__

La búsqueda será considerablemente mejor que la actual de Excel\.

Podrá buscarse por:

- Referencia exacta\.
- Referencia parcial\.
- Alias\.
- Nombre\.
- Parte del nombre\.
- Marca\.
- Categoría\.
- Código interno\.

Ejemplo:

Usuario escribe:

orbitrol

Resultado:

RK\-428

ACC BLOQUE DE ORBITROL

TRANSCALLAO

O:

Usuario escribe:

11103

y aparecerán las referencias relacionadas\.

__9\. Autocompletado en las operaciones__

Esto reemplazará al VLOOKUP actual\.

En una entrada, venta, salida o transferencia:

Referencia: \[ RK\-428                \]

Al seleccionar el producto:

Referencia: RK\-428

Producto: ACC BLOQUE DE ORBITROL

Marca: TRANSCALLAO

Unidad: UNIDAD

Stock Mazuko: 7

Dependiendo del módulo podrán aparecer también:

- Precio sugerido\.
- Precio mínimo\.
- Stock\.
- Lotes\.
- Ubicación\.
- Tipo de producto\.

Por tanto:

El usuario no escribirá manualmente nombre y marca cada vez que registre un movimiento\.

__10\. Producto inexistente__

Si el trabajador escribe:

RK\-999999

y no existe:

Referencia no encontrada

El comportamiento dependerá del rol\.

__Vendedor__

No puede crear el producto directamente\.

Podrá:

Solicitar creación del producto\.

__Almacenero__

Recomendación: tampoco crear directamente\.

__Encargado__

Podrá crear productos si recibe ese permiso\.

__Administrador general__

Podrá crear productos\.

Esto evita que aparezcan duplicados creados rápidamente durante una venta\.

__11\. Flujo definitivo de creación__

Ingresar referencia

        ↓

Normalizar para búsqueda

        ↓

Buscar referencia exacta

        ↓

¿Existe?

 ┌──────┴───────┐

 Sí              No

 ↓               ↓

Mostrar      Buscar similares

existente        ↓

            ¿Hay posibles coincidencias?

             ┌──────┴───────┐

             Sí              No

             ↓               ↓

          Advertir      Continuar creación

             ↓               ↓

       Usuario decide    Registrar datos

             └──────┬────────┘

                    ↓

            Validar información

                    ↓

               Crear producto

                    ↓

            Disponible globalmente

__12\. Datos básicos del producto__

__Identificación__

- Código interno\.
- Referencia principal\.
- Nombre\.
- Descripción\.

__Clasificación__

- Marca\.
- Categoría\.
- Unidad de medida\.
- Tipo de producto\.

__Comercial__

- Precio sugerido\.
- Precio mínimo\.
- Precio mayorista, opcional\.
- Precio minorista, opcional\.

__Inventario__

- Stock mínimo\.
- Control PEPS\.
- Control de lotes\.
- Permite stock negativo: __No__\.

__Kits__

Cuando corresponda:

- Tipo de kit\.
- Componentes\.
- Cantidades\.
- Permite armado anticipado\.
- Permite armado al vender\.
- Permite desarmado\.
- Versión de composición\.

__Estado__

- Activo\.
- Inactivo\.

__13\. Marca__

La marca dejará de ser texto libre repetido en cada movimiento\.

Existirá un catálogo:

MARCAS

TRANSCALLAO

NOK

VOLVO

SKF

KOMATSU

\.\.\.

El producto se relacionará mediante:

marca\_id

Esto evita:

VOLVO

Volvo

volvo

VOLVO 

como cuatro valores diferentes\.

__14\. Categorías__

También recomiendo utilizar un catálogo\.

Ejemplos preliminares:

- Rodamientos\.
- Retenes\.
- Bombas\.
- Filtros\.
- Sistema hidráulico\.
- Transmisión\.
- Motor\.
- Rodaje\.
- Sellos\.
- Kits\.
- Otros\.

La clasificación definitiva puede completarse cuando se importe el catálogo real\.

Un producto deberá pertenecer, inicialmente, a una categoría principal\.

__15\. Unidades de medida__

También deberán normalizarse\.

Ejemplos:

UNIDAD

JUEGO

KIT

PAR

METRO

CAJA

Esto es importante por los productos que actualmente se venden como conjuntos\.

No sería correcto registrar:

Cantidad: 0\.5

en un producto cuya unidad sea KIT, salvo que explícitamente se configure para admitir fracciones\.

__Regla recomendada__

Cada unidad tendrá una propiedad:

permite\_decimales

Por ejemplo:

__Unidad__

__Decimales__

Unidad

No

Kit

No

Juego

No

Metro

Sí

__16\. Configuración de precios__

El producto tendrá un precio base o sugerido\.

Pero debemos distinguir entre:

Precio global

y:

Precio por sucursal

__Recomendación__

Crear un precio sugerido general y permitir sobrescribirlo por sucursal\.

Ejemplo:

RK\-428

Precio general: S/ 180

Pero:

__Sucursal__

__Precio__

Juliaca

S/ 180

Mazuko

S/ 190

Huepetuhe

S/ 195

Esto puede ser útil por costos logísticos y mercado local\.

Lo mismo podrá aplicarse al precio mínimo\.

__17\. Historial de precios__

Los precios no deberían simplemente sobrescribirse sin historial\.

Si cambia:

S/ 180 → S/ 190

guardaremos:

Anterior: S/ 180

Nuevo: S/ 190

Fecha

Usuario

Sucursal

Motivo opcional

Esto será útil para auditoría y reportes\.

Una venta histórica seguirá mostrando el precio que tuvo al momento de realizarse\.

__18\. El costo no pertenece al catálogo como verdad oficial__

Este punto es importante\.

Podemos mostrar:

Último costo conocido

Costo promedio actual

pero el costo real pertenece al inventario de cada sucursal\.

Ejemplo:

RK\-428

puede tener:

__Sucursal__

__Costo promedio__

Juliaca

S/ 100

Mazuko

S/ 115

Huepetuhe

S/ 108

Por eso:

El producto no tendrá un único costo promedio global editable\.

El costo se calculará por:

producto \+ sucursal

__19\. Stock mínimo__

También recomiendo manejarlo por sucursal\.

Ejemplo:

RK\-428

__Sucursal__

__Stock mínimo__

Juliaca

5

Mazuko

2

Huepetuhe

3

Esto permitirá generar alertas más útiles\.

Puede existir un valor general como predeterminado, pero cada sucursal podrá personalizarlo\.

__20\. Ubicación física__

Un producto podrá tener una ubicación dentro de cada sucursal\.

Ejemplos:

Pasillo A

Estante 3

Nivel 2

O código:

A\-03\-02

No recomiendo poner la ubicación directamente en productos, porque puede ser diferente en cada tienda\.

Será:

Producto \+ sucursal \+ ubicación

Incluso posteriormente un lote podría tener ubicación propia\.

__21\. Producto simple__

Configuración:

Tipo: SIMPLE

Control de lotes: Sí

Rotación: PEPS

Ejemplo:

RK\-428

ACC BLOQUE DE ORBITROL

En una entrada:

Entrada → lote → promedio → stock

En una venta:

Venta → PEPS → salida → Kardex

__22\. Kit como producto único__

Configuración:

Tipo: KIT\_UNICO

Ejemplo:

KIT\-001

KIT COMPLETO DE REPARACIÓN

Funciona prácticamente igual que un producto simple\.

Tiene:

- Stock\.
- Lotes\.
- Precio\.
- Costo promedio\.
- Kardex\.

No necesita componentes asociados para funcionar\.

__23\. Kit por componentes__

Configuración:

Tipo: KIT\_COMPONENTES

Tendrá composición\.

Ejemplo:

__Componente__

__Cantidad__

RET\-001

2

ROD\-001

1

SEL\-001

4

También tendrá una versión:

Versión 1

Si posteriormente cambia:

2 retenes → 3 retenes

se crea:

Versión 2

No modificamos la versión usada en ventas anteriores\.

__24\. Edición de productos__

Debemos separar dos tipos de edición\.

__Datos que pueden corregirse__

- Nombre\.
- Descripción\.
- Imagen\.
- Categoría\.
- Alias\.
- Stock mínimo\.
- Precios\.

__Datos sensibles__

- Referencia principal\.
- Tipo de producto\.
- Unidad de medida\.
- Composición del kit\.
- Control de lotes\.

Cambiar estos datos cuando ya existen movimientos puede afectar el comportamiento\.

__Regla recomendada__

Cuando un producto ya tenga movimientos:

- Cambiar la referencia → permitido con auditoría\.
- Cambiar nombre → permitido\.
- Cambiar marca → permitido con auditoría\.
- Cambiar tipo SIMPLE → KIT → restringido\.
- Cambiar unidad → restringido\.
- Eliminar producto → no permitido\.

__25\. Productos inactivos__

Nunca eliminaremos físicamente un producto que tenga historial\.

En lugar de:

DELETE producto

utilizaremos:

estado = INACTIVO

Un producto inactivo:

- Sigue apareciendo en operaciones históricas\.
- Sigue apareciendo en Kardex\.
- No puede venderse\.
- No puede comprarse normalmente\.
- No puede agregarse a nuevos kits\.
- Puede consultarse en reportes\.

Si aún tiene stock, el sistema debería advertir antes de permitir desactivarlo\.

__26\. Fusión de productos duplicados__

Dado el problema de referencias del Excel, esta funcionalidad puede ser necesaria durante migración\.

Supongamos:

Producto A:

PVG\-100

Producto B:

PVG100

y se confirma que realmente son el mismo producto\.

No simplemente eliminaremos uno\.

Se necesitará una operación administrativa:

Fusionar productos\.

Que deberá:

- Elegir producto principal\.
- Convertir la otra referencia en alias\.
- Unificar relaciones donde sea seguro\.
- Mantener trazabilidad\.

Sin embargo, recomiendo utilizarla principalmente durante la migración y restringirla mucho una vez el sistema esté en producción\.

__27\. Importación masiva de productos__

Dado que tendremos aproximadamente miles de productos, registrarlos uno por uno no sería práctico\.

Necesitamos importación desde Excel\.

Plantilla:

__Referencia__

__Nombre__

__Marca__

__Categoría__

__Unidad__

__Tipo__

__Precio sugerido__

__Precio mínimo__

El sistema realizará primero una __prevalidación__\.

Ejemplo:

1,910 registros analizados

1,850 válidos

20 posibles duplicados

10 marcas desconocidas

15 referencias similares

15 con información faltante

Nada se importará hasta revisar los errores importantes\.

__28\. Auditoría__

Todas las acciones sensibles deberán registrarse\.

Ejemplos:

Creación de producto

Cambio de referencia

Cambio de marca

Cambio de precio

Cambio de precio mínimo

Cambio de tipo

Desactivación

Creación de alias

Cambio de kit

Guardando:

- Usuario\.
- Fecha\.
- Dispositivo\.
- Valor anterior\.
- Valor nuevo\.
- Sucursal cuando corresponda\.

__29\. Funcionamiento offline del catálogo__

La creación y modificación oficial del catálogo requerirá internet\.

__Offline sí se podrá__

- Buscar productos sincronizados\.
- Consultar referencias\.
- Consultar nombres\.
- Consultar marcas\.
- Consultar precios conocidos\.
- Consultar stock estimado\.
- Consultar composición de kits conocida\.

__Offline no se permitirá inicialmente__

- Crear producto maestro\.
- Cambiar referencia\.
- Cambiar marca\.
- Modificar composición\.
- Desactivar producto\.
- Cambiar precio mínimo oficial\.

Esto disminuye conflictos\.

__30\. Sincronización del catálogo__

Cuando el dispositivo recupera conexión:

Consultar versión del catálogo

        ↓

¿Hay cambios?

        ↓

Descargar diferencias

        ↓

Actualizar IndexedDB

No será necesario descargar los miles de productos completos cada vez\.

Podremos usar:

updated\_at

version

para sincronización incremental\.

__31\. Permisos del proceso__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Ver productos

Sí

Sí

Sí

Sí

Crear producto

Sí

Según permiso

No

No

Editar nombre

Sí

Según permiso

No

No

Cambiar referencia

Sí

No recomendado

No

No

Cambiar marca

Sí

Limitado

No

No

Cambiar precio

Sí

Sí, local

No

Dentro de venta

Cambiar precio mínimo

Sí

Local con permiso

No

No

Crear kit

Sí

Con permiso

No

No

Modificar kit

Sí

Con permiso

No

No

Desactivar producto

Sí

No recomendado

No

No

Importación masiva

Sí

No

No

No

__32\. Validaciones definitivas__

Antes de crear un producto:

- Referencia obligatoria\.
- Nombre obligatorio\.
- Marca obligatoria\.
- Categoría obligatoria\.
- Unidad obligatoria\.
- Tipo obligatorio\.
- Referencia exacta única entre referencias principales\.
- Verificación de alias existentes\.
- Advertencia por referencia normalizada similar\.
- Precio no negativo\.
- Precio mínimo no negativo\.
- Stock mínimo no negativo\.
- Kit de componentes con composición válida\.

Para un componente de kit:

- Debe existir\.
- Debe estar activo\.
- No puede ser el mismo kit\.

También debemos impedir inicialmente referencias circulares como:

KIT A contiene KIT B

KIT B contiene KIT A

__33\. Criterios de aceptación del Proceso 1__

Consideraremos aprobado el proceso cuando se cumpla:

1. Un producto se registra una sola vez para toda la empresa\.
2. Se puede buscar por referencia, nombre, marca y alias\.
3. Las referencias se almacenan como texto\.
4. Se detectan posibles duplicados\.
5. No se fusionan referencias automáticamente\.
6. Un producto puede tener referencias alternativas\.
7. El costo promedio permanece separado por sucursal\.
8. Los precios pueden configurarse\.
9. Los precios mantienen historial\.
10. El stock mínimo puede configurarse por sucursal\.
11. Existen productos simples y dos tipos de kits\.
12. La composición de kits tiene versiones\.
13. Un producto histórico no se elimina\.
14. La creación del catálogo requiere conexión\.
15. El catálogo se replica hacia IndexedDB\.
16. Los permisos determinan quién puede modificarlo\.
17. Existe auditoría sobre modificaciones sensibles\.

__34\. Resultado del Proceso 1__

Con estas reglas podemos considerar funcionalmente definido:

__Catálogo centralizado de productos, referencias, marcas, categorías, unidades, precios, configuración de inventario y definición de kits\.__

Su flujo general queda:

REFERENCIA

    ↓

PRODUCTO MAESTRO

    ├── Marca

    ├── Categoría

    ├── Unidad

    ├── Alias

    ├── Precios

    └── Tipo

         ├── Simple

         ├── Kit único

         └── Kit componentes

PRODUCTO

    ↓

Configuración por sucursal

    ├── Precio local

    ├── Precio mínimo

    ├── Stock mínimo

    └── Ubicación

PRODUCTO

    ↓

INVENTARIO

    ├── Stock

    ├── Costo promedio

    └── Lotes

Con esto, __Proceso 1 puede quedar aprobado como diseño funcional preliminar__\.

El siguiente proceso de la Etapa 3 será el __Proceso 2: Compras y Entradas__, donde definiremos con el mismo nivel de detalle: proveedores/procedencia, documentos, moneda y tipo de cambio, costos, creación de lotes, promedio ponderado, devoluciones, inventario inicial, ajustes positivos y efectos exactos sobre Inventario y Kardex\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 2: Compras y Entradas__

Este proceso corresponde principalmente al __Módulo 5: Compras y entradas__, pero afecta directamente a:

- Inventario por sucursal\.
- Lotes\.
- Promedio ponderado\.
- Kardex\.
- Transferencias\.
- Kits\.
- Reportes\.
- PWA y sincronización\.

La meta es definir exactamente qué ocurre cuando ingresa mercadería al sistema\.

__1\. Objetivo funcional__

Registrar de forma controlada cualquier movimiento que aumente el inventario de una sucursal\.

Una entrada confirmada deberá:

- Aumentar el stock\.
- Crear o actualizar lotes\.
- Recalcular el costo promedio\.
- Generar un movimiento de Kardex\.
- Mantener trazabilidad documental\.
- Identificar al usuario responsable\.
- Poder ser auditada posteriormente\.

La lógica general será:

Entrada confirmada

        ↓

Aumentar inventario

        ↓

Crear lote

        ↓

Recalcular costo promedio

        ↓

Generar Kardex

__2\. Tipos de entrada__

El sistema distinguirá claramente el motivo del ingreso\.

__2\.1 Compra a proveedor__

Mercadería comprada directamente\.

Ejemplo:

Proveedor: ABC Repuestos

Producto: RK\-428

Cantidad: 10

Costo: S/ 150

__2\.2 Inventario inicial__

Será utilizado durante la puesta en marcha del sistema\.

Ejemplo:

Sucursal: Mazuko

Producto: RK\-428

Stock físico validado: 7

Costo inicial: S/ 145

Esta operación se utilizará una sola vez por producto/sucursal durante la migración inicial, salvo regularizaciones administrativas\.

__2\.3 Recepción de transferencia__

Mercadería enviada desde otra sucursal\.

No se registrará manualmente como una entrada común\.

Se generará desde:

Transferencia enviada

        ↓

Sucursal destino confirma recepción

        ↓

Entrada automática

__2\.4 Devolución de cliente__

Producto que vuelve físicamente después de una venta\.

Deberá indicar:

- Venta original\.
- Producto\.
- Cantidad\.
- Estado físico\.
- Si vuelve a stock vendible\.
- Lote original, si puede identificarse\.

__2\.5 Ajuste positivo__

Se utilizará cuando el conteo físico determine que existen más unidades que las registradas\.

Ejemplo:

Sistema: 5

Conteo físico: 6

Diferencia: \+1

No deberá utilizarse como método normal para registrar compras olvidadas\.

__2\.6 Entrada por armado de kit__

Cuando se arme anticipadamente un kit desde componentes:

Salida de componentes

        ↓

Confirmación de armado

        ↓

Entrada del kit terminado

__2\.7 Otras entradas__

Para situaciones excepcionales autorizadas\.

Ejemplo:

- Recuperación de mercadería\.
- Regularización histórica\.
- Donación\.
- Reingreso administrativo\.

Se exigirá motivo\.

__3\. Diferencia entre compra y entrada__

Esto conviene separarlo conceptualmente\.

Una __compra__ representa la operación comercial:

Proveedor

Documento

Moneda

Costo

Productos comprados

Una __entrada de inventario__ representa el ingreso físico de mercadería\.

Normalmente:

Compra

   ↓

Entrada

Pero no toda entrada es una compra\.

Por ejemplo:

Transferencia recibida → Entrada

Devolución → Entrada

Ajuste positivo → Entrada

Kit armado → Entrada

Por eso en el modelo funcional no debemos llamar "compra" a cualquier entrada\.

__4\. Estados de una entrada__

Propongo:

BORRADOR

   ↓

PENDIENTE

   ↓

CONFIRMADA

Estados alternativos:

- Rechazada\.
- Anulada\.
- Con diferencia\.
- Con conflicto de sincronización\.

__Borrador__

Todavía se puede editar\.

No afecta:

- Stock\.
- Lotes\.
- Kardex\.
- Costo promedio\.

__Pendiente__

Puede utilizarse cuando una operación requiere revisión\.

Ejemplo:

- Ajuste de inventario\.
- Devolución importante\.
- Entrada excepcional\.

__Confirmada__

Ya produjo efecto físico y contable\.

Después de confirmarla:

No se podrá modificar directamente\.

__5\. Datos de cabecera__

Cada entrada tendrá información general\.

__Obligatorios__

- Sucursal\.
- Tipo de entrada\.
- Fecha de operación\.
- Usuario responsable\.

__Según el tipo__

- Proveedor\.
- Empresa o procedencia\.
- Tipo de documento\.
- Número de documento\.
- Moneda\.
- Tipo de cambio\.
- Transferencia relacionada\.
- Venta relacionada\.
- Orden de armado\.
- Motivo\.
- Observaciones\.

Ejemplo:

Tipo: COMPRA

Sucursal: Mazuko

Proveedor: ABC Repuestos

Documento: Factura

Número: F001\-00258

Fecha: 06/08/2026

Moneda: USD

Tipo de cambio: 3\.75

__6\. Productos de la entrada__

Cada entrada podrá contener varios productos\.

Ejemplo:

__Referencia__

__Producto__

__Cantidad__

__Costo__

RK\-428

ACC BLOQUE DE ORBITROL

10

150

F\-217411

FILTRO

5

80

N\-11103241

GUIA DE BASTIDOR

2

250

Esto reemplaza registrar una fila aislada sin una cabecera clara\.

La entrada tendrá:

Entrada \#ENT\-MZK\-000125

    ├── RK\-428 × 10

    ├── F\-217411 × 5

    └── N\-11103241 × 2

__7\. Selección del producto__

El usuario podrá buscar por:

- Referencia\.
- Alias\.
- Nombre\.
- Marca\.
- Código interno\.

Al seleccionar:

RK\-428

el sistema completará:

ACC BLOQUE DE ORBITROL

TRANSCALLAO

Unidad: UNIDAD

Si no existe:

Producto no registrado

El usuario no podrá simplemente escribir un nombre libre dentro de la entrada\.

__8\. Cantidades__

La cantidad deberá respetar la unidad del producto\.

Ejemplo:

UNIDAD → enteros

KIT → enteros

JUEGO → enteros

METRO → puede aceptar decimal

Reglas:

- Cantidad > 0\.
- No aceptar cero\.
- No aceptar negativas\.
- Número de decimales según unidad\.

__9\. Costo unitario__

El costo se registra en la entrada\.

No será el precio de venta\.

Ejemplo:

Costo unitario: S/ 150

Si la compra viene en dólares:

Precio USD: $40

TC: 3\.75

Costo en soles:

40 × 3\.75 = S/ 150

__Regla recomendada__

El sistema debe guardar:

moneda\_original

costo\_moneda\_original

tipo\_cambio

costo\_base

Ejemplo:

USD 40

TC 3\.75

Costo base: PEN 150

Esto dará trazabilidad y permitirá saber cómo se calculó el costo\.

__10\. ¿Se podrá modificar manualmente el costo convertido?__

Recomiendo que sí, pero solo antes de confirmar y con una advertencia\.

Ejemplo:

Calculado: S/ 150\.00

Ingresado: S/ 151\.50

Podría ocurrir por:

- Flete\.
- Seguro\.
- Otros costos\.
- Redondeos\.

Pero sería mejor manejar esos costos explícitamente\.

Más adelante podemos tener:

Costo producto

\+ Flete

\+ Seguro

\+ Otros costos atribuibles

= Costo final

Para la primera versión podemos manejar:

- Costo unitario final\.
- Observación\.

__11\. Costo total__

Se calculará automáticamente:

Total línea =

cantidad × costo unitario

El usuario no escribirá manualmente el total\.

Ejemplo:

10 × S/ 150 = S/ 1,500

__12\. Costo promedio ponderado__

Este es uno de los puntos centrales\.

Supongamos que en Mazuko existe:

Stock: 5

Costo promedio: S/ 100

Valor: S/ 500

Llega una compra:

Cantidad: 5

Costo: S/ 140

Valor entrada: S/ 700

Nuevo promedio:

\(S/ 500 \+ S/ 700\) ÷ \(5 \+ 5\)

= S/ 120

Resultado:

Stock: 10

Costo promedio: S/ 120

Valor: S/ 1,200

__Regla__

El promedio se recalcula:

Solo cuando existe una entrada valorizada que aumenta inventario\.

Una venta no recalcula el promedio\.

__13\. Caso stock cero__

Supongamos:

Stock anterior: 0

Nueva entrada:

10 unidades × S/ 150

Entonces:

Nuevo costo promedio = S/ 150

No existe promedio anterior que ponderar\.

__14\. Creación automática de lote__

Cada entrada confirmada generará uno o más lotes\.

Ejemplo:

Entrada:

RK\-428 × 10

El sistema podría crear:

MZK\-20260806\-0001

con:

Cantidad inicial: 10

Cantidad disponible: 10

Costo original: S/ 150

Fecha original: 06/08/2026

__Si el proveedor entrega un lote__

Se almacenará:

Lote proveedor: ABC\-2026\-4487

pero también podemos conservar un identificador interno\.

__15\. Varias líneas del mismo producto__

Recomiendo permitirlas únicamente si existe una razón\.

Ejemplo:

RK\-428

5 unidades lote A

5 unidades lote B

Eso sí tiene sentido porque son lotes diferentes\.

Pero si:

RK\-428 × 5

RK\-428 × 5

mismo costo y mismo lote, el sistema debería sugerir combinarlas\.

__16\. PEPS__

Una entrada no consume PEPS; lo alimenta\.

Cada nueva entrada se coloca al final de la secuencia física:

Lote más antiguo

      ↓

Lote siguiente

      ↓

Lote nuevo

Después, las ventas y salidas consumirán los más antiguos\.

__17\. Inventario inicial__

Esta entrada merece reglas especiales\.

Durante la migración:

Producto: RK\-428

Stock físico: 10

Costo inicial: S/ 150

Se genera:

Movimiento: INVENTARIO\_INICIAL

Lote: MZK\-INICIAL\-0001

__Fecha del lote__

Como probablemente no sabremos cuándo se compró originalmente, tendremos:

fecha\_ingreso\_original = desconocida

fecha\_registro\_sistema = fecha migración

Para PEPS podemos:

- Tratar todo inventario inicial como más antiguo que las compras posteriores\.
- Mantener un orden interno estable\.

Esta es mi recomendación\.

__18\. Recepción de transferencia__

No será una entrada manual libre\.

Ejemplo:

Juliaca envía:

RK\-428 × 5

Al recibir Mazuko:

Transferencia TR\-00045

el sistema traerá automáticamente:

- Producto\.
- Cantidad enviada\.
- Lotes enviados\.
- Costo de transferencia\.
- Fecha original\.
- Origen\.

Mazuko solo confirma:

Cantidad recibida: 5

o registra diferencia\.

Al confirmar:

- Se crea entrada\.
- Se crean lotes destino\.
- Se recalcula el promedio local\.

__19\. Conservación de lotes en transferencia__

La trazabilidad debe conservarse\.

Ejemplo:

Origen:

Lote JUL\-20260701\-001

Destino:

Nuevo lote interno:

MZK\-20260806\-004

pero relacionado con:

lote\_origen = JUL\-20260701\-001

y manteniendo:

fecha\_ingreso\_original = 01/07/2026

Así PEPS en Mazuko sabe que esa mercadería es antigua\.

__20\. Devolución de cliente__

Una devolución debe vincularse con la venta original\.

Flujo:

Buscar venta

      ↓

Seleccionar producto vendido

      ↓

Cantidad a devolver

      ↓

Registrar motivo

      ↓

Revisar estado físico

__Si vuelve en buen estado__

Entrada al inventario

__Si está dañado__

Entrada a stock dañado

No debe aumentar automáticamente el stock vendible\.

__21\. Costo de una devolución__

Recomendación:

La devolución debe reincorporarse usando el __costo con el que salió originalmente__ en esa venta, no el precio vendido al cliente\.

Ejemplo:

Precio venta: S/ 180

Costo de salida: S/ 110

Si se devuelve:

Costo de reingreso: S/ 110

Esto permite revertir correctamente el efecto económico de la venta\.

__22\. Ajuste positivo__

Flujo:

Conteo físico

      ↓

Sistema detecta sobrante

      ↓

Encargado revisa

      ↓

Crear ajuste positivo

      ↓

Registrar motivo

      ↓

Confirmar

Ejemplo:

Sistema: 10

Físico: 12

Ajuste: \+2

__Costo del ajuste__

Aquí necesitamos una política\.

Recomendación:

- Si existe costo promedio actual → usar ese costo\.
- Si stock era cero → exigir costo al encargado o administrador\.

Esto evita crear inventario valorizado en cero\.

__23\. Entrada por armado de kit__

Supongamos que armamos:

KIT\-A

usando componentes cuyo costo total es:

S/ 200

La orden de armado generará:

SALIDA COMPONENTES: S/ 200

        ↓

ENTRADA KIT: S/ 200

Si existe:

Mano de obra: S/ 20

entonces:

Costo entrada kit: S/ 220

El kit tendrá su propio lote\.

__24\. Anulación de entrada__

Una entrada confirmada no se editará ni eliminará\.

Flujo:

Solicitar anulación

       ↓

Validar que sea reversible

       ↓

Registrar motivo

       ↓

Autorizar

       ↓

Generar movimiento inverso

__Problema importante__

Si ya se vendieron unidades de esa entrada, no podemos simplemente borrar el lote\.

Ejemplo:

Entrada: 10

Ya vendidas: 7

Disponible: 3

No puede anularse normalmente una entrada de 10\.

El sistema deberá indicar:

La entrada tiene existencias ya consumidas y no puede anularse directamente\.

Podrá requerir:

- Devolución a proveedor\.
- Ajuste administrativo\.
- Revisión del administrador\.

__25\. Duplicidad documental__

Debemos prevenir registrar la misma factura dos veces\.

Ejemplo:

Proveedor: ABC

Documento: F001\-00125

Si ya existe:

Advertencia:

Este documento ya fue registrado\.

Regla recomendable:

proveedor \+ tipo\_documento \+ numero\_documento

debe ser único para compras normales, salvo una excepción autorizada\.

__26\. Compra con varios costos__

Puede ocurrir que un mismo producto aparezca con:

- Precio de compra\.
- Flete\.
- Otros costos\.

No debemos mezclar esto con el precio de venta\.

Para primera versión:

Costo unitario final

será el dato que entra al Kardex\.

Pero dejaría preparado el modelo para:

costo\_compra

costo\_flete

otros\_costos

costo\_final

__27\. Proveedores__

Aunque no lo teníamos como módulo independiente, las compras requieren una entidad de proveedores\.

No hace falta crear un módulo principal nuevo\.

Puede ser una subfuncionalidad de Compras\.

Datos:

- RUC/DNI según corresponda\.
- Razón social\.
- Nombre comercial\.
- Teléfono\.
- Dirección\.
- Contacto\.
- Estado\.

Esto permitirá:

- Historial de compras\.
- Búsqueda de documentos\.
- Costo por proveedor\.
- Referencias alternativas por proveedor\.

__28\. Estados de documentos de entrada__

Propuesta definitiva:

__Estado__

__Afecta inventario__

Borrador

No

Pendiente de aprobación

No

Confirmada

Sí

Anulada

Reversión

Rechazada

No

Con conflicto

No hasta resolver

__29\. Permisos__

__Administrador__

Puede:

- Crear entradas\.
- Confirmarlas\.
- Anular\.
- Ajustar\.
- Ver costos\.
- Modificar excepcionalmente costos antes de confirmar\.

__Encargado__

Puede:

- Crear compras\.
- Confirmar entradas normales\.
- Realizar ajustes de su sucursal\.
- Ver costos\.
- Gestionar proveedores locales\.

__Almacenero__

Recomendación:

- Preparar entrada\.
- Registrar cantidades físicas\.
- Lotes\.
- Ubicaciones\.
- No modificar costos sensibles\.
- No confirmar ajustes\.

__Vendedor__

No necesita acceso a compras normales\.

__30\. Entrada offline__

Aquí recomiendo ser conservadores\.

__Offline sí__

Podríamos permitir:

- Preparar borrador de recepción física\.
- Registrar cantidades recibidas\.
- Registrar lotes del proveedor\.
- Registrar observaciones\.

__Offline no inicialmente__

No recomiendo confirmar oficialmente:

- Compras\.
- Ajustes positivos\.
- Recepciones de transferencias\.
- Entradas valorizadas\.

¿Por qué?

Porque una entrada modifica:

- Costo promedio\.
- Valor de inventario\.
- Lotes\.
- PEPS\.
- Posiblemente operaciones posteriores\.

Es mejor que el servidor determine el orden oficial\.

__31\. Caso práctico offline__

Sucursal pierde conexión justo cuando llega mercadería\.

La PWA permite:

Recepción local pendiente

Producto: RK\-428

Cantidad: 10

Costo: S/ 150

Estado:

PENDIENTE DE SINCRONIZACIÓN

Podemos decidir si ese stock puede utilizarse localmente antes de sincronizar\.

Mi recomendación inicial:

__No considerarlo stock oficial vendible hasta sincronizar la entrada\.__

Esto evita que se venda mercadería cuya entrada luego pueda ser rechazada o cuyo costo no esté confirmado\.

Podemos mostrar:

Stock oficial: 5

Recepción pendiente: \+10

pero:

Stock disponible oficial: 5

__32\. ¿Y si el negocio necesita vender inmediatamente lo recién recibido sin internet?__

Esto puede ocurrir en la práctica\.

Por eso debemos dejar preparada una futura política:

permitir\_consumir\_entradas\_locales\_pendientes

Pero para V1 recomiendo:

false

Así reducimos mucho los conflictos de sincronización\.

__33\. Kardex generado__

Al confirmar una entrada:

Antes:

Stock: 5

Promedio: S/ 100

Valor: S/ 500

Entrada:

5 × S/ 140 = S/ 700

Kardex:

__Entrada__

__Costo entrada__

__Salida__

__Saldo__

__Promedio__

__Valor saldo__

5

140

0

10

120

1,200

Esto se genera automáticamente\.

__34\. Auditoría__

Se deberá registrar:

- Quién creó la entrada\.
- Quién confirmó\.
- Quién anuló\.
- Fecha y hora\.
- Dispositivo\.
- Cambios realizados antes de confirmar\.
- Motivo de ajustes\.
- Documento asociado\.

__35\. Reportes derivados__

De este proceso podremos obtener:

- Compras por período\.
- Compras por proveedor\.
- Entradas por sucursal\.
- Costo de compras\.
- Entradas por producto\.
- Ajustes positivos\.
- Devoluciones\.
- Recepciones por transferencia\.
- Entradas por armado de kits\.
- Historial de costos\.
- Variación de costos por producto\.

__36\. Reglas funcionales definitivas del Proceso 2__

1. Una entrada confirmada aumenta inventario\.
2. Una entrada en borrador no afecta stock\.
3. Toda entrada tiene un motivo/tipo\.
4. Cada entrada física crea lotes\.
5. Las cantidades deben ser positivas\.
6. El costo no puede ser negativo\.
7. El total se calcula automáticamente\.
8. Compras en moneda extranjera guardan tipo de cambio\.
9. El costo oficial se expresa en moneda base\.
10. La entrada recalcula el promedio ponderado\.
11. El promedio se calcula por producto y sucursal\.
12. La entrada alimenta la secuencia PEPS\.
13. Las transferencias recibidas generan entrada automáticamente\.
14. Las devoluciones se vinculan a la venta\.
15. Los ajustes requieren motivo y permisos\.
16. El inventario inicial se registra como entrada especial\.
17. Las entradas confirmadas no se editan\.
18. Las anulaciones se realizan con movimientos inversos\.
19. No se puede anular libremente una entrada parcialmente consumida\.
20. Debe prevenirse duplicidad de documentos\.
21. Las entradas offline pueden prepararse, pero no serán oficiales hasta sincronizarse\.
22. Stock pendiente offline no será vendible inicialmente\.
23. Todo movimiento confirmado genera Kardex\.
24. Todo movimiento deja auditoría\.

__37\. Criterios de aceptación__

El proceso estará correctamente implementado cuando:

- Una compra confirmada aumente exactamente el stock correspondiente\.
- Se cree correctamente el lote\.
- El promedio ponderado sea correcto\.
- El Kardex coincida con el inventario\.
- Una entrada de una sucursal no afecte otra\.
- El mismo documento no pueda duplicarse sin advertencia\.
- Una entrada anulada genere trazabilidad\.
- Una transferencia recibida conserve lote y antigüedad\.
- Una devolución se relacione con su venta\.
- Los borradores no modifiquen inventario\.
- Los permisos limiten quién puede ajustar\.
- Las operaciones offline pendientes se distingan del stock oficial\.

__Resultado del Proceso 2__

Queda definido funcionalmente:

__El módulo de Compras y Entradas registrará todos los ingresos físicos de mercadería, creará lotes, actualizará inventario, recalculará el promedio ponderado y generará automáticamente el Kardex, manteniendo trazabilidad por documento, sucursal, usuario y origen del movimiento\.__

El siguiente proceso será el __Proceso 3: Inventario por sucursal y lotes__, donde debemos definir con precisión stock físico, disponible, reservado, en tránsito, dañado, ubicaciones, PEPS, conteos, consultas globales y consistencia entre inventario y lotes\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 3: Inventario por sucursal y lotes__

Este proceso corresponde principalmente al __Módulo 4: Inventario por sucursal, lotes y armado de kits__, y se relaciona directamente con:

- Compras y entradas\.
- Ventas y salidas\.
- Transferencias\.
- Kardex\.
- Kits\.
- Cierre diario\.
- Alertas\.
- Reportes\.
- PWA y sincronización\.

El objetivo es definir exactamente __qué significa el stock en el sistema__ y cómo se controlará por sucursal y por lote\.

__1\. Objetivo funcional__

El sistema debe poder responder, para cualquier producto:

- Cuánto stock existe en cada sucursal\.
- Cuánto está realmente disponible para vender\.
- Cuánto está reservado\.
- Cuánto está en tránsito\.
- Cuánto está dañado o bloqueado\.
- Qué lotes existen\.
- Cuál es el lote más antiguo\.
- Cuál es el costo promedio\.
- Cuál es el valor del inventario\.
- Dónde está ubicado físicamente\.

La unidad principal de control será:

Producto \+ Sucursal

Y el nivel de trazabilidad será:

Producto \+ Sucursal \+ Lote

__2\. Diferentes conceptos de stock__

No debemos tener un único campo llamado simplemente stock\.

El sistema manejará varios conceptos\.

__Stock físico__

Cantidad total que físicamente pertenece a la sucursal\.

Ejemplo:

Stock físico: 10

__Stock reservado__

Cantidad que existe físicamente, pero ya está comprometida para una operación\.

Ejemplos:

- Transferencia preparada\.
- Pedido reservado\.
- Kit en proceso de armado\.

Stock reservado: 2

__Stock bloqueado__

Cantidad que existe, pero temporalmente no puede venderse\.

Ejemplos:

- Producto en revisión\.
- Lote observado\.
- Diferencia pendiente\.

Stock bloqueado: 1

__Stock dañado__

Producto físicamente existente, pero no vendible como producto normal\.

Stock dañado: 1

__Stock disponible__

Será la cantidad realmente utilizable para una nueva venta o salida\.

Conceptualmente:

Stock disponible

=

Stock físico

\- reservado

\- bloqueado

\- dañado

Ejemplo:

Stock físico:     10

Reservado:         2

Bloqueado:         1

Dañado:            1

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-

Disponible:        6

__3\. Stock en tránsito__

El stock en tránsito debe tratarse por separado\.

Supongamos que Juliaca envía cinco unidades a Mazuko\.

Para Juliaca:

Stock disponible disminuye: \-5

Pero esas unidades todavía no pertenecen al inventario disponible de Mazuko\.

Se mostrarán como:

En tránsito hacia Mazuko: 5

En Mazuko:

Stock disponible: no aumenta todavía

Stock próximo a recibir: \+5

Solo al confirmar la recepción:

En tránsito → Stock físico de Mazuko

Esto evita duplicar inventario\.

__4\. Ejemplo completo de inventario__

Producto:

RK\-428

ACC BLOQUE DE ORBITROL

Sucursal Mazuko:

__Concepto__

__Cantidad__

Stock físico

15

Reservado

3

Dañado

1

Bloqueado

1

Disponible

10

En tránsito hacia Mazuko

5

La interfaz podría mostrar:

Disponible       10

Físico           15

Reservado         3

Dañado            1

Bloqueado         1

Por recibir       5

Esto es mucho más claro que un único “Stock = 15”\.

__5\. Inventario global__

El administrador podrá consultar dos vistas\.

__Inventario de una sucursal__

Ejemplo:

Mazuko

RK\-428 → 10 disponibles

__Inventario consolidado__

Ejemplo:

__Sucursal__

__Disponible__

Juliaca

10

Mazuko

4

Huepetuhe

2

Otra sucursal

3

__Total disponible__

__19__

El consolidado no significa que exista un almacén global\.

Será una suma informativa de los inventarios locales\.

__6\. Consulta desde una sucursal__

Recomiendo que un vendedor normalmente vea:

- Su propio stock disponible\.
- Stock de su sucursal\.
- Precio\.

No necesariamente costos\.

Sin embargo, puede ser útil permitir que consulte si otra sucursal tiene el producto\.

Ejemplo:

RK\-428

Mazuko: 0

Juliaca: 4

Huepetuhe: 2

Pero esta información puede restringirse por rol\.

Recomendación:

__Vendedor__

Puede ver:

- Stock propio\.
- Indicador "Disponible en otra sucursal", si se desea\.

__Encargado__

Puede ver cantidades de otras sucursales\.

__Administrador__

Ve todo\.

Esto facilitará solicitudes de transferencia\.

__7\. Lotes internos para todos los productos__

La política ya definida será:

Internamente todos los productos tendrán lotes\.

Pero el usuario no tendrá que administrarlos manualmente en cada operación\.

Ejemplo:

Entrada:

RK\-428 × 10

Genera automáticamente:

Lote:

MZK\-20260806\-0001

El lote permitirá saber:

- Cuándo entró\.
- De dónde vino\.
- Cuánto entró\.
- Cuánto queda\.
- Cuál era su costo original\.
- En qué ubicación está\.
- Qué salidas lo consumieron\.

__8\. Información del lote__

Cada lote deberá incluir como mínimo:

- UUID\.
- Código interno\.
- Producto\.
- Sucursal\.
- Movimiento de origen\.
- Tipo de origen\.
- Fecha de ingreso original\.
- Fecha de recepción local\.
- Cantidad inicial\.
- Cantidad disponible\.
- Cantidad reservada\.
- Costo original\.
- Ubicación\.
- Estado\.
- Lote de origen, si vino por transferencia\.
- Lote del proveedor, si existe\.
- Observaciones\.

Ejemplo:

Código: MZK\-20260806\-0001

Producto: RK\-428

Fecha original: 06/08/2026

Cantidad inicial: 10

Disponible: 7

Reservado: 2

Dañado: 1

Costo original: S/ 150

Ubicación: A\-03\-02

__9\. Estados del lote__

Propuesta:

- Disponible\.
- Parcialmente reservado\.
- Reservado\.
- Agotado\.
- En tránsito\.
- Dañado\.
- Bloqueado\.
- Devuelto\.
- En revisión\.

No es necesario que el usuario vea todos como una lista complicada\. Muchos estados pueden administrarse automáticamente\.

__10\. PEPS/FIFO__

La política ya definida será:

El sistema sugerirá primero los lotes más antiguos\.

Orden funcional recomendado:

1. fecha\_ingreso\_original
2. fecha\_recepcion\_sucursal
3. created\_at
4. ID interno

Ejemplo:

__Lote__

__Fecha__

__Disponible__

A

01/07

3

B

15/07

5

C

01/08

10

Venta de seis unidades:

Lote A → 3

Lote B → 3

El lote C no se toca\.

__11\. PEPS físico vs costo promedio__

Debemos mantener clara esta separación\.

Una salida puede consumir:

Lote A:

3 unidades originalmente compradas a S/ 100

Lote B:

3 unidades originalmente compradas a S/ 130

Pero si el costo promedio actual es:

S/ 115

el costo oficial de la salida será:

6 × 115

No:

3 × 100 \+ 3 × 130

Los costos históricos del lote sirven para trazabilidad\.

El promedio ponderado sigue siendo la valorización oficial\.

__12\. Modificación manual del lote PEPS__

PEPS será una sugerencia automática, pero no una prisión operativa\.

Si el almacenero físicamente no puede utilizar el lote más antiguo, podrá cambiarlo\.

Ejemplo:

Sistema recomienda:

Lote A

Trabajador selecciona:

Lote B

Debe indicar motivo:

- Lote no encontrado\.
- Producto dañado\.
- Diferencia física\.
- Presentación distinta\.
- Ubicación inaccesible\.
- Solicitud específica\.
- Otro\.

El sistema guardará:

Lote sugerido: A

Lote utilizado: B

Usuario: \.\.\.

Motivo: \.\.\.

__13\. Ubicaciones físicas__

La ubicación será por sucursal\.

Ejemplos:

A\-01\-01

A\-01\-02

B\-03\-01

Puede representar:

Pasillo A

Estante 1

Nivel 1

Un producto puede tener más de una ubicación\.

Incluso un mismo producto puede tener:

Lote A → A\-01\-01

Lote B → B\-03\-02

Por eso la ubicación idealmente pertenece al lote\.

__14\. Movimiento de ubicación__

Mover un producto de un estante a otro dentro de la misma sucursal:

NO cambia stock

NO genera entrada

NO genera salida

Pero sí debe dejar trazabilidad de ubicación\.

Ejemplo:

Lote A

A\-01\-01 → B\-02\-03

Esto puede ser una subfunción de inventario\.

No necesita aparecer en el Kardex valorizado porque no modifica cantidad ni valor\.

__15\. Reservas__

Una reserva no disminuye el stock físico\.

Ejemplo:

Stock físico: 10

Reserva: 3

Resultado:

Stock disponible: 7

Se utilizará principalmente para:

- Transferencias preparadas\.
- Armado anticipado de kits\.
- Posibles pedidos reservados futuros\.

__Estados de una reserva__

- Activa\.
- Consumida\.
- Liberada\.
- Vencida\.

Para la V1, no hace falta implementar reservas comerciales complejas si no existe ese proceso\.

Las usaremos principalmente de forma interna\.

__16\. Transferencia preparada__

Este es un buen caso de reserva\.

Supongamos:

Mazuko:

Stock físico: 10

Se aprueba transferir cuatro a Huepetuhe\.

Antes de enviarlas:

Stock físico: 10

Reservado para transferencia: 4

Disponible: 6

Cuando se confirma el envío:

Stock físico: 6

En tránsito: 4

Así esas cuatro unidades no pueden venderse mientras se prepara el despacho\.

__17\. Producto dañado__

No recomiendo reducir automáticamente el inventario total cuando algo se marca como dañado\.

Primero:

Disponible → Dañado

Ejemplo:

Antes:

Físico: 10

Disponible: 10

Se identifica una unidad dañada:

Físico: 10

Disponible: 9

Dañado: 1

Después se decide:

- Reparar\.
- Volver a stock disponible\.
- Dar de baja\.
- Devolver al proveedor\.

Si finalmente se da de baja:

Salida por daño

Entonces el stock físico pasa a nueve y se genera Kardex\.

Esto conserva mejor la trazabilidad\.

__18\. Producto bloqueado__

Un producto o lote puede bloquearse temporalmente\.

Casos:

- Diferencia en conteo\.
- Revisión técnica\.
- Posible error de referencia\.
- Conflicto de sincronización\.
- Investigación administrativa\.

Mientras está bloqueado:

No está disponible para venta

Pero sigue existiendo físicamente\.

__19\. Stock negativo__

Queda confirmado:

No se permitirá stock disponible ni stock físico negativo mediante una operación normal\.

Ejemplo:

Disponible: 2

Venta solicitada: 3

Resultado:

OPERACIÓN BLOQUEADA

Incluso si el administrador quiere resolverlo, deberá corregir la causa mediante:

- Entrada\.
- Ajuste\.
- Transferencia\.
- Corrección de operación\.

No mediante una venta negativa\.

__20\. Concurrencia__

Este proceso es crítico\.

Supongamos:

Stock disponible: 1

Dos vendedores online intentan vender esa unidad simultáneamente\.

Laravel deberá:

1. Iniciar transacción\.
2. Bloquear el registro de inventario correspondiente\.
3. Volver a comprobar disponibilidad\.
4. Confirmar solo una operación\.
5. Rechazar la otra\.

Conceptualmente:

Vendedor A ─┐

            ├→ Stock 1

Vendedor B ─┘

Solo uno puede consumirlo

No debemos confiar únicamente en la validación visual de React\.

__21\. Inventario offline__

Offline se mostrará:

Stock local estimado

y no simplemente “Stock”\.

Ejemplo:

Disponible estimado: 5

Última sincronización: 15:30

Si se realiza una venta offline de dos:

Disponible estimado: 3

IndexedDB actualizará localmente el inventario estimado\.

Pero PostgreSQL seguirá teniendo el inventario oficial hasta que la venta se sincronice\.

__22\. Diferencia entre stock local y oficial__

Ejemplo:

A las 14:00 el dispositivo sincroniza:

Stock oficial: 10

Queda sin internet\.

Vende:

\-3

Local:

Stock estimado: 7

Mientras tanto, otro dispositivo online vende:

\-5

El servidor tiene:

Stock oficial: 5

Cuando el dispositivo reconecta e intenta enviar la venta de tres:

5 disponibles → venta de 3

Puede aceptarse\.

Resultado oficial:

2

Pero si la venta offline fuera seis:

5 disponibles → venta de 6

deberá quedar en conflicto\.

__23\. Reservas offline__

No recomiendo crear reservas globales offline\.

Serían difíciles de garantizar porque los demás dispositivos no conocen la reserva\.

La PWA puede mantener:

reserva\_local

para evitar que el mismo dispositivo venda dos veces sus unidades estimadas\.

Pero esa reserva no será oficial hasta sincronizar\.

__24\. PEPS offline__

La PWA tendrá una copia de los lotes conocidos\.

Ejemplo:

Lote A: 3

Lote B: 5

Venta offline de cuatro:

Asignación provisional:

A → 3

B → 1

Al sincronizar, Laravel vuelve a asignar oficialmente\.

Puede ocurrir:

Lote A ya consumido por otra operación

Entonces Laravel puede:

__Si existe otro lote__

Reasignar:

Lote B → 4

y aceptar la venta\.

__Si no existe stock__

Crear conflicto\.

Por eso tendremos:

asignacion\_local

asignacion\_oficial

__25\. Costo promedio offline__

La PWA puede conservar:

Costo promedio conocido: S/ 110

pero será solo estimado\.

El vendedor no necesita verlo\.

Al sincronizar:

Laravel asignará el costo promedio oficial vigente según las reglas del servidor\.

Esto evita inconsistencias económicas\.

__26\. Conteo físico de inventario__

El conteo será una funcionalidad importante\.

Flujo:

Crear conteo

        ↓

Seleccionar sucursal

        ↓

Seleccionar productos/área

        ↓

Registrar cantidades físicas

        ↓

Comparar con sistema

        ↓

Detectar diferencias

        ↓

Revisión

        ↓

Ajuste autorizado si corresponde

__27\. Tipos de conteo__

__Conteo general__

Todos los productos de una sucursal\.

Se utilizará para:

- Inventario inicial\.
- Auditorías\.
- Cierre especial\.

__Conteo parcial__

Por:

- Categoría\.
- Marca\.
- Ubicación\.
- Lista de productos\.

__Conteo puntual__

Un único producto\.

Útil cuando existe una diferencia\.

__28\. Conteo por lote__

Para la primera versión recomiendo:

El conteo normal será por producto\.

Ejemplo:

RK\-428

Sistema: 10

Físico: 9

Si existe diferencia, se abre detalle de lotes\.

Entonces:

__Lote__

__Sistema__

__Físico__

A

3

3

B

7

6

Así identificamos dónde está la diferencia\.

Esto evita hacer demasiado pesado cada cierre diario\.

__29\. Diferencias de inventario__

Ejemplo:

Sistema: 10

Conteo físico: 8

Diferencia: \-2

El conteo por sí solo __no debe modificar stock__\.

Debe producir:

Diferencia detectada

Luego:

Encargado revisa

        ↓

Justificación

        ↓

Ajuste aprobado

Solo el ajuste genera Kardex\.

__30\. Ajuste positivo__

Ejemplo:

Sistema: 8

Físico: 10

Diferencia: \+2

Genera:

Entrada por ajuste \+2

Costo:

- Si existe costo promedio → usarlo\.
- Si no existe → solicitar costo autorizado\.

__31\. Ajuste negativo__

Ejemplo:

Sistema: 10

Físico: 8

Diferencia: \-2

Genera:

Salida por ajuste \-2

El sistema:

- Consume lotes\.
- Preferentemente identifica qué lote falta\.
- Valoriza al promedio\.
- Genera Kardex\.

Requiere autorización del encargado o administrador según permisos\.

__32\. Inventario y kits únicos__

Un KIT\_UNICO se comporta igual que un producto simple:

Stock

Lotes

PEPS

Costo promedio

Ubicación

No tiene un tratamiento especial en esta vista\.

__33\. Inventario de kits por componentes__

Para un kit armado al vender:

KIT\-A

2 retenes

1 rodamiento

4 sellos

puede no tener stock propio\.

En su lugar, el sistema puede calcular:

Kits posibles de armar\.

Ejemplo:

Retenes disponibles: 10 → permite 5 kits

Rodamientos: 3 → permite 3 kits

Sellos: 20 → permite 5 kits

Resultado:

KIT\-A

Disponibilidad armable: 3

Esto es muy útil\.

No significa que existan tres kits físicamente armados\.

La interfaz debe diferenciarlos:

Kits armados: 1

Kits adicionales que pueden armarse: 3

__34\. Fórmula de disponibilidad de kit__

Para cada componente:

cantidad\_disponible\_componente

÷

cantidad\_requerida

Se toma el menor entero posible\.

Ejemplo:

Kit:

2 A

1 B

4 C

Disponibilidad:

A: 10 / 2 = 5

B: 3 / 1 = 3

C: 20 / 4 = 5

Kit armable = 3

Esto se calcula dinámicamente\.

__35\. Inventario consolidado de kits__

Debemos diferenciar:

__Kit único__

Se suma como inventario normal\.

__Kit armado__

Se suman las unidades físicamente armadas\.

__Kit potencial desde componentes__

No recomiendo sumarlo al stock consolidado oficial como si fuera existencia física\.

Debe aparecer como:

Disponible para armar: X

porque los mismos componentes podrían participar en otros kits o venderse individualmente\.

__36\. Valor del inventario__

Por producto y sucursal:

Valor inventario =

stock físico valorizable × costo promedio

Pero productos dañados pueden seguir teniendo valor contable hasta que se den de baja\.

Por tanto debemos distinguir:

- Estado físico\.
- Estado vendible\.
- Valor contable\.

Un producto dañado no necesariamente pierde valor automáticamente\.

La baja o deterioro económico será una operación específica\.

__37\. Inventario inicial__

En la migración final se importará:

Sucursal

Producto

Cantidad física

Costo inicial aprobado

El sistema generará:

- Movimiento de inventario inicial\.
- Lote inicial\.
- Costo promedio inicial\.
- Kardex inicial\.

No cargaremos directamente:

stock = 10

sin movimiento\.

Esto garantiza trazabilidad desde el primer día\.

__38\. Alertas derivadas del inventario__

Este proceso alimentará alertas de:

- Stock bajo\.
- Stock agotado\.
- Diferencia de conteo\.
- Lote antiguo\.
- Lote bloqueado\.
- Producto dañado\.
- Stock reservado alto\.
- Stock en tránsito demorado\.
- Diferencia entre stock y lotes\.
- Producto sin costo\.
- Producto sin ubicación\.

__39\. Consistencia entre inventario y lotes__

Regla crítica:

Cantidad física del inventario

=

suma de cantidades físicas de los lotes activos

Ejemplo:

Inventario: 10

Lote A: 3

Lote B: 7

Correcto\.

Si:

Inventario: 10

Lotes:

3 \+ 6 = 9

el sistema debe generar una alerta crítica\.

Esto no debería ocurrir mediante operaciones normales porque ambos se actualizarán dentro de la misma transacción\.

__40\. Consistencia con Kardex__

Otra regla:

Saldo del último movimiento de Kardex

=

Stock contable actual

Esto permitirá detectar cualquier corrupción o error\.

Podemos ejecutar verificaciones programadas\.

__41\. Permisos__

__Administrador__

- Ve toda la empresa\.
- Ve costos\.
- Ve lotes\.
- Puede bloquear lotes\.
- Puede confirmar ajustes\.
- Puede corregir ubicaciones\.

__Encargado__

- Ve inventario de su sucursal\.
- Puede consultar otras sucursales según permiso\.
- Ve costos si está autorizado\.
- Confirma ajustes locales\.
- Gestiona diferencias\.

__Almacenero__

- Ve inventario\.
- Ve lotes\.
- Gestiona ubicaciones\.
- Hace conteos\.
- Puede cambiar lote PEPS con motivo\.
- No confirma ajustes sensibles\.

__Vendedor__

- Ve stock disponible\.
- Busca productos\.
- No modifica inventario\.
- Normalmente no necesita ver lotes ni costos\.

__42\. Pantalla principal de inventario__

La vista debería tener columnas similares a:

__Referencia__

__Producto__

__Disponible__

__Físico__

__Reservado__

__Tránsito__

__Dañado__

__Costo promedio\*__

\* Solo para roles autorizados\.

Filtros:

- Sucursal\.
- Marca\.
- Categoría\.
- Stock bajo\.
- Agotado\.
- Con daño\.
- Con tránsito\.
- Con diferencia\.

__43\. Vista detalle del producto__

Al ingresar a un producto:

RK\-428

ACC BLOQUE DE ORBITROL

mostrar:

__Resumen__

- Disponible\.
- Físico\.
- Reservado\.
- Dañado\.
- Tránsito\.
- Promedio\.
- Valor\.

__Lotes__

- Código\.
- Fecha\.
- Disponible\.
- Ubicación\.
- Estado\.

__Movimientos recientes__

- Entradas\.
- Ventas\.
- Transferencias\.
- Ajustes\.

__Otras sucursales__

- Disponibilidad por tienda\.

__Kit__

Si corresponde:

- Componentes\.
- Kits armables\.

__44\. Historial de inventario__

No debemos depender solo del Kardex para explicar cada cambio\.

El detalle podrá enlazar a:

- Compra\.
- Venta\.
- Salida\.
- Transferencia\.
- Conteo\.
- Ajuste\.
- Armado\.

Cada cantidad tendrá un documento de origen\.

__45\. Reglas funcionales definitivas del Proceso 3__

1. El inventario se controla por producto y sucursal\.
2. Cada producto tiene lotes internos\.
3. El stock disponible no es igual necesariamente al stock físico\.
4. Reservado, dañado y bloqueado no están disponibles para nuevas ventas\.
5. El stock en tránsito no pertenece todavía al disponible del destino\.
6. PEPS determina el orden físico de consumo\.
7. El promedio ponderado determina el costo oficial\.
8. Se puede cambiar la selección PEPS con permisos y motivo\.
9. Stock negativo no está permitido\.
10. Todo ajuste debe tener origen y autorización\.
11. Los conteos no modifican directamente el inventario\.
12. Los productos dañados siguen físicamente registrados hasta su baja\.
13. Las ubicaciones no afectan el Kardex\.
14. Los lotes transferidos conservan trazabilidad de origen\.
15. Offline se trabaja con stock estimado\.
16. Laravel determina el stock oficial\.
17. Las asignaciones PEPS offline son provisionales\.
18. La suma de lotes debe coincidir con el inventario\.
19. El inventario debe coincidir con el último saldo del Kardex\.
20. El kit por componentes puede mostrar disponibilidad armable sin considerarla stock físico\.

__46\. Criterios de aceptación del Proceso 3__

El proceso estará aprobado cuando:

- Cada sucursal tenga inventario independiente\.
- El consolidado sume correctamente las sucursales\.
- Disponible, físico, reservado, dañado y tránsito se distingan correctamente\.
- Una reserva disminuya disponible sin disminuir físico\.
- Un envío pase correctamente a tránsito\.
- Una recepción convierta tránsito en inventario del destino\.
- Los lotes se consuman por PEPS\.
- El cambio manual de lote quede auditado\.
- No sea posible vender más de lo disponible\.
- Dos ventas simultáneas no generen stock negativo\.
- Los conteos produzcan diferencias sin modificar directamente stock\.
- Los ajustes generen Kardex\.
- Las cantidades de lotes coincidan con el stock\.
- La PWA distinga stock oficial de estimado\.
- Los kits por componentes calculen correctamente la cantidad armable\.

__Resultado del Proceso 3__

Queda funcionalmente definido:

__El inventario será administrado por producto y sucursal, con cantidades físicas, disponibles, reservadas, dañadas, bloqueadas y en tránsito\. Todas las existencias tendrán trazabilidad mediante lotes internos, las salidas seguirán PEPS como criterio de rotación física y el valor oficial será determinado mediante promedio ponderado móvil\.__

El siguiente proceso de la Etapa 3 será el __Proceso 4: Ventas__, donde debemos definir en profundidad cliente obligatorio, productos y kits, precios y descuentos, contado/crédito, pagos iniciales, asignación PEPS, costo de venta, cuentas por cobrar, anulaciones y comportamiento online/offline\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 4: Ventas__

Este proceso corresponde principalmente al __Módulo 6: Ventas y salidas__, pero se conecta directamente con:

- Clientes\.
- Inventario\.
- Lotes PEPS\.
- Kardex\.
- Kits\.
- Cuentas por cobrar\.
- Pagos\.
- Cierre diario\.
- PWA y sincronización\.
- Alertas y reportes\.

El objetivo es definir exactamente cómo se registrará una venta desde que el vendedor selecciona al cliente hasta que el sistema descuenta inventario, calcula costos y registra la deuda o el pago\.

__1\. Objetivo funcional__

Registrar ventas de forma controlada, evitando:

- Stock negativo\.
- Precios no autorizados\.
- Ventas duplicadas\.
- Errores en clientes\.
- Inconsistencias entre venta, inventario y Kardex\.
- Cuentas por cobrar incorrectas\.

Toda venta confirmada deberá:

- Estar asociada a un cliente\.
- Validar el stock disponible\.
- Validar precios\.
- Consumir lotes PEPS\.
- Valorizar la salida al costo promedio\.
- Actualizar inventario\.
- Generar Kardex\.
- Crear una cuenta por cobrar si queda saldo\.
- Registrar pagos iniciales si corresponden\.
- Mantener trazabilidad completa\.

__2\. Tipos de venta__

Tendremos tres formas principales:

__Venta al contado__

El cliente paga el total al momento de la venta\.

Total: S/ 500

Pago: S/ 500

Saldo: S/ 0

Estado: PAGADA

__Venta al crédito__

No se paga el total\.

Total: S/ 1,500

Pago inicial: S/ 0

Saldo: S/ 1,500

Estado: PENDIENTE

__Venta con pago inicial parcial__

Total: S/ 1,500

Pago inicial: S/ 500

Saldo: S/ 1,000

Estado: PARCIAL

No necesitaremos tratarla como un tipo completamente distinto; funcionalmente es una venta a crédito con pago inicial\.

__3\. Cliente obligatorio__

Queda definido:

__Toda venta debe estar asociada a un cliente\.__

Incluso al contado\.

Esto permitirá:

- Historial de compras\.
- Devoluciones\.
- Garantías\.
- Créditos\.
- Seguimiento comercial\.
- Reportes por cliente\.

Podemos tener un cliente genérico:

CLIENTE VARIOS

para ventas ocasionales, pero seguirá existiendo una relación con un cliente\.

__4\. Flujo general de una venta__

Iniciar venta

    ↓

Seleccionar cliente

    ↓

Agregar productos o kits

    ↓

Ingresar cantidades

    ↓

Cargar precios sugeridos

    ↓

Modificar precio si corresponde

    ↓

Validar precio mínimo

    ↓

Validar stock disponible

    ↓

Calcular total

    ↓

Seleccionar contado/crédito

    ↓

Registrar pago inicial

    ↓

Confirmar

    ↓

Asignar lotes PEPS

    ↓

Descontar stock

    ↓

Calcular costo de venta

    ↓

Generar Kardex

    ↓

Crear deuda si queda saldo

    ↓

Registrar pago

__5\. Estados de una venta__

Propongo:

- BORRADOR
- PENDIENTE\_AUTORIZACION
- CONFIRMADA
- ANULADA
- RECHAZADA
- CONFLICTO

Y por pago:

- PAGADA
- PARCIAL
- PENDIENTE
- VENCIDA

Una venta puede estar:

Estado venta: CONFIRMADA

Estado financiero: PARCIAL

__6\. Venta en borrador__

Mientras esté en borrador:

- Puede editarse\.
- Puede eliminarse\.
- No afecta inventario\.
- No genera Kardex\.
- No crea deuda\.
- No registra pagos oficiales\.
- No reserva stock inicialmente, salvo que luego implementemos reservas comerciales\.

Al confirmar recién produce efectos\.

__7\. Datos de cabecera de la venta__

Cada venta tendrá:

- Sucursal\.
- Fecha y hora\.
- Cliente\.
- Tipo de venta\.
- Moneda\.
- Documento comercial si aplica\.
- Vendedor\.
- Observaciones\.
- Estado\.
- UUID\.
- Dispositivo\.
- Indicador online/offline\.

__8\. Datos por producto__

Cada línea tendrá:

- Producto\.
- Referencia\.
- Descripción\.
- Cantidad\.
- Precio sugerido\.
- Precio unitario final\.
- Descuento\.
- Subtotal\.
- Costo promedio oficial\.
- Costo total de venta\.
- Lotes asignados\.
- Tipo de producto\.

El vendedor verá precio y cantidad\.

El costo quedará oculto para roles sin permiso\.

__9\. Búsqueda de producto__

El vendedor podrá buscar por:

- Referencia\.
- Alias\.
- Nombre\.
- Marca\.

Al seleccionar:

RK\-428

ACC BLOQUE DE ORBITROL

Stock disponible: 7

Precio sugerido: S/ 180

El sistema no permitirá agregar una referencia inexistente\.

__10\. Validación de stock__

Queda definido:

No se permite vender más que el stock disponible\.

Ejemplo:

Disponible: 2

Solicitado: 3

Resultado:

Venta bloqueada

No habrá autorización para generar stock negativo en V1\.

__11\. Precio de venta__

Cada producto puede tener:

- Precio sugerido\.
- Precio mínimo\.
- Precio local por sucursal\.
- Precio mayorista opcional\.
- Precio minorista opcional\.

El vendedor podrá modificar el precio dentro de los límites permitidos\.

__12\. Precio inferior al mínimo__

Queda definida esta política:

Precio final >= mínimo

→ permitido

Precio final < mínimo

→ requiere autorización

La autorización será principalmente del administrador general\.

El encargado podrá tener permiso limitado según configuración\.

Se guardará:

- Precio sugerido\.
- Precio mínimo vigente\.
- Precio final\.
- Descuento\.
- Usuario que autorizó\.
- Motivo\.

__13\. Descuento máximo__

Como aún no existe una regla de negocio real:

El porcentaje máximo será configurable por rol y/o sucursal\.

No fijaremos un número duro en código\.

Ejemplo futuro:

Vendedor: 5%

Encargado: 10%

Admin: mayor flexibilidad

__14\. Cálculo de la venta__

Por línea:

Subtotal = cantidad × precio final

Total:

Total venta = suma de subtotales

Si luego se incorpora IGV explícito o facturación electrónica, podrá ampliarse\.

Por ahora no debemos mezclar esa futura lógica con el núcleo del inventario\.

__15\. Costo de venta__

El vendedor no ingresa el costo\.

Laravel obtiene:

Costo promedio actual del producto en la sucursal

Ejemplo:

Cantidad: 3

Costo promedio: S/ 110

Costo venta: S/ 330

Si el precio fue:

S/ 180 × 3 = S/ 540

Entonces:

Utilidad bruta = 540 \- 330 = S/ 210

__16\. Asignación PEPS__

Cuando se confirma la venta, el sistema seleccionará los lotes más antiguos\.

Ejemplo:

__Lote__

__Disponible__

A

2

B

5

C

4

Venta:

4 unidades

Asignación:

Lote A → 2

Lote B → 2

El costo oficial no depende del costo original de esos lotes; sigue usando el promedio ponderado\.

__17\. Cambio manual de lote__

El vendedor normalmente no deberá cambiar lotes\.

Si la venta requiere despacho físico desde almacén:

- Almacenero\.
- Encargado\.
- Administrador\.

podrán cambiar la sugerencia PEPS con motivo\.

Se audita:

- Lote recomendado\.
- Lote usado\.
- Usuario\.
- Motivo\.

__18\. Venta de producto simple__

Flujo:

Seleccionar producto

    ↓

Validar stock

    ↓

Validar precio

    ↓

Confirmar

    ↓

Consumir lotes PEPS

    ↓

Valorizar al promedio

    ↓

Actualizar inventario

    ↓

Kardex

__19\. Venta de kit único__

Un KIT\_UNICO se vende igual que un producto simple:

- Tiene stock propio\.
- Tiene lotes\.
- Tiene costo promedio\.
- Se consume por PEPS\.
- Tiene precio propio\.

No descuenta componentes\.

__20\. Venta de kit por componentes__

Aquí el comportamiento cambia\.

Ejemplo:

KIT A

2 retenes

1 rodamiento

4 sellos

Antes de confirmar:

- Validar stock de cada componente\.
- Validar lotes\.
- Calcular kits armables\.
- Calcular costo total del kit\.

Flujo:

Vender kit

    ↓

Consultar versión de composición

    ↓

Validar componentes

    ↓

Consumir PEPS por componente

    ↓

Valorizar cada salida al promedio

    ↓

Sumar costos

    ↓

Generar salida de componentes

    ↓

Registrar venta comercial del kit

__21\. Costo del kit por componentes__

Ejemplo:

__Componente__

__Cantidad__

__Promedio__

__Costo__

Retén

2

20

40

Rodamiento

1

100

100

Sello

4

10

40

Costo del kit:

S/ 180

Si se vende a:

S/ 260

Utilidad:

S/ 80

__22\. Venta al contado__

Flujo financiero:

Total venta

    ↓

Registrar método de pago

    ↓

Pago = total

    ↓

Saldo = 0

    ↓

Estado = PAGADA

Métodos iniciales:

- Efectivo\.
- Transferencia bancaria\.
- Depósito\.
- Yape\.
- Plin\.
- Tarjeta\.
- Otro\.

__23\. Venta al crédito__

Reglas:

- Cliente obligatorio\.
- Fecha de vencimiento obligatoria\.
- Pago inicial puede ser cero\.
- Se crea cuenta por cobrar\.
- Saldo = total \- pago inicial\.

Ejemplo:

Total: S/ 2,000

Pago inicial: S/ 500

Saldo: S/ 1,500

Vencimiento: 20/08/2026

__24\. Estado de deuda__

Automático\.

Saldo = 0

→ PAGADA

Saldo > 0 y hoy <= vencimiento

→ PENDIENTE o PARCIAL

Saldo > 0 y hoy > vencimiento

→ VENCIDA

Si hubo pago parcial:

PARCIAL

hasta que venza; después puede mostrarse:

VENCIDA \- PARCIAL

Internamente podemos separar:

- estado\_pago
- estado\_vencimiento

para no mezclar conceptos\.

__25\. Pago inicial__

El pago inicial se registra como un pago real asociado a la venta\.

No simplemente como un número dentro de la venta\.

Esto es importante para auditoría\.

Ejemplo:

Venta 001

Total: 1,500

Pago \#1:

500 efectivo

Cuenta:

Saldo: 1,000

__26\. Pagos mayores al saldo__

Queda definido:

No se permiten\.

Si saldo:

S/ 300

y usuario ingresa:

S/ 350

se bloquea\.

__27\. Pago de deuda en otra sucursal__

La recomendación queda incorporada como funcionalidad soportada\.

Ejemplo:

Venta original: Juliaca

Pago recibido: Mazuko

Se guardarán ambas sucursales\.

Esto afecta:

- Cuenta por cobrar global\.
- Caja de Mazuko\.
- Reportes de Juliaca\.
- Cierre diario de Mazuko\.

No cambia inventario\.

__28\. Venta y pago son operaciones distintas__

Muy importante:

VENTA

→ afecta inventario y Kardex

PAGO

→ afecta saldo financiero/caja

Un pago posterior no genera movimiento de inventario\.

Esto evita duplicar cifras en cierres y reportes\.

__29\. Anulación antes de confirmar__

Si está en borrador:

Cancelar borrador

No requiere movimiento inverso porque nunca afectó inventario\.

__30\. Anulación de venta confirmada__

No se elimina\.

Flujo:

Solicitar anulación

    ↓

Motivo obligatorio

    ↓

Validar permisos

    ↓

Validar cierre diario

    ↓

Crear reversión

    ↓

Restituir stock/lotes si corresponde

    ↓

Revertir deuda

    ↓

Gestionar pagos

__31\. Quién puede anular__

Queda recomendado:

__Vendedor__

- No anula ventas confirmadas\.

__Encargado__

- Puede anular ventas del mismo día de su sucursal si tiene permiso\.
- Día no cerrado\.

__Administrador__

- Puede anular operaciones de cualquier sucursal\.
- Para días cerrados, solo administrador mediante proceso excepcional\.

__32\. Venta ya pagada y luego anulada__

Aquí hay que diferenciar inventario y dinero\.

Si:

Venta: S/ 500

Pago: S/ 500

y luego se anula:

- Se revierte inventario si producto regresa\.
- La venta queda anulada\.
- El pago no debe desaparecer\.

Se necesitará:

- Devolución de dinero\.
- Nota de crédito/saldo a favor futuro si se implementa\.
- Registro de reembolso\.

Para V1 recomiendo:

Una venta pagada solo puede anularse mediante un proceso de devolución/reembolso autorizado\.

No simplemente “anular”\.

__33\. Devolución parcial__

Ejemplo:

Venta:

5 unidades

Cliente devuelve:

2

El sistema debe permitir:

- Devolver solo 2\.
- Restituir inventario si están en buen estado\.
- Revertir costo correspondiente\.
- Reducir deuda o generar reembolso según estado financiero\.

Esto será desarrollado más a fondo en el proceso de devoluciones\.

__34\. Venta offline__

Queda permitida\.

La PWA tendrá:

- Cliente sincronizado\.
- Catálogo\.
- Precio conocido\.
- Precio mínimo conocido\.
- Stock estimado\.
- Lotes conocidos\.
- Composición de kit conocida\.

Flujo:

Sin internet

    ↓

Crear venta

    ↓

Validar localmente

    ↓

Generar UUID

    ↓

Asignar lotes provisionalmente

    ↓

Guardar en IndexedDB

    ↓

Reducir stock local estimado

    ↓

Estado pendiente

__35\. Venta offline de cliente nuevo__

Como permitiremos registrar cliente básico offline:

Crear cliente local

    ↓

UUID cliente

    ↓

Crear venta vinculada

Al sincronizar:

1. Se intenta crear/identificar cliente\.
2. Después se procesa la venta\.
3. Luego se procesan sus pagos\.

La dependencia debe conservarse\.

__36\. Venta offline al contado__

Se puede registrar:

- Venta\.
- Pago\.
- Método de pago\.

Ambos quedan pendientes\.

Al sincronizar:

1\. Validar/crear cliente

2\. Confirmar venta

3\. Confirmar pago

Si la venta falla, el pago no debe procesarse como pago huérfano\.

__37\. Venta offline a crédito__

Puede permitirse, pero con restricciones\.

Recomiendo:

- Cliente debe existir o crearse localmente\.
- Fecha de vencimiento obligatoria\.
- No consultar “límites de crédito” porque todavía no tenemos ese módulo\.
- La deuda será provisional hasta sincronizar\.

Si al sincronizar hay conflicto de stock, la cuenta por cobrar no se crea\.

__38\. Venta offline de kit único__

Permitida\.

Funciona igual que producto simple\.

__39\. Venta offline de kit por componentes__

Permitida de forma limitada, como ya definimos\.

Condiciones:

- Composición sincronizada\.
- Versión conocida\.
- Todos los componentes disponibles localmente\.
- Ningún componente bloqueado localmente\.

Al sincronizar:

- Laravel valida nuevamente\.
- Puede reasignar lotes\.
- Si falta algún componente, la venta entra en conflicto\.

__40\. Cambio de precio offline__

La PWA utilizará:

- Precio sugerido sincronizado\.
- Precio mínimo sincronizado\.

Si precio final >= mínimo local:

permitir localmente

Pero Laravel volverá a validar\.

Aquí recomiendo una política para evitar problemas:

Si el precio mínimo cambió después de que el dispositivo quedó offline, respetar el precio mínimo vigente al momento de la última sincronización, siempre que la operación tenga evidencia de esa versión\.

Así no castigamos al vendedor por una regla que no pudo conocer\.

Debemos guardar:

precio\_minimo\_version

precio\_minimo\_local

__41\. Venta offline bajo precio mínimo__

No recomiendo permitirla\.

Porque requiere autorización central\.

Entonces:

Offline \+ precio < mínimo local

→ BLOQUEAR

Aunque el vendedor diga que luego pedirá permiso\.

Esto evita conflictos delicados\.

__42\. Sincronización de una venta__

Laravel recibirá:

- UUID\.
- Cliente UUID/ID\.
- Sucursal\.
- Productos\.
- Cantidades\.
- Precios\.
- Versiones de precio\.
- Tipo de venta\.
- Pago inicial\.
- Vencimiento\.
- Asignación PEPS local\.
- Fecha de operación\.

Luego:

1. Verifica duplicidad\.
2. Verifica usuario/dispositivo\.
3. Verifica cliente\.
4. Verifica productos\.
5. Verifica stock oficial\.
6. Reasigna lotes si es necesario\.
7. Determina costo promedio oficial\.
8. Confirma venta\.
9. Genera Kardex\.
10. Crea deuda\.
11. Procesa pago relacionado\.

Todo dentro de una estrategia transaccional segura\.

__43\. Conflicto por stock__

Ejemplo:

PWA cree:

Stock: 5

Venta offline: 4

Servidor al sincronizar:

Stock oficial: 3

Resultado:

CONFLICTO\_STOCK\_INSUFICIENTE

No se confirma parcialmente de forma automática\.

Requiere revisión\.

__44\. Conflicto de lote__

Si el lote sugerido ya no existe, pero hay stock suficiente en otro lote:

Reasignación automática

Esto no debe considerarse conflicto crítico\.

Solo se registra:

Asignación local ≠ asignación oficial

Si no hay stock total suficiente, sí hay conflicto\.

__45\. Duplicidad de venta__

Cada venta tendrá UUID único\.

Si la PWA manda dos veces:

UUID ya procesado

Laravel devolverá la venta existente y no generará otra\.

__46\. Venta y cierre diario__

Una venta confirmada deberá aparecer en el cierre de su sucursal\.

Separaremos:

__Ventas realizadas__

Monto comercial\.

__Cobros recibidos__

Dinero realmente ingresado\.

Ejemplo:

Venta al crédito:

Venta: S/ 1,000

Pago inicial: S/ 200

Cierre:

Ventas del día: S/ 1,000

Cobros del día: S/ 200

Cuenta por cobrar generada: S/ 800

Esto evita confundir venta con flujo de caja\.

__47\. Venta registrada en una sucursal y pago en otra__

Ejemplo:

Venta en Juliaca:

S/ 1,000 crédito

Pago de S/ 300 en Mazuko\.

Cierre Juliaca:

Venta: S/ 1,000

Cierre Mazuko:

Cobro de cuenta por cobrar: S/ 300

El sistema conserva la trazabilidad\.

__48\. Reportes derivados__

De este proceso salen:

- Ventas por día\.
- Ventas por sucursal\.
- Ventas por vendedor\.
- Ventas por cliente\.
- Ventas por producto\.
- Ventas por marca\.
- Kits vendidos\.
- Precio promedio de venta\.
- Descuentos\.
- Autorizaciones\.
- Costo de venta\.
- Utilidad bruta\.
- Ventas al contado\.
- Ventas al crédito\.
- Pagos iniciales\.
- Saldos generados\.
- Ventas offline\.
- Ventas con conflictos\.

__49\. Alertas derivadas__

Podemos generar:

- Venta pendiente de sincronización\.
- Venta con conflicto\.
- Intento bajo precio mínimo\.
- Venta a crédito vencida posteriormente\.
- Precio anormalmente bajo\.
- Venta con margen negativo, si administrativamente se permite\.
- Producto sin stock\.
- Cliente con deuda vencida, opcionalmente al vender\.

__50\. Regla futura sobre clientes morosos__

Actualmente no tenemos una política que impida vender a un cliente con deuda vencida\.

No debemos inventarla\.

Pero podemos preparar:

bloquear\_venta\_si\_cliente\_moroso

con valores:

- No bloquear\.
- Advertir\.
- Requiere autorización\.
- Bloquear\.

Para V1 puede quedar en:

ADVERTIR

si el cliente tiene deuda vencida\.

__51\. Permisos__

__Acción__

__Admin__

__Encargado__

__Vendedor__

__Almacenero__

Crear venta

Sí

Sí

Sí

Opcional

Confirmar venta normal

Sí

Sí

Sí

No

Ver costo

Sí

Según permiso

No

Según permiso

Cambiar precio dentro de límites

Sí

Sí

Sí

No

Autorizar bajo mínimo

Sí

Con permiso

No

No

Anular mismo día

Sí

Con permiso

No

No

Anular día cerrado

Sí

No

No

No

Cambiar lote PEPS

Sí

Sí

No

Sí con motivo

Ver utilidad

Sí

Según permiso

No

No

__52\. Reglas funcionales definitivas del Proceso 4__

1. Toda venta requiere cliente\.
2. No se permite stock negativo\.
3. El vendedor no modifica costos\.
4. El precio es independiente del costo\.
5. El precio puede editarse dentro de límites\.
6. Bajo precio mínimo requiere autorización\.
7. Offline no se permite precio bajo mínimo\.
8. La venta confirmada consume lotes PEPS\.
9. La salida se valoriza al promedio ponderado\.
10. Producto simple y kit único se venden como inventario normal\.
11. Kit por componentes consume sus componentes\.
12. Contado requiere pago total\.
13. Crédito crea cuenta por cobrar\.
14. Pago inicial se registra como pago real\.
15. Pago no puede superar saldo\.
16. Venta y pago son operaciones separadas\.
17. Los pagos no afectan Kardex\.
18. Una venta confirmada no se elimina\.
19. Anulación genera reversión\.
20. Venta pagada requiere devolución/reembolso para revertirse correctamente\.
21. Venta offline es provisional hasta sincronizar\.
22. UUID impide duplicados\.
23. Laravel determina stock, lotes y costo oficiales\.
24. Operaciones dependientes se procesan en orden\.
25. La venta aparece en cierre como venta; los pagos aparecen como cobros\.

__53\. Criterios de aceptación del Proceso 4__

El proceso estará aprobado cuando:

- No sea posible confirmar una venta sin cliente\.
- No sea posible vender más que el stock disponible\.
- El precio mínimo se valide correctamente\.
- Los descuentos queden registrados\.
- El vendedor no pueda modificar costos\.
- PEPS seleccione correctamente lotes\.
- El costo de salida corresponda al promedio ponderado\.
- Los kits simples y compuestos afecten correctamente inventario\.
- Una venta al crédito genere saldo correcto\.
- Los pagos iniciales se registren individualmente\.
- Una venta offline sobreviva al cierre del navegador\.
- Reenviar una venta no la duplique\.
- Una venta offline sin stock oficial suficiente entre en conflicto\.
- Ventas y cobros aparezcan separados en el cierre\.
- Las anulaciones mantengan trazabilidad\.

__Resultado del Proceso 4__

Queda definido funcionalmente:

__El módulo de Ventas registrará operaciones comerciales asociadas obligatoriamente a un cliente, validará precios y stock, descontará existencias mediante PEPS, valorizará salidas mediante promedio ponderado móvil y gestionará ventas al contado o crédito de forma integrada con cuentas por cobrar, pagos, PWA y Kardex\.__

El siguiente proceso es el __Proceso 5: Otras salidas de inventario__, donde definiremos uso interno, daños, pérdidas, devoluciones a proveedor, ajustes negativos, entregas no comerciales, consumo de componentes para kits y sus efectos exactos sobre lotes, costo promedio, Kardex, autorizaciones y funcionamiento offline\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 5: Otras salidas de inventario__

Este proceso pertenece al __Módulo 6: Ventas y salidas__, pero se separa funcionalmente de las ventas porque aquí hablamos de movimientos que reducen inventario __sin ser necesariamente una operación comercial con cliente__\.

Se relaciona directamente con:

- Inventario\.
- Lotes PEPS\.
- Kardex\.
- Kits\.
- Transferencias\.
- Ajustes\.
- Cierre diario\.
- Auditoría\.
- PWA y sincronización\.

__1\. Objetivo funcional__

Registrar de forma controlada cualquier salida física de mercadería que no sea una venta normal\.

Ejemplos:

- Uso interno\.
- Producto dañado dado de baja\.
- Pérdida\.
- Devolución a proveedor\.
- Ajuste negativo\.
- Entrega no comercial\.
- Consumo de componentes para armado de kits\.

Toda salida confirmada deberá:

- Reducir inventario\.
- Consumir lotes\.
- Valorizarse al costo promedio\.
- Generar Kardex\.
- Registrar motivo\.
- Mantener trazabilidad\.
- Respetar permisos\.
- Evitar stock negativo\.

__2\. Tipos de salida__

Quedan definidos los siguientes tipos iniciales\.

__2\.1 Uso interno__

Cuando la empresa utiliza un repuesto para sus propias operaciones\.

Ejemplo:

Producto: FILTRO\-001

Cantidad: 2

Destino: Taller interno

Motivo: Mantenimiento de cargador

No existe venta ni cliente\.

__2\.2 Producto dañado / baja__

Cuando un producto que estaba marcado como dañado finalmente debe retirarse definitivamente del inventario\.

Flujo:

Disponible

   ↓

Dañado

   ↓

Revisión

   ↓

Baja definitiva

La baja sí reduce el stock físico y genera Kardex\.

__2\.3 Pérdida__

Para productos:

- Extraviados\.
- Robados\.
- No encontrados\.
- Faltantes sin causa determinada\.

Debe ser una operación sensible\.

__2\.4 Devolución a proveedor__

Cuando se devuelve físicamente una compra al proveedor\.

Ejemplo:

- Producto defectuoso\.
- Pedido incorrecto\.
- Exceso\.
- Garantía\.
- Producto no conforme\.

Debe relacionarse, siempre que sea posible, con:

- Compra original\.
- Entrada original\.
- Lote original\.
- Proveedor\.

__2\.5 Ajuste negativo__

Resultado de un conteo físico validado\.

Ejemplo:

Sistema: 10

Físico: 8

Diferencia: \-2

Luego de revisión:

Ajuste negativo: 2

__2\.6 Entrega no comercial__

Para casos donde se entrega físicamente el producto pero no corresponde a una venta convencional\.

Ejemplos:

- Muestra\.
- Bonificación\.
- Garantía\.
- Entrega autorizada\.
- Consumo especial\.

Debe indicarse obligatoriamente el motivo\.

__2\.7 Consumo para armado de kit__

Cuando se arma anticipadamente un kit:

Componentes

    ↓

Salida por armado

    ↓

Entrada de kit terminado

Esta salida se genera automáticamente desde la orden de armado\.

No debería registrarse manualmente como una salida común\.

__3\. Estados__

Propuesta:

- BORRADOR
- PENDIENTE\_APROBACION
- CONFIRMADA
- ANULADA
- RECHAZADA
- CONFLICTO

Una salida en borrador:

- No afecta stock\.
- No consume lotes\.
- No genera Kardex\.

Solo una salida confirmada produce efectos\.

__4\. Flujo general__

Crear salida

     ↓

Seleccionar tipo

     ↓

Seleccionar producto

     ↓

Ingresar cantidad

     ↓

Registrar motivo/destino

     ↓

Validar stock

     ↓

Seleccionar o sugerir lotes

     ↓

Solicitar autorización si aplica

     ↓

Confirmar

     ↓

Consumir lotes

     ↓

Reducir inventario

     ↓

Generar Kardex

__5\. Datos de cabecera__

Cada salida tendrá:

- Sucursal\.
- Tipo de salida\.
- Fecha y hora\.
- Responsable\.
- Destino, cuando corresponda\.
- Documento o referencia\.
- Motivo\.
- Observaciones\.
- Usuario creador\.
- Usuario autorizador, si aplica\.
- Estado\.
- UUID\.
- Dispositivo\.

__6\. Datos por producto__

Cada línea tendrá:

- Producto\.
- Referencia\.
- Cantidad\.
- Unidad\.
- Costo promedio oficial\.
- Costo total de salida\.
- Lotes utilizados\.
- Estado físico\.
- Observación opcional\.

El costo no será editable por el usuario operativo\.

__7\. Validación de stock__

Regla ya aprobada:

No se permite stock negativo\.

Ejemplo:

Disponible: 3

Salida solicitada: 5

Resultado:

Operación bloqueada

Tampoco el administrador debe “forzar” stock negativo\.

Debe corregirse primero la causa\.

__8\. Valorización__

Toda salida se valoriza usando el __costo promedio ponderado vigente__\.

Ejemplo:

Cantidad: 4

Costo promedio: S/ 120

Entonces:

Costo de salida: S/ 480

Aunque físicamente se consuman lotes con costos originales distintos\.

__9\. PEPS según tipo de salida__

No todas las salidas usan PEPS de la misma manera\.

__Tipo__

__Selección de lote__

Uso interno

PEPS automático

Entrega no comercial

PEPS automático

Armado de kit

PEPS automático

Producto dañado

Lote específico

Pérdida

Preferentemente lote identificado

Devolución a proveedor

Lote original específico

Ajuste negativo

Según conteo / lote identificado

__10\. Uso interno__

Flujo recomendado:

Seleccionar producto

     ↓

Cantidad

     ↓

Destino interno

     ↓

Motivo

     ↓

PEPS

     ↓

Confirmar

Ejemplo:

Destino: Taller

Equipo: Excavadora 03

Motivo: Reparación hidráulica

Podemos dejar equipo opcional inicialmente\.

Esto puede ser útil en el futuro para saber qué maquinaria consume más repuestos\.

__11\. Producto dañado__

Recordemos que marcar algo como dañado no significa darlo de baja inmediatamente\.

Primero:

Disponible: 10

Se identifica una unidad dañada:

Disponible: 9

Dañado: 1

Físico total: 10

Todavía no hay salida física\.

Después se decide\.

__Si se recupera__

Dañado → Disponible

No genera Kardex de cantidad\.

__Si se da de baja__

Dañado → Salida definitiva

Entonces:

Físico total: 9

y sí genera Kardex\.

__12\. Flujo de baja por daño__

Producto marcado como dañado

        ↓

Revisión del encargado

        ↓

¿Se recupera?

   ├── Sí → volver a disponible

   └── No

        ↓

Solicitar baja

        ↓

Motivo

        ↓

Autorización

        ↓

Salida por daño

Recomendación:

- Encargado puede solicitar y confirmar bajas pequeñas\.
- Administrador interviene en bajas sensibles o de alto valor\.

El umbral económico podrá configurarse posteriormente\.

__13\. Pérdidas__

La pérdida debe tratarse con mayor control que un uso interno\.

Campos adicionales recomendados:

- Tipo de pérdida\.
- Responsable que reporta\.
- Fecha detectada\.
- Lote si se conoce\.
- Observación\.
- Evidencia opcional\.
- Autorización\.

Tipos posibles:

- Extraviado\.
- Robo\.
- Error de inventario\.
- Faltante físico\.
- Otro\.

__14\. Quién puede registrar pérdidas__

__Vendedor__

No\.

__Almacenero__

Puede reportar el faltante\.

No debería confirmarlo definitivamente\.

__Encargado__

Puede revisar y confirmar según permisos\.

__Administrador__

Puede aprobar cualquier pérdida\.

Flujo:

Almacenero reporta

      ↓

Encargado revisa

      ↓

Aprobar / rechazar

      ↓

Salida definitiva

__15\. Devolución a proveedor__

Esta operación debe ser especialmente trazable\.

Flujo:

Buscar proveedor

      ↓

Buscar compra/entrada original

      ↓

Seleccionar producto

      ↓

Seleccionar lote original

      ↓

Cantidad a devolver

      ↓

Motivo

      ↓

Confirmar

__16\. ¿Por qué no PEPS en devolución a proveedor?__

Porque no siempre queremos devolver la mercadería más antigua\.

Ejemplo:

Proveedor entregó:

Lote A → correcto

Lote B → defectuoso

Debe devolverse:

Lote B

aunque A sea más antiguo\.

Por eso:

La devolución a proveedor consume un lote específico relacionado con la compra\.

__17\. Cantidad máxima de devolución__

No se podrá devolver más de la cantidad disponible del lote asociado\.

Ejemplo:

Lote recibido: 10

Ya utilizado: 7

Disponible: 3

Máximo a devolver:

3

Si se desea devolver siete que ya fueron vendidos o consumidos, el sistema no puede inventar esas existencias\.

__18\. Costo de devolución a proveedor__

La salida oficial se valorizará según la política de Kardex vigente, es decir, al costo promedio\.

Pero debemos conservar además:

- Costo original del lote\.
- Costo original de la compra\.

Así los reportes pueden comparar:

Costo original proveedor

vs

Valor contable de salida

La gestión financiera de una nota de crédito del proveedor quedaría fuera del alcance inicial de inventario, salvo que se implemente posteriormente\.

__19\. Ajuste negativo__

Nunca debe existir un botón:

“Cambiar stock de 10 a 8”

El flujo correcto es:

Conteo físico

     ↓

Diferencia \-2

     ↓

Revisión

     ↓

Ajuste negativo

     ↓

Salida de 2

__20\. Ajuste negativo por lote__

Si sabemos dónde está la diferencia:

Lote A

Sistema: 5

Físico: 3

la salida debe consumir:

Lote A → 2

No debemos aplicar PEPS arbitrariamente\.

Si no puede determinarse el lote, se requerirá una política de asignación administrativa\.

Recomendación:

Utilizar PEPS como asignación técnica y registrar “lote físico no identificado”\.

Esto permite mantener consistencia matemática sin afirmar falsamente que se sabe qué lote desapareció\.

__21\. Entrega no comercial__

Debe utilizarse con cuidado para que no se convierta en una forma de saltarse Ventas\.

Ejemplo legítimo:

Producto de cortesía

Muestra

Garantía

Bonificación

Debe exigir:

- Tipo de entrega\.
- Beneficiario/destino\.
- Motivo\.
- Autorización cuando corresponda\.

__22\. Regla importante: venta gratuita vs salida no comercial__

Si una entrega está relacionada con una transacción comercial, conviene conservarla dentro de la venta\.

Ejemplo:

Compra 10

\+ 1 producto bonificado

Podría registrarse dentro de la venta como línea:

Precio: S/ 0

Motivo: Bonificación

con autorización\.

Mientras que una muestra entregada fuera de una venta será:

Salida no comercial

Esta diferenciación facilitará reportes\.

__23\. Consumo para armado de kit__

No deberá ser un formulario independiente\.

El usuario crea:

ORDEN DE ARMADO

Ejemplo:

Armar 5 KIT\-A

El sistema calcula:

10 retenes

5 rodamientos

20 sellos

Al confirmar el armado:

Salida automática de componentes

consumiendo PEPS\.

Después:

Entrada automática del kit terminado

__24\. Atomicidad del armado__

Esto es fundamental\.

No puede ocurrir:

Se descuentan componentes

pero no se crea el kit

Debe ejecutarse como una sola operación transaccional:

BEGIN

Salida componentes

\+

Entrada kit

\+

Lotes

\+

Kardex

COMMIT

Si algo falla:

ROLLBACK

__25\. Costo promedio después de una salida__

Una salida normal __no recalcula el costo promedio__\.

Ejemplo:

Antes:

Stock: 10

Promedio: S/ 120

Salida:

3

Después:

Stock: 7

Promedio: S/ 120

Valor:

7 × 120 = S/ 840

__26\. Caso de stock cero después de una salida__

Ejemplo:

Stock: 3

Promedio: S/ 120

Salida:

3

Resultado:

Stock: 0

Valor: S/ 0

Respecto al promedio, recomiendo conservar internamente el último costo promedio conocido para referencia, pero el valor de inventario es cero\.

La próxima entrada volverá a establecer el promedio conforme a su costo cuando el stock anterior sea cero\.

__27\. Anulación de una salida__

Una salida confirmada no se elimina\.

Flujo:

Salida confirmada

      ↓

Solicitar anulación

      ↓

Motivo

      ↓

Autorización

      ↓

Movimiento inverso

      ↓

Reingreso de unidades

__28\. Restitución de lotes al anular__

Siempre que sea posible, la reversión debe devolver unidades a los lotes que fueron consumidos originalmente\.

Ejemplo:

Salida:

Lote A → 2

Lote B → 1

Anulación:

Lote A ← 2

Lote B ← 1

Esto mantiene la trazabilidad\.

Si ya existen operaciones posteriores que hacen imposible una reversión directa, se requerirá tratamiento administrativo\.

__29\. Día cerrado__

Una salida de un día cerrado no podrá anularse normalmente\.

Regla:

Día abierto

→ encargado autorizado puede anular

Día cerrado

→ administrador general

Y se debe dejar auditoría completa\.

__30\. Salidas offline__

Ya habíamos dejado pendiente qué salidas permitir\.

La recomendación para V1 queda:

__Permitidas offline__

- Uso interno simple\.
- Entrega no comercial sencilla\.
- Reporte de producto dañado\.
- Conteo físico\.

__No confirmar oficialmente offline__

- Ajuste negativo\.
- Pérdida definitiva\.
- Devolución a proveedor\.
- Baja definitiva por daño\.
- Consumo manual para armado\.
- Anulación de salida sincronizada\.

__31\. Producto dañado offline__

Sí permitiría:

Reportar producto como dañado

pero inicialmente como evento pendiente\.

Ejemplo:

RK\-428

1 unidad

Lote local B

Motivo: pieza quebrada

La PWA puede marcarla localmente como no disponible para evitar venderla desde ese mismo dispositivo\.

Al sincronizar Laravel valida el cambio\.

__32\. Uso interno offline__

Puede permitirse porque es similar a una venta en el efecto físico\.

La PWA:

- Verifica stock estimado\.
- Asigna PEPS provisional\.
- Reduce stock estimado\.
- Guarda UUID\.
- Sincroniza después\.

Laravel vuelve a validar\.

Si no hay stock oficial suficiente:

CONFLICTO

__33\. Entrega no comercial offline__

Puede permitirse solo para tipos previamente configurados como:

offline\_permitido = true

Ejemplo:

- Muestra sencilla\.

Pero no:

- Baja de inventario\.
- Pérdida\.
- Ajuste\.

Esto nos da flexibilidad sin hardcodear todas las reglas\.

__34\. Pérdidas offline__

Recomiendo:

Se puede registrar el reporte offline, pero no confirmar la pérdida definitiva\.

Flujo:

Offline

↓

Reportar faltante

↓

Pendiente

↓

Sincronizar

↓

Encargado/Admin revisa

↓

Confirmar ajuste/salida

__35\. Devolución a proveedor offline__

No recomiendo confirmarla offline porque necesitamos verificar:

- Compra\.
- Proveedor\.
- Lote\.
- Cantidad disponible\.
- Estado de documentos\.

Puede prepararse como borrador, pero la confirmación requiere servidor\.

__36\. Auditoría__

Cada salida sensible guardará:

- Creador\.
- Confirmador\.
- Autorizador\.
- Fecha\.
- Dispositivo\.
- Sucursal\.
- Motivo\.
- Lotes\.
- Cantidad\.
- Costo promedio\.
- Documento asociado\.
- Estado anterior/nuevo cuando corresponda\.

__37\. Documentos y numeración__

Las salidas pueden tener una numeración interna\.

Ejemplo:

SAL\-MZK\-2026\-000125

Podemos diferenciar:

USO\-MZK\-\.\.\.

AJU\-MZK\-\.\.\.

BAJ\-MZK\-\.\.\.

DEV\-PROV\-MZK\-\.\.\.

No es obligatorio que el usuario memorice esos prefijos; el sistema los genera\.

__38\. Reportes derivados__

El proceso permitirá reportes de:

- Uso interno\.
- Pérdidas\.
- Bajas por daño\.
- Ajustes negativos\.
- Devoluciones a proveedor\.
- Entregas no comerciales\.
- Salidas por armado\.
- Salidas por usuario\.
- Salidas por sucursal\.
- Salidas por motivo\.
- Costo de salidas\.

__39\. Alertas__

Posibles alertas:

- Pérdida pendiente de aprobación\.
- Ajuste importante\.
- Producto dañado pendiente\.
- Devolución a proveedor pendiente\.
- Salida offline sin sincronizar\.
- Conflicto de stock\.
- Salidas anormalmente frecuentes\.
- Varias pérdidas del mismo producto\.

Estas últimas pueden ser útiles como control administrativo\.

__40\. Permisos__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Uso interno

Sí

Sí

Con permiso

No

Reportar daño

Sí

Sí

Sí

Opcional

Confirmar baja por daño

Sí

Con permiso

No

No

Reportar pérdida

Sí

Sí

Sí

No

Confirmar pérdida

Sí

Con permiso

No

No

Devolución proveedor

Sí

Sí

Preparar

No

Ajuste negativo

Sí

Sí

No

No

Entrega no comercial

Sí

Sí

Con permiso

No

Anular salida

Sí

Limitado

No

No

__41\. Operaciones que requieren autorización__

Recomendación:

__Siempre sensibles__

- Pérdida\.
- Ajuste negativo\.
- Baja definitiva\.
- Anulación de salida confirmada\.

__Dependiendo de permisos__

- Devolución a proveedor\.
- Entrega no comercial\.
- Uso interno de alto valor\.

Podemos posteriormente agregar reglas por importe\.

Ejemplo:

salida > S/ 5,000

→ requiere administrador

Pero no fijaremos ese monto hasta que la empresa defina su política\.

__42\. Relación con cierre diario__

El cierre debe mostrar separadamente:

Ventas

Otras salidas

Dentro de otras salidas:

- Uso interno\.
- Daños\.
- Pérdidas\.
- Ajustes\.
- Devoluciones\.
- Entregas\.
- Armado de kits\.

Ejemplo:

Salidas del día

Uso interno:            S/ 500

Pérdida:                S/ 200

Ajustes:                S/ 100

Devolución proveedor:   S/ 300

__43\. Relación con Kardex__

Cada salida confirmada genera un tipo de movimiento específico\.

Ejemplos:

SALIDA\_USO\_INTERNO

SALIDA\_PERDIDA

SALIDA\_DANO

DEVOLUCION\_PROVEEDOR

AJUSTE\_NEGATIVO

SALIDA\_NO\_COMERCIAL

CONSUMO\_ARMADO\_KIT

No debemos tener simplemente:

SALIDA

para todo, porque perderíamos capacidad de análisis\.

__44\. Reglas funcionales definitivas del Proceso 5__

1. Toda salida debe indicar un tipo\.
2. Una salida confirmada reduce inventario\.
3. Una salida en borrador no afecta stock\.
4. No se permite stock negativo\.
5. Las salidas se valorizan al costo promedio vigente\.
6. Una salida normal no cambia el costo promedio\.
7. Uso interno sigue PEPS\.
8. Entrega no comercial sigue PEPS\.
9. Armado de kit sigue PEPS\.
10. Devolución a proveedor utiliza lote específico\.
11. Daño y pérdida deben intentar identificar el lote real\.
12. Los ajustes nacen de una diferencia validada\.
13. El conteo no modifica directamente el stock\.
14. Los productos dañados se separan del disponible antes de la baja\.
15. Una baja definitiva sí genera salida y Kardex\.
16. Una salida confirmada nunca se elimina\.
17. La anulación genera un movimiento inverso\.
18. Las reversiones intentan restaurar los lotes originales\.
19. Las salidas sensibles requieren autorización\.
20. Las pérdidas pueden reportarse offline, pero no confirmarse definitivamente\.
21. Ajustes negativos no se confirman offline\.
22. Devoluciones a proveedor requieren conexión para confirmarse\.
23. Uso interno puede funcionar offline\.
24. Todo movimiento deja auditoría\.
25. Cada tipo de salida genera un tipo específico de Kardex\.

__45\. Criterios de aceptación del Proceso 5__

El proceso estará aprobado cuando:

- Un uso interno descuente correctamente el inventario\.
- Una baja por daño reduzca físicamente el stock solo cuando se confirme\.
- Un producto simplemente marcado como dañado deje de estar disponible sin desaparecer del inventario\.
- Una pérdida requiera el nivel correcto de autorización\.
- Una devolución a proveedor consuma el lote correcto\.
- Un ajuste negativo provenga de una diferencia validada\.
- No puedan existir cantidades negativas\.
- PEPS funcione en las salidas que correspondan\.
- Una salida mantenga el costo promedio sin recalcularlo\.
- Una anulación restaure correctamente inventario y lotes\.
- Las operaciones offline respeten sus restricciones\.
- Las salidas aparezcan correctamente clasificadas en Kardex y cierre\.

__Resultado del Proceso 5__

Queda funcionalmente definido:

__Las otras salidas de inventario estarán clasificadas según su causa y deberán mantener trazabilidad de cantidades, lotes, costos, usuarios y autorizaciones\. Las salidas habituales podrán seguir PEPS, mientras que movimientos como devoluciones, pérdidas y ajustes utilizarán el lote físico correspondiente cuando pueda identificarse\. Ninguna operación podrá generar stock negativo ni modificar directamente el saldo del inventario\.__

El siguiente trabajo de la Etapa 3 es el __Proceso 6: Transferencias entre sucursales__, donde definiremos solicitud desde destino, despacho desde origen, aprobación, reserva de stock, preparación, PEPS, tránsito, recepción parcial, diferencias, costos, lotes de origen/destino, anulaciones y comportamiento online/offline\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 6: Transferencias entre sucursales__

Este proceso corresponde al __Módulo 7: Transferencias entre sucursales__ y se relaciona directamente con:

- Inventario\.
- Lotes PEPS\.
- Kardex\.
- Compras y entradas\.
- Otras salidas\.
- Kits\.
- Cierre diario\.
- PWA y sincronización\.
- Alertas\.
- Auditoría\.

El objetivo es definir cómo se moverá mercadería de una sucursal a otra __sin duplicar stock, sin perder trazabilidad y manteniendo el costo correcto__\.

__1\. Objetivo funcional__

Permitir que una sucursal envíe productos a otra mediante un proceso controlado que incluya:

- Solicitud\.
- Aprobación\.
- Reserva\.
- Preparación\.
- Envío\.
- Tránsito\.
- Recepción\.
- Registro de diferencias\.
- Actualización de inventarios\.
- Conservación de lotes\.
- Kardex en origen y destino\.

La regla principal será:

Una transferencia no es una venta ni una compra entre sucursales\.

Es un movimiento interno de inventario de la misma empresa\.

__2\. Dos formas de iniciar una transferencia__

Queda definido que soportaremos ambas\.

__2\.1 Solicitud desde la sucursal destino__

Ejemplo:

Mazuko necesita producto de Juliaca\.

Mazuko solicita

    ↓

Juliaca revisa

    ↓

Aprueba

    ↓

Prepara

    ↓

Envía

    ↓

Mazuko recibe

Este será probablemente el flujo más habitual\.

__2\.2 Transferencia iniciada desde origen__

Ejemplo:

Juliaca recibe mercadería y decide distribuirla\.

Juliaca crea transferencia

    ↓

Selecciona Mazuko

    ↓

Prepara

    ↓

Envía

    ↓

Mazuko recibe

Esto permite redistribución preventiva\.

__3\. Estados de la transferencia__

Propongo los siguientes estados definitivos:

1. BORRADOR
2. SOLICITADA
3. APROBADA
4. EN\_PREPARACION
5. PREPARADA
6. ENVIADA
7. EN\_TRANSITO
8. RECIBIDA
9. RECIBIDA\_CON\_DIFERENCIA
10. RECIBIDA\_PARCIAL
11. RECHAZADA
12. CANCELADA
13. CONFLICTO

No todos aparecerán necesariamente como botones visibles al usuario\.

__4\. Flujo principal desde destino__

Destino crea solicitud

        ↓

Selecciona origen

        ↓

Agrega productos y cantidades

        ↓

Enviar solicitud

        ↓

Origen revisa disponibilidad

        ↓

¿Aprueba?

 ┌─────────────┴─────────────┐

 No                          Sí

 ↓                           ↓

Rechazada               Reservar stock

                             ↓

                        Preparar pedido

                             ↓

                        Asignar lotes

                             ↓

                        Confirmar envío

                             ↓

                         En tránsito

                             ↓

                    Destino verifica recepción

                             ↓

                 ¿Cantidad recibida coincide?

                  ┌──────────┴───────────┐

                  Sí                     No

                  ↓                      ↓

              Recibida           Recibida con diferencia

__5\. Flujo iniciado desde origen__

Origen crea transferencia

        ↓

Selecciona destino

        ↓

Agrega productos

        ↓

Validar disponibilidad

        ↓

Preparar

        ↓

Asignar lotes

        ↓

Enviar

        ↓

En tránsito

        ↓

Destino recibe

Puede requerirse aprobación según rol\.

__6\. Datos de cabecera__

Cada transferencia tendrá:

- Código\.
- UUID\.
- Sucursal origen\.
- Sucursal destino\.
- Tipo de inicio:
	- Solicitud del destino\.
	- Envío desde origen\.
- Fecha de solicitud\.
- Fecha de aprobación\.
- Fecha de preparación\.
- Fecha de envío\.
- Fecha de recepción\.
- Usuario solicitante\.
- Usuario aprobador\.
- Usuario que despacha\.
- Usuario receptor\.
- Motivo\.
- Observaciones\.
- Estado\.
- Documento de transporte, si existe\.

__7\. Detalle de productos__

Cada línea tendrá:

- Producto\.
- Referencia\.
- Cantidad solicitada\.
- Cantidad aprobada\.
- Cantidad preparada\.
- Cantidad enviada\.
- Cantidad recibida\.
- Cantidad con diferencia\.
- Lotes asignados\.
- Costo de transferencia oficial\.
- Observaciones\.

Esto es importante porque las cantidades pueden cambiar durante el proceso\.

__8\. Cantidad solicitada vs aprobada__

Ejemplo:

Mazuko solicita:

RK\-428: 10 unidades

Juliaca solo puede enviar:

6 unidades

El encargado podrá aprobar:

Solicitada: 10

Aprobada: 6

No será necesario rechazar toda la transferencia\.

El destino verá claramente la modificación\.

__9\. Validación de stock en origen__

Al aprobar la transferencia:

Stock disponible origen >= cantidad aprobada

Si no:

No se puede aprobar esa cantidad

No se permite stock negativo\.

__10\. Reserva de stock__

Una vez aprobada:

Stock físico: 20

Transferencia aprobada: 5

Resultado:

Físico: 20

Reservado transferencia: 5

Disponible: 15

Esto evita que los cinco productos sean vendidos mientras se prepara el despacho\.

__11\. Momento en que el stock sale del origen__

No recomiendo disminuir físicamente el stock cuando la solicitud es aprobada\.

Debe disminuir cuando se confirma el __envío físico__\.

Flujo:

APROBADA

→ reserva

PREPARADA

→ continúa reservada

ENVIADA

→ sale del inventario físico del origen

→ pasa a tránsito

Esto representa mejor la realidad\.

__12\. Preparación__

Durante preparación:

- Se verifican físicamente productos\.
- Se confirman cantidades\.
- Se asignan lotes\.
- Se registran observaciones\.
- Se puede cambiar la cantidad antes del despacho según permisos\.

Estado:

EN\_PREPARACION

Luego:

PREPARADA

__13\. Asignación PEPS__

En origen, el sistema propondrá los lotes más antiguos\.

Ejemplo:

__Lote__

__Disponible__

A

3

B

5

C

10

Transferencia de seis:

Lote A → 3

Lote B → 3

Si el almacenero utiliza otro lote, deberá indicar motivo\.

__14\. Confirmación del envío__

Al confirmar el despacho:

Inventario origen

    ↓ \- cantidad enviada

Lotes origen

    ↓ \- cantidades asignadas

Transferencia

    ↓ EN\_TRANSITO

Se genera un movimiento de Kardex de tipo:

TRANSFERENCIA\_SALIDA

__15\. Stock en tránsito__

El producto deja de estar disponible en origen pero todavía no aumenta el inventario del destino\.

Ejemplo:

Antes:

Juliaca: 10

Mazuko: 2

Envía cinco\.

Mientras está en tránsito:

Juliaca disponible: 5

En tránsito: 5

Mazuko disponible: 2

Total empresa:

5 \+ 5 en tránsito \+ 2 = 12

No se pierde inventario consolidado\.

__16\. Propiedad del stock en tránsito__

Para reportes debemos poder saber:

- De dónde salió\.
- A dónde va\.
- Qué productos contiene\.
- Cuántas unidades\.
- Desde cuándo está en tránsito\.

Recomiendo considerarlo como una categoría separada del inventario local\.

No debe contar como disponible en ninguna sucursal\.

__17\. Recepción en destino__

El receptor verá:

Transferencia TR\-00045

Origen: Juliaca

Destino: Mazuko

RK\-428

Enviado: 5

Deberá registrar:

Recibido: 5

y confirmar\.

__18\. Recepción correcta__

Si:

Enviado: 5

Recibido: 5

al confirmar:

- Finaliza tránsito\.
- Aumenta inventario del destino\.
- Crea lotes destino\.
- Recalcula promedio ponderado\.
- Genera Kardex de entrada\.
- Estado = RECIBIDA\.

__19\. Recepción parcial__

Ejemplo:

Enviado: 10

Recibido ahora: 6

Puede ocurrir que el envío venga dividido\.

Recomiendo permitir recepción parcial\.

Resultado:

Recibido acumulado: 6

Pendiente: 4

Estado: RECIBIDA\_PARCIAL

Los seis ingresan al inventario\.

Los cuatro continúan en tránsito hasta que:

- Lleguen\.
- Se declare diferencia\.
- Se resuelva la transferencia\.

__20\. Recepción con faltante__

Ejemplo:

Enviado: 10

Físicamente recibido: 8

Faltante: 2

No debemos registrar diez en destino\.

Se registra:

Entrada destino: 8

Diferencia: 2

Estado: RECIBIDA\_CON\_DIFERENCIA

Los dos faltantes quedan pendientes de investigación\.

__21\. Recepción con sobrante__

Ejemplo:

Sistema dice:

Enviado: 10

Destino encuentra:

11

No debe ingresarse automáticamente la unidad extra\.

Registrar:

Recibido conforme: 10

Sobrante físico: 1

La unidad adicional queda:

PENDIENTE DE REGULARIZACION

hasta revisar su origen\.

Podría pertenecer a:

- Otro producto\.
- Otra transferencia\.
- Error de conteo\.
- Error de despacho\.

__22\. Productos diferentes__

Si se envió:

RK\-428

pero llega otro repuesto:

No debe sustituirse automáticamente la referencia\.

Se registra una diferencia:

PRODUCTO\_INCORRECTO

y se revisa\.

__23\. Diferencias de transferencia__

Tipos iniciales:

- Faltante\.
- Sobrante\.
- Producto incorrecto\.
- Producto dañado\.
- Cantidad incorrecta\.
- Lote incorrecto\.
- Otro\.

Cada diferencia tendrá:

- Producto\.
- Cantidad\.
- Tipo\.
- Observación\.
- Evidencia opcional\.
- Usuario reportante\.
- Resolución\.
- Usuario que resuelve\.

__24\. Producto dañado durante traslado__

Ejemplo:

Enviado: 5

Llegaron buenos: 4

Llegó dañado: 1

Podemos registrar:

Inventario destino:

Disponible \+4

Dañado \+1

La cantidad total recibida sigue siendo cinco\.

No es un faltante, sino un problema de estado físico\.

Después se decidirá qué hacer con la unidad dañada\.

__25\. Lotes en destino__

Cuando llega un producto transferido, recomiendo generar un lote local nuevo pero vinculado al lote origen\.

Ejemplo:

Origen:

JUL\-20260701\-001

Destino:

MZK\-20260806\-004

con:

lote\_origen\_id → JUL\-20260701\-001

Esto permite:

- Identificación local\.
- Trazabilidad completa\.
- Transferencias sucesivas\.

__26\. Fecha original del lote__

Debemos conservar:

fecha\_ingreso\_original

Supongamos:

Producto comprado en Juliaca:

01/07/2026

Transferido a Mazuko:

06/08/2026

El lote destino tendrá:

Fecha original: 01/07/2026

Fecha recepción Mazuko: 06/08/2026

Para PEPS recomiendo utilizar la fecha original\.

Así no rejuvenecemos artificialmente la mercadería al moverla de sucursal\.

__27\. Costo de la transferencia__

Este punto es importante\.

La transferencia no debe generar utilidad entre sucursales\.

Por tanto:

El costo de salida en origen será el costo promedio oficial del producto en origen al momento del envío\.

Ejemplo:

Juliaca:

Promedio: S/ 110

Envía cinco:

Valor transferencia: S/ 550

__28\. Costo en destino__

La entrada de transferencia llega valorizada con ese costo de transferencia\.

Supongamos Mazuko ya tiene:

5 unidades

Promedio: S/ 130

Valor: S/ 650

Recibe:

5 unidades × S/ 110 = S/ 550

Nuevo promedio Mazuko:

\(S/ 650 \+ S/ 550\) / 10

= S/ 120

Así cada sucursal mantiene su promedio propio\.

__29\. Costo original del lote__

Podemos conservar además:

costo\_original\_lote

para trazabilidad\.

Pero el costo que entra al promedio de destino será el valor oficial de transferencia definido por el Kardex de origen\.

__30\. El costo no es editable por destino__

La sucursal receptora no debe poder decir:

Costo recibido: S/ 150

si el origen lo transfirió a:

S/ 110

El valor proviene del sistema\.

Esto evita manipulación del inventario\.

__31\. Kardex en origen__

Al envío:

Tipo: TRANSFERENCIA\_SALIDA

Cantidad salida: 5

Costo promedio: S/ 110

Valor salida: S/ 550

Destino: Mazuko

__32\. Kardex en destino__

Al recibir:

Tipo: TRANSFERENCIA\_ENTRADA

Cantidad entrada: 5

Costo entrada: S/ 110

Valor entrada: S/ 550

Origen: Juliaca

Después se calcula el nuevo promedio de destino\.

Ambos movimientos quedan relacionados con la misma transferencia\.

__33\. ¿Qué pasa con el promedio en origen?__

Una salida por transferencia no recalcula el promedio\.

Ejemplo:

Antes:

Stock 10

Promedio 110

Después de enviar cinco:

Stock 5

Promedio 110

__34\. Transferencia de kit único__

Un KIT\_UNICO puede transferirse igual que un producto normal:

- Stock\.
- Lotes\.
- PEPS\.
- Costo promedio\.
- Tránsito\.
- Recepción\.

__35\. Kit prearmado por componentes__

Si el kit fue armado anticipadamente y ya tiene inventario propio:

Se transfiere como kit terminado\.

No hay que volver a mover sus componentes\.

__36\. Kit que solo se arma al vender__

Si no existe físicamente como kit:

No se puede transferir el “kit potencial”\.

Se transfieren sus componentes\.

Ejemplo:

KIT A:

2 retenes

1 rodamiento

Si Mazuko quiere capacidad de armar cinco kits:

Transferir:

10 retenes

5 rodamientos

Luego Mazuko podrá armarlos\.

__37\. Solicitud por kit no armado__

La interfaz puede ayudar\.

Destino solicita:

5 × KIT A

El sistema puede mostrar al origen:

Se requieren:

10 retenes

5 rodamientos

20 sellos

Pero la transferencia real deberá quedar registrada por los productos físicos enviados\.

Esto podría ser una funcionalidad posterior si complica demasiado V1\.

__38\. Cancelación antes del envío__

Mientras esté:

- Borrador\.
- Solicitada\.
- Aprobada\.
- En preparación\.
- Preparada\.

Puede cancelarse según permisos\.

Si había reserva:

Cancelar

   ↓

Liberar reserva

No hay Kardex porque todavía no salió inventario físicamente\.

__39\. Cancelación después del envío__

No debemos permitir:

EN\_TRANSITO → CANCELADA

como si nunca hubiera ocurrido\.

La mercadería ya salió físicamente\.

Se debe resolver mediante:

- Recepción\.
- Devolución al origen\.
- Diferencia\.
- Pérdida\.
- Redirección autorizada, si se implementa\.

__40\. Devolución de transferencia__

Si Mazuko recibe cinco y decide devolver dos a Juliaca:

No se modifica la transferencia original\.

Se crea:

Nueva transferencia:

Mazuko → Juliaca

Cantidad: 2

Esto mantiene trazabilidad\.

__41\. Rechazo de solicitud__

La sucursal origen puede rechazar una solicitud antes de aprobarla\.

Debe indicar:

- Motivo\.
- Usuario\.
- Fecha\.

Ejemplos:

- Sin stock\.
- Stock reservado\.
- Producto no disponible\.
- Solicitud incorrecta\.
- Otra sucursal atenderá\.

__42\. Numeración__

Ejemplo:

TRF\-2026\-000125

O con origen:

TRF\-JUL\-2026\-000125

Recomiendo una numeración central única visible, mientras internamente el UUID garantiza unicidad\.

__43\. Permisos__

__Administrador__

Puede:

- Crear\.
- Aprobar\.
- Rechazar\.
- Enviar\.
- Recibir\.
- Resolver diferencias\.
- Consultar todas las transferencias\.

__Encargado de sucursal__

Puede:

- Solicitar\.
- Crear transferencias desde su sucursal según permiso\.
- Aprobar envíos locales\.
- Confirmar recepción\.
- Gestionar diferencias locales\.

__Almacenero__

Puede:

- Preparar\.
- Seleccionar lotes\.
- Registrar cantidades físicas\.
- Confirmar preparación\.
- No debería aprobar administrativamente\.

__Vendedor__

Recomendación:

- Puede consultar disponibilidad\.
- Puede generar solicitud de transferencia si se habilita\.
- No prepara, envía ni recibe oficialmente\.

__44\. Matriz resumida__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Solicitar

Sí

Sí

Opcional

Opcional

Aprobar

Sí

Sí local

No

No

Preparar

Sí

Sí

Sí

No

Cambiar lote PEPS

Sí

Sí

Sí con motivo

No

Confirmar envío

Sí

Sí

Según permiso

No

Recibir

Sí

Sí

Según permiso

No

Resolver diferencias

Sí

Local limitada

Reportar

No

Cancelar antes de envío

Sí

Según estado

No

No

__45\. Transferencias offline__

Aquí recomiendo una política bastante restrictiva\.

__Offline sí permitir__

- Consultar transferencias sincronizadas\.
- Crear borrador de solicitud\.
- Preparar localmente una transferencia ya aprobada\.
- Registrar conteo de productos/lotes\.
- Registrar observaciones\.

__Offline no permitir oficialmente__

- Aprobar transferencia\.
- Confirmar envío\.
- Confirmar recepción\.
- Resolver diferencias\.
- Cancelar una transferencia ya enviada\.

La razón es que estas operaciones afectan inventario de __dos sucursales__\.

__46\. Solicitud offline__

Sí podemos permitir:

Crear solicitud

Estado:

LOCAL\_PENDIENTE

Al recuperar conexión:

- Se sincroniza\.
- Laravel valida productos\.
- Se crea oficialmente como SOLICITADA\.

No afecta stock mientras está offline\.

__47\. Preparación offline__

Supongamos que la transferencia ya fue aprobada antes de perder internet\.

El almacenero puede:

- Escanear/buscar productos\.
- Registrar lotes seleccionados\.
- Confirmar físicamente cantidades\.

Pero el botón:

Confirmar envío

requiere conexión\.

Esto evita que el servidor ignore una salida que físicamente ya ocurrió\.

__48\. Recepción offline__

Para V1 recomiendo:

Se puede registrar el conteo de recepción localmente, pero la recepción oficial requiere conexión\.

Ejemplo:

Local:

Recibido físicamente: 5

Estado:

RECEPCION\_PENDIENTE

Hasta sincronizar, esas cinco unidades no son stock oficial vendible\.

Es una política conservadora, pero reduce muchos conflictos\.

__49\. Problema operativo real__

Puede ocurrir que llegue la mercadería a una sucursal sin internet y necesiten venderla inmediatamente\.

Es el mismo problema que vimos con compras\.

Para V1 mantendremos:

Mercadería recibida pero no sincronizada no aumenta el stock vendible oficial\.

Podemos dejar preparada una configuración futura para permitir recepción provisional offline\.

__50\. Concurrencia__

Al aprobar y preparar, Laravel debe revalidar stock\.

Ejemplo:

Stock disponible cuando se solicitó: 10

Pero antes de aprobar otra venta consume seis\.

Ahora:

Disponible: 4

Solicitud: 5

La transferencia no puede aprobar cinco\.

Debe:

- Aprobar cuatro\.
- O esperar\.
- O rechazar\.

__51\. Bloqueo durante confirmación de envío__

Al confirmar envío:

1. Iniciar transacción\.
2. Bloquear inventarios involucrados\.
3. Verificar reservas\.
4. Verificar lotes\.
5. Consumir lotes\.
6. Reducir stock físico\.
7. Crear tránsito\.
8. Generar Kardex\.
9. Confirmar transferencia\.
10. Commit\.

Esto evita duplicidades\.

__52\. Diferencia resuelta como pérdida__

Ejemplo:

Origen envió diez\.

Destino recibió ocho\.

Después de investigación se concluye:

2 unidades se perdieron durante transporte

La resolución debe cerrar el tránsito restante mediante una operación específica:

PERDIDA\_EN\_TRANSFERENCIA

con autorización\.

No debe desaparecer simplemente el saldo pendiente\.

__53\. Diferencia por error de despacho__

Ejemplo:

Se documentaron diez pero realmente salieron ocho\.

Si se comprueba:

- Destino recibe ocho\.
- Se corrige la diferencia administrativamente\.
- No se genera pérdida falsa de dos si nunca salieron\.

Esto deberá quedar auditado\.

La resolución de diferencias será un proceso sensible\.

__54\. Transferencia vencida o demorada__

Podemos generar alerta cuando una transferencia permanezca demasiado tiempo:

EN\_TRANSITO

La cantidad de días será configurable\.

Ejemplo futuro:

Más de 3 días

→ alerta

No fijaremos el número aún\.

__55\. Documentos físicos__

Podemos permitir adjuntar:

- Guía\.
- Foto\.
- Comprobante de envío\.
- Foto de recepción\.
- Observaciones\.

No tiene que ser obligatorio inicialmente\.

__56\. Reportes derivados__

El módulo permitirá:

- Transferencias por período\.
- Por origen\.
- Por destino\.
- Por producto\.
- Pendientes\.
- En tránsito\.
- Demoradas\.
- Con diferencias\.
- Cantidades enviadas\.
- Cantidades recibidas\.
- Valor transferido\.
- Lotes transferidos\.
- Usuarios que despacharon/recibieron\.

__57\. Alertas__

- Solicitud pendiente\.
- Transferencia aprobada sin preparar\.
- Preparada sin enviar\.
- En tránsito demasiado tiempo\.
- Recepción parcial\.
- Diferencia pendiente\.
- Producto dañado en transporte\.
- Transferencia con conflicto\.
- Recepción pendiente de sincronización\.

__58\. Relación con cierre diario__

El cierre de cada sucursal debe distinguir:

__Origen__

Transferencias enviadas

__Destino__

Transferencias recibidas

El monto no se considera venta ni ingreso de caja\.

Ejemplo:

Ventas: S/ 10,000

Transferencias enviadas valorizadas: S/ 2,500

No debemos sumar ambas como ventas\.

__59\. Relación con inventario consolidado__

Mientras está en tránsito:

Inventario sucursales

\+

Inventario en tránsito

=

Inventario total empresa

Esto permitirá detectar mercancía que “desaparece” entre locales\.

__60\. Reglas funcionales definitivas del Proceso 6__

1. Una transferencia puede iniciarse desde origen o destino\.
2. Una solicitud no modifica inventario\.
3. Una transferencia aprobada reserva stock\.
4. La reserva reduce disponible, no físico\.
5. El inventario sale físicamente al confirmar envío\.
6. El envío genera Kardex en origen\.
7. La mercadería pasa a tránsito\.
8. El destino no aumenta disponible antes de recibir\.
9. La recepción genera entrada y Kardex en destino\.
10. Se permite recepción parcial\.
11. Las diferencias no se corrigen automáticamente\.
12. Un sobrante no ingresa automáticamente\.
13. Producto dañado puede recibirse como stock dañado\.
14. Los lotes siguen PEPS en origen\.
15. El cambio de lote requiere motivo\.
16. Los lotes destino conservan trazabilidad del origen\.
17. Se conserva fecha original para PEPS\.
18. La salida se valoriza al promedio del origen\.
19. El destino recalcula su propio promedio\.
20. El destino no modifica el costo recibido\.
21. Una transferencia no genera utilidad entre sucursales\.
22. Kit único/prearmado puede transferirse como producto\.
23. Un kit no armado se transfiere mediante componentes\.
24. Una transferencia enviada no puede simplemente cancelarse\.
25. Una devolución se registra como una nueva transferencia\.
26. Diferencias deben resolverse explícitamente\.
27. Operaciones críticas de transferencia requieren conexión en V1\.
28. No se permite stock negativo\.
29. Todo cambio sensible queda auditado\.
30. El inventario en tránsito forma parte del patrimonio total de la empresa, pero no del stock vendible local\.

__61\. Criterios de aceptación del Proceso 6__

Consideraremos aprobado el proceso cuando:

- Una solicitud no modifique stock\.
- Una aprobación reserve correctamente\.
- Una reserva impida vender las mismas unidades\.
- El envío disminuya inventario del origen\.
- La mercadería aparezca en tránsito\.
- No aumente inventario destino antes de recepción\.
- Una recepción correcta aumente exactamente la cantidad recibida\.
- La recepción parcial mantenga saldo pendiente\.
- Las diferencias queden registradas\.
- PEPS asigne correctamente los lotes del origen\.
- El costo del origen se transfiera correctamente\.
- El promedio del destino se recalcule correctamente\.
- Los lotes mantengan su antigüedad original\.
- Una transferencia no aparezca como venta\.
- Una operación enviada no pueda borrarse\.
- Las transferencias offline respeten las restricciones\.
- El consolidado mantenga el total incluyendo tránsito\.

__Resultado del Proceso 6__

Queda funcionalmente definido:

__Las transferencias permitirán mover inventario entre sucursales mediante solicitud o despacho directo, con reserva previa, consumo PEPS en origen, estado de tránsito, recepción controlada, trazabilidad de lotes y valorización mediante el costo promedio oficial del origen\. Las diferencias de recepción deberán resolverse explícitamente y ninguna operación podrá duplicar inventario entre sucursales\.__

El siguiente proceso de la Etapa 3 es el __Proceso 7: Kardex y valorización__, donde formalizaremos completamente el promedio ponderado móvil, tipos de movimientos, saldos, reversiones, orden cronológico, movimientos offline tardíos, cierres históricos, redondeos y reglas para garantizar que Kardex, inventario y lotes siempre coincidan\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 7: Kardex y valorización__

Este proceso corresponde al __Módulo 8: Kardex automático__ y es uno de los componentes más críticos del sistema, porque será la fuente de trazabilidad de todos los movimientos de inventario\.

Se relaciona directamente con:

- Inventario\.
- Compras y entradas\.
- Ventas\.
- Otras salidas\.
- Transferencias\.
- Kits\.
- Cierres diarios\.
- PWA y sincronización\.
- Reportes\.
- Auditoría\.

La regla central será:

__Ninguna operación deberá modificar el stock directamente sin generar el movimiento de Kardex correspondiente\.__

__1\. Objetivo funcional__

El Kardex deberá registrar, para cada:

Producto \+ Sucursal

todas las operaciones que:

- Aumenten stock\.
- Disminuyan stock\.
- Cambien el valor del inventario\.
- Reviertan una operación anterior\.

Permitirá reconstruir:

- Qué ocurrió\.
- Cuándo ocurrió\.
- Quién lo hizo\.
- Desde qué documento\.
- Cuánta mercadería entró o salió\.
- Qué costo se utilizó\.
- Qué saldo quedó\.
- Qué lotes físicos estuvieron involucrados\.

__2\. Método oficial de valorización__

Queda confirmado:

__Promedio ponderado móvil\.__

El costo promedio será independiente por producto y sucursal\.

Por ejemplo:

RK\-428

Juliaca → promedio S/ 110

Mazuko → promedio S/ 125

Huepetuhe → promedio S/ 118

No tendremos un único costo promedio para toda la empresa\.

__3\. Diferencia entre Kardex y lotes__

Debe quedar explícitamente documentado:

__Kardex__

Responde:

¿A qué costo oficial se valoriza el inventario?

Método:

PROMEDIO PONDERADO MÓVIL

__Lotes__

Responden:

¿Qué unidades físicas salieron?

Método:

PEPS / FIFO

Por tanto:

Kardex → valoración económica

Lotes  → trazabilidad física

__4\. Estructura funcional de una línea de Kardex__

Cada movimiento deberá almacenar al menos:

- UUID\.
- Sucursal\.
- Producto\.
- Fecha de operación\.
- Fecha de registro oficial\.
- Tipo de movimiento\.
- Documento origen\.
- Operación relacionada\.
- Cantidad de entrada\.
- Costo unitario de entrada\.
- Valor de entrada\.
- Cantidad de salida\.
- Costo unitario de salida\.
- Valor de salida\.
- Stock posterior\.
- Costo promedio posterior\.
- Valor del saldo posterior\.
- Usuario\.
- Dispositivo\.
- Estado de sincronización\.
- Observaciones\.

__5\. Tipos de movimientos__

No utilizaremos solamente ENTRADA y SALIDA\.

Debemos conocer la causa\.

__Entradas__

- INVENTARIO\_INICIAL
- COMPRA
- DEVOLUCION\_CLIENTE
- TRANSFERENCIA\_ENTRADA
- AJUSTE\_POSITIVO
- ARMADO\_KIT\_ENTRADA
- REVERSO\_SALIDA
- OTRA\_ENTRADA

__Salidas__

- VENTA
- USO\_INTERNO
- SALIDA\_DANO
- PERDIDA
- DEVOLUCION\_PROVEEDOR
- AJUSTE\_NEGATIVO
- TRANSFERENCIA\_SALIDA
- CONSUMO\_ARMADO\_KIT
- SALIDA\_NO\_COMERCIAL
- REVERSO\_ENTRADA

Esto permitirá reportes mucho más precisos\.

__6\. Una operación puede generar varios movimientos__

Ejemplo: venta con tres productos\.

Venta V\-00125

Generará:

Kardex producto A

Kardex producto B

Kardex producto C

Todos vinculados a:

venta\_id = V\-00125

__7\. Entrada con stock existente__

Ejemplo:

Antes:

Stock: 10

Promedio: S/ 100

Valor: S/ 1,000

Compra:

5 unidades × S/ 130

Valor: S/ 650

Nuevo stock:

15

Nuevo valor:

S/ 1,650

Nuevo promedio:

1,650 / 15 = S/ 110

Kardex:

__Entrada__

__Costo__

__Salida__

__Stock__

__Promedio__

__Valor__

5

130

—

15

110

1,650

__8\. Entrada cuando el stock es cero__

Antes:

Stock: 0

Valor: 0

Nueva entrada:

10 × S/ 150

Resultado:

Stock: 10

Promedio: S/ 150

Valor: S/ 1,500

El nuevo costo de entrada pasa a ser el costo promedio inicial\.

__9\. Salida__

Ejemplo:

Antes:

Stock: 15

Promedio: S/ 110

Venta:

4 unidades

Costo oficial de salida:

4 × 110 = S/ 440

Resultado:

Stock: 11

Promedio: S/ 110

Valor: S/ 1,210

Regla:

Una salida normal no modifica el promedio ponderado\.

__10\. Salida total del inventario__

Antes:

Stock: 3

Promedio: S/ 110

Valor: S/ 330

Salida:

3

Resultado:

Stock: 0

Valor: S/ 0

Recomiendo conservar como dato auxiliar:

ultimo\_costo\_promedio = 110

pero el valor oficial del inventario será cero\.

__11\. Nueva entrada después de stock cero__

Supongamos que quedó:

Stock: 0

Luego entra:

5 × S/ 160

El nuevo promedio será:

S/ 160

No debe mezclarse con el promedio histórico de S/ 110\.

__12\. Kardex de transferencia__

__Origen__

Supongamos:

Promedio Juliaca: S/ 110

Cantidad enviada: 5

Kardex Juliaca:

TRANSFERENCIA\_SALIDA

5 × 110 = S/ 550

__Destino__

Mazuko recibe:

5 unidades

Valor recibido: S/ 550

Costo unitario: S/ 110

Ese valor participa en el promedio de Mazuko\.

__13\. Devolución de cliente__

Debe vincularse a la venta original\.

Si el producto salió originalmente con:

Costo oficial: S/ 110

y vuelve en condiciones vendibles:

Entrada devolución: S/ 110

Esto revierte económicamente la salida original de forma coherente\.

__14\. Devolución dañada__

Si vuelve dañada:

- Se registra físicamente\.
- Queda en estado dañado\.
- No aumenta el stock disponible\.
- Su tratamiento económico posterior dependerá de si se recupera o se da de baja\.

La operación debe mantener trazabilidad con la venta original\.

__15\. Ajuste positivo__

Si existe costo promedio actual:

Ajuste \+2

Costo promedio actual: S/ 120

La recomendación es:

Entrada ajuste:

2 × 120

Así el ajuste no distorsiona artificialmente el promedio\.

Si no existe stock ni costo vigente:

El encargado/administrador deberá ingresar un costo inicial validado\.

__16\. Ajuste negativo__

Ejemplo:

Ajuste: \-2

Promedio: S/ 120

Costo de salida:

S/ 240

El promedio permanece:

S/ 120

__17\. Armado de kit__

Supongamos:

Componentes consumidos:

Componente A: S/ 100

Componente B: S/ 50

Componente C: S/ 30

Costo total:

S/ 180

Entonces:

Kardex componentes

→ salidas por S/ 180

y:

Kardex kit terminado

→ entrada por S/ 180

Si existe mano de obra:

\+ S/ 20

entrada del kit:

S/ 200

La diferencia de S/ 20 corresponde al costo adicional de armado\.

__18\. Kardex de kit armado al vender__

Si el kit no existe como stock terminado:

Venta KIT A

no genera una salida física del producto KIT A\.

Genera:

Salida componente 1

Salida componente 2

Salida componente 3

La venta comercial mantiene el concepto de kit, pero el Kardex refleja los productos que realmente salieron\.

__19\. Reversiones__

Queda establecida una regla fundamental:

__Un movimiento confirmado de Kardex nunca se elimina ni se modifica directamente\.__

Si existe un error:

Movimiento original

       ↓

Movimiento de reversión

Ejemplo:

VENTA \-3

se revierte mediante:

REVERSO\_VENTA \+3

Ambos quedan visibles\.

__20\. Relación entre movimiento y reversión__

Debemos guardar:

movimiento\_original\_id

movimiento\_reversion\_id

Esto permitirá mostrar:

Venta V\-125

├── Movimiento original

└── Reversión R\-028

__21\. No borrar historia__

Ni siquiera el administrador general debería tener una opción:

Eliminar movimiento Kardex

Eso destruiría la trazabilidad\.

Sí puede:

- Revertir\.
- Corregir mediante ajuste\.
- Documentar el motivo\.

__22\. Fecha de operación y fecha oficial__

Con PWA necesitamos guardar dos fechas distintas\.

Ejemplo:

Venta realizada offline:

Fecha operación:

06/08/2026 14:30

Sincronización:

06/08/2026 17:00

Por tanto tendremos:

fecha\_operacion

fecha\_registro\_servidor

No debemos perder ninguna\.

__23\. Problema de movimientos offline atrasados__

Este es uno de los puntos más delicados del diseño\.

Ejemplo:

10:00 → compra

12:00 → venta online

14:00 → cierre

A las 16:00 aparece una venta offline realizada realmente a las:

11:00

Si insertáramos esa venta retroactivamente en medio del Kardex y recalculáramos todo, podríamos modificar:

- Costos de ventas posteriores\.
- Márgenes\.
- Saldos históricos\.
- Cierres ya aprobados\.

Esto no es recomendable\.

__24\. Política recomendada para operaciones offline tardías__

Propongo esta política:

__La fecha de operación original se conserva para trazabilidad, pero el efecto oficial se registra cuando Laravel acepta la operación\.__

Ejemplo:

Realizada: 11:00

Sincronizada: 16:00

Kardex oficial:

fecha\_operacion = 11:00

fecha\_registro\_oficial = 16:00

El costo se determina de acuerdo con el estado oficial procesable cuando Laravel confirma la operación\.

Esto evita recalcular todo el historial constantemente\.

__25\. Día aún abierto__

Si la operación offline llega el mismo día y el cierre todavía no fue confirmado:

Laravel podrá incorporarla normalmente antes del cierre\.

Por eso una condición del cierre será:

No debe haber operaciones conocidas pendientes de sincronización\.

__26\. Operación llega después del cierre__

Si el día ya fue cerrado:

Venta realizada offline: ayer 18:00

Sincroniza: hoy 08:00

No recomiendo modificar silenciosamente el cierre de ayer\.

Debe quedar:

CONFLICTO\_DIA\_CERRADO

y requerir:

- Revisión del administrador\.
- Reapertura controlada; o
- Registro regularizador según política\.

La decisión quedará auditada\.

__27\. No recalcular silenciosamente costos históricos__

Regla:

Una operación atrasada no debe cambiar automáticamente el costo oficial de ventas ya cerradas\.

Esto es muy importante para que:

- Reportes emitidos no cambien solos\.
- Márgenes históricos sean estables\.
- Cierres tengan valor\.

__28\. Orden oficial del Kardex__

Para evitar ambigüedad, cada movimiento tendrá una secuencia oficial\.

Ejemplo:

secuencia\_kardex = 00000125

El orden oficial no dependerá solamente de la hora del teléfono\.

La secuencia la asigna PostgreSQL/Laravel al confirmar\.

Orden:

Producto

\+ Sucursal

\+ secuencia oficial

__29\. Por qué no confiar en la hora del dispositivo__

Un dispositivo puede:

- Tener hora incorrecta\.
- Cambiar zona horaria\.
- Estar offline\.
- Manipularse manualmente\.

Por tanto:

fecha\_operacion

es informativa/auditable\.

La secuencia oficial la determina el servidor\.

__30\. Concurrencia del Kardex__

Supongamos:

Stock: 5

Promedio: S/ 100

Dos operaciones llegan simultáneamente:

Compra \+5

Venta \-3

El resultado económico puede depender del orden\.

Laravel debe serializar operaciones del mismo:

producto \+ sucursal

utilizando:

- Transacciones\.
- Bloqueo de inventario\.
- Secuencia oficial\.

De esa forma nunca se procesan dos movimientos incompatibles al mismo tiempo\.

__31\. Ejemplo de orden__

Estado inicial:

5 × 100

__Si primero entra compra__

Compra:

5 × 140

Nuevo promedio:

120

Venta de 3:

Costo salida = 360

__Si primero sale venta__

Venta:

3 × 100 = 300

Luego compra:

Stock restante 2 × 100

\+ 5 × 140

Nuevo promedio diferente\.

Por eso:

El orden de confirmación oficial debe ser determinístico\.

__32\. Transacción por operación__

Una venta deberá confirmar conjuntamente:

Venta

\+ inventario

\+ lotes

\+ Kardex

\+ cuenta por cobrar

\+ pago inicial

No podemos permitir:

Venta guardada

pero Kardex falló

Si una parte crítica falla:

ROLLBACK

__33\. Idempotencia__

Cada operación tendrá UUID\.

Ejemplo:

0198\.\.\.

Si Laravel recibe dos veces exactamente la misma operación:

UUID ya procesado

no genera otro Kardex\.

Devuelve el resultado original\.

Esto es esencial para la PWA\.

__34\. Kardex e inventario__

Debe cumplirse permanentemente:

Saldo último Kardex

=

Cantidad contable del inventario

Si no:

ALERTA CRÍTICA

__35\. Kardex y lotes__

También deberá cumplirse:

Cantidad física inventario

=

Suma cantidades físicas de lotes

Por tanto tendremos tres niveles consistentes:

KARDEX

   ↕

INVENTARIO

   ↕

LOTES

__36\. Diferencia entre cantidad y valor__

Podrían existir casos donde la cantidad coincida pero el valor no\.

Ejemplo:

Stock: 10

Kardex: 10

Lotes: 10

pero:

Valor inventario calculado ≠ valor del Kardex

También debe generar alerta\.

__37\. Precisión monetaria__

No se utilizará float para importes\.

Se utilizarán tipos:

DECIMAL / NUMERIC

Recomendación técnica posterior:

costo\_unitario → NUMERIC\(18,6\)

valor\_total    → NUMERIC\(18,2 o mayor internamente\)

La precisión definitiva se decidirá en la Etapa 4\.

__38\. Redondeos__

Recomiendo:

- Mantener mayor precisión internamente para costos promedio\.
- Redondear solo para visualización y documentos\.

Ejemplo:

Promedio interno:

110\.333333

Pantalla:

S/ 110\.33

Pero el próximo cálculo debe utilizar:

110\.333333

y no 110\.33, siempre que sea práctico\.

Esto evita acumulación de diferencias\.

__39\. Moneda base__

Para Kardex recomiendo utilizar:

__Soles \(PEN\) como moneda base__, suponiendo que esa sea la moneda contable operativa de la empresa\.

Una compra en USD guardará:

USD

tipo de cambio

importe original

importe convertido PEN

El Kardex utiliza el importe convertido\.

Si la empresa confirma otra moneda base, esto quedará configurable\.

__40\. Kardex visible__

Una pantalla de Kardex podría mostrar:

__Fecha__

__Tipo__

__Documento__

__Entrada__

__Costo entrada__

__Salida__

__Costo salida__

__Saldo__

__Promedio__

Filtros:

- Sucursal\.
- Producto\.
- Fecha\.
- Tipo de movimiento\.
- Documento\.
- Usuario\.

__41\. Detalle expandido__

Al abrir un movimiento:

- Documento origen\.
- Usuario\.
- Fecha operación\.
- Fecha servidor\.
- Dispositivo\.
- Lotes\.
- Operación relacionada\.
- Reversión si existe\.
- Observaciones\.
- Estado de sincronización\.

Esto sustituirá la dificultad actual de rastrear de qué hoja del Excel salió una cantidad\.

__42\. Quién puede ver costos__

__Administrador__

Ve:

- Cantidades\.
- Costos\.
- Valores\.
- Promedios\.
- Utilidad relacionada\.

__Encargado__

Según permiso\.

__Almacenero__

Puede ver cantidades y lotes; costos según permiso\.

__Vendedor__

Recomendación:

- No ve costo promedio\.
- No ve costo del Kardex\.
- Puede consultar movimientos comerciales propios si corresponde\.

__43\. ¿Quién puede crear Kardex manualmente?__

Respuesta:

__Nadie\.__

No habrá formulario:

Nuevo movimiento de Kardex

El Kardex siempre será consecuencia de:

- Entrada\.
- Venta\.
- Salida\.
- Transferencia\.
- Ajuste\.
- Kit\.
- Reversión\.

Esto es fundamental\.

__44\. Ajustes administrativos__

Si el administrador necesita corregir inventario:

No edita Kardex\.

Genera:

AJUSTE\_POSITIVO

o:

AJUSTE\_NEGATIVO

con motivo\.

El sistema produce Kardex automáticamente\.

__45\. Corrección de costo__

Puede ocurrir que una compra haya ingresado con costo incorrecto\.

Si todavía está en borrador:

Editar normalmente\.

Si ya está confirmada:

No se debe editar silenciosamente la línea de Kardex\.

Necesitaremos una operación administrativa de corrección\.

Para V1 recomiendo:

- Si no hubo movimientos posteriores: permitir reversión y registro correcto\.
- Si hubo movimientos posteriores: ajuste de valorización autorizado o proceso administrativo especial\.

Este caso deberá restringirse al administrador\.

__46\. Ajuste de valorización sin cantidad__

Puede ser necesario técnicamente soportar un movimiento que:

Cantidad = 0

pero cambie:

Valor inventario

por una corrección excepcional de costo\.

Ejemplo:

AJUSTE\_VALORIZACION

No recomiendo exponerlo a usuarios normales\.

Será una herramienta administrativa\.

__47\. Kardex y cierre diario__

Al confirmar cierre:

El sistema debe guardar una referencia del estado:

- Última secuencia Kardex\.
- Stock\.
- Valor\.
- Operaciones pendientes\.
- Fecha/hora\.

Después del cierre:

Los movimientos anteriores no deben modificarse silenciosamente\.

__48\. Reapertura__

Ya definimos:

- Encargado no reabre\.
- Administrador general sí puede hacerlo excepcionalmente\.

Cuando se reabre:

- Se registra motivo\.
- Usuario\.
- Fecha\.
- Cambios posteriores\.
- Nuevo cierre\.

No se elimina el cierre anterior de auditoría\.

__49\. Reportes basados en Kardex__

El Kardex permitirá generar:

- Kardex por producto\.
- Kardex por sucursal\.
- Inventario valorizado\.
- Costos de venta\.
- Costos de salidas\.
- Valor de transferencias\.
- Evolución del costo promedio\.
- Entradas y salidas por período\.
- Ajustes\.
- Reversiones\.
- Inventario consolidado valorizado\.

__50\. PEPS como reporte separado__

El Kardex puede mostrar una relación con lotes, pero el reporte PEPS será diferente\.

Ejemplo:

__Kardex__

Venta 5

Costo oficial: S/ 110

__Trazabilidad física__

Lote A → 3

Lote B → 2

No debemos confundirlos en los reportes\.

__51\. Auditoría__

Además del Kardex, acciones administrativas deberán quedar en auditoría\.

Ejemplo:

Quién autorizó ajuste

Quién reabrió cierre

Quién anuló venta

Quién modificó lote

Quién resolvió conflicto

El Kardex demuestra el movimiento económico/físico; auditoría explica decisiones administrativas\.

__52\. Integridad histórica__

Una vez confirmado un movimiento:

No se permitirá modificar:

- Cantidad\.
- Costo\.
- Saldo\.
- Tipo\.
- Producto\.
- Sucursal\.

Los cambios se harán mediante nuevas operaciones relacionadas\.

Esto permite confiar en el Kardex como documento histórico\.

__53\. Inventario inicial__

La primera línea de Kardex de cada producto/sucursal migrado será:

INVENTARIO\_INICIAL

Ejemplo:

01/09/2026

Inventario inicial

Entrada: 10

Costo: S/ 120

Saldo: 10

Promedio: 120

Valor: 1,200

No necesitamos reconstruir obligatoriamente todo el historial antiguo del Excel si no es suficientemente confiable\.

__54\. Productos sin inventario inicial__

Si un producto existe en catálogo pero no tiene stock:

Stock = 0

No es necesario crear una línea de Kardex de cero\.

El primer movimiento será cuando realmente exista una entrada\.

__55\. Migración y costo inicial__

El costo inicial debe ser aprobado\.

Si el Excel contiene:

Stock: 10

Costo: 0

no deberíamos asumir automáticamente que el inventario vale cero\.

Debe:

- Validarse un costo\.
- O quedar marcado como pendiente de valorización antes del inicio productivo\.

Idealmente no iniciar inventario vendible con costo desconocido\.

__56\. Conflictos del Kardex__

Posibles alertas:

- Saldo Kardex ≠ inventario\.
- Inventario ≠ lotes\.
- Valor inconsistente\.
- Movimiento duplicado\.
- Secuencia irregular\.
- Operación offline posterior a cierre\.
- Producto sin costo\.
- Ajuste de valorización pendiente\.
- Reversión incompleta\.

__57\. Verificación automática__

Recomiendo ejecutar periódicamente una comprobación automática:

Para cada producto \+ sucursal:

1\. Último saldo Kardex

2\. Inventario actual

3\. Suma de lotes

4\. Valor calculado

Si todo coincide:

OK

Si no:

GENERAR ALERTA

Nunca corregir automáticamente una diferencia importante sin dejar movimiento\.

__58\. Reglas funcionales definitivas del Proceso 7__

1. El Kardex es automático\.
2. Nadie registra líneas manualmente\.
3. Se controla por producto y sucursal\.
4. Promedio ponderado móvil es la valorización oficial\.
5. PEPS se utiliza únicamente para trazabilidad física\.
6. Entradas valorizadas pueden modificar el promedio\.
7. Salidas normales no cambian el promedio\.
8. Stock cero implica valor cero\.
9. Una nueva entrada con stock cero establece nuevo promedio\.
10. Todo movimiento tiene documento origen\.
11. Todo movimiento tiene UUID\.
12. Todo movimiento confirmado es inmutable\.
13. Los errores se corrigen mediante reversión o ajuste\.
14. No se eliminan movimientos\.
15. Las transferencias generan salida en origen y entrada en destino\.
16. Cada sucursal conserva promedio independiente\.
17. Kits generan movimientos según su modalidad\.
18. Se guardan fecha de operación y fecha oficial\.
19. El servidor define la secuencia oficial\.
20. No se confía únicamente en la hora del dispositivo\.
21. Operaciones offline tardías no recalculan silenciosamente historia cerrada\.
22. Una operación que llega después del cierre puede generar conflicto\.
23. Kardex, inventario y lotes deben coincidir\.
24. Se utilizan decimales, nunca float\.
25. La precisión interna debe ser mayor que la visual\.
26. Las operaciones de inventario se procesan transaccionalmente\.
27. UUID garantiza idempotencia\.
28. Los costos son visibles según permisos\.
29. Ajustes de valorización son administrativos\.
30. Los cierres preservan la integridad histórica\.

__59\. Criterios de aceptación del Proceso 7__

Consideraremos aprobado el proceso cuando:

- Cada entrada genere correctamente su Kardex\.
- Cada venta o salida genere correctamente su Kardex\.
- El promedio ponderado se calcule correctamente\.
- Las salidas no modifiquen el promedio\.
- Los movimientos de una sucursal no alteren el promedio de otra\.
- Las transferencias mantengan el valor entre origen y destino\.
- Una reversión no elimine el movimiento original\.
- No exista edición directa de Kardex\.
- El saldo del Kardex coincida con inventario\.
- Inventario coincida con lotes\.
- Una petición duplicada no genere doble movimiento\.
- Dos operaciones simultáneas se procesen en orden seguro\.
- Las operaciones offline conserven fecha real y fecha oficial\.
- Un movimiento posterior a un cierre no cambie silenciosamente el historial\.
- Los reportes puedan reconstruirse desde movimientos confirmados\.

__Resultado del Proceso 7__

Queda funcionalmente definido:

__El Kardex será permanente, automático e inmutable, valorizado mediante promedio ponderado móvil por producto y sucursal\. PEPS se utilizará de manera complementaria para determinar los lotes físicos consumidos\. Todo movimiento tendrá trazabilidad documental, secuencia oficial, costos, saldos y relación con su operación de origen\. Las correcciones se realizarán mediante reversiones o ajustes, nunca alterando el historial confirmado\.__

Con esto queda definida una de las piezas más importantes del sistema\.

El siguiente proceso de la __Etapa 3__ es el __Proceso 8: Kits y armado de productos__, donde vamos a consolidar en un solo diseño funcional los dos modelos que ya acordamos: __kit como producto único__ y __kit compuesto__, incluyendo composición versionada, armado al vender, prearmado, disponibilidad armable, costos, lotes, transferencias, devoluciones, desarmado y comportamiento offline\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 8: Kits y armado de productos__

Este proceso se integra principalmente dentro de:

- Catálogo de productos\.
- Inventario por sucursal\.
- Ventas y salidas\.
- Transferencias\.
- Kardex\.
- PWA y sincronización\.

No será un módulo aislado en la navegación principal, pero sí tendrá lógica propia porque afecta varias áreas del sistema\.

La decisión ya tomada es que soportaremos __dos modelos de kits__:

- __Kit único inventariado__
- __Kit compuesto por componentes__

Además, el kit por componentes podrá funcionar de dos maneras:

- __Armado al momento de vender__
- __Armado anticipado__

__1\. Objetivo funcional__

Permitir vender, almacenar, transferir y valorizar productos que comercialmente se manejan como conjuntos, sin perder trazabilidad de:

- Sus componentes\.
- Sus cantidades\.
- Sus lotes\.
- Sus costos\.
- Su composición histórica\.
- Sus movimientos de inventario\.

El sistema debe saber distinguir entre:

Producto simple

Kit único

Kit por componentes

__2\. Tipos definitivos de producto__

En catálogo tendremos conceptualmente:

SIMPLE

KIT\_UNICO

KIT\_COMPONENTES

__SIMPLE__

Producto normal\.

Ejemplo:

RK\-428

ACC BLOQUE DE ORBITROL

__KIT\_UNICO__

El kit ya existe físicamente como una sola unidad comercial e inventariable\.

Ejemplo:

KIT\-001

KIT COMPLETO DE REPARACIÓN

__KIT\_COMPONENTES__

Es una composición comercial formada a partir de otros productos\.

Ejemplo:

KIT\-REP\-001

2 × RETÉN

1 × RODAMIENTO

4 × SELLO

__3\. Kit único inventariado__

El KIT\_UNICO funcionará casi igual que un producto simple\.

Tendrá:

- Referencia propia\.
- Nombre\.
- Marca\.
- Precio\.
- Precio mínimo\.
- Stock\.
- Lotes\.
- Costo promedio\.
- Kardex\.
- Ubicación\.
- Stock mínimo\.

Ejemplo:

KIT\-001

Stock Mazuko: 5

Costo promedio: S/ 250

Precio sugerido: S/ 350

__4\. Entrada de un kit único__

Si el proveedor entrega el kit armado:

Compra

    ↓

Entrada KIT\-001

    ↓

Crear lote

    ↓

Recalcular promedio

    ↓

Actualizar stock

    ↓

Kardex

No necesitamos conocer sus componentes internos para controlar inventario\.

__5\. Venta de un kit único__

Se comportará como producto normal:

Seleccionar KIT

    ↓

Validar stock

    ↓

Validar precio

    ↓

Consumir PEPS

    ↓

Costo promedio

    ↓

Venta

    ↓

Kardex

Ejemplo:

Stock: 3

Venta: 1

Stock final: 2

__6\. Transferencia de un kit único__

También se mueve como producto normal:

Origen

    ↓

Lote PEPS del kit

    ↓

Transferencia

    ↓

Tránsito

    ↓

Destino

No se separa en componentes\.

__7\. Kit por componentes__

Este tipo tendrá una __receta o composición__\.

Ejemplo:

KIT REPARACIÓN A

Composición:

2 × RET\-001

1 × ROD\-001

4 × SEL\-001

Esta composición es fundamental para:

- Calcular disponibilidad\.
- Validar stock\.
- Calcular costo\.
- Consumir inventario\.
- Armar productos terminados\.

__8\. La composición debe tener versión__

Esta regla queda confirmada\.

Nunca debemos guardar solamente:

Kit A = 2 retenes \+ 1 rodamiento

sin historia\.

Porque mañana puede cambiar a:

Kit A = 3 retenes \+ 1 rodamiento

Las ventas antiguas no pueden cambiar\.

Por eso tendremos:

KIT A

 ├── Versión 1

 └── Versión 2

__9\. Ejemplo de versionado__

__Versión 1__

Vigente desde: 01/01/2026

2 × RETÉN

1 × RODAMIENTO

4 × SELLO

__Versión 2__

Vigente desde: 01/09/2026

3 × RETÉN

1 × RODAMIENTO

4 × SELLO

Una venta de agosto mantiene:

Composición versión 1

aunque consultemos el sistema meses después\.

__10\. Una composición confirmada no debe sobrescribirse__

Si ya fue utilizada:

No se modifica la versión existente\.

Se crea una nueva\.

Esto permitirá reconstruir exactamente:

- Qué componentes se utilizaron\.
- Qué cantidades\.
- Qué costo tenía la venta\.

__11\. Validaciones de composición__

Al crear un kit:

- Debe tener al menos un componente\.
- Las cantidades deben ser mayores a cero\.
- El componente debe existir\.
- El componente debe estar activo\.
- Un kit no puede contenerse directamente a sí mismo\.
- No se permitirán dependencias circulares\.

Ejemplo inválido:

KIT A contiene KIT B

KIT B contiene KIT A

El sistema debe bloquearlo\.

__12\. ¿Puede un kit contener otro kit?__

Técnicamente sí es posible, pero para V1 recomiendo limitarlo\.

La configuración más segura será:

KIT\_COMPONENTES compuesto principalmente por productos simples\.

Y permitir KIT\_UNICO como componente solo si el negocio realmente lo necesita\.

No recomiendo permitir inicialmente:

KIT\_COMPONENTES

 dentro de

 KIT\_COMPONENTES

 dentro de

 KIT\_COMPONENTES

porque aumenta mucho la complejidad de costos y offline\.

__13\. Modalidad 1: armado al momento de vender__

En este caso el kit no existe físicamente antes de la venta\.

Ejemplo:

KIT A

El sistema muestra comercialmente:

Disponible para armar: 3

pero:

Stock físico del KIT A: 0

__14\. Cálculo de disponibilidad armable__

Composición:

KIT A

2 × A

1 × B

4 × C

Stock disponible:

A = 10

B = 3

C = 20

Calculamos:

A → 10 / 2 = 5 kits

B → 3 / 1 = 3 kits

C → 20 / 4 = 5 kits

Resultado:

Máximo armable = 3 kits

El componente limitante es B\.

__15\. No considerar disponibilidad armable como stock físico__

Esto es importante\.

No debemos decir:

Stock KIT A = 3

porque esos componentes todavía existen individualmente\.

Mostraremos:

Kit armado físicamente: 0

Disponible para armar: 3

Esto evita duplicar stock\.

__16\. Venta de kit armado al momento__

Flujo:

Seleccionar KIT A

        ↓

Sistema obtiene composición vigente

        ↓

Cantidad solicitada

        ↓

Calcular componentes requeridos

        ↓

Validar disponibilidad de cada componente

        ↓

Validar precio

        ↓

Confirmar

        ↓

Consumir lotes PEPS de componentes

        ↓

Valorizar cada componente a su promedio

        ↓

Registrar venta comercial del kit

        ↓

Generar Kardex de componentes

No se crea primero stock del kit\.

__17\. Ejemplo completo__

Venta:

2 KIT A

Composición por kit:

2 retenes

1 rodamiento

4 sellos

Necesitamos:

4 retenes

2 rodamientos

8 sellos

Si falta un solo componente:

Venta no puede confirmarse

__18\. Costo del kit armado al vender__

Cada componente utiliza su promedio actual\.

Ejemplo:

__Componente__

__Cantidad__

__Promedio__

__Total__

Retén

2

S/ 20

S/ 40

Rodamiento

1

S/ 100

S/ 100

Sello

4

S/ 10

S/ 40

Costo kit:

S/ 180

Venta:

S/ 260

Utilidad bruta:

S/ 80

__19\. PEPS del kit por componentes__

No existe PEPS del kit abstracto\.

Se ejecuta PEPS para cada componente\.

Ejemplo:

Retenes

Lote A → 2

Rodamiento

Lote B → 1

Sellos

Lote C → 3

Lote D → 1

Esto queda asociado a la línea comercial del kit\.

__20\. Kardex del kit armado al vender__

La venta puede mostrar:

KIT A × 1

pero el Kardex físico tendrá:

SALIDA RETÉN × 2

SALIDA RODAMIENTO × 1

SALIDA SELLO × 4

Cada uno con:

- Su costo promedio\.
- Sus lotes\.
- Su saldo\.

No tendremos una salida ficticia de inventario para KIT A porque ese stock nunca existió\.

__21\. Historial comercial del kit__

Aunque el Kardex sea por componentes, la venta conserva:

Producto comercial vendido: KIT A

Composición usada: versión 3

Precio del kit: S/ 260

Costo componentes: S/ 180

Así tendremos reportes como:

- Kits vendidos\.
- Utilidad por kit\.
- Componentes utilizados\.

__22\. Modalidad 2: armado anticipado__

Aquí el negocio arma físicamente el kit antes de venderlo\.

Entonces sí tendremos:

Stock físico del kit terminado

Flujo:

Orden de armado

        ↓

Seleccionar KIT

        ↓

Cantidad a armar

        ↓

Obtener composición vigente

        ↓

Validar componentes

        ↓

Reservar componentes

        ↓

Preparar

        ↓

Confirmar armado

        ↓

Consumir componentes

        ↓

Crear entrada del kit

        ↓

Crear lote del kit terminado

        ↓

Actualizar Kardex

__23\. Orden de armado__

Tendrá:

- Código\.
- Sucursal\.
- Kit\.
- Versión de composición\.
- Cantidad solicitada\.
- Cantidad armada\.
- Usuario\.
- Fecha\.
- Estado\.
- Componentes requeridos\.
- Componentes realmente utilizados\.
- Mano de obra opcional\.
- Otros costos opcionales\.
- Observaciones\.

__24\. Estados del armado__

Propongo:

- BORRADOR
- PENDIENTE
- EN\_PREPARACION
- ARMADA
- CANCELADA
- CONFLICTO

Mientras esté en borrador:

- No afecta inventario\.

Durante preparación:

- Puede reservar componentes\.

Al confirmar:

- Consume componentes\.
- Crea kit terminado\.

__25\. Reserva de componentes__

Ejemplo:

Tenemos:

10 retenes

La orden requiere:

6

Al reservar:

Físico: 10

Reservado armado: 6

Disponible: 4

Esto evita que una venta normal consuma los componentes destinados al armado\.

__26\. Atomicidad del armado__

Esta operación debe ser transaccional\.

No se puede producir:

Componentes descontados

pero kit no ingresado

Todo debe ocurrir junto:

Consumir componentes

\+

Actualizar lotes

\+

Kardex componentes

\+

Entrada kit

\+

Lote kit

\+

Kardex kit

Si falla algo:

ROLLBACK

__27\. Costo del kit prearmado__

Costo base:

Suma del costo oficial de componentes consumidos

Ejemplo:

Componentes: S/ 180

Si no se considera mano de obra:

Costo de producción del kit = S/ 180

__28\. Mano de obra__

Ya habíamos recomendado dejarla soportada, aunque inicialmente pueda estar en cero\.

La orden puede tener:

Costo componentes: S/ 180

Costo mano de obra: S/ 20

Otros costos: S/ 5

Costo total:

S/ 205

Entrada del kit terminado:

Costo unitario: S/ 205

si se armó una unidad\.

__29\. Varias unidades armadas__

Ejemplo:

5 kits

Costo total componentes \+ extras: S/ 1,000

Costo unitario de entrada:

S/ 200 por kit

Este valor entra al promedio ponderado del kit terminado\.

__30\. El kit prearmado adquiere inventario propio__

Después de confirmar:

KIT A

Stock: 5

Lote: MZK\-KIT\-20260806\-001

Costo original armado: S/ 200

Desde ese momento:

Se comporta como un producto inventariado normal\.

Su venta ya no consume componentes\.

Consume el stock del kit terminado\.

__31\. Muy importante: no descontar componentes dos veces__

Si se prearmó el kit:

Componentes ya salieron en el armado

Cuando se venda:

Solo sale KIT TERMINADO

No volvemos a descontar:

- Retenes\.
- Rodamientos\.
- Sellos\.

__32\. Kit con ambas modalidades__

Un mismo KIT\_COMPONENTES podría configurarse para:

- Armado al vender\.
- Armado anticipado\.

Entonces puede ocurrir:

KIT A

Stock prearmado: 2

Capacidad adicional armable: 3

Al vender una unidad, recomiendo:

Consumir primero stock prearmado disponible\.

Y solo si no hay prearmado suficiente:

Armar al vender usando componentes\.

Esto evita dejar kits ya preparados envejeciendo\.

__33\. Ejemplo de venta mixta__

Cliente solicita:

4 KIT A

Tenemos:

Prearmados: 2

Armables desde componentes: 3

El sistema puede:

2 → stock de kit terminado

2 → componentes

Pero esta mezcla añade complejidad\.

Para V1 recomiendo una decisión más simple en la interfaz:

El vendedor selecciona la modalidad o el sistema prioriza prearmado y completa automáticamente con componentes\.

Mi recomendación es __priorizar prearmado automáticamente__\.

__34\. Costo en una venta mixta__

Si:

2 kits prearmados

Promedio kit = S/ 190

y:

2 armados al vender

Costo componentes actual = S/ 210

la venta comercial puede tener una sola línea:

KIT A × 4

pero internamente tendrá dos componentes de costo:

2 × 190

\+

2 × 210

El sistema deberá guardar el costo real total de esa venta\.

__35\. Lote del kit terminado__

Cada armado anticipado crea un lote\.

Ejemplo:

MZK\-KIT\-20260806\-001

Guardar:

- Orden de armado\.
- Versión de composición\.
- Cantidad\.
- Costo de armado\.
- Fecha\.
- Componentes origen\.
- Lotes de componentes consumidos\.

Esto dará trazabilidad completa\.

__36\. Trazabilidad inversa__

Debe ser posible consultar:

¿De qué componentes salió este kit?

Ejemplo:

KIT lote K001

   ↓

Orden ARM\-0015

   ↓

RETÉN lote R001

RODAMIENTO lote ROD5

SELLO lote S10

Esto será muy útil si después se detecta un problema en un componente\.

__37\. Transferencia de kit prearmado__

Si ya existe físicamente:

KIT A

Lote K001

puede transferirse como kit\.

No se desarma\.

Flujo normal de transferencia:

PEPS kit

→ tránsito

→ recepción

→ lote destino

__38\. Transferencia de kit no armado__

Si solo existe composición:

KIT A armable = 3

ese número no se puede transferir\.

Se deben transferir:

Componentes físicos

El destino después puede armar el kit\.

__39\. Devolución de kit único o prearmado__

Si el cliente devuelve el kit completo y está en buen estado:

Entrada del kit

Se intenta:

- Relacionarlo con venta original\.
- Relacionarlo con lote original\.
- Reincorporarlo al inventario\.

__40\. Devolución de kit armado al vender__

Aquí hay más dificultad\.

El cliente compró:

KIT A

pero físicamente recibió componentes\.

Al devolver:

No debemos asumir automáticamente que devolvió todo\.

La pantalla debe mostrar la composición usada:

2 retenes

1 rodamiento

4 sellos

Y el encargado marca qué recibió realmente\.

Ejemplo:

Retenes recibidos: 2

Rodamiento: 1

Sellos: 3 de 4

Solo eso vuelve a inventario\.

__41\. Devolución parcial de kit__

Debe permitirse porque físicamente puede faltar un componente\.

Se registra:

- Componente\.
- Cantidad vendida\.
- Cantidad devuelta\.
- Estado físico\.
- Lote si se identifica\.

La parte financiera se ajustará según la política de devolución\.

__42\. Desarmado de kit__

Ya definimos que será una operación restringida\.

No será una operación cotidiana del vendedor\.

Aplica principalmente al kit prearmado\.

Flujo:

Seleccionar kit terminado

        ↓

Seleccionar lote

        ↓

Cantidad a desarmar

        ↓

Mostrar composición de origen

        ↓

Registrar componentes recuperados

        ↓

Registrar componentes dañados/perdidos

        ↓

Confirmar

__43\. No asumir recuperación total__

Ejemplo:

Un kit originalmente tenía:

2 retenes

1 rodamiento

4 sellos

Al desarmar puede recuperarse:

2 retenes

1 rodamiento

3 sellos

No debemos crear automáticamente cuatro sellos\.

El usuario autorizado registra la recuperación física real\.

__44\. Costo del desarmado__

Esta operación es contablemente más delicada\.

Para V1 recomiendo:

Mantener el valor contable del kit y distribuirlo entre los componentes recuperados mediante una política controlada\.

Pero como todavía no tenemos una regla del negocio para esa distribución, no debemos fijar una fórmula definitiva\.

Por eso:

- Dejamos preparado el proceso\.
- Lo restringimos a administrador/encargado\.
- La política exacta de revalorización puede cerrarse antes de desarrollar el desarmado\.

Incluso podemos dejar el desarmado como funcionalidad posterior sin afectar el núcleo\.

__45\. Recomendación para V1 sobre desarmado__

La recomendación definitiva sería:

__Diseñar la base de datos para soportarlo, pero no habilitar el desarmado general en la primera versión salvo que el negocio confirme que realmente lo utiliza\.__

Esto reduce riesgos\.

__46\. Modificación de una composición__

Solo usuarios autorizados\.

Flujo:

Abrir KIT

    ↓

Composición actual

    ↓

Crear nueva versión

    ↓

Modificar componentes

    ↓

Validar

    ↓

Activar nueva versión

No se edita la versión histórica\.

__47\. ¿Qué pasa con órdenes en preparación cuando cambia la receta?__

Si:

Orden ARM\-001

Versión kit = V1

y mientras se prepara se crea:

V2

la orden debe seguir usando:

V1

porque esa fue la versión congelada al crearla\.

Las nuevas órdenes usarán V2\.

__48\. ¿Qué pasa con una venta offline cuando cambia la composición?__

La PWA puede tener:

KIT A

Versión 3

Sin internet se registra una venta\.

Mientras tanto servidor publica:

Versión 4

Al sincronizar:

- La venta informa que utilizó versión 3\.
- Laravel valida\.

Recomendación:

Si la versión 3 seguía siendo válida al momento en que el dispositivo la conocía y existen componentes suficientes, se puede aceptar usando esa versión\.

No deberíamos reinterpretar silenciosamente la venta con versión 4\.

__49\. Kit por componentes offline__

Ya definimos que estará permitido con restricciones\.

La PWA debe tener:

- Composición versionada\.
- Componentes\.
- Stock local estimado\.
- Lotes conocidos\.
- Precios\.
- Precio mínimo\.

__50\. Validación offline__

Ejemplo:

KIT A requiere:

A × 2

B × 1

Local:

A disponible estimado: 4

B disponible estimado: 1

Puede venderse:

1 KIT

Después:

A → 2

B → 0

localmente\.

__51\. Sincronización del kit offline__

Laravel debe validar todos los componentes dentro de una sola operación\.

No puede ocurrir:

Retén aceptado

Rodamiento rechazado

y dejar media venta\.

Debe ser:

Todos aceptados

o:

Venta de kit en conflicto

__52\. Conflicto por componente__

Ejemplo:

PWA vendió:

KIT A

requiere:

2 A

1 B

Servidor:

A = 5

B = 0

Resultado:

CONFLICTO\_COMPONENTE\_INSUFICIENTE

No se confirma el kit\.

__53\. Reasignación de lotes offline__

Si existe stock total suficiente pero los lotes locales fueron consumidos:

Laravel reasigna otros lotes PEPS

Esto no requiere intervención humana salvo que cambie la disponibilidad total\.

__54\. Armado anticipado offline__

No recomiendo confirmar oficialmente un armado anticipado offline en V1\.

Porque simultáneamente:

- Consume varios componentes\.
- Genera múltiples Kardex\.
- Crea un producto terminado\.
- Crea lote\.
- Puede incorporar mano de obra\.

Podemos permitir:

Preparar borrador de orden

offline\.

Pero:

La confirmación oficial requiere conexión\.

__55\. Precios de kits__

El precio del kit es comercialmente independiente del costo de componentes\.

Ejemplo:

Costo componentes: S/ 180

Precio sugerido kit: S/ 260

Precio mínimo kit: S/ 230

No debe recalcularse automáticamente el precio de venta cada vez que cambie un componente, salvo que la empresa configure una regla futura\.

__56\. Alerta de margen__

Sin embargo, sí podemos advertir al administrador:

Costo actual kit: S/ 245

Precio mínimo: S/ 230

Resultado:

Precio mínimo está por debajo del costo actual\.

Esto no necesariamente bloquea automáticamente, pero debe generar alerta\.

__57\. Kit sin costo calculable__

Puede ocurrir que uno de sus componentes tenga costo desconocido\.

Entonces:

Costo kit = incompleto

Recomendación:

No permitir venta oficial del kit si no puede calcularse su costo de manera válida, salvo política administrativa especial\.

Especialmente durante la migración debemos validar esto\.

__58\. Componente desactivado__

Si un componente de la composición vigente es desactivado:

- La composición histórica se mantiene\.
- El kit debe quedar marcado para revisión\.
- No se debería permitir nuevas ventas/armados hasta tener una versión vigente válida\.

No modificamos automáticamente la receta\.

__59\. Stock mínimo de kit por componentes__

Para kit no armado, un stock mínimo tradicional no tiene mucho sentido\.

Podemos manejar:

mínimo de kits armables

Ejemplo:

Alerta si capacidad armable < 2

Esta funcionalidad puede incorporarse posteriormente\.

Para kit prearmado sí puede existir:

stock mínimo físico

normal\.

__60\. Reportes de kits__

Tendremos potencialmente:

- Kits vendidos\.
- Kits únicos vendidos\.
- Kits por componentes vendidos\.
- Kits armados\.
- Kits desarmados\.
- Componentes consumidos\.
- Costo de armado\.
- Utilidad de kits\.
- Disponibilidad armable\.
- Kits prearmados por sucursal\.
- Versiones de composición\.
- Lotes de kits\.
- Trazabilidad componente → kit\.
- Trazabilidad kit → componentes\.

__61\. Alertas de kits__

- Kit sin componentes suficientes\.
- Kit sin costo\.
- Composición sin versión activa\.
- Componente inactivo\.
- Kit con precio mínimo debajo del costo\.
- Orden de armado pendiente\.
- Orden de armado incompleta\.
- Kit antiguo prearmado\.
- Diferencia entre componentes reservados y orden\.
- Conflicto de kit offline\.

__62\. Permisos__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Ver composición

Sí

Sí

Sí

Según necesidad

Crear kit

Sí

Con permiso

No

No

Cambiar composición

Sí

Con permiso

No

No

Crear orden de armado

Sí

Sí

Sí/según permiso

No

Confirmar armado

Sí

Sí

Con permiso

No

Vender kit

Sí

Sí

No

Sí

Cambiar componentes en venta

No libremente

No libremente

No

No

Desarmar

Sí

Con permiso

No

No

Ver costo del kit

Sí

Según permiso

Según permiso

No

__63\. El vendedor no modifica la composición durante una venta__

Muy importante\.

No debe poder hacer:

KIT A normalmente:

2 retenes

Hoy voy a poner:

1 retén

Si necesita una composición diferente:

Debe existir otra versión autorizada o tratarse como productos individuales\.

Esto mantiene el control\.

__64\. Venta de componentes separados__

Nada impide que el mismo cliente compre individualmente:

2 retenes

1 rodamiento

4 sellos

pero eso sería una venta de productos simples, no una venta del KIT A\.

Es importante para reportes\.

__65\. Auditoría__

Se registrará:

- Quién creó un kit\.
- Quién creó una composición\.
- Quién activó una nueva versión\.
- Quién creó orden de armado\.
- Quién confirmó armado\.
- Qué lotes se consumieron\.
- Costos usados\.
- Quién desarmó\.
- Qué componentes se recuperaron\.
- Conflictos y resoluciones\.

__66\. Reglas funcionales definitivas del Proceso 8__

1. Existen productos SIMPLE, KIT\_UNICO y KIT\_COMPONENTES\.
2. Un kit único tiene stock y Kardex propios\.
3. Un kit por componentes tiene composición versionada\.
4. Las composiciones históricas no se sobrescriben\.
5. No se permiten dependencias circulares\.
6. El kit por componentes puede armarse al vender\.
7. También puede prearmarse\.
8. La disponibilidad armable no es stock físico\.
9. El armado al vender consume componentes\.
10. Cada componente utiliza PEPS propio\.
11. Cada componente sale a su costo promedio\.
12. El costo del kit es la suma de los costos de los componentes utilizados\.
13. El armado anticipado consume componentes y crea stock terminado\.
14. El kit prearmado obtiene lote, promedio y Kardex propios\.
15. Una venta de kit prearmado no vuelve a consumir componentes\.
16. Si existen kits prearmados, se recomienda consumirlos antes de armar nuevos al vender\.
17. Las órdenes de armado congelan la versión de composición\.
18. El armado debe ser transaccional\.
19. La mano de obra se soportará como costo opcional\.
20. Los kits terminados pueden transferirse normalmente\.
21. Los kits no armados se transfieren mediante sus componentes\.
22. La devolución de un kit por componentes debe validar qué piezas regresaron realmente\.
23. El desarmado será restringido y posiblemente diferido para V1\.
24. El vendedor no modifica composiciones\.
25. El kit puede venderse offline con reglas especiales\.
26. El servidor revalida todos los componentes\.
27. Una venta de kit es atómica: todos los componentes se aceptan o ninguno\.
28. Los lotes offline son provisionales\.
29. Un cambio futuro de receta no modifica ventas históricas\.
30. Toda operación de kit queda auditada\.

__67\. Criterios de aceptación del Proceso 8__

El proceso estará aprobado cuando:

- Un kit único se comporte correctamente como producto inventariado\.
- Un kit compuesto calcule correctamente su disponibilidad armable\.
- El sistema no duplique stock por contar componentes y kit potencial\.
- Una venta de kit consuma exactamente la composición versionada\.
- PEPS funcione individualmente para cada componente\.
- El costo del kit se calcule a partir de los costos promedio vigentes\.
- Cambiar una composición no modifique ventas anteriores\.
- Un armado anticipado consuma componentes y genere exactamente el stock de kit correspondiente\.
- Un kit prearmado tenga lote y Kardex\.
- No se descuenten componentes nuevamente al vender un kit prearmado\.
- Las transferencias diferencien kit terminado de kit potencial\.
- Las devoluciones identifiquen componentes reales\.
- Una venta offline de kit no pueda confirmarse parcialmente\.
- Las operaciones queden correctamente auditadas\.

__Resultado del Proceso 8__

Queda funcionalmente definido:

__El sistema soportará kits inventariados como productos independientes y kits formados a partir de componentes\. Los kits compuestos tendrán recetas versionadas y podrán ensamblarse al momento de la venta o anticipadamente\. El consumo físico de componentes seguirá PEPS, su valorización utilizará promedio ponderado móvil y los kits prearmados adquirirán inventario, lotes y Kardex propios\.__

Con esto cerramos la lógica central de __Kits y Armado__\.

El siguiente proceso de la __Etapa 3__ es el __Proceso 9: Clientes y cuentas por cobrar__, donde definiremos registro de clientes, identificaciones, duplicados, ventas al crédito, fechas de vencimiento, estados de deuda, historial, mora, pagos en otras sucursales, clientes offline y reglas para clientes con deudas vencidas\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 9: Clientes y cuentas por cobrar__

Este proceso corresponde al __Módulo 12: Clientes, pagos y cuentas por cobrar__ y se relaciona directamente con:

- Ventas\.
- Pagos\.
- Cierre diario\.
- Reportes\.
- Alertas\.
- PWA y sincronización\.

Actualmente esta lógica __no existe estructurada en el Excel__, por lo que aquí estamos diseñando el proceso desde cero, pero alineado con las reglas que ya definimos\.

__1\. Objetivo funcional__

Permitir registrar clientes y controlar correctamente:

- Ventas al contado\.
- Ventas al crédito\.
- Pagos iniciales\.
- Saldos pendientes\.
- Fechas de vencimiento\.
- Deudas vencidas\.
- Historial de pagos\.
- Pagos realizados en otra sucursal\.
- Estado de cada cuenta por cobrar\.

La regla principal será:

__Toda venta debe estar asociada a un cliente\.__

__2\. Tipos de cliente__

Para la primera versión no necesitamos una clasificación compleja\.

Podemos manejar:

- Persona natural\.
- Empresa\.
- Cliente genérico\.

__Cliente genérico__

Podemos crear un registro como:

CLIENTE VARIOS

para ventas al contado donde no se necesite identificar a la persona\.

Pero técnicamente seguirá siendo un cliente registrado\.

__3\. Datos del cliente__

__Obligatorios mínimos__

- Tipo de cliente\.
- Nombre o razón social\.
- Estado\.

__Cuando tenga documento__

- Tipo de documento\.
- Número de documento\.

__Datos adicionales__

- Teléfono\.
- Dirección\.
- Correo\.
- Nombre comercial\.
- Observaciones\.
- Fecha de registro\.
- Sucursal donde se registró inicialmente\.

__4\. Documento del cliente__

Podremos manejar inicialmente:

- DNI\.
- RUC\.
- Carné de extranjería\.
- Pasaporte\.
- Otro\.

El sistema no debe obligar a todos los clientes a tener RUC o DNI si el negocio atiende clientes informales, salvo que posteriormente la empresa indique lo contrario\.

Pero para una venta a crédito recomiendo:

__Exigir cliente identificado y no permitir CLIENTE VARIOS\.__

__5\. Cliente obligatorio para crédito__

Queda definida esta regla:

Venta al contado

→ Cliente registrado o CLIENTE VARIOS

Venta a crédito

→ Cliente identificado obligatorio

Por ejemplo, esto no sería válido:

Cliente: CLIENTE VARIOS

Tipo: Crédito

Saldo: S/ 1,500

Debe bloquearse\.

__6\. Duplicados de clientes__

Antes de crear un cliente se buscará por:

- Documento\.
- Nombre\.
- Teléfono\.
- Razón social\.

Si existe el mismo documento:

RUC: 20123456789

no debe crearse otro cliente automáticamente\.

El sistema mostrará:

Ya existe un cliente con este documento\.

__7\. Clientes sin documento__

Aquí sí pueden existir personas con nombres similares\.

Ejemplo:

JUAN PEREZ

JUAN PÉREZ

El sistema mostrará posibles coincidencias, pero no deberá fusionarlos automáticamente\.

Esto sigue la misma filosofía que definimos para las referencias de productos\.

__8\. Estado del cliente__

Propongo:

- ACTIVO
- INACTIVO
- BLOQUEADO

__Activo__

Puede realizar nuevas compras\.

__Inactivo__

No se utiliza normalmente en operaciones nuevas, pero conserva historial\.

__Bloqueado__

Puede consultarse, pero nuevas ventas pueden quedar restringidas\.

Ejemplos de bloqueo futuro:

- Problemas administrativos\.
- Crédito suspendido\.
- Datos por validar\.

__9\. No eliminar clientes con historial__

Si un cliente tiene ventas o pagos:

No se elimina físicamente\.

Se cambia su estado\.

Esto permite mantener:

- Ventas históricas\.
- Deudas\.
- Pagos\.
- Devoluciones\.
- Reportes\.

__10\. Cuenta por cobrar__

No debemos manejar la deuda únicamente como un número dentro del cliente\.

Cada venta con saldo generará una __cuenta por cobrar individual__\.

Ejemplo:

Cliente: Empresa ABC

Venta V\-001:

Saldo S/ 1,000

Venta V\-010:

Saldo S/ 500

Total cliente:

S/ 1,500

Pero seguimos sabiendo a qué venta pertenece cada deuda\.

__11\. Creación de cuenta por cobrar__

Una cuenta se genera automáticamente cuando:

Total venta > pagos registrados al confirmar

Ejemplo:

Venta: S/ 2,000

Pago inicial: S/ 500

Se crea:

Cuenta por cobrar:

Total original: S/ 2,000

Pagado: S/ 500

Saldo: S/ 1,500

__12\. Venta al contado__

Ejemplo:

Venta: S/ 500

Pago: S/ 500

Saldo: S/ 0

No necesitamos mantener una cuenta por cobrar activa\.

Podemos registrar financieramente:

Estado: PAGADA

pero no aparecerá en la bandeja de deudas pendientes\.

__13\. Venta al crédito sin pago inicial__

Total: S/ 1,500

Pago inicial: 0

Saldo: S/ 1,500

Estado inicial:

PENDIENTE

__14\. Venta con pago parcial__

Total: S/ 1,500

Pago inicial: S/ 500

Saldo: S/ 1,000

Estado:

PARCIAL

__15\. Fecha de vencimiento__

Para toda venta con saldo pendiente:

La fecha de vencimiento será obligatoria\.

Ejemplo:

Venta: 06/08/2026

Vencimiento: 20/08/2026

No debemos crear una deuda indefinida sin fecha, salvo que la empresa posteriormente solicite una política distinta\.

__16\. Estado de deuda__

Recomiendo separar dos conceptos internamente\.

__Estado de pago__

- Pendiente\.
- Parcial\.
- Pagada\.
- Anulada\.

__Estado de vencimiento__

- Vigente\.
- Vencida\.

Así podemos representar correctamente:

Pago: PARCIAL

Vencimiento: VENCIDA

En pantalla:

__Vencida – pago parcial__

Esto es más preciso que tener una única columna de estado\.

__17\. Cuándo se considera vencida__

Ya quedó definida la política:

Una deuda se considera vencida automáticamente cuando tiene saldo pendiente y la fecha actual supera su fecha de vencimiento\.

Ejemplo:

Vencimiento: 10/08/2026

Saldo: S/ 500

El 11/08:

Estado de vencimiento: VENCIDA

No requiere que un empleado cambie el estado manualmente\.

__18\. No generar intereses automáticamente en V1__

No tenemos información de que la empresa cobre:

- Intereses\.
- Mora\.
- Penalidades\.

Por tanto:

En la primera versión una deuda vencida conserva el mismo saldo\.

Solo cambia su estado\.

Si luego se desea cobrar mora, será una regla comercial adicional\.

__19\. Historial del cliente__

Al abrir un cliente, podremos mostrar:

__Datos generales__

- Documento\.
- Nombre\.
- Teléfono\.
- Dirección\.

__Resumen financiero__

Total pendiente

Total vencido

Número de deudas activas

Último pago

__Historial__

- Ventas\.
- Pagos\.
- Devoluciones\.
- Anulaciones\.
- Deudas\.

__20\. Ejemplo de ficha de cliente__

EMPRESA ABC S\.A\.C\.

RUC: 20123456789

Pendiente total: S/ 3,500

Vencido: S/ 1,000

Cuentas:

V\-00125   S/ 1,000   VENCIDA

V\-00140   S/ 2,500   VIGENTE

__21\. Venta nueva a cliente con deuda vencida__

Aquí no tenemos una política empresarial confirmada\.

Por tanto no debemos bloquearlo de forma rígida\.

La recomendación para V1 es:

Cliente tiene deuda vencida

        ↓

Mostrar advertencia

Ejemplo:

Este cliente tiene S/ 1,000 de deuda vencida\.

Pero la venta puede continuar\.

Más adelante podrá configurarse:

- Solo advertir\.
- Requerir autorización\.
- Bloquear crédito\.
- Bloquear todas las ventas\.

__22\. Diferencia entre contado y crédito para cliente moroso__

Aunque posteriormente se bloquee crédito, puede seguir teniendo sentido permitir una venta al contado\.

Por eso una futura política debería poder ser:

Tiene deuda vencida

→ Venta contado: permitir

→ Nueva venta crédito: autorización

Dejaremos el sistema preparado para ello\.

__23\. Límite de crédito__

Actualmente no tenemos información de límites por cliente\.

Por tanto:

No implementaremos un límite obligatorio de crédito en la primera versión\.

Pero podemos dejar preparado un campo opcional:

limite\_credito

para una futura política\.

__24\. Pago de una deuda__

El pago será una operación independiente\.

Flujo:

Buscar cliente

     ↓

Ver cuentas pendientes

     ↓

Seleccionar deuda

     ↓

Mostrar saldo

     ↓

Ingresar monto

     ↓

Método de pago

     ↓

Confirmar

     ↓

Actualizar saldo

El pago no afecta inventario ni Kardex\.

Lo desarrollaremos con mayor detalle en el siguiente proceso\.

__25\. Pago parcial__

Ejemplo:

Saldo: S/ 1,500

Pago: S/ 500

Resultado:

Nuevo saldo: S/ 1,000

Estado pago: PARCIAL

__26\. Pago total__

Saldo: S/ 1,000

Pago: S/ 1,000

Resultado:

Saldo: S/ 0

Estado: PAGADA

__27\. Pago superior al saldo__

Ya definido:

No se permitirá\.

Ejemplo:

Saldo: S/ 500

Pago ingresado: S/ 600

Resultado:

El pago supera el saldo pendiente\.

No manejaremos saldos a favor en V1\.

__28\. Cliente con varias deudas__

Ejemplo:

V\-001 → S/ 300

V\-002 → S/ 500

V\-003 → S/ 200

Cliente quiere pagar:

S/ 600

Aquí hay dos opciones posibles\.

__Opción A: seleccionar deuda por deuda__

V\-001 → 300

V\-002 → 300

__Opción B: sistema reparte automáticamente__

Por antigüedad\.

Para V1 recomiendo:

__Permitir que el usuario seleccione explícitamente las deudas que está pagando\.__

Podemos ofrecer un botón:

Aplicar a las más antiguas

como ayuda\.

Pero debe quedar claro dónde se aplicó el dinero\.

__29\. Regla sugerida para aplicación automática__

Cuando el usuario elija:

Aplicar automáticamente

recomiendo:

1. Deudas vencidas más antiguas\.
2. Luego deudas vigentes más antiguas\.

Es una regla intuitiva y trazable\.

Pero no obligaremos a usarla\.

__30\. Pago de deuda en cualquier sucursal__

Esta funcionalidad la dejamos como recomendación y conviene incorporarla\.

Ejemplo:

Venta original:

Juliaca

Pago:

Mazuko

La cuenta del cliente es central, así que puede actualizarse\.

Guardaremos:

sucursal\_venta

sucursal\_cobro

__31\. Efecto en cierre diario__

Si Mazuko recibe S/ 500 de una deuda originada en Juliaca:

__Cierre Mazuko__

Cobro de cuenta por cobrar: S/ 500

__Reporte de venta original__

Permanece asociada a Juliaca\.

Esto evita mover la venta de sucursal\.

__32\. Pago no modifica Kardex__

Regla definitiva:

VENTA

→ inventario

→ Kardex

→ deuda

PAGO

→ deuda

→ caja/cierre

No habrá un Kardex de pagos porque el Kardex es de productos\.

__33\. Anulación de cuenta por cobrar__

No debería existir un botón directo:

Eliminar deuda\.

La deuda se modifica como consecuencia de:

- Pago\.
- Anulación de venta\.
- Devolución\.
- Nota de ajuste financiero futura\.
- Corrección administrativa autorizada\.

Esto mantiene trazabilidad\.

__34\. Anulación de venta con deuda pendiente__

Ejemplo:

Venta: S/ 1,000

Pagado: 0

Saldo: 1,000

Si la venta es anulada correctamente:

Cuenta por cobrar → ANULADA

Saldo exigible → 0

Pero la cuenta histórica permanece\.

__35\. Anulación con pago parcial__

Ejemplo:

Venta: S/ 1,000

Pagado: S/ 300

Saldo: S/ 700

Si se anula:

- Se revierte inventario según corresponda\.
- La deuda de S/ 700 deja de ser exigible\.
- Los S/ 300 pagados no desaparecen\.

Debe existir un proceso de:

reembolso

o resolución financiera\.

No se borrará el pago\.

__36\. Devolución parcial y cuenta por cobrar__

Ejemplo:

Venta original: S/ 1,000

Saldo pendiente: S/ 600

Se devuelve mercadería por:

S/ 200

Dependiendo de la política comercial:

Nuevo saldo: S/ 400

si la devolución se aplica al saldo\.

La relación financiera de devoluciones deberá quedar vinculada a la venta original\.

__37\. Clientes globales__

Recomiendo:

El catálogo de clientes será global para toda la empresa\.

No tendremos:

Cliente ABC de Juliaca

Cliente ABC de Mazuko

como registros distintos si es la misma persona/empresa\.

Será un solo cliente con operaciones en distintas sucursales\.

__38\. Sucursal de registro__

Aunque el cliente sea global, guardaremos:

sucursal\_registro

para saber dónde fue creado inicialmente\.

Pero no limitará sus compras\.

__39\. Cliente visto por todas las sucursales__

Un vendedor de Mazuko podrá buscar al cliente registrado en Juliaca\.

Esto es necesario si:

- Compra en varias tiendas\.
- Paga deuda en otra sucursal\.
- Se quieren evitar duplicados\.

__40\. Privacidad por rol__

No todos necesitan ver toda la información financiera\.

__Vendedor__

Puede:

- Buscar cliente\.
- Ver datos básicos\.
- Ver una advertencia de deuda\.
- Registrar venta\.
- Ver deuda necesaria para cobrar si tiene permiso\.

__Encargado__

Puede:

- Ver historial\.
- Cuentas por cobrar\.
- Pagos\.
- Deudas vencidas\.

__Administrador__

Ve todo\.

__41\. Registrar cliente offline__

Queda permitido para datos básicos\.

Flujo:

Sin conexión

    ↓

Nuevo cliente

    ↓

UUID local

    ↓

Guardar IndexedDB

    ↓

Usar en venta local

Después:

Sincronizar cliente

    ↓

Sincronizar venta

__42\. Validaciones offline del cliente__

La PWA podrá revisar los clientes sincronizados\.

Si se ingresa un documento ya conocido:

Mostrar coincidencia

Pero puede ocurrir que otro dispositivo haya creado el mismo cliente mientras este estaba offline\.

Por tanto la validación definitiva ocurre en Laravel\.

__43\. Conflicto de cliente duplicado__

Ejemplo:

Dispositivo offline crea:

RUC 20123456789

EMPRESA ABC

Mientras tanto servidor ya tiene ese RUC\.

Al sincronizar:

No debemos crear dos clientes\.

Laravel puede devolver:

CLIENTE\_DUPLICADO

y ofrecer vincular la venta local con el cliente existente\.

__44\. Fusión segura durante sincronización__

Si la coincidencia por documento es exacta:

mismo RUC

podemos proponer automáticamente:

Asociar con cliente existente\.

Pero si solo coincide el nombre:

EMPRESA ABC

requiere revisión\.

No fusionamos por nombre solamente\.

__45\. Clientes offline y venta al crédito__

Permitido con restricciones\.

Si se crea un cliente nuevo offline y se vende a crédito:

Cliente local UUID

      ↓

Venta local

      ↓

Cuenta por cobrar provisional

Al sincronizar:

1. Crear/vincular cliente\.
2. Confirmar venta\.
3. Crear cuenta oficial\.
4. Procesar pago inicial\.

Si la venta es rechazada por stock:

La cuenta por cobrar oficial no se crea\.

__46\. Consulta de deudas offline__

La PWA puede guardar la última información conocida\.

Debe mostrar:

Saldo según última sincronización

Ejemplo:

Saldo conocido: S/ 1,500  
Última sincronización: 14:30

Porque quizá el cliente pagó en otra sucursal después\.

__47\. Pago offline: riesgo__

Los pagos offline son más delicados que una simple consulta\.

Ejemplo:

Dos sucursales sin conexión ven:

Saldo: S/ 500

Sucursal A cobra S/ 500 offline\.

Sucursal B también cobra S/ 500 offline\.

Al sincronizar habría S/ 1,000 contra deuda de S/ 500\.

Como ya definimos que no aceptamos pagos superiores al saldo, esto generaría conflicto\.

__48\. Recomendación sobre pagos offline__

Podemos permitirlos porque ya estaban dentro del alcance PWA, pero con una política controlada:

__El pago offline se registra como cobro provisional y Laravel valida el saldo al sincronizar\.__

Si el saldo sigue siendo suficiente:

Aceptar

Si no:

CONFLICTO\_PAGO\_SUPERA\_SALDO

Esto requerirá resolución financiera\.

Más adelante detallaremos este punto en el Proceso 10\.

__49\. Estado de cliente offline__

No recomiendo permitir:

- Bloquear cliente\.
- Desactivar cliente\.
- Modificar políticas de crédito\.

offline\.

Solo:

- Crear datos básicos\.
- Corregir información local antes de sincronizar\.

__50\. Alertas de cuentas por cobrar__

El sistema podrá generar:

- Deuda vencida\.
- Deuda próxima a vencer\.
- Cliente con varias deudas\.
- Pago offline pendiente\.
- Conflicto de pago\.
- Cliente duplicado\.
- Venta al crédito pendiente de sincronización\.

Para "próxima a vencer", el número de días será configurable\.

__51\. Dashboard de cuentas por cobrar__

Podrá mostrar:

Total por cobrar:          S/ 50,000

Vigente:                   S/ 35,000

Vencido:                   S/ 15,000

Además:

- Por sucursal de venta\.
- Por cliente\.
- Por antigüedad\.
- Por vencimiento\.

__52\. Antigüedad de deuda__

Podemos generar rangos:

Vigente

1–30 días vencida

31–60

61–90

Más de 90

Los rangos pueden ser configurables posteriormente\.

Esto será útil para reportes administrativos\.

__53\. Reportes de clientes__

- Clientes registrados\.
- Clientes activos\.
- Ventas por cliente\.
- Clientes frecuentes\.
- Total comprado\.
- Última compra\.
- Cuentas por cobrar\.
- Deudas vencidas\.
- Pagos realizados\.
- Pagos por sucursal\.
- Devoluciones por cliente\.

__54\. Permisos__

__Acción__

__Admin__

__Encargado__

__Vendedor__

__Almacenero__

Buscar cliente

Sí

Sí

Sí

Opcional

Crear cliente

Sí

Sí

Sí

No

Editar datos básicos

Sí

Sí

Limitado

No

Ver deuda total

Sí

Sí

Según permiso

No

Ver historial completo

Sí

Sí

Limitado

No

Registrar venta crédito

Sí

Sí

Sí

No

Bloquear cliente

Sí

Con permiso

No

No

Anular cliente

No, solo inactivar

No

No

No

Resolver duplicados

Sí

Limitado

No

No

__55\. Reglas funcionales definitivas del Proceso 9__

1. Toda venta requiere cliente\.
2. Los clientes serán globales para toda la empresa\.
3. El documento del cliente debe ser único cuando exista\.
4. No se fusionan clientes por nombre automáticamente\.
5. CLIENTE VARIOS puede usarse para contado\.
6. CLIENTE VARIOS no puede recibir crédito\.
7. Venta con saldo crea una cuenta por cobrar\.
8. Cada deuda se relaciona con una venta específica\.
9. La fecha de vencimiento es obligatoria para crédito\.
10. Una deuda vencida se determina automáticamente\.
11. No se generan intereses automáticos en V1\.
12. Se permiten pagos parciales\.
13. No se permiten pagos mayores al saldo\.
14. Un cliente puede tener varias cuentas pendientes\.
15. Los pagos deben asignarse a cuentas específicas\.
16. Puede existir ayuda para aplicar pagos a deudas más antiguas\.
17. Los clientes pueden pagar en cualquier sucursal\.
18. Se conserva sucursal de venta y sucursal de cobro\.
19. Un pago no afecta Kardex\.
20. Una deuda no se elimina manualmente\.
21. Anular venta afecta su cuenta por cobrar\.
22. Los pagos realizados no desaparecen al anular una venta\.
23. Clientes con deuda vencida generan advertencia en V1\.
24. No se bloquean automáticamente nuevas ventas por morosidad inicialmente\.
25. El límite de crédito queda preparado, pero no obligatorio\.
26. Cliente puede registrarse offline\.
27. Laravel resuelve duplicidad oficial\.
28. Las cuentas creadas offline son provisionales hasta confirmar la venta\.
29. Los saldos vistos offline deben identificarse como última información sincronizada\.
30. Toda modificación sensible mantiene auditoría\.

__56\. Criterios de aceptación del Proceso 9__

El proceso estará aprobado cuando:

- Una venta no pueda confirmarse sin cliente\.
- Una venta a crédito no pueda usar CLIENTE VARIOS\.
- Un documento duplicado no cree otro cliente\.
- Una venta al crédito cree exactamente el saldo correspondiente\.
- Un pago inicial reduzca correctamente la deuda\.
- La deuda pase automáticamente a vencida cuando corresponda\.
- Un cliente pueda tener varias deudas separadas\.
- El sistema calcule correctamente el total pendiente\.
- Un pago realizado en otra sucursal reduzca la misma deuda\.
- No se pueda pagar más que el saldo\.
- Una anulación de venta no borre pagos históricos\.
- Clientes creados offline se sincronicen sin duplicarse\.
- Los permisos limiten el acceso financiero\.
- Las cuentas por cobrar aparezcan correctamente en reportes\.

__Resultado del Proceso 9__

Queda funcionalmente definido:

__El sistema manejará un catálogo central de clientes y generará cuentas por cobrar individualmente a partir de las ventas con saldo\. Las deudas tendrán vencimiento, estado de pago y estado de mora automáticos; podrán recibir pagos parciales desde distintas sucursales y conservarán trazabilidad completa con su venta de origen\.__

El siguiente proceso de la __Etapa 3__ es el __Proceso 10: Pagos y cobranzas__, donde debemos definir en detalle métodos de pago, pagos parciales, pago de varias deudas, cobro desde otra sucursal, comprobantes internos, anulaciones y reembolsos, conflictos offline y su integración exacta con el cierre diario\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 10: Pagos y cobranzas__

Este proceso corresponde al __Módulo 12: Clientes, pagos y cuentas por cobrar__ y se relaciona directamente con:

- Ventas\.
- Clientes\.
- Cuentas por cobrar\.
- Cierre diario\.
- Reportes\.
- PWA y sincronización\.
- Auditoría\.

La regla principal será:

__Un pago modifica el saldo financiero del cliente, pero no modifica inventario ni Kardex\.__

__1\. Objetivo funcional__

Permitir registrar correctamente:

- Pagos al contado\.
- Pagos iniciales\.
- Pagos parciales\.
- Pagos totales\.
- Cobro de una o varias deudas\.
- Pagos en otra sucursal\.
- Métodos de pago\.
- Pagos offline\.
- Anulaciones de pago\.
- Reembolsos\.
- Historial completo de cobranzas\.

__2\. Diferencia entre venta y pago__

Esto debe quedar muy claro\.

VENTA

→ afecta inventario

→ genera Kardex

→ puede crear deuda

PAGO

→ reduce deuda

→ afecta caja/cobranza

→ NO afecta inventario

→ NO genera Kardex

Ejemplo:

Venta al crédito: S/ 1,000

Pago hoy: S/ 300

Inventario ya salió al momento de vender\.

El pago solo cambia:

Saldo: S/ 1,000 → S/ 700

__3\. Tipos de pago__

Podemos manejar:

1. Pago de venta al contado\.
2. Pago inicial de venta a crédito\.
3. Pago parcial posterior\.
4. Pago total de deuda\.
5. Pago aplicado a varias deudas\.

Internamente todos pueden utilizar la misma entidad de pago\.

__4\. Métodos de pago__

Para V1 recomiendo soportar:

- Efectivo\.
- Transferencia bancaria\.
- Depósito bancario\.
- Yape\.
- Plin\.
- Tarjeta\.
- Otro\.

Cada método podrá tener configuración\.

Por ejemplo:

EFECTIVO

requiere número operación: no

TRANSFERENCIA

requiere número operación: sí

YAPE

requiere número operación: opcional

__5\. Datos de un pago__

Cada pago tendrá como mínimo:

- UUID\.
- Cliente\.
- Monto\.
- Moneda\.
- Método de pago\.
- Fecha y hora\.
- Sucursal donde se recibió\.
- Usuario\.
- Estado\.
- Observación\.
- Número de operación o referencia cuando corresponda\.
- Dispositivo\.
- Estado de sincronización\.

Además tendrá las deudas a las que fue aplicado\.

__6\. Flujo de pago de una deuda__

Buscar cliente

      ↓

Mostrar cuentas pendientes

      ↓

Seleccionar deuda

      ↓

Mostrar saldo actual

      ↓

Ingresar monto

      ↓

Seleccionar método

      ↓

Validar

      ↓

Confirmar

      ↓

Registrar pago

      ↓

Reducir saldo

      ↓

Actualizar estado de deuda

      ↓

Incluir cobro en cierre diario

__7\. Validación del importe__

Queda definido:

monto > 0

y:

monto <= saldo pendiente

No se permitirán:

- Pagos cero\.
- Pagos negativos\.
- Pagos superiores al saldo\.

__8\. Pago parcial__

Ejemplo:

Saldo anterior: S/ 1,500

Pago: S/ 500

Resultado:

Saldo nuevo: S/ 1,000

Estado de pago: PARCIAL

__9\. Pago total__

Saldo: S/ 1,000

Pago: S/ 1,000

Resultado:

Saldo: S/ 0

Estado: PAGADA

La cuenta permanece en el historial\.

No se elimina\.

__10\. Pago de varias deudas__

Supongamos:

Cliente ABC

V\-001 → S/ 300

V\-002 → S/ 500

V\-003 → S/ 200

El cliente entrega:

S/ 600

Recomiendo permitir dos modalidades\.

__Aplicación manual__

Usuario decide:

V\-001 → 300

V\-002 → 300

__Aplicación automática__

Botón:

Aplicar a las deudas más antiguas\.

El sistema haría:

V\-001 → 300

V\-002 → 300

Quedando:

V\-002 → 200

V\-003 → 200

__11\. Prioridad automática__

Cuando se use aplicación automática, recomiendo:

1. Deudas vencidas más antiguas\.
2. Luego deudas vigentes más antiguas\.

Esto es solo una ayuda\.

El usuario podrá revisar la distribución antes de confirmar\.

__12\. Relación pago\-deuda__

No debemos guardar simplemente:

cliente\.pagado \+= 500

Necesitamos saber exactamente dónde se aplicó\.

Conceptualmente:

PAGO P\-001

Monto: 600

Aplicaciones:

\- V\-001 → 300

\- V\-002 → 300

Esto facilitará auditoría y anulaciones\.

__13\. Pago inicial de una venta__

El pago inicial debe ser un pago real\.

Ejemplo:

Venta: S/ 2,000

Pago inicial: S/ 500

Internamente:

Venta V\-100

Cuenta por cobrar: S/ 2,000

Pago P\-200:

S/ 500

Saldo:

S/ 1,500

No tendremos un campo aislado que no deje historial\.

__14\. Venta al contado__

Una venta al contado genera igualmente un registro de pago\.

Ejemplo:

Venta: S/ 500

Pago: S/ 500 efectivo

Esto es importante para el cierre diario\.

__15\. Varios métodos en un mismo pago__

Recomiendo soportar __pago mixto__\.

Ejemplo:

Total: S/ 1,000

Efectivo: S/ 400

Yape: S/ 600

Esto ocurre frecuentemente en negocios reales\.

Conceptualmente tendremos:

Pago/cobro

   ├── Efectivo 400

   └── Yape 600

Podemos implementarlo desde V1 sin demasiada complejidad\.

__16\. Validación de pago mixto__

Debe cumplirse:

suma de métodos = monto total del pago

Ejemplo inválido:

Pago total declarado: 1,000

Efectivo: 400

Yape: 500

Total métodos: 900

No se confirma\.

__17\. Pago recibido en otra sucursal__

Queda recomendado soportarlo\.

Ejemplo:

Venta:

Juliaca

Cobro:

Mazuko

Guardaremos:

sucursal\_origen\_deuda = Juliaca

sucursal\_recepcion\_pago = Mazuko

La deuda central disminuye normalmente\.

__18\. Efecto en el cierre de otra sucursal__

Si Mazuko recibe:

S/ 500

de una deuda de Juliaca:

__Mazuko__

Registra:

Cobro recibido: \+S/ 500

__Juliaca__

No registra caja por esos S/ 500\.

La venta sigue siendo de Juliaca\.

__19\. Numeración de pagos__

Podemos generar:

PAG\-MZK\-2026\-000125

y además UUID interno\.

La numeración servirá para:

- Comprobante interno\.
- Búsqueda\.
- Auditoría\.

__20\. Comprobante interno__

Recomiendo que el sistema pueda generar un comprobante interno de pago con:

- Número\.
- Cliente\.
- Fecha\.
- Monto\.
- Método\.
- Deudas aplicadas\.
- Saldo restante\.
- Sucursal\.
- Usuario\.

Puede imprimirse o exportarse a PDF posteriormente\.

Esto no sustituye necesariamente un comprobante tributario\.

__21\. Pago con transferencia bancaria__

Datos opcionales:

- Banco\.
- Número de operación\.
- Fecha operación\.
- Titular\.
- Observación\.

Para V1 podemos dejar:

numero\_operacion

como campo principal\.

__22\. Evitar duplicidad de pagos__

Puede ocurrir que el usuario registre dos veces la misma transferencia\.

Podemos detectar coincidencias por:

- Cliente\.
- Monto\.
- Método\.
- Número de operación\.
- Fecha\.

Si existe:

Posible pago duplicado\.

No necesariamente bloquearemos si no hay un identificador único confiable, pero sí advertiremos\.

__23\. UUID e idempotencia__

En PWA cada pago tendrá UUID\.

Si se envía dos veces:

UUID ya procesado

Laravel devuelve el pago existente\.

No duplica el cobro\.

__24\. Estado del pago__

Propongo:

- BORRADOR
- PENDIENTE
- CONFIRMADO
- ANULADO
- CONFLICTO
- RECHAZADO

Normalmente los pagos online pasarán directamente a CONFIRMADO\.

__25\. Un pago confirmado no se edita__

Regla:

Un pago confirmado no se modifica directamente\.

No se cambia:

S/ 300 → S/ 500

después de confirmarlo\.

Si fue incorrecto:

Anular pago

      ↓

Registrar pago correcto

Esto conserva trazabilidad\.

__26\. Anulación de pago__

Debe ser restringida\.

Flujo:

Seleccionar pago

      ↓

Solicitar anulación

      ↓

Motivo obligatorio

      ↓

Validar permisos

      ↓

Revertir aplicaciones a deuda

      ↓

Aumentar saldo nuevamente

      ↓

Marcar pago ANULADO

El pago original permanece visible\.

__27\. Quién puede anular pagos__

Recomendación:

__Vendedor__

No anula pagos confirmados\.

__Encargado__

Puede anular pagos del mismo día de su sucursal si:

- El cierre está abierto\.
- Tiene permiso\.
- Registra motivo\.

__Administrador__

Puede anular cualquier pago bajo reglas administrativas\.

Día cerrado:

Solo administrador mediante proceso excepcional\.

__28\. Ejemplo de anulación__

Antes:

Deuda: S/ 1,000

Pago: S/ 400

Saldo: S/ 600

Se anula el pago\.

Resultado:

Pago: ANULADO

Saldo nuevamente: S/ 1,000

No se elimina el pago de la historia\.

__29\. Pago aplicado a varias deudas y anulación__

Ejemplo:

Pago P\-001: S/ 600

V\-001 → 300

V\-002 → 300

Al anular:

V\-001 saldo \+300

V\-002 saldo \+300

Todo debe revertirse en una misma transacción\.

__30\. Venta anulada con pago existente__

Como ya definimos:

Anular una venta no implica borrar su pago\.

Ejemplo:

Venta: 1,000

Pagado: 300

Saldo: 700

La venta se anula\.

Tenemos:

Deuda exigible → 0

Pago recibido → sigue existiendo

Ahora se requiere una resolución:

- Reembolso\.
- Aplicación a otra deuda, si negocio lo permite en futuro\.
- Saldo a favor futuro\.

Para V1 recomiendo principalmente:

__Reembolso registrado explícitamente\.__

__31\. Reembolso__

El reembolso será distinto de anular pago\.

__Anular pago__

Significa:

El pago fue registrado erróneamente\.

__Reembolso__

Significa:

El pago fue real, pero posteriormente se devuelve dinero al cliente\.

Esta distinción es muy importante\.

__32\. Flujo de reembolso__

Pago válido existente

      ↓

Venta anulada/devolución

      ↓

Monto a devolver

      ↓

Autorización

      ↓

Registrar reembolso

      ↓

Salida de caja

El pago original queda intacto\.

__33\. Datos de reembolso__

- Cliente\.
- Pago original\.
- Venta relacionada\.
- Monto\.
- Método de devolución\.
- Sucursal\.
- Usuario\.
- Autorizador\.
- Motivo\.
- Fecha\.

No afecta Kardex directamente\.

La devolución física del producto es una operación separada\.

__34\. Reembolso parcial__

Debe poderse soportar\.

Ejemplo:

Pago original: S/ 1,000

Reembolso: S/ 200

porque quizá solo se devolvió una parte de la venta\.

__35\. Saldos a favor__

Para V1 recomiendo __no implementar saldos a favor__\.

Porque agregaría:

- Cuenta corriente de cliente\.
- Aplicación futura\.
- Reembolsos parciales\.
- Créditos internos\.

Por ahora:

Pago > deuda → bloqueado

Y las devoluciones monetarias se resuelven mediante reembolso\.

__36\. Pago offline__

Ya definimos que será posible como operación provisional\.

Flujo:

Sin conexión

      ↓

Consultar saldo conocido

      ↓

Registrar pago

      ↓

UUID

      ↓

Guardar IndexedDB

      ↓

Estado PENDIENTE

      ↓

Sincronizar

__37\. Información mostrada offline__

Debe decir claramente:

Saldo conocido: S/ 500

Última sincronización: 15:30

No:

Saldo actual: S/ 500

porque puede haber cambiado en otro dispositivo\.

__38\. Riesgo de doble cobro offline__

Ejemplo:

Servidor tiene:

Saldo: S/ 500

Dos dispositivos offline lo vieron\.

__Dispositivo A__

cobra:

S/ 400

__Dispositivo B__

cobra:

S/ 300

Total intentado:

S/ 700

Solo S/ 500 son aplicables\.

__39\. Política para conflicto de pago__

Supongamos A sincroniza primero:

Saldo 500

Pago 400

→ aceptado

Saldo oficial:

100

Después B intenta:

Pago 300

Laravel detecta:

300 > 100

Resultado:

CONFLICTO\_PAGO\_SUPERA\_SALDO

No debemos aplicar solo S/ 100 automáticamente\.

Porque físicamente el trabajador recibió S/ 300\.

Eso requiere intervención\.

__40\. Resolución del conflicto de pago__

El encargado/administrador deberá revisar\.

Opciones según situación:

- Confirmar que el dinero realmente fue recibido\.
- Reembolsar exceso\.
- Aplicar a otra deuda del mismo cliente, si el cliente autoriza y se habilita\.
- Anular el registro local si nunca se cobró realmente\.

Para V1, la opción más segura será:

No redistribuir automáticamente; requerir resolución explícita\.

__41\. Pago offline al contado junto con venta__

Aquí la dependencia es importante\.

Venta offline

\+

Pago offline

Al sincronizar:

1. Cliente\.
2. Venta\.
3. Pago\.

Si la venta es rechazada por stock:

Pago queda bloqueado como conflicto dependiente

No se registra contra una venta inexistente\.

__42\. Pago de una deuda existente offline__

Puede sincronizarse independientemente si la cuenta todavía existe y tiene saldo suficiente\.

__43\. Anulación de pago offline__

No recomiendo permitir anular un pago ya sincronizado mientras el dispositivo está offline\.

Sí puede cancelar:

Pago local todavía no sincronizado

porque aún no existe oficialmente\.

Una vez sincronizado:

La anulación requiere conexión\.

__44\. Pago local cancelado antes de sincronizar__

Si el usuario se da cuenta de un error:

PAGO LOCAL

estado: pendiente

puede marcar:

CANCELADO\_LOCAL

y no se envía al servidor\.

Debe conservarse un registro local mínimo para auditoría del dispositivo si es necesario\.

__45\. Cierre diario y métodos de pago__

El cierre mostrará cobros por método\.

Ejemplo:

__Método__

__Cobrado__

Efectivo

S/ 2,500

Yape

S/ 1,200

Plin

S/ 500

Transferencia

S/ 3,000

Tarjeta

S/ 800

Total:

S/ 8,000

__46\. Diferencia entre venta y cobro en cierre__

Ejemplo del día:

Ventas: S/ 10,000

pero:

Cobros: S/ 8,000

porque:

- S/ 3,000 fueron ventas a crédito\.
- Se cobraron S/ 1,000 de deudas antiguas\.

Entonces:

Ventas nuevas:      10,000

Cobro de ventas nuevas: 7,000

Cobro de deudas anteriores: 1,000

Cobros totales:      8,000

Esto debe mostrarse claramente\.

__47\. Cierre de efectivo__

Para pagos en efectivo podremos comparar:

Efectivo esperado

vs

Efectivo contado físicamente

Ejemplo:

Esperado: S/ 2,500

Contado: S/ 2,480

Diferencia: \-S/ 20

La diferencia se registrará en el cierre, no se cambiarán pagos para hacerlos coincidir\.

__48\. Transferencias/Yape/Plin en cierre__

No necesitan conteo físico de caja, pero pueden tener:

- Total registrado\.
- Número de operaciones\.
- Observación\.
- Evidencia opcional\.

Más adelante podría existir conciliación bancaria, pero queda fuera de V1\.

__49\. Pagos pendientes de sincronización y cierre__

Regla importante:

No se puede confirmar el cierre diario mientras existan pagos locales pendientes o conflictos financieros del día\.

Porque el efectivo físico podría existir aunque el servidor no lo conozca todavía\.

__50\. Pago con fecha anterior__

Un pago online se registra normalmente con fecha del servidor/operación\.

Si un usuario intenta registrar hoy un pago de ayer:

Recomiendo permitir indicar:

fecha\_pago

pero si ayer está cerrado:

Debe requerir autorización o registrarse oficialmente hoy conservando la fecha informada\.

La política seguirá el mismo principio del Kardex: no modificar silenciosamente cierres históricos\.

__51\. Fecha de pago vs registro__

Al igual que PWA:

fecha\_pago

fecha\_registro\_servidor

Esto permitirá conservar la realidad operativa sin comprometer auditoría\.

__52\. Conflicto con día cerrado__

Pago offline realizado ayer pero sincronizado hoy:

fecha\_pago: ayer

registro: hoy

Si el cierre de ayer está confirmado:

CONFLICTO\_DIA\_CERRADO

o política de regularización administrativa\.

No debemos agregar silenciosamente efectivo al cierre de ayer\.

__53\. Auditoría__

Todo pago deberá permitir saber:

- Quién lo registró\.
- En qué sucursal\.
- En qué dispositivo\.
- Cuándo se realizó\.
- Cuándo se sincronizó\.
- Qué deuda\(s\) afectó\.
- Qué método utilizó\.
- Quién lo anuló\.
- Motivo\.
- Si tuvo conflicto\.
- Cómo se resolvió\.

__54\. Reportes de pagos__

Podremos generar:

- Pagos por fecha\.
- Pagos por sucursal\.
- Pagos por cliente\.
- Pagos por vendedor/cobrador\.
- Pagos por método\.
- Cobros de ventas del día\.
- Cobros de deudas anteriores\.
- Pagos anulados\.
- Reembolsos\.
- Pagos offline\.
- Conflictos de pagos\.

__55\. Alertas__

- Pago offline pendiente\.
- Pago en conflicto\.
- Posible pago duplicado\.
- Pago anulado\.
- Reembolso pendiente\.
- Diferencia de caja\.
- Cobro registrado contra deuda vencida, informativo\.
- Día con pagos pendientes de sincronización\.

__56\. Permisos__

__Acción__

__Admin__

__Encargado__

__Vendedor__

__Almacenero__

Registrar pago

Sí

Sí

Sí con permiso

No

Pago de varias deudas

Sí

Sí

Sí con permiso

No

Ver saldo cliente

Sí

Sí

Según permiso

No

Anular pago mismo día

Sí

Con permiso

No

No

Anular día cerrado

Sí

No

No

No

Registrar reembolso

Sí

Con permiso

No

No

Resolver conflicto pago

Sí

Limitado

No

No

Ver reportes de cobro

Sí

Sí local

Limitado

No

__57\. Reglas funcionales definitivas del Proceso 10__

1. Los pagos son independientes de inventario\.
2. Un pago no genera Kardex\.
3. Todo pago está asociado a un cliente\.
4. Los pagos de deuda se aplican a cuentas específicas\.
5. Puede aplicarse un pago a varias deudas\.
6. El sistema puede sugerir aplicación por antigüedad\.
7. Se permiten pagos parciales\.
8. Se permiten pagos totales\.
9. No se permiten pagos mayores al saldo aplicable\.
10. Se soportan varios métodos de pago\.
11. Se recomienda soportar pagos mixtos\.
12. La suma de métodos debe coincidir con el pago\.
13. Un pago inicial es un registro de pago real\.
14. Las ventas al contado también generan pago\.
15. Los pagos pueden recibirse en otra sucursal\.
16. Se conserva sucursal de venta y de cobro\.
17. Un pago confirmado no se edita directamente\.
18. Una anulación revierte las aplicaciones del pago\.
19. El pago original no se elimina\.
20. Anulación de venta no elimina pagos\.
21. Reembolso y anulación de pago son conceptos diferentes\.
22. No habrá saldo a favor en V1\.
23. Pagos offline son provisionales\.
24. Laravel valida el saldo oficial al sincronizar\.
25. Un pago offline superior al saldo oficial entra en conflicto\.
26. El exceso no se redistribuye automáticamente\.
27. UUID evita duplicidad por reintentos\.
28. Los pagos pendientes impiden cierre diario\.
29. El cierre diferencia ventas de cobros\.
30. Todo pago y reversión deja auditoría\.

__58\. Criterios de aceptación del Proceso 10__

El proceso estará aprobado cuando:

- Un pago parcial reduzca exactamente el saldo correspondiente\.
- Un pago total deje saldo cero\.
- No se pueda superar el saldo\.
- Un pago pueda distribuirse entre varias deudas\.
- Los métodos de pago se registren correctamente\.
- Un pago mixto cuadre exactamente\.
- Un pago en otra sucursal afecte la deuda correcta\.
- Un pago no modifique inventario ni Kardex\.
- Una anulación restaure las deudas afectadas\.
- El pago original siga visible después de anularlo\.
- Un reembolso no se confunda con anulación\.
- Los pagos offline sobrevivan sin conexión\.
- Un reintento no duplique el pago\.
- Los conflictos de saldo se detecten\.
- El cierre muestre correctamente cobros por método y origen\.
- No pueda cerrarse el día con pagos pendientes\.

__Resultado del Proceso 10__

Queda funcionalmente definido:

__El sistema permitirá cobrar ventas y cuentas por cobrar mediante pagos parciales o totales, utilizando uno o varios métodos de pago y conservando trazabilidad por cliente, deuda y sucursal\. Los pagos serán independientes del Kardex, podrán registrarse provisionalmente offline y toda anulación o reembolso deberá conservar el historial financiero original\.__

El siguiente proceso de la __Etapa 3__ es el __Proceso 11: Devoluciones, anulaciones y reversiones__, donde debemos unificar todas las reglas que hemos ido mencionando para ventas, entradas, salidas, pagos, kits y días cerrados, de modo que el sistema tenga una política única y consistente para corregir errores sin borrar historial\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 11: Devoluciones, anulaciones y reversiones__

Este proceso es transversal y afecta a:

- Ventas\.
- Compras y entradas\.
- Otras salidas\.
- Transferencias\.
- Pagos\.
- Cuentas por cobrar\.
- Kits\.
- Inventario\.
- Lotes\.
- Kardex\.
- Cierre diario\.
- Auditoría\.

La regla central será:

__Una operación confirmada no se borra ni se modifica directamente\. Si debe corregirse, se genera una operación relacionada que revierta total o parcialmente sus efectos\.__

__1\. Objetivo funcional__

Definir una política única para corregir operaciones sin perder trazabilidad\.

El sistema debe distinguir entre:

- Cancelar un borrador\.
- Anular una operación confirmada\.
- Devolver mercadería\.
- Revertir un movimiento\.
- Reembolsar dinero\.
- Corregir una diferencia\.
- Corregir una operación de un día ya cerrado\.

__2\. Cancelación vs anulación__

__Cancelación__

Aplica a una operación que __todavía no produjo efectos oficiales__\.

Ejemplo:

Venta en BORRADOR

→ Cancelar

No requiere:

- Movimiento de inventario\.
- Kardex\.
- Reversión financiera\.

Puede quedar registrada como cancelada para auditoría, pero no tuvo impacto\.

__Anulación__

Aplica a una operación que ya fue confirmada\.

Ejemplo:

Venta CONFIRMADA

      ↓

Solicitar anulación

      ↓

Generar reversión

La operación original permanece\.

__3\. Regla de inmutabilidad__

Una vez confirmada una operación, no se permitirá cambiar directamente:

- Producto\.
- Cantidad\.
- Costo\.
- Precio\.
- Cliente\.
- Sucursal\.
- Lotes\.
- Total\.
- Saldo generado\.

Se corrige mediante una nueva operación relacionada\.

__4\. Tipos de corrección__

Tendremos conceptualmente:

1. Cancelación de borrador\.
2. Anulación total\.
3. Devolución total\.
4. Devolución parcial\.
5. Reversión de entrada\.
6. Reversión de salida\.
7. Anulación de pago\.
8. Reembolso\.
9. Ajuste de inventario\.
10. Ajuste de valorización excepcional\.

__5\. Anulación de venta__

Flujo:

Venta confirmada

      ↓

Solicitar anulación

      ↓

Motivo obligatorio

      ↓

Validar permisos

      ↓

Validar cierre

      ↓

Validar productos y pagos

      ↓

Generar reversión

Debe resolver dos dimensiones:

Inventario

\+

Finanzas

__6\. Venta no pagada__

Ejemplo:

Venta: S/ 1,000

Pagado: 0

Saldo: S/ 1,000

Si se anula y los productos regresan correctamente:

- Se revierte la salida de inventario\.
- Se restituyen lotes\.
- Se genera Kardex inverso\.
- La cuenta por cobrar deja de ser exigible\.
- La venta pasa a ANULADA\.

La cuenta histórica no se elimina\.

__7\. Venta pagada parcialmente__

Ejemplo:

Venta: S/ 1,000

Pagado: S/ 300

Saldo: S/ 700

Al anular:

- El saldo de S/ 700 deja de ser exigible\.
- Los S/ 300 recibidos siguen registrados\.
- Debe resolverse qué ocurre con esos S/ 300\.

Recomendación V1:

Generar un reembolso explícito cuando el dinero se devuelve al cliente\.

__8\. Venta totalmente pagada__

Ejemplo:

Venta: S/ 500

Pagado: S/ 500

No recomiendo permitir un simple botón de “Anular venta”\.

Debe realizarse como:

Devolución/anulación comercial

\+

Reversión inventario

\+

Reembolso financiero

Esto representa lo que realmente ocurrió\.

__9\. Anulación vs devolución de venta__

No son exactamente lo mismo\.

__Anulación__

Se usa cuando la operación se registró erróneamente y debe quedar sin efecto\.

Ejemplo:

- Venta duplicada\.
- Producto equivocado antes de entrega\.
- Error de registro\.

__Devolución__

Se usa cuando:

- La venta fue real\.
- El producto fue entregado\.
- Posteriormente el cliente lo devuelve\.

Por tanto la documentación debe diferenciarlas\.

__10\. Devolución total__

Flujo:

Buscar venta original

      ↓

Seleccionar todos los productos

      ↓

Registrar cantidades devueltas

      ↓

Evaluar estado físico

      ↓

Confirmar devolución

      ↓

Actualizar inventario

      ↓

Actualizar situación financiera

La venta original sigue existiendo\.

__11\. Devolución parcial__

Ejemplo:

Venta:

RK\-428 × 5

Cliente devuelve:

RK\-428 × 2

El sistema debe controlar:

Vendido: 5

Ya devuelto anteriormente: 1

Máximo adicional devolvible: 4

Nunca puede devolverse más de lo originalmente vendido, descontando devoluciones anteriores\.

__12\. Estado físico de la devolución__

Por cada producto deberá elegirse:

- Bueno / vendible\.
- Dañado\.
- En revisión\.
- Incompleto, en caso de kit\.

__Bueno__

Puede volver a stock vendible\.

__Dañado__

Vuelve físicamente, pero a stock dañado\.

__En revisión__

Queda bloqueado hasta que el encargado determine su estado\.

__13\. Lote de una devolución__

Siempre que sea posible, se intentará relacionar la devolución con los lotes consumidos en la venta original\.

Ejemplo:

Venta original:

Lote A → 2

Lote B → 1

Devolución de dos unidades\.

El sistema puede sugerir lotes relacionados, pero en la práctica quizá no se conozca cuál unidad volvió\.

Recomendación:

- Si puede identificarse → restaurar lote original\.
- Si no puede identificarse → crear lote interno de devolución vinculado a la venta\.

__14\. Costo de devolución__

La devolución debe utilizar como referencia el costo oficial de la salida original\.

Ejemplo:

Precio venta: S/ 180

Costo salida: S/ 110

Si vuelve una unidad:

Valor de reversión de inventario: S/ 110

No se utiliza el precio cobrado al cliente como costo\.

__15\. Efecto financiero de devolución__

Ejemplo:

Venta:

Total: S/ 1,000

Saldo pendiente: S/ 600

Devolución comercial aprobada:

Valor comercial devuelto: S/ 200

Recomendación:

1. Primero disminuir saldo pendiente\.
2. Si el valor devuelto supera el saldo, el exceso se convierte en monto a reembolsar\.

Ejemplo:

Saldo: 600

Devolución: 200

Nuevo saldo: 400

Otro caso:

Saldo: 100

Devolución: 200

Entonces:

Nuevo saldo: 0

Monto a reembolsar: 100

No crearemos saldo a favor en V1\.

__16\. Devolución de kit único__

Si se vendió como producto inventariado:

KIT\_UNICO

la devolución se maneja como una unidad normal\.

Debe verificarse:

- Cantidad\.
- Estado\.
- Lote\.
- Venta original\.

__17\. Devolución de kit por componentes__

Aquí no podemos asumir que todo el kit regresa completo\.

La pantalla mostrará la composición utilizada originalmente\.

Ejemplo:

KIT A

2 retenes

1 rodamiento

4 sellos

El usuario registra:

Retenes: 2

Rodamiento: 1

Sellos: 3

Solo esos componentes regresan físicamente\.

__18\. Devolución parcial de componentes del kit__

El sistema debe conservar:

- Composición usada en la venta\.
- Componentes devueltos\.
- Componentes faltantes\.
- Estado físico de cada uno\.
- Valor comercial atribuido a la devolución\.

Esta última parte puede requerir política comercial\.

Para V1 recomiendo que el monto a reconocer sea ingresado/autorizado explícitamente, porque no existe una regla empresarial para prorratear automáticamente el precio del kit entre componentes\.

__19\. Reversión de una entrada__

Ejemplo:

Compra registrada por error:

Entrada: 10

Si las diez unidades siguen intactas:

Disponible: 10

se puede revertir\.

La reversión:

- Reduce stock 10\.
- Consume el lote creado\.
- Genera REVERSO\_ENTRADA\.
- Restaura el estado anterior del inventario según el cálculo correspondiente\.

__20\. Entrada parcialmente consumida__

Ejemplo:

Entrada original: 10

Ya salieron: 7

Quedan: 3

No se puede anular simplemente la entrada completa\.

El sistema debe bloquear:

La entrada tiene existencias ya consumidas\.

Opciones:

- Devolver las tres restantes al proveedor\.
- Corregir costo administrativamente\.
- Generar ajustes debidamente autorizados\.
- Revisar las operaciones posteriores\.

__21\. Corrección de costo de una compra__

Si la entrada está en borrador:

Editar costo

Si ya está confirmada pero no tuvo movimientos posteriores, se puede:

Revertir entrada

\+

Registrar entrada correcta

Si ya existieron movimientos posteriores, la corrección puede cambiar valorizaciones históricas\.

Por tanto:

Requiere proceso administrativo especial\.

__22\. Ajuste de valorización__

Para casos excepcionales podrá existir:

AJUSTE\_VALORIZACION

que:

- No modifica cantidad\.
- Modifica valor/costo bajo reglas controladas\.
- Requiere administrador\.
- Requiere motivo\.
- Queda auditado\.

No será una herramienta operativa normal\.

__23\. Reversión de otras salidas__

Ejemplo:

Uso interno registrado por error:

Salida: 3

Si se anula:

Reingreso: 3

Se intenta restaurar:

- Lotes originales\.
- Valor de salida original\.
- Inventario\.

Se genera movimiento inverso\.

__24\. Pérdidas y bajas__

Una pérdida o baja confirmada no debería anularse trivialmente\.

Si después aparece el producto perdido:

No significa que la pérdida original nunca ocurrió\.

Recomendación:

Pérdida original

      ↓

Producto recuperado

      ↓

Entrada por recuperación

De esta forma el historial dice la verdad\.

__25\. Producto dañado recuperado__

Si solo estaba clasificado como dañado y nunca fue dado de baja:

DAÑADO → DISPONIBLE

No hay movimiento de cantidad\.

Si ya había sido dado de baja:

SALIDA\_DANO

y luego se recupera físicamente, se registra una nueva entrada de recuperación autorizada\.

__26\. Devolución a proveedor__

Si ya se confirmó una devolución al proveedor y posteriormente la mercadería vuelve:

No se elimina la devolución original\.

Se registra una nueva entrada vinculada a ella\.

__27\. Anulación de transferencia antes del envío__

Mientras esté:

- Solicitada\.
- Aprobada\.
- En preparación\.
- Preparada\.

puede cancelarse\.

Si existía reserva:

Liberar reserva

No hay Kardex de reversión porque todavía no salió físicamente\.

__28\. Transferencia ya enviada__

No se puede cancelar como si nunca existiera\.

Si ya está EN\_TRANSITO:

Debe terminar mediante:

- Recepción\.
- Recepción parcial\.
- Diferencia\.
- Pérdida\.
- Nueva transferencia de devolución\.

__29\. Transferencia recibida incorrectamente__

Si se confirmó una recepción equivocada y el día sigue abierto, el administrador/encargado autorizado puede iniciar una corrección controlada\.

Pero no se debe editar:

Recibido 10 → cambiar manualmente a 8

Se necesitan movimientos compensatorios y resolución de diferencia\.

__30\. Anulación de pago__

Ya definida:

Significa que el pago fue registrado por error\.

Efecto:

Pago confirmado

      ↓

Anulación

      ↓

Restaurar saldo de las deudas

El pago permanece visible como ANULADO\.

__31\. Reembolso__

Significa:

El pago fue real, pero luego se devolvió dinero al cliente\.

Por tanto:

Pago original permanece confirmado

\+

Reembolso nuevo

No se anula el pago real\.

__32\. Comparación importante__

__Situación__

__Operación__

Registré por error un pago inexistente

Anulación de pago

Cliente realmente pagó y luego le devuelvo dinero

Reembolso

Registré una venta duplicada

Anulación de venta

Cliente recibió producto y luego lo regresa

Devolución

Conteo muestra diferencia

Ajuste

Producto perdido reaparece

Entrada por recuperación

Esta tabla debe formar parte de la documentación funcional\.

__33\. Día abierto__

Mientras el cierre no esté confirmado:

- Encargado autorizado puede resolver ciertas anulaciones\.
- Administrador tiene permisos más amplios\.
- Todo cambio debe registrarse\.

__34\. Día cerrado__

Regla:

Las operaciones de un día cerrado no se modifican silenciosamente\.

Si se requiere corrección:

- Administrador general\.
- Motivo obligatorio\.
- Posible reapertura\.
- O movimiento regularizador en fecha actual, según el caso\.

__35\. Reapertura de cierre__

Ya se definió que será excepcional\.

Flujo:

Cierre confirmado

       ↓

Administrador solicita reapertura

       ↓

Motivo obligatorio

       ↓

Reabrir

       ↓

Realizar corrección

       ↓

Volver a cerrar

Debe conservarse:

- Cierre original\.
- Fecha de reapertura\.
- Responsable\.
- Motivo\.
- Nuevo cierre\.

__36\. Cuándo conviene no reabrir__

No toda corrección histórica debe obligar a reabrir\.

Ejemplo:

Producto perdido ayer aparece hoy\.

No es necesario modificar ayer\.

Hoy se registra:

ENTRADA\_RECUPERACION

Esto refleja mejor la realidad\.

La reapertura debe usarse principalmente cuando existe un error documental/material que realmente invalida el cierre anterior\.

__37\. Operaciones offline pendientes__

Una operación local no sincronizada aún no es una operación oficial confirmada\.

Puede:

CANCELARSE LOCALMENTE

antes de enviarse\.

No requiere una reversión del servidor\.

__38\. Operación offline ya sincronizada__

Desde el momento en que Laravel la acepta:

Se aplican exactamente las mismas reglas que a cualquier operación online\.

No puede borrarse desde IndexedDB y asumir que desapareció del servidor\.

__39\. Operación offline que llega a día cerrado__

Ejemplo:

Venta realizada: ayer 18:00

Sincronización: hoy 08:00

Si ayer está cerrado:

CONFLICTO\_DIA\_CERRADO

El administrador deberá decidir:

- Reabrir\.
- Rechazar\.
- Regularizar hoy\.

La venta no se inserta silenciosamente\.

__40\. Reversión de lotes__

Una reversión debe intentar restaurar exactamente las asignaciones originales\.

Ejemplo:

Venta:

Lote A → 3

Lote B → 2

Anulación:

Lote A ← 3

Lote B ← 2

Esto mantiene trazabilidad PEPS\.

__41\. Lote original ya no disponible lógicamente__

Puede haber casos complejos por operaciones posteriores\.

Ejemplo:

1. Venta consume lote A\.
2. Después ocurren otros movimientos\.
3. Se intenta anular la venta antigua\.

La reversión puede volver a crear disponibilidad en el lote A siempre que el producto físico realmente regrese\.

Pero si se trata solo de una corrección documental sin devolución física, no se debe aumentar inventario\.

Por eso:

Toda anulación que afecte inventario debe indicar si existe retorno físico real\.

__42\. Anulación comercial sin retorno físico__

Ejemplo raro:

Se decide cancelar económicamente una venta pero el producto no volvió\.

Entonces:

- No debe aumentar stock\.
- Se requiere una operación financiera/comercial diferente\.
- El inventario sigue mostrando que el producto salió\.

Esto evita inventario ficticio\.

__43\. Evidencias opcionales__

Para operaciones sensibles podremos permitir adjuntos:

- Foto del producto devuelto\.
- Documento\.
- Foto de daño\.
- Comprobante de reembolso\.
- Informe de pérdida\.

No será obligatorio en todos los casos, pero la estructura puede soportarlo\.

__44\. Motivos estandarizados__

Recomiendo utilizar catálogos de motivos y campo de detalle adicional\.

Ejemplo para anulación de venta:

- Venta duplicada\.
- Error de producto\.
- Error de cantidad\.
- Error de cliente\.
- Operación no realizada\.
- Otro\.

Para devolución:

- Producto defectuoso\.
- Producto incorrecto\.
- Cliente desistió\.
- Garantía\.
- Otro\.

Esto mejora reportes\.

__45\. Autorizaciones__

__Vendedor__

Puede:

- Cancelar sus propios borradores\.
- Solicitar devolución/anulación\.
- No ejecutar anulaciones confirmadas\.

__Almacenero__

Puede:

- Registrar recepción física de devolución\.
- Informar estado del producto\.
- No resolver la parte financiera\.

__Encargado__

Puede:

- Anular operaciones del mismo día según permisos\.
- Aprobar devoluciones locales\.
- Realizar ajustes locales\.
- No reabrir cierres\.

__Administrador general__

Puede:

- Resolver casos de cualquier sucursal\.
- Reabrir cierres\.
- Autorizar ajustes extraordinarios\.
- Resolver correcciones de costo/valorización\.

__46\. Matriz funcional resumida__

__Acción__

__Vendedor__

__Almacenero__

__Encargado__

__Admin__

Cancelar borrador propio

Sí

Sí

Sí

Sí

Anular venta confirmada

No

No

Limitado

Sí

Registrar devolución física

Sí/solicitar

Sí

Sí

Sí

Aprobar devolución

No

No

Sí

Sí

Anular entrada

No

No

Limitado

Sí

Anular pago

No

No

Limitado

Sí

Registrar reembolso

No

No

Con permiso

Sí

Ajuste valorización

No

No

No

Sí

Reabrir cierre

No

No

No

Sí

__47\. Auditoría mínima__

Toda corrección debe registrar:

- Operación original\.
- Tipo de corrección\.
- Usuario solicitante\.
- Usuario autorizador\.
- Motivo\.
- Fecha y hora\.
- Sucursal\.
- Dispositivo\.
- Cantidades\.
- Valores\.
- Lotes\.
- Estado anterior\.
- Estado posterior\.

__48\. Reportes__

Podremos generar:

- Ventas anuladas\.
- Devoluciones\.
- Devoluciones parciales\.
- Entradas anuladas\.
- Salidas anuladas\.
- Pagos anulados\.
- Reembolsos\.
- Ajustes\.
- Reaperturas de cierre\.
- Correcciones administrativas\.
- Operaciones por motivo\.
- Operaciones por autorizador\.

__49\. Alertas__

- Anulación pendiente\.
- Devolución pendiente de revisión\.
- Reembolso pendiente\.
- Operación de día cerrado\.
- Reversión incompleta\.
- Ajuste extraordinario\.
- Corrección de costo pendiente\.
- Operación offline en conflicto\.
- Alto número de anulaciones por usuario\.

__50\. Reglas funcionales definitivas del Proceso 11__

1. Los borradores pueden cancelarse sin reversión\.
2. Las operaciones confirmadas no se eliminan\.
3. Una anulación crea efectos inversos cuando corresponde\.
4. Anulación y devolución son conceptos distintos\.
5. Reembolso y anulación de pago son conceptos distintos\.
6. Una devolución debe relacionarse con la venta original\.
7. No puede devolverse más de lo vendido\.
8. Debe registrarse el estado físico de lo devuelto\.
9. Una devolución vendible vuelve a stock disponible\.
10. Una devolución dañada vuelve a stock dañado\.
11. La valorización de devolución se basa en la salida original\.
12. La devolución puede reducir deuda pendiente\.
13. Si corresponde devolver dinero, se registra reembolso\.
14. No habrá saldo a favor en V1\.
15. Una entrada parcialmente consumida no puede anularse libremente\.
16. Una salida revertida intenta restaurar los lotes originales\.
17. Una pérdida recuperada se registra como nueva entrada\.
18. Una transferencia enviada no puede cancelarse directamente\.
19. Un pago confirmado no se edita\.
20. Una anulación de pago restaura las deudas afectadas\.
21. Un reembolso conserva el pago original\.
22. Los días cerrados no se modifican silenciosamente\.
23. Solo el administrador puede reabrir un cierre\.
24. Las operaciones offline no sincronizadas pueden cancelarse localmente\.
25. Las ya sincronizadas siguen las reglas normales\.
26. Una operación offline tardía puede generar conflicto de cierre\.
27. Toda corrección requiere motivo\.
28. Las operaciones sensibles requieren autorización\.
29. Los movimientos históricos permanecen visibles\.
30. Toda corrección queda auditada\.

__51\. Criterios de aceptación del Proceso 11__

El proceso estará aprobado cuando:

- Un borrador pueda cancelarse sin afectar inventario\.
- Una operación confirmada no pueda eliminarse\.
- Una anulación genere correctamente su reversión\.
- Una devolución parcial no permita superar lo vendido\.
- Una devolución dañada no aumente stock vendible\.
- La reversión restituya correctamente lotes cuando corresponda\.
- Una venta con deuda pendiente ajuste correctamente su cuenta por cobrar\.
- Una venta pagada no elimine pagos existentes\.
- Los reembolsos se registren por separado\.
- Una entrada consumida no pueda anularse incorrectamente\.
- Una transferencia enviada no pueda desaparecer\.
- Una pérdida recuperada tenga historial separado\.
- Las operaciones de día cerrado requieran tratamiento especial\.
- Las correcciones offline respeten el estado oficial\.
- Toda operación sensible tenga trazabilidad de usuario y motivo\.

__Resultado del Proceso 11__

Queda funcionalmente definido:

__El sistema utilizará una política de inmutabilidad: las operaciones confirmadas no se borrarán ni se editarán directamente\. Las correcciones se realizarán mediante anulaciones, devoluciones, reversiones, ajustes o reembolsos explícitos, conservando siempre la relación con la operación original y su efecto en inventario, Kardex y cuentas por cobrar\.__

El siguiente proceso de la __Etapa 3__ es el __Proceso 12: Conteo físico y cierre diario__, donde unificaremos inventario físico, diferencias, caja, ventas, cobros, transferencias, operaciones offline pendientes, conflictos, aprobación del cierre y reapertura administrativa\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 12: Conteo físico y cierre diario__

Este proceso corresponde principalmente al __Módulo 9: Cierre diario__, pero integra información de:

- Inventario\.
- Ventas\.
- Otras salidas\.
- Compras y entradas\.
- Transferencias\.
- Pagos\.
- Cuentas por cobrar\.
- Kits\.
- PWA y sincronización\.
- Kardex\.
- Auditoría\.

La regla principal será:

__El cierre diario no modifica movimientos anteriores para “hacer cuadrar” la información; primero detecta diferencias y luego genera ajustes o incidencias debidamente autorizadas\.__

__1\. Objetivo funcional__

Cerrar formalmente las operaciones de una sucursal para un día determinado, verificando:

- Ventas\.
- Cobros\.
- Entradas\.
- Otras salidas\.
- Transferencias\.
- Pagos\.
- Inventario físico\.
- Diferencias\.
- Operaciones offline\.
- Conflictos\.
- Kits y armados\.
- Estado del Kardex\.

El cierre debe dejar una fotografía confiable del día\.

__2\. Dos componentes del cierre__

Conviene separar conceptualmente:

__Cierre operativo__

Verifica:

- Inventario\.
- Entradas\.
- Salidas\.
- Transferencias\.
- Kits\.
- Conflictos\.
- Sincronización\.

__Cierre de caja/cobranzas__

Verifica:

- Efectivo\.
- Yape\.
- Plin\.
- Transferencias bancarias\.
- Tarjetas\.
- Cobros de ventas\.
- Cobros de deudas anteriores\.
- Reembolsos\.

Ambos formarán parte del mismo cierre diario, pero se mostrarán en secciones diferentes\.

__3\. Estados del cierre__

Propongo:

- PENDIENTE
- EN\_PREPARACION
- CON\_DIFERENCIAS
- PENDIENTE\_APROBACION
- CONFIRMADO
- REABIERTO
- ANULADO

Flujo normal:

PENDIENTE

   ↓

EN\_PREPARACION

   ↓

¿Hay diferencias?

 ┌────────────┴────────────┐

 Sí                        No

 ↓                         ↓

CON\_DIFERENCIAS       PENDIENTE\_APROBACION

      ↓                       ↓

Resolver                 Confirmar

      └───────────────→ CONFIRMADO

__4\. Quién realiza el cierre__

Recomendación:

__Vendedor__

- No confirma cierre\.
- Puede revisar sus ventas/cobros si se desea\.

__Almacenero__

- Puede participar en conteo físico\.
- No confirma cierre financiero\.

__Encargado de sucursal__

- Prepara y confirma el cierre de su sucursal\.
- Siempre que no existan incidencias que requieran administrador\.

__Administrador general__

- Puede revisar todos los cierres\.
- Resolver excepciones\.
- Reabrir cierres\.

__5\. Momento del cierre__

Cada sucursal tendrá un cierre por:

Sucursal \+ fecha operativa

Ejemplo:

Mazuko

06/08/2026

No recomiendo fijar desde ahora una hora obligatoria porque puede variar por sucursal\.

Podrá existir una hora de referencia configurable posteriormente\.

__6\. Un solo cierre oficial por día y sucursal__

Regla:

Una sucursal no puede tener dos cierres oficiales independientes para la misma fecha\.

Puede tener:

- Un cierre confirmado\.
- Reaperturas controladas\.
- Versiones/auditoría del mismo cierre\.

__7\. Inicio del cierre__

Al iniciar:

Seleccionar fecha

      ↓

Sistema recopila movimientos

      ↓

Verificar sincronización

      ↓

Verificar conflictos

      ↓

Preparar resumen

El sistema debe calcular automáticamente todo lo posible\.

El usuario no debería volver a escribir manualmente cifras que ya existen\.

__8\. Resumen de ventas__

El cierre mostrará:

- Número de ventas\.
- Total vendido\.
- Ventas al contado\.
- Ventas al crédito\.
- Ventas parciales\.
- Ventas anuladas\.
- Devoluciones\.

Ejemplo:

__Concepto__

__Total__

Ventas brutas

S/ 12,000

Devoluciones

S/ 500

Ventas netas

S/ 11,500

La fórmula comercial final podrá ajustarse cuando definamos reportes, pero las operaciones estarán separadas\.

__9\. Ventas vs cobros__

Esto debe mantenerse muy claro\.

Ejemplo:

Ventas del día: S/ 10,000

No significa:

Dinero recibido: S/ 10,000

Puede ser:

Ventas contado:        6,000

Ventas crédito:        4,000

Cobros de deuda vieja: 1,500

Entonces:

Ventas: S/ 10,000

Cobros: S/ 7,500

__10\. Resumen de cobros__

Debe mostrar por separado:

- Cobros de ventas del día\.
- Cobros de deudas anteriores\.
- Pagos iniciales\.
- Reembolsos\.
- Anulaciones de pagos\.

Y por método:

- Efectivo\.
- Yape\.
- Plin\.
- Transferencia\.
- Depósito\.
- Tarjeta\.
- Otro\.

__11\. Caja de efectivo__

Para efectivo tendremos:

Efectivo esperado

y:

Efectivo contado

Ejemplo:

Esperado: S/ 2,500

Contado: S/ 2,480

Diferencia: \-S/ 20

El sistema no cambia pagos para que cuadren\.

Se registra:

Diferencia de caja: \-20

con explicación\.

__12\. Fondo inicial de caja__

Recomiendo dejar preparado:

fondo\_inicial

Ejemplo:

Fondo inicial: S/ 300

Cobros efectivo: S/ 2,500

Reembolsos efectivo: S/ 100

Efectivo esperado:

300 \+ 2,500 \- 100 = 2,700

Si la empresa no utiliza fondo fijo, puede ser cero\.

__13\. Retiros o entregas de efectivo__

Puede ocurrir que durante el día se retire dinero de caja\.

Ejemplo:

Retiro a administración: S/ 1,000

Entonces el cierre debería soportar:

- Fondo inicial\.
- Ingresos\.
- Egresos autorizados\.
- Efectivo esperado final\.

No lo confundiremos con gastos contables completos; será control de caja\.

__14\. Fórmula conceptual de efectivo__

Efectivo esperado final =

fondo inicial

\+ cobros en efectivo

\- reembolsos en efectivo

\- retiros autorizados

\+ ingresos de caja autorizados

No incluiremos Yape o transferencias bancarias dentro del efectivo físico\.

__15\. Otros métodos de pago__

Para Yape, Plin, transferencia, etc\., el cierre mostrará:

- Total\.
- Número de operaciones\.
- Posibles referencias\.

No habrá conciliación bancaria automática en V1\.

Eso puede ser una fase futura\.

__16\. Entradas del día__

El cierre operativo mostrará:

- Compras\.
- Inventario inicial, si corresponde\.
- Ajustes positivos\.
- Devoluciones de clientes\.
- Transferencias recibidas\.
- Armados de kits\.

Con:

- Número de operaciones\.
- Cantidades\.
- Valor, para roles con permiso\.

__17\. Otras salidas__

Separadas de ventas:

- Uso interno\.
- Daños\.
- Pérdidas\.
- Ajustes negativos\.
- Devoluciones a proveedor\.
- Entregas no comerciales\.
- Consumo para armado\.

Esto permite identificar movimientos sensibles durante el cierre\.

__18\. Transferencias__

El cierre deberá mostrar:

__Enviadas__

- Preparadas\.
- Enviadas\.
- En tránsito\.

__Recibidas__

- Recibidas\.
- Parciales\.
- Con diferencia\.

Una transferencia en tránsito no bloquea necesariamente el cierre si está correctamente registrada\.

Una transferencia con conflicto crítico sí puede bloquearlo\.

__19\. Kits__

Debe verificarse:

- Órdenes de armado terminadas\.
- Órdenes pendientes\.
- Componentes reservados\.
- Kits terminados creados correctamente\.
- Diferencias de armado\.
- Operaciones offline de kits\.

No debemos cerrar con una operación de armado en estado inconsistente\.

__20\. Operaciones offline pendientes__

Regla ya aprobada:

No se puede confirmar un cierre mientras existan operaciones del día pendientes de sincronización\.

Ejemplos:

- Venta offline\.
- Pago offline\.
- Uso interno offline\.
- Cliente relacionado con una venta pendiente\.
- Conteo pendiente\.

__21\. Cómo sabe el servidor que hay operaciones offline pendientes__

Esto tiene una limitación importante:

Si un dispositivo está completamente desconectado, el servidor no sabe necesariamente que tiene operaciones locales\.

Por eso necesitamos complementar con reglas de dispositivo\.

Recomiendo que el cierre muestre:

- Dispositivos autorizados de la sucursal\.
- Última sincronización de cada uno\.
- Operaciones pendientes conocidas\.

Ejemplo:

Caja 1: sincronizada 19:55

Caja 2: última conexión 16:30

Si Caja 2 no volvió a conectarse, el encargado debe verificarla antes del cierre\.

__22\. Confirmación de dispositivos__

Podemos implementar una regla práctica:

Antes de cerrar:

Todos los dispositivos operativos deben:

\- sincronizar

o

\- marcarse como sin operaciones pendientes por el encargado

Para V1, esto puede ser una validación operacional más que una garantía técnica absoluta\.

__23\. Conflictos__

No se puede cerrar si existen conflictos críticos del día como:

- Venta con stock insuficiente\.
- Pago superior al saldo\.
- Kit con componentes insuficientes\.
- Operación de día cerrado pendiente\.
- Ajuste no resuelto\.
- Diferencia de transferencia pendiente crítica\.

__24\. Diferencias no críticas__

Algunas alertas podrían no bloquear\.

Ejemplo:

- Producto sin ubicación\.
- Lote antiguo\.
- Stock bajo\.

Estas son advertencias, no motivos para impedir cierre\.

Debemos diferenciar:

ALERTA

de:

BLOQUEO DE CIERRE

__25\. Conteo físico diario__

Aquí debemos ser realistas\.

No recomiendo obligar a contar __todo el inventario completo cada día__ si hay miles de repuestos\.

Sería demasiado pesado\.

Para el cierre diario recomiendo:

- Conteos selectivos\.
- Conteo de caja obligatorio\.
- Conteo de productos críticos/opcionales según política\.

El inventario general completo puede hacerse periódicamente\.

__26\. Tipos de conteo relacionados al cierre__

__Conteo puntual__

Productos con movimiento significativo o diferencia\.

__Conteo por ubicación/categoría__

Para controles parciales\.

__Conteo general__

Inventario físico completo, por ejemplo:

- Inicio del sistema\.
- Auditoría mensual/trimestral\.
- Situación extraordinaria\.

No debe ser requisito diario para miles de referencias\.

__27\. Conteo ciego__

Recomiendo soportar opcionalmente:

El trabajador cuenta sin ver inicialmente la cantidad esperada\.

Esto reduce el sesgo de copiar el número del sistema\.

Ejemplo:

Producto RK\-428

Cantidad física: \[   \]

Luego el sistema compara\.

Puede usarse para auditorías importantes\.

__28\. Conteo normal__

Para controles rápidos sí puede mostrarse:

Sistema: 10

Físico: \[ 9 \]

La modalidad dependerá del tipo de conteo\.

__29\. Diferencia de inventario__

Ejemplo:

Sistema: 10

Físico: 8

Diferencia: \-2

El cierre no cambia el stock automáticamente\.

Genera:

DIFERENCIA PENDIENTE

Luego:

Revisión

   ↓

Ajuste autorizado

__30\. ¿Puede cerrarse con diferencia de inventario?__

Mi recomendación:

__Diferencia detectada pero no resuelta__

No cerrar\.

__Diferencia revisada y justificada__

Debe generarse el ajuste correspondiente antes de confirmar, salvo que el administrador la deje explícitamente como incidencia pendiente excepcional\.

Para V1, la regla más segura es:

Diferencias materiales del conteo utilizado para cierre deben resolverse antes de confirmar\.

__31\. Ajuste derivado del conteo__

Si:

Físico > sistema

se genera:

AJUSTE\_POSITIVO

Si:

Físico < sistema

se genera:

AJUSTE\_NEGATIVO

El encargado confirma según sus permisos\.

El cierre luego recoge el nuevo saldo\.

__32\. No modificar el conteo para que cuadre__

El registro original del conteo debe conservarse\.

Ejemplo:

Primer conteo: 8

Sistema: 10

Si se hace reconteo:

Segundo conteo: 9

No borramos el primer conteo\.

Podemos tener:

- Conteo inicial\.
- Reconteo\.
- Cantidad final aprobada\.

Esto da mejor auditoría\.

__33\. Proceso de reconteo__

Diferencia detectada

      ↓

Solicitar reconteo

      ↓

Segundo responsable cuenta

      ↓

Comparar

      ↓

Definir cantidad física aprobada

Esto es recomendable para diferencias importantes\.

__34\. Umbral para reconteo__

No tenemos política del negocio para decidir:

- Cuántas unidades\.
- Qué valor monetario\.

Por tanto debe ser configurable posteriormente\.

Ejemplo futuro:

Diferencia > S/ 1,000

→ doble conteo obligatorio

No fijaremos un monto ahora\.

__35\. Consistencia Kardex–Inventario–Lotes__

Antes del cierre el sistema ejecutará verificaciones:

Último saldo Kardex

=

Inventario

y:

Inventario físico registrado

=

Suma de lotes

Si no coincide:

Bloqueo crítico de cierre\.

No debería corregirse automáticamente\.

__36\. Valor del inventario al cierre__

Para roles autorizados:

Valor inventario =

stock valorizable × costo promedio

El cierre puede guardar una fotografía del valor por sucursal\.

Esto permitirá después comparar:

- Inicio del día\.
- Fin del día\.
- Variaciones\.

__37\. Snapshot del cierre__

Al confirmar, recomiendo guardar un resumen inmutable:

- Fecha\.
- Sucursal\.
- Totales de ventas\.
- Totales de cobros\.
- Totales por método\.
- Entradas\.
- Salidas\.
- Transferencias\.
- Ajustes\.
- Última secuencia de Kardex\.
- Valor de inventario\.
- Usuario confirmador\.
- Fecha/hora\.

No sustituye los movimientos originales; sirve como fotografía de control\.

__38\. No duplicar información innecesariamente__

El snapshot debe guardar principalmente:

- Totales\.
- Referencias de secuencia\.
- Estados\.

Los detalles seguirán consultándose desde las operaciones originales\.

Así evitamos tener dos fuentes distintas que puedan divergir\.

__39\. Flujo completo de cierre__

Iniciar cierre

      ↓

Verificar dispositivos/sincronización

      ↓

Verificar conflictos

      ↓

Cargar ventas y cobros

      ↓

Cargar entradas/salidas

      ↓

Cargar transferencias

      ↓

Verificar kits

      ↓

Realizar conteos requeridos

      ↓

Registrar efectivo físico

      ↓

Calcular diferencias

      ↓

Resolver incidencias

      ↓

Validar Kardex/inventario/lotes

      ↓

Confirmar cierre

__40\. Datos del cierre__

Cada cierre tendrá:

- Sucursal\.
- Fecha operativa\.
- Estado\.
- Usuario iniciador\.
- Usuario confirmador\.
- Fecha/hora inicio\.
- Fecha/hora confirmación\.
- Fondo inicial\.
- Efectivo esperado\.
- Efectivo contado\.
- Diferencia de caja\.
- Observaciones\.
- Totales de ventas\.
- Totales de cobros\.
- Totales de movimientos\.
- Última secuencia Kardex\.
- Número de incidencias\.
- Número de conflictos\.
- Versión del cierre\.

__41\. Diferencia de caja__

Ejemplo:

Esperado: 2,700

Físico: 2,680

Diferencia: \-20

Debe obligar a:

- Introducir motivo\.
- Identificar responsable/encargado\.
- Aprobar según reglas\.

No se ajustan pagos individualmente sin evidencia\.

__42\. Sobrante de caja__

También puede existir:

Esperado: 2,700

Físico: 2,720

Diferencia: \+20

Mismo tratamiento:

- Registrar diferencia\.
- Justificar\.
- No inventar una venta o pago\.

__43\. ¿Bloquear cierre por cualquier diferencia de caja?__

Recomendación:

El sistema debe detectar siempre la diferencia, pero el negocio puede establecer tolerancia\.

Como no tenemos una política real:

Dejar la tolerancia configurable\.

Inicialmente podemos ser estrictos:

Diferencia ≠ 0

→ requiere justificación y autorización del encargado

Pero no necesariamente administrador para un monto mínimo\.

__44\. Cierre con transferencia en tránsito__

Sí puede cerrarse\.

Ejemplo:

Transferencia enviada hoy

Estado: EN\_TRANSITO

Está correctamente registrada\.

No hay inconsistencia\.

El cierre muestra:

Transferencia en tránsito

No es un bloqueo\.

__45\. Cierre con recepción parcial__

Puede cerrarse si:

- La recepción parcial fue confirmada correctamente\.
- El saldo en tránsito está identificado\.
- No hay diferencia no registrada\.

El problema no es que esté parcial; el problema es que esté inconsistente\.

__46\. Cierre con producto dañado pendiente__

Si el producto está correctamente marcado como DAÑADO:

No necesariamente bloquea cierre\.

Sí debe aparecer como incidencia/estado de inventario\.

Si existe una baja pendiente de aprobación, puede mostrarse como pendiente\.

__47\. Cierre con pérdida reportada no aprobada__

Aquí recomiendo bloquear si afecta el conteo del día\.

Porque el sistema aún considera físicamente algo que el trabajador dice que no existe\.

Debe resolverse:

- Aparece producto\.
- Se rechaza reporte\.
- Se aprueba pérdida/ajuste\.

__48\. Cierre con venta offline en conflicto__

Bloqueado\.

No podemos confirmar cifras mientras no sepamos si esa venta será aceptada\.

__49\. Cierre con cliente duplicado offline__

Si el cliente duplicado pertenece a una venta pendiente:

Bloquea indirectamente porque la venta no está resuelta\.

Si solo se creó un cliente y no tiene operación relacionada, puede no bloquear cierre\.

__50\. Confirmación__

Al confirmar:

estado = CONFIRMADO

y el día queda protegido contra modificaciones operativas normales\.

Operaciones posteriores que intenten afectar esa fecha deberán pasar por reglas administrativas\.

__51\. Qué se bloquea después del cierre__

No se permitirá normalmente:

- Crear venta retroactiva\.
- Crear pago retroactivo\.
- Ajustar inventario con fecha cerrada\.
- Anular libremente operación del día\.
- Cambiar conteos\.
- Modificar totales\.

Sí se puede:

- Consultar\.
- Exportar\.
- Generar reportes\.

__52\. Operaciones del día siguiente__

El cierre no “reinicia” el stock\.

El saldo final continúa siendo el saldo inicial operativo del siguiente día\.

Kardex sigue de forma perpetua\.

No tendremos un Kardex nuevo cada día\.

__53\. Reapertura__

Ya aprobada como excepción administrativa\.

Solo:

Administrador general\.

Flujo:

Cierre confirmado

      ↓

Solicitar reapertura

      ↓

Motivo obligatorio

      ↓

Reabrir

      ↓

Correcciones

      ↓

Nueva validación

      ↓

Confirmar nuevamente

__54\. Versiones del cierre__

Recomiendo mantener:

Cierre versión 1

Reapertura

Cierre versión 2

No eliminar V1\.

Podremos saber:

- Qué se cambió\.
- Por qué\.
- Quién lo hizo\.

__55\. Operación tardía y cierre__

Ejemplo:

Venta offline realizada ayer

Sincroniza hoy

Ayer cerrado

Resultado:

CONFLICTO\_DIA\_CERRADO

No se incorpora sola\.

Administrador decide:

__Opción A__

Reabrir el cierre anterior\.

__Opción B__

Regularizar en fecha actual\.

__Opción C__

Rechazar la operación, si realmente no ocurrió o debe corregirse\.

Debe registrarse la decisión\.

__56\. Cuándo recomendar reapertura__

Principalmente cuando:

- Operación realmente pertenecía al día cerrado\.
- Afecta significativamente caja/inventario\.
- Se necesita que el reporte histórico refleje correctamente ese día\.

Para incidencias que físicamente ocurren después, es mejor movimiento actual\.

__57\. Cierre central y sucursales__

Cada sucursal realiza su propio cierre\.

El administrador general tendrá un tablero:

__Sucursal__

__Fecha__

__Estado__

Juliaca

06/08

Confirmado

Mazuko

06/08

Confirmado

Huepetuhe

06/08

Pendiente

\.\.\.

06/08

Con diferencias

Esto permitirá saber rápidamente qué tienda falta cerrar\.

__58\. ¿Habrá cierre global?__

Recomiendo que el sistema pueda generar un __resumen consolidado__ de cierres, pero no necesariamente un segundo proceso de cierre global\.

Es decir:

Cierres por sucursal

       ↓

Reporte consolidado empresa

La administración puede revisar todas, sin bloquear toda la empresa porque una sucursal aún no cerró\.

__59\. Reporte de cierre__

Debe poder mostrar:

__Cabecera__

- Sucursal\.
- Fecha\.
- Responsable\.
- Estado\.

__Comercial__

- Ventas\.
- Devoluciones\.
- Crédito\.

__Caja__

- Cobros\.
- Métodos\.
- Efectivo\.
- Diferencia\.

__Inventario__

- Entradas\.
- Salidas\.
- Ajustes\.
- Conteos\.

__Transferencias__

- Enviadas\.
- Recibidas\.
- En tránsito\.

__Incidencias__

- Daños\.
- Pérdidas\.
- Conflictos\.
- Reaperturas\.

__60\. Exportación__

Posteriormente podrá exportarse:

- PDF\.
- Excel\.

El documento deberá mostrar si es:

CONFIRMADO

o:

REABIERTO / VERSIÓN POSTERIOR

para evitar confusión\.

__61\. Alertas__

El cierre alimentará alertas como:

- Sucursal sin cerrar\.
- Diferencia de caja\.
- Diferencia de inventario\.
- Operaciones offline pendientes\.
- Conflicto pendiente\.
- Dispositivo sin sincronizar\.
- Transferencia con diferencia\.
- Kit incompleto\.
- Cierre reabierto\.
- Cierre atrasado\.

__62\. Permisos__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Ver cierre local

Sí

Sí

Limitado

Limitado

Iniciar cierre

Sí

Sí

No

No

Registrar conteo

Sí

Sí

Sí

No

Registrar efectivo

Sí

Sí

No

Según función

Resolver diferencia inventario

Sí

Sí con permiso

No

No

Confirmar cierre

Sí

Sí

No

No

Reabrir cierre

Sí

No

No

No

Ver cierres globales

Sí

No/limitado

No

No

__63\. Bloqueos definitivos de cierre__

Para V1 recomiendo bloquear confirmación si existe al menos uno de estos casos:

1. Venta pendiente de sincronización\.
2. Pago pendiente de sincronización\.
3. Conflicto crítico\.
4. Inventario ≠ lotes\.
5. Kardex ≠ inventario\.
6. Diferencia de conteo requerida sin resolver\.
7. Pérdida que afecta el inventario y no está resuelta\.
8. Orden de armado inconsistente\.
9. Recepción/transferencia con estado imposible\.
10. Operación financiera dependiente sin resolver\.

__64\. Elementos que generan advertencia pero no necesariamente bloqueo__

- Stock bajo\.
- Producto agotado\.
- Producto dañado correctamente registrado\.
- Lote antiguo\.
- Transferencia válida en tránsito\.
- Deuda vencida de cliente\.
- Producto sin ubicación\.
- Kit con baja disponibilidad futura\.

__65\. Reglas funcionales definitivas del Proceso 12__

1. Existe un cierre diario por sucursal y fecha\.
2. Ventas y cobros se presentan por separado\.
3. El efectivo físico se compara contra el esperado\.
4. Las diferencias de caja se registran, no se ocultan\.
5. El cierre incluye entradas, salidas, transferencias y kits\.
6. No es obligatorio contar todo el catálogo diariamente\.
7. Se permiten conteos parciales y generales\.
8. Un conteo no modifica stock directamente\.
9. Las diferencias generan ajustes autorizados\.
10. Se conserva historial de conteos y reconteos\.
11. Kardex, inventario y lotes deben coincidir\.
12. No se cierra con operaciones offline críticas pendientes\.
13. No se cierra con conflictos críticos\.
14. Transferencias válidas en tránsito no bloquean\.
15. Recepciones parciales válidas pueden permanecer abiertas\.
16. Productos dañados correctamente clasificados no bloquean\.
17. El cierre guarda una fotografía/resumen del día\.
18. Una vez confirmado, el día queda protegido\.
19. Solo el administrador reabre\.
20. Las reaperturas conservan versiones históricas\.
21. Operaciones offline tardías no modifican silenciosamente un cierre\.
22. Cada sucursal cierra independientemente\.
23. El administrador puede consultar un consolidado global\.
24. El cierre no reinicia Kardex ni inventario\.
25. Todo cierre y reapertura queda auditado\.

__66\. Criterios de aceptación del Proceso 12__

El proceso estará aprobado cuando:

- El cierre calcule automáticamente ventas y cobros\.
- Los métodos de pago cuadren correctamente\.
- El efectivo esperado pueda compararse con el físico\.
- Las diferencias requieran explicación\.
- Entradas, salidas y transferencias aparezcan correctamente\.
- Un conteo con diferencia no cambie stock automáticamente\.
- Los ajustes resuelvan diferencias de forma trazable\.
- Kardex, inventario y lotes sean validados antes de cerrar\.
- No pueda cerrarse con ventas/pagos pendientes de sincronización\.
- Un conflicto crítico bloquee el cierre\.
- Una transferencia normal en tránsito no lo bloquee\.
- Un cierre confirmado proteja la fecha\.
- Solo el administrador pueda reabrirlo\.
- Se mantenga la versión anterior después de una reapertura\.
- El administrador pueda ver qué sucursales cerraron y cuáles no\.

__Resultado del Proceso 12__

Queda funcionalmente definido:

__El cierre diario será un control por sucursal que consolidará ventas, cobros, movimientos de inventario, transferencias, conteos y operaciones offline\. El sistema validará la consistencia entre Kardex, inventario y lotes antes de confirmar y no permitirá cerrar mientras existan conflictos críticos o movimientos pendientes\. Las reaperturas serán excepcionales y exclusivas del administrador general\.__

Con esto ya tenemos definidos __12 procesos funcionales principales__ de la Etapa 3\. El siguiente es el __Proceso 13: PWA, operación offline y sincronización__, donde corresponde consolidar toda la lógica que hemos ido definiendo: IndexedDB, dispositivos autorizados, cola local, UUID, orden de sincronización, reintentos, idempotencia, detección de conectividad y qué ocurre exactamente desde que una sucursal pierde internet hasta que vuelve a conectarse\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 13: PWA, operación offline y sincronización__

Este proceso corresponde al __Módulo 13: PWA, sincronización y conflictos__ y es transversal a casi todo el sistema\.

Se relaciona directamente con:

- Usuarios y dispositivos\.
- Catálogo\.
- Clientes\.
- Ventas\.
- Pagos\.
- Inventario\.
- Lotes\.
- Kits\.
- Conteos\.
- Cierre diario\.
- Conflictos\.

La regla central será:

__La PWA permitirá trabajar temporalmente sin internet, pero PostgreSQL seguirá siendo la fuente oficial y Laravel validará toda operación al sincronizar\.__

__1\. Objetivo funcional__

Permitir que una sucursal continúe realizando operaciones esenciales cuando pierda conexión, evitando:

- Pérdida de información\.
- Duplicidad de ventas\.
- Duplicidad de pagos\.
- Stock local incoherente\.
- Operaciones incompletas\.
- Conflictos silenciosos\.
- Uso de información demasiado antigua sin advertencia\.

La PWA deberá:

1. Detectar pérdida de conexión\.
2. Seguir operativa con datos sincronizados\.
3. Guardar operaciones en IndexedDB\.
4. Generar UUID para cada operación\.
5. Mantener una cola local\.
6. Reintentar al recuperar conexión\.
7. Enviar operaciones a Laravel\.
8. Recibir aceptación, rechazo o conflicto\.
9. Actualizar el estado local\.
10. Refrescar datos oficiales\.

__2\. Fuente oficial de información__

Debemos distinguir:

__PostgreSQL__

Es la fuente oficial de:

- Stock\.
- Costos\.
- Lotes\.
- Clientes\.
- Deudas\.
- Ventas confirmadas\.
- Pagos confirmados\.
- Transferencias\.
- Kardex\.
- Cierres\.

__IndexedDB__

Es una copia local para:

- Consulta offline\.
- Operaciones provisionales\.
- Cola de sincronización\.
- Datos maestros necesarios\.

Nunca será considerada la base oficial\.

__3\. Arquitectura general__

                    INTERNET

                       │

                       ▼

                Laravel \+ API

                       │

                       ▼

                  PostgreSQL

                       ▲

                       │

                Sincronización

                       │

                       ▼

                PWA React

                       │

                       ▼

                  IndexedDB

Cuando hay conexión:

PWA ↔ Laravel ↔ PostgreSQL

Cuando no hay conexión:

PWA ↔ IndexedDB

__4\. Tecnología local definida__

Utilizaremos:

- IndexedDB\.
- Dexie\.js\.
- dexie\-react\-hooks\.
- Zod\.
- UUID v7\.
- Axios o fetch\.
- Workbox\.
- vite\-plugin\-pwa\.

No utilizaremos localStorage para operaciones críticas\.

__5\. Qué se almacenará localmente__

Cada dispositivo autorizado mantendrá una copia de los datos necesarios\.

__Catálogo__

- Productos activos\.
- Referencias\.
- Alias\.
- Nombre\.
- Marca\.
- Categoría\.
- Unidad\.
- Tipo\.
- Precio conocido\.
- Precio mínimo conocido\.
- Versiones de kits\.

__Inventario__

- Último stock sincronizado\.
- Stock local estimado\.
- Lotes conocidos\.
- Ubicaciones necesarias\.
- Reservas locales propias\.

__Clientes__

- Datos básicos\.
- Últimos saldos conocidos\.
- Deudas necesarias para cobro\.
- Clientes creados localmente\.

__Operaciones__

- Ventas pendientes\.
- Pagos pendientes\.
- Salidas permitidas\.
- Conteos\.
- Clientes nuevos\.
- Conflictos\.
- Historial de sincronización\.

__6\. Primer inicio de sesión__

Recomendación:

El primer inicio de sesión de un dispositivo debe requerir internet\.

Flujo:

Usuario ingresa credenciales

        ↓

Laravel autentica

        ↓

Verificar usuario

        ↓

Verificar sucursal

        ↓

Registrar/autorizar dispositivo

        ↓

Descargar datos iniciales

        ↓

Preparar IndexedDB

        ↓

Dispositivo listo para offline

No se permitirá instalar el sistema en un equipo desconocido y empezar a trabajar completamente offline sin haberlo autorizado antes\.

__7\. No almacenar contraseñas__

La PWA no guardará la contraseña del usuario en IndexedDB\.

Para offline se utilizará una sesión/token seguro previamente emitido y una política de duración controlada\.

Si la sesión requiere renovación y no hay internet, se aplicará una ventana offline limitada\.

La duración exacta se definirá técnicamente en la siguiente etapa\.

__8\. Dispositivo autorizado__

Cada equipo tendrá conceptualmente:

device\_id

uuid

usuario/s autorizados

sucursal

nombre dispositivo

último acceso

última sincronización

estado

Estados posibles:

- Autorizado\.
- Bloqueado\.
- Revocado\.
- Pendiente\.

__9\. Si un dispositivo es revocado__

Cuando vuelva a tener conexión:

Laravel detecta revocación

        ↓

Cerrar sesión

        ↓

Bloquear nuevas sincronizaciones

El manejo de operaciones locales pendientes en un dispositivo revocado deberá requerir revisión administrativa\.

No deben simplemente perderse\.

__10\. Detección de conexión__

No confiaremos solamente en:

navigator\.onLine

porque puede indicar conexión de red sin acceso real al servidor\.

Recomendación:

navigator\.onLine

\+

endpoint ligero de salud/sesión en Laravel

Así tendremos estados:

- Online\.
- Offline\.
- Servidor no disponible\.
- Sesión inválida\.

__11\. Indicador visual__

La interfaz debe mostrar claramente el estado\.

Ejemplo online:

__Conectado — datos actualizados__

Ejemplo offline:

__Sin conexión — trabajando con datos locales__

Y para stock:

__Stock local estimado — última sincronización 15:30__

Esto evita que el usuario confunda información local con información oficial\.

__12\. Pérdida de conexión durante una operación__

Ejemplo:

El vendedor está creando una venta y se pierde internet\.

La operación no debe desaparecer\.

La PWA debe poder continuar utilizando datos locales\.

Flujo:

Venta en proceso

        ↓

Se pierde conexión

        ↓

Continuar localmente

        ↓

Validar

        ↓

Guardar IndexedDB

        ↓

Marcar pendiente

__13\. UUID de operación__

Toda operación generada en el dispositivo tendrá UUID antes de intentar enviarse\.

Ejemplo:

0198f2\.\.\.

Ese UUID se conserva:

- En IndexedDB\.
- En el request a Laravel\.
- En PostgreSQL\.

Esto permite idempotencia\.

__14\. Estados locales de sincronización__

Propongo:

- LOCAL
- PENDIENTE
- SINCRONIZANDO
- SINCRONIZADA
- CONFLICTO
- RECHAZADA
- CANCELADA\_LOCAL
- DUPLICADA

Ejemplo:

Venta V\-local\-15

Estado: PENDIENTE

Después:

Estado: SINCRONIZADA

ID servidor: V\-001258

__15\. Cola de operaciones__

IndexedDB tendrá una cola\.

Ejemplo:

1\. CLIENTE nuevo

2\. VENTA

3\. PAGO venta

4\. CONTEO

No necesariamente se enviarán simplemente por created\_at; hay que respetar dependencias\.

__16\. Dependencias__

Ejemplo:

Cliente local C1

       ↓

Venta V1 usa C1

       ↓

Pago P1 usa V1

No puede enviarse:

P1 antes de V1

ni:

V1 antes de C1

Por eso cada operación podrá declarar dependencias\.

__17\. Orden recomendado de sincronización__

Inicialmente:

1. Clientes nuevos\.
2. Datos auxiliares permitidos\.
3. Ventas\.
4. Salidas\.
5. Pagos vinculados\.
6. Conteos\.
7. Borradores de solicitudes\.

Las operaciones administrativas sensibles no se confirmarán offline\.

__18\. Envío por lotes__

En lugar de hacer un request por cada movimiento, Laravel podrá aceptar un lote:

sync\_batch

con varias operaciones\.

Ejemplo:

Batch B001

Cliente C1

Venta V1

Pago P1

Venta V2

Cada operación conserva su UUID y resultado independiente\.

__19\. No aceptar parcialmente operaciones atómicas__

Una venta de kit por componentes es una única operación lógica\.

No puede pasar:

Componente A aceptado

Componente B rechazado

Debe ser:

Venta aceptada completa

o:

Venta en conflicto

Lo mismo para un armado\.

__20\. Validación local con Zod__

Antes de guardar una operación:

Formulario

   ↓

Zod

   ↓

¿Datos válidos?

Si no:

No guardar

Esto evita tener basura en la cola\.

Ejemplo:

- Cantidad <= 0\.
- Cliente faltante\.
- Pago negativo\.
- Vencimiento faltante\.

__21\. Pero la validación local no es suficiente__

Regla:

Una operación válida en React/Zod todavía puede ser inválida oficialmente\.

Laravel vuelve a validar:

- Permisos\.
- Stock\.
- Lotes\.
- Estado de producto\.
- Precios\.
- Cliente\.
- Saldo\.
- Cierre\.
- Composición de kit\.

__22\. Stock local estimado__

Supongamos última sincronización:

RK\-428 = 10

Venta offline:

\-3

PWA:

Stock oficial conocido: 10

Movimientos locales pendientes: \-3

Stock local estimado: 7

Una segunda venta del mismo dispositivo usa 7 como referencia local\.

__23\. No sobrescribir el stock oficial conocido__

Recomiendo guardar ambos:

cantidad\_servidor\_ultima\_sync

cantidad\_estimada\_local

Así podemos distinguir qué parte proviene del servidor y qué parte de operaciones locales\.

__24\. Varias operaciones locales__

Ejemplo:

Último servidor: 10

Venta local A: \-2

Venta local B: \-3

Uso interno: \-1

Estimado:

4

La PWA no debe permitir una nueva operación local superior a cuatro, salvo que exista una entrada local permitida y consumible, cosa que en V1 no tendremos\.

__25\. Entradas offline__

Ya definimos una política conservadora\.

Se puede:

- Registrar borrador\.
- Registrar recepción física\.
- Guardar observaciones\.

Pero:

No incrementan stock vendible local en V1 hasta ser confirmadas por Laravel\.

Ejemplo:

Oficial conocido: 5

Entrada local pendiente: \+10

Disponible para venta offline: 5

__26\. Transferencias offline__

También quedan restringidas\.

Se podrá:

- Crear solicitud local\.
- Preparar información\.
- Registrar recepción física pendiente\.

Pero no:

- Aprobar oficialmente\.
- Confirmar envío\.
- Confirmar recepción oficial\.
- Resolver diferencias\.

Estas requieren conexión\.

__27\. Ventas offline__

Permitidas\.

Debe existir:

- Cliente\.
- Producto sincronizado\.
- Stock estimado suficiente\.
- Precio válido\.
- Composición válida si es kit\.
- UUID\.

La venta queda provisional hasta que Laravel la acepte\.

__28\. Venta offline bajo mínimo__

Ya definido:

precio < mínimo local

→ bloquear

No se puede dejar “para autorizar después”\.

Las excepciones de precio requieren conexión\.

__29\. Cliente nuevo offline__

Permitido\.

Se genera:

cliente\_uuid\_local

La venta se relaciona con ese UUID\.

Al sincronizar Laravel:

- Crea cliente\.
- O detecta duplicado\.
- O solicita resolución\.

__30\. Pagos offline__

Permitidos de manera provisional\.

Se guardará:

- Saldo conocido al momento\.
- Monto\.
- Método\.
- Deuda\(s\)\.
- Fecha\.
- UUID\.

El servidor verifica el saldo oficial después\.

__31\. Conteos offline__

Sí deben permitirse\.

Un conteo físico es especialmente adecuado para offline porque no debe modificar stock directamente\.

Flujo:

Contar

↓

Guardar local

↓

Sincronizar

↓

Comparar oficialmente

↓

Revisar diferencia

__32\. Kits offline__

__Kit único__

Funciona igual que producto simple\.

__Kit por componentes__

Permitido solamente si:

- Composición está sincronizada\.
- Versión es conocida\.
- Todos los componentes están disponibles localmente\.
- No hay componentes localmente bloqueados\.

Laravel revalida posteriormente\.

__33\. Armado anticipado offline__

No confirmado oficialmente\.

Puede prepararse una orden, pero la confirmación requiere conexión\.

__34\. Otras salidas offline__

Permitidas inicialmente:

- Uso interno sencillo\.
- Entrega no comercial configurada\.
- Reporte de daño\.
- Reporte de pérdida\.
- Conteo\.

Con diferencias:

__Uso interno__

Puede descontar estimado local\.

__Reporte de daño__

Puede bloquear localmente una unidad\.

__Reporte de pérdida__

No genera salida oficial hasta aprobación\.

__35\. Datos que deben versionarse__

Además del UUID de operación, ciertos datos necesitan una versión\.

Ejemplos:

precio\_version

kit\_composicion\_version

producto\_version

cliente\_version

inventario\_version

No necesariamente todos con tablas de versiones completas, pero sí necesitamos poder detectar datos obsoletos\.

__36\. Ejemplo de precio obsoleto__

Dispositivo sincroniza:

Precio mínimo: S/ 180

Versión: 15

Luego queda offline\.

Administrador cambia a:

S/ 190

Versión: 16

El vendedor realizó venta a:

S/ 185

Usando la información que tenía\.

La política recomendada que ya definimos:

Si el dispositivo utilizó legítimamente una versión previamente sincronizada y no estaba conectado, Laravel puede respetar esa versión según la política configurada\.

Debemos guardar qué versión utilizó\.

__37\. Datos sensibles que no deben modificarse offline__

Inicialmente:

- Usuarios\.
- Roles\.
- Permisos\.
- Sucursales\.
- Producto maestro\.
- Referencia principal\.
- Composición oficial de kit\.
- Precio mínimo oficial\.
- Ajustes de inventario\.
- Aprobaciones\.
- Cierres\.
- Resoluciones de conflictos\.

__38\. Recuperación de conexión__

Flujo:

PWA detecta servidor disponible

        ↓

Validar sesión

        ↓

Enviar operaciones pendientes

        ↓

Procesar resultados

        ↓

Descargar cambios del servidor

        ↓

Recalcular estado local

        ↓

Actualizar hora de última sync

__39\. Sincronización bidireccional__

No es solo:

PWA → servidor

También:

Servidor → PWA

Después de subir movimientos debemos descargar:

- Stock actualizado\.
- Lotes actualizados\.
- Clientes\.
- Saldos\.
- Productos cambiados\.
- Precios\.
- Kits\.
- Estados de operaciones\.

__40\. Sincronización incremental__

No descargaremos todo el catálogo siempre\.

Utilizaremos conceptualmente:

updated\_at

version

cursor

Ejemplo:

Dame productos modificados después de la versión 1500\.

Esto hace la sincronización más eficiente\.

__41\. Sincronización completa__

Debe existir también una opción administrativa/técnica:

Re\-sincronizar datos locales\.

Para casos de:

- Dispositivo nuevo\.
- IndexedDB corrupta\.
- Diferencia importante\.
- Cambio grande de catálogo\.

Antes de borrar datos locales deberá comprobarse que no existan operaciones pendientes sin respaldar\.

__42\. Reintentos automáticos__

Si falla por:

- Timeout\.
- Corte de red\.
- Error 5xx temporal\.

La operación vuelve a:

PENDIENTE

y se reintenta\.

No debemos marcar como conflicto una simple falla de red\.

__43\. Backoff__

Técnicamente utilizaremos reintentos espaciados\.

Ejemplo conceptual:

Intento 1

↓

5 s

↓

Intento 2

↓

30 s

↓

Intento 3

La estrategia exacta se define en la Etapa 4\.

__44\. Error permanente vs temporal__

__Temporal__

- Servidor no responde\.
- Red cayó\.
- Timeout\.

Resultado:

REINTENTAR

__Permanente__

- Producto desactivado\.
- Usuario sin permiso\.
- Stock insuficiente\.
- Pago supera saldo\.

Resultado:

CONFLICTO / RECHAZADA

__45\. Rechazada vs conflicto__

Conviene diferenciarlos\.

__Rechazada__

La operación definitivamente no puede procesarse tal como está\.

Ejemplo:

Usuario no tiene permiso

Producto inexistente

__Conflicto__

Puede resolverse tomando una decisión\.

Ejemplo:

Stock insuficiente

Cliente duplicado

Día cerrado

Pago excede saldo

__46\. Tipos iniciales de conflicto__

- STOCK\_INSUFICIENTE
- LOTE\_NO\_DISPONIBLE
- CLIENTE\_DUPLICADO
- PRECIO\_NO\_VALIDO
- KIT\_VERSION\_DESACTUALIZADA
- COMPONENTE\_INSUFICIENTE
- PAGO\_SUPERA\_SALDO
- DIA\_CERRADO
- PRODUCTO\_DESACTIVADO
- USUARIO\_SIN\_PERMISO
- OPERACION\_DUPLICADA
- DEPENDENCIA\_RECHAZADA

__47\. Lote no disponible pero stock suficiente__

Este caso puede resolverse automáticamente\.

PWA:

Lote A → 3

Servidor:

Lote A ya no tiene stock

Lote B tiene 3

Laravel puede:

Reasignar B

Resultado:

SINCRONIZADA

con registro:

asignación local ≠ oficial

No necesita conflicto manual\.

__48\. Stock total insuficiente__

PWA:

Venta: 5

Servidor:

Disponible: 3

No se aceptará parcialmente\.

Resultado:

CONFLICTO\_STOCK\_INSUFICIENTE

La venta debe revisarse\.

__49\. No dividir automáticamente ventas__

No recomiendo:

Solicitó 5

Servidor acepta 3

Eso alteraría una venta ya realizada al cliente\.

Por tanto:

Venta completa aceptada o conflicto\.

__50\. Dependencias rechazadas__

Ejemplo:

Cliente C1

Venta V1

Pago P1

Cliente se resuelve correctamente, pero venta falla por stock\.

Entonces:

P1 no se procesa

Estado:

CONFLICTO\_DEPENDENCIA

Esto evita pagos huérfanos\.

__51\. Sincronización de varias ventas simultáneamente__

Laravel deberá procesar inventario con transacciones y bloqueos\.

Aunque la PWA envíe:

V1

V2

V3

el servidor no confiará en el orden local para garantizar stock\.

Cada producto/sucursal se valida oficialmente\.

__52\. Timestamp del dispositivo__

Guardaremos:

fecha\_operacion\_dispositivo

pero también:

fecha\_recepcion\_servidor

fecha\_confirmacion\_servidor

El servidor no confiará ciegamente en la hora local\.

__53\. Operaciones fuera de orden__

Puede ocurrir:

Venta A realizada 14:00

Venta B realizada 14:05

pero B sincroniza primero\.

La política que ya definimos:

El servidor mantiene una secuencia oficial de confirmación y conserva la fecha real informada para auditoría\.

No reconstruirá silenciosamente todo el Kardex pasado\.

__54\. Cierre diario__

Antes de cerrar:

- Cola local del dispositivo debe estar vacía o revisada\.
- No debe haber conflictos críticos\.
- Dispositivos relevantes deben haber sincronizado\.
- Pagos pendientes deben resolverse\.
- Ventas pendientes deben resolverse\.

__55\. Problema del dispositivo totalmente desconectado__

El servidor no puede saber con certeza qué existe en IndexedDB si el equipo no se conecta\.

Por eso el proceso de cierre deberá mostrar:

Última sincronización de dispositivos

El encargado verificará los dispositivos operativos\.

Esta limitación debe quedar documentada desde ahora\.

__56\. Qué ocurre si se cierra el navegador__

IndexedDB persiste\.

Entonces una venta pendiente no debe desaparecer por:

- Cerrar pestaña\.
- Reiniciar navegador\.
- Reiniciar computadora\.

Al volver:

Operaciones pendientes: 3

siguen allí\.

__57\. Qué ocurre si se limpia el navegador__

Este es un riesgo real\.

Si el usuario elimina datos del sitio antes de sincronizar, puede perder operaciones locales\.

Por eso debemos:

- Advertir cuando hay operaciones pendientes\.
- Evitar botones internos que borren IndexedDB sin validación\.
- Mostrar cantidad de pendientes\.
- Forzar sincronización antes de cerrar sesión cuando sea posible\.

No podemos evitar que alguien borre manualmente todos los datos del navegador desde herramientas externas\.

__58\. Cierre de sesión con pendientes__

Recomendación:

Si existen operaciones pendientes:

No permitir cierre de sesión normal sin advertencia fuerte\.

Opciones:

- Sincronizar ahora\.
- Mantener sesión\.
- Salir bajo autorización/riesgo, dependiendo del diseño\.

Para V1 recomiendo bloquear el cierre normal mientras haya pendientes, salvo administrador\.

__59\. Actualización de la PWA__

Una nueva versión del frontend no debe borrar IndexedDB\.

Debemos diseñar migraciones locales de esquema\.

Ejemplo:

IndexedDB versión 1

↓

actualización

↓

versión 2

Dexie permite manejar versiones\.

__60\. Service Worker__

Workbox se encargará principalmente de:

- Cachear shell de la aplicación\.
- Archivos JS/CSS\.
- Recursos necesarios\.
- Estrategias de actualización\.

No lo utilizaremos como único mecanismo para garantizar transacciones de negocio\.

__61\. Por qué no depender solo de Background Sync__

Las operaciones del negocio tienen:

- Dependencias\.
- Conflictos\.
- Validaciones\.
- Estados\.
- Kits\.
- Pagos\.

Necesitamos un __motor de sincronización propio__\.

Workbox puede ayudar, pero no será la lógica central\.

__62\. IndexedDB propuesta conceptualmente__

Podremos tener stores como:

products

product\_aliases

brands

categories

inventory\_cache

lots\_cache

customers

receivables\_cache

kit\_versions

pending\_operations

sync\_results

sync\_conflicts

device\_state

La estructura exacta se diseñará en la Etapa 4\.

__63\. Operación local genérica__

Conceptualmente:

uuid

type

payload

status

created\_at

operation\_date

dependencies

retry\_count

last\_error

server\_id

synced\_at

Esto permite un motor uniforme\.

__64\. Información de sincronización en servidor__

También tendremos registros tipo:

sync\_batches

sync\_operations

sync\_conflicts

Esto dará trazabilidad de:

- Qué dispositivo envió\.
- Qué se procesó\.
- Qué falló\.
- Cuántas veces\.
- Qué resolución tuvo\.

__65\. Dashboard local de sincronización__

Recomiendo una pantalla sencilla:

Sincronización

Pendientes:      3

En conflicto:    1

Última sync:     17:05

Estado servidor: Conectado

El usuario podrá ver qué operaciones siguen pendientes\.

__66\. No mostrar errores técnicos crudos__

En lugar de:

SQLSTATE 23505\.\.\.

mostrar:

No se pudo sincronizar la venta porque el stock oficial es insuficiente\.

El detalle técnico podrá quedar en logs para soporte\.

__67\. Sincronización manual__

Además de automática, debe existir:

__Sincronizar ahora__

Esto es útil antes del cierre\.

__68\. Sincronización automática__

Se intentará cuando:

- Se recupera conexión\.
- Se inicia sesión\.
- Se abre la aplicación\.
- Se crea una operación con conexión\.
- Periódicamente mientras la app está activa\.

No necesitamos una frecuencia agresiva cuando está estable\.

__69\. Cambios provenientes del servidor__

Si el usuario está online y otro dispositivo realiza una venta, debemos refrescar eventualmente el stock\.

Para V1 podemos utilizar:

- Refetch periódico\.
- Sincronización después de operaciones\.
- Eventos/polling\.

No es necesario WebSocket desde el primer día, aunque podría agregarse\.

__70\. Operación online también debe usar UUID__

Aunque haya internet\.

Esto es recomendable porque:

- Un request puede timeout\.
- El navegador puede reenviar\.
- El usuario puede hacer doble clic\.

Así la misma estrategia de idempotencia sirve online y offline\.

__71\. Doble clic__

Al confirmar una venta:

Usuario hace doble clic

Debe enviarse el mismo UUID o bloquearse el botón durante procesamiento\.

Laravel igualmente debe impedir duplicidad\.

__72\. Seguridad local__

IndexedDB contendrá información comercial\.

Por tanto:

- Solo dispositivos autorizados\.
- Sesiones controladas\.
- Bloqueo de dispositivo\.
- No almacenar secretos innecesarios\.
- Limpiar información local cuando un dispositivo sea dado de baja, cuando sea posible\.

No asumiremos que IndexedDB es equivalente a una bóveda cifrada\.

__73\. Pérdida o robo de equipo__

Administrador:

Bloquear dispositivo

Cuando el equipo se conecte, pierde acceso\.

Si nunca vuelve a conectarse, los datos locales siguen físicamente en ese equipo; por eso la seguridad del dispositivo también importa\.

Esta es una limitación normal de cualquier PWA offline\.

__74\. Datos antiguos__

Si un dispositivo lleva demasiado tiempo sin sincronizar, debemos advertir\.

Ejemplo futuro:

Datos desactualizados desde hace 3 días\.

Incluso puede bloquear ciertas operaciones según configuración\.

La duración máxima offline no está definida todavía, así que debe quedar configurable\.

__75\. Recomendación sobre tiempo máximo offline__

No fijaría un número sin conocer la realidad de conectividad de las sucursales\.

Diseñaría:

max\_offline\_hours

configurable\.

Por ejemplo, en el futuro:

- Hasta X horas: funcionamiento normal\.
- Más de X: advertencia\.
- Más de Y: restringir ventas a crédito/kits\.

Pero la empresa debe confirmar los tiempos reales de corte\.

__76\. Reportes de sincronización__

Administrador podrá consultar:

- Operaciones offline por sucursal\.
- Operaciones pendientes\.
- Conflictos\.
- Reintentos\.
- Dispositivos sin sincronizar\.
- Última sincronización\.
- Operaciones rechazadas\.
- Tiempo medio offline\.

__77\. Alertas__

- Dispositivo sin sincronizar\.
- Cola pendiente grande\.
- Conflicto de stock\.
- Pago en conflicto\.
- Cliente duplicado\.
- Operación de día cerrado\.
- Sesión/dispositivo revocado\.
- Error repetido de sincronización\.
- Datos locales muy antiguos\.

__78\. Matriz definitiva offline / online__

__Operación__

__Offline__

__Confirmación oficial offline__

Consultar catálogo

Sí

—

Consultar stock conocido

Sí

—

Registrar cliente

Sí

No, pendiente

Venta simple

Sí

Pendiente servidor

Venta kit único

Sí

Pendiente servidor

Venta kit componentes

Sí limitada

Pendiente servidor

Pago

Sí

Pendiente servidor

Uso interno

Sí

Pendiente servidor

Reportar daño

Sí

Pendiente servidor

Reportar pérdida

Sí

No baja definitiva

Conteo físico

Sí

No ajuste directo

Compra/entrada

Borrador

No

Ajuste inventario

No

No

Aprobar transferencia

No

No

Confirmar envío

No

No

Confirmar recepción

No

No

Armado anticipado

Borrador

No

Cambiar producto

No

No

Cambiar precio mínimo

No

No

Anular operación sincronizada

No

No

Confirmar cierre

No

No

Resolver conflicto

No

No

__79\. Reglas funcionales definitivas del Proceso 13__

1. PostgreSQL es la fuente oficial\.
2. IndexedDB es almacenamiento local temporal y operativo\.
3. El primer acceso del dispositivo requiere conexión\.
4. Solo dispositivos autorizados trabajan offline\.
5. No se guardan contraseñas en IndexedDB\.
6. La PWA debe mostrar claramente si está offline\.
7. El stock offline se mostrará como estimado\.
8. Toda operación usa UUID\.
9. Las operaciones se guardan antes de intentar sincronizar\.
10. Cerrar navegador no elimina pendientes\.
11. Las operaciones tienen estado de sincronización\.
12. Las dependencias deben respetarse\.
13. Laravel revalida todo\.
14. La validación local no determina la oficialidad\.
15. Ventas offline están permitidas\.
16. Pagos offline están permitidos provisionalmente\.
17. Clientes pueden crearse offline\.
18. Conteos pueden registrarse offline\.
19. Entradas no incrementan stock vendible offline en V1\.
20. Transferencias críticas requieren conexión\.
21. Ajustes requieren conexión\.
22. Cierre diario requiere conexión\.
23. Kits por componentes requieren composición sincronizada\.
24. Armados anticipados no se confirman offline\.
25. El servidor puede reasignar lotes si existe stock suficiente\.
26. Stock insuficiente genera conflicto\.
27. Una venta no se acepta parcialmente\.
28. Pago superior al saldo genera conflicto\.
29. Los reintentos no duplican operaciones\.
30. Diferenciar fallas temporales de conflictos de negocio\.
31. La sincronización es bidireccional\.
32. Se utilizará sincronización incremental\.
33. Debe existir sincronización manual\.
34. La app debe conservar datos durante actualizaciones\.
35. El cierre exige resolver pendientes críticos\.
36. Los dispositivos sin sincronizar deben ser visibles\.
37. Las operaciones tardías no alteran silenciosamente días cerrados\.
38. El servidor asigna secuencia oficial\.
39. Toda sincronización queda auditada\.
40. Workbox ayuda al PWA, pero el motor de sincronización será propio\.

__80\. Criterios de aceptación del Proceso 13__

Consideraremos aprobado este proceso cuando:

- La aplicación pueda abrir sin internet después del primer acceso\.
- Catálogo y stock conocido puedan consultarse offline\.
- Una venta offline permanezca después de cerrar y volver a abrir la PWA\.
- Cada operación tenga UUID único\.
- Un reintento no genere duplicado\.
- Cliente → venta → pago se sincronicen respetando dependencia\.
- Stock local estimado se actualice con operaciones pendientes\.
- Laravel vuelva a validar el stock oficial\.
- Un lote agotado pueda reasignarse cuando haya otro disponible\.
- Stock total insuficiente genere conflicto\.
- Un pago excesivo genere conflicto\.
- Una operación dependiente no se procese si su operación principal falla\.
- Entradas offline pendientes no aumenten stock vendible\.
- Transferencias sensibles requieran conexión\.
- Una actualización del frontend no elimine pendientes\.
- El usuario pueda ver pendientes y conflictos\.
- El cierre no se confirme mientras existan pendientes críticos\.
- La recuperación de conexión active la sincronización\.
- Los cambios del servidor actualicen posteriormente IndexedDB\.
- El administrador pueda identificar dispositivos que no se han sincronizado\.

__Resultado del Proceso 13__

Queda funcionalmente definido:

__La PWA mantendrá una copia local de la información necesaria y una cola persistente de operaciones mediante IndexedDB\. Las operaciones offline serán identificadas por UUID, sincronizadas posteriormente de forma idempotente y revalidadas por Laravel\. El servidor conservará la autoridad sobre stock, costos, lotes, pagos y cierres, mientras que los conflictos serán explícitos y nunca se resolverán mediante modificaciones silenciosas de información\.__

Con esto queda consolidada la arquitectura funcional offline que hemos ido definiendo desde el inicio del proyecto\.

El siguiente proceso de la __Etapa 3__ es el __Proceso 14: Gestión y resolución de conflictos__, donde definiremos la bandeja de conflictos, prioridades, qué puede resolverse automáticamente, qué puede resolver el encargado, qué requiere administrador, y qué ocurre con stock, ventas, pagos y cierres mientras existe un conflicto\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 14: Gestión y resolución de conflictos__

Este proceso corresponde al __Módulo 13: PWA, sincronización y conflictos__, pero afecta directamente a:

- Ventas\.
- Pagos\.
- Clientes\.
- Inventario\.
- Lotes\.
- Kits\.
- Transferencias\.
- Cierre diario\.
- Auditoría\.

La regla central será:

__Un conflicto nunca debe corregirse silenciosamente ni generar datos inconsistentes\. Debe resolverse automáticamente solo cuando la decisión sea segura; en los demás casos debe quedar pendiente para un usuario autorizado\.__

__1\. Objetivo funcional__

El sistema debe poder detectar y tratar situaciones como:

- Stock insuficiente\.
- Lote ya consumido\.
- Cliente duplicado\.
- Precio inválido\.
- Kit con composición desactualizada\.
- Componente insuficiente\.
- Pago superior al saldo\.
- Operación de un día cerrado\.
- Producto desactivado\.
- Usuario sin permisos\.
- Dependencias fallidas\.
- Operaciones duplicadas\.

El objetivo no es solamente mostrar “error”, sino saber:

1. Qué operación falló\.
2. Por qué falló\.
3. Si puede resolverse automáticamente\.
4. Quién debe revisarla\.
5. Qué opciones de resolución existen\.
6. Qué operaciones dependen de ella\.

__2\. Diferencia entre error técnico y conflicto de negocio__

Esto es importante\.

__Error técnico__

Ejemplos:

- Sin internet\.
- Timeout\.
- Servidor temporalmente caído\.
- Error 500 transitorio\.

Resultado:

REINTENTAR

No necesita intervención del usuario todavía\.

__Conflicto de negocio__

Ejemplos:

Stock oficial insuficiente

Pago supera saldo

Día cerrado

Cliente duplicado

Resultado:

CONFLICTO

Requiere una decisión o una regla específica\.

__3\. Bandeja de conflictos__

El sistema tendrá una pantalla central:

__Conflictos de sincronización__

El encargado verá los de su sucursal\.

El administrador podrá ver todos\.

Columnas recomendadas:

__Fecha__

__Sucursal__

__Tipo__

__Operación__

__Usuario__

__Prioridad__

__Estado__

Ejemplo:

| 06/08 16:40 | Mazuko | Stock insuficiente | Venta V\-local\-15 | Juan | Alta | Pendiente |

__4\. Estados de un conflicto__

Propongo:

- PENDIENTE
- EN\_REVISION
- RESUELTO\_AUTOMATICO
- RESUELTO\_MANUAL
- RECHAZADO
- CANCELADO
- ESCALADO

Flujo:

PENDIENTE

   ↓

EN\_REVISION

   ↓

¿Se puede resolver?

 ┌──────┴──────┐

 Sí            No

 ↓             ↓

RESUELTO     ESCALADO / RECHAZADO

__5\. Prioridad del conflicto__

Recomiendo tres niveles:

__Crítica__

Afecta:

- Dinero\.
- Stock\.
- Cierre\.
- Integridad del sistema\.

Ejemplos:

- Pago superior al saldo\.
- Venta sin stock\.
- Día cerrado\.
- Kardex inconsistente\.

__Alta__

Requiere revisión pronta\.

Ejemplos:

- Cliente duplicado relacionado a venta\.
- Kit incompleto\.
- Transferencia con diferencia\.

__Media__

Puede esperar\.

Ejemplos:

- Lote local distinto, si ya fue reasignado\.
- Información no crítica desactualizada\.

__6\. Qué conflictos pueden resolverse automáticamente__

Solo aquellos donde el resultado sea inequívoco\.

__Lote agotado, pero hay otro lote disponible__

Ejemplo:

Local propuso:

Lote A → 3

Servidor encuentra:

Lote A → 0

Lote B → 5

Stock total suficiente\.

Laravel:

Reasignar lote B

Resultado:

RESUELTO\_AUTOMATICO

La operación se confirma\.

Se guarda:

- Asignación local\.
- Asignación oficial\.

__7\. Operación duplicada__

Si llega el mismo UUID:

UUID ya procesado

No es un conflicto humano\.

Laravel devuelve la operación existente\.

Resultado:

DUPLICADA / YA\_PROCESADA

No crea nada adicional\.

__8\. Cliente duplicado por documento exacto__

Ejemplo:

Cliente local:

RUC 20123456789

EMPRESA ABC

Servidor ya tiene exactamente ese RUC\.

Aquí podemos resolver casi automáticamente\.

Recomendación:

Asociar el registro local al cliente existente si el documento coincide exactamente\.

Pero guardar evidencia de la resolución\.

Si hay diferencias importantes de nombre o estado, puede requerir revisión\.

__9\. Cliente similar solo por nombre__

Ejemplo:

EMPRESA ABC SAC

EMPRESA A\.B\.C\.

No se fusiona automáticamente\.

Resultado:

CONFLICTO\_CLIENTE\_POSIBLE\_DUPLICADO

Un usuario autorizado decide:

- Usar cliente existente\.
- Crear nuevo cliente\.
- Corregir datos\.

__10\. Stock insuficiente__

Ejemplo:

Venta offline:

Cantidad: 5

Servidor:

Disponible oficial: 3

No se permite:

Aceptar solo 3

La venta completa queda en conflicto\.

Opciones recomendadas:

1. Cancelar venta local\.
2. Esperar una entrada/transferencia y reintentar, si comercialmente sigue válida\.
3. Corregir cantidad mediante proceso autorizado si realmente se entregó menos\.
4. Resolver mediante otra operación administrativa si hubo error previo de inventario\.

Nunca crear stock negativo\.

__11\. Quién resuelve stock insuficiente__

__Encargado de sucursal__

Puede:

- Revisar inventario\.
- Verificar conteo\.
- Cancelar operación local\.
- Corregir una operación no ejecutada físicamente\.
- Solicitar transferencia\.

__Administrador__

Puede:

- Resolver ajustes de inventario\.
- Autorizar regularizaciones\.
- Revisar operaciones de días cerrados\.

No puede simplemente aprobar stock negativo\.

__12\. Precio inválido__

Dos posibles situaciones\.

__Precio por debajo del mínimo conocido localmente__

La PWA ya debería haberlo bloqueado\.

Si aun así llega por manipulación o error:

RECHAZADA

__El precio mínimo cambió mientras el dispositivo estaba offline__

Ejemplo:

Local conocía:

Mínimo S/ 180

Versión 15

Venta:

S/ 185

Servidor ahora:

Mínimo S/ 190

Versión 16

Como ya definimos, podemos respetar la versión válida que el dispositivo conocía, según política\.

Resultado posible:

RESUELTO\_AUTOMATICO

si existe evidencia de versión sincronizada legítima\.

__13\. Precio inferior al mínimo local__

Si el vendedor registró:

Mínimo local: 180

Precio venta: 170

offline:

No debe llegar al servidor como una operación válida\.

La PWA debe bloquearlo\.

Si se manipula el cliente para enviarlo:

RECHAZADA

por seguridad\.

__14\. Kit con versión desactualizada__

Ejemplo:

PWA usó:

KIT A versión 3

Servidor tiene versión actual:

4

No debemos sustituir automáticamente la composición\.

Se revisa:

- La versión 3 existía\.
- Era válida cuando fue sincronizada\.
- Hay stock suficiente\.
- La venta se realizó usando esa composición\.

Si todo cumple:

Puede aceptarse usando versión 3\.

Si la versión 3 fue anulada por un problema crítico o contiene un componente desactivado:

CONFLICTO\_KIT

__15\. Componente insuficiente__

Venta de kit requiere:

A × 2

B × 1

Servidor:

A = 10

B = 0

Resultado:

CONFLICTO\_COMPONENTE\_INSUFICIENTE

La venta completa queda pendiente\.

No se confirma parcialmente\.

__16\. Producto desactivado__

Si un dispositivo offline vende un producto que luego fue desactivado:

Hay dos posibles motivos de desactivación\.

__Desactivación administrativa normal__

Podría revisarse si la venta fue realizada legítimamente antes de conocer el cambio\.

__Desactivación crítica__

Ejemplo:

- Producto incorrecto\.
- Producto bloqueado\.
- Problema de seguridad/comercial\.

Entonces puede ser rechazada\.

Por tanto recomiendo que el conflicto muestre:

motivo\_desactivacion

fecha\_desactivacion

para que el encargado/admin decida\.

__17\. Pago superior al saldo__

Ejemplo:

Dispositivo registra:

Pago S/ 300

Servidor:

Saldo oficial S/ 100

No aplicar automáticamente S/ 100\.

Porque físicamente se cobraron S/ 300\.

Resultado:

CONFLICTO\_PAGO\_SUPERA\_SALDO

__18\. Resolución de pago superior al saldo__

Opciones V1:

- Confirmar que el cobro local fue un error y cancelarlo\.
- Registrar reembolso del exceso si el dinero sí fue recibido\.
- Aplicar una parte a otra deuda del cliente solo mediante decisión explícita, no automática\.

No habrá saldo a favor en V1\.

__19\. Pago duplicado__

Si el mismo UUID:

ya procesado

resolución automática\.

Si UUID diferente pero:

- Mismo cliente\.
- Mismo importe\.
- Mismo número de operación\.
- Misma fecha\.

Mostrar:

Posible pago duplicado\.

No eliminar automáticamente, porque podrían existir dos pagos reales iguales\.

__20\. Día cerrado__

Ejemplo:

Venta realizada offline:

fecha\_operacion: 05/08

Sincroniza:

06/08

y el 05/08 ya está cerrado\.

Resultado:

CONFLICTO\_DIA\_CERRADO

Solo administrador resuelve\.

__21\. Opciones para día cerrado__

Administrador podrá elegir, dependiendo del caso:

__Reabrir día__

Cuando realmente debe formar parte de ese cierre\.

__Regularizar en fecha actual__

Conservando:

fecha\_real\_operacion

y registrando hoy el efecto oficial\.

__Rechazar__

Si la operación no debe incorporarse\.

Todo queda auditado\.

__22\. Usuario sin permiso__

Ejemplo:

El dispositivo estaba offline y luego el administrador le retiró el permiso\.

El usuario había creado una operación local antes o después del cambio\.

Debemos guardar:

- Fecha operación\.
- Versión/permisos conocidos\.
- Fecha cambio de permiso\.

Recomendación:

__Operación creada antes de revocación__

Puede revisarse y eventualmente aceptarse\.

__Operación creada después de que el dispositivo ya debía estar revocado__

Rechazar\.

La decisión final la toma Laravel según política y timestamps confiables disponibles\.

__23\. Dispositivo revocado__

Operaciones pendientes de un dispositivo revocado no deben sincronizarse automáticamente como si nada\.

Resultado:

CONFLICTO\_DISPOSITIVO\_REVOCADO

El administrador decide si:

- Importar operaciones legítimas previas a revocación\.
- Rechazarlas\.

Esto es especialmente importante si el equipo fue robado o comprometido\.

__24\. Dependencia rechazada__

Ejemplo:

Cliente C1

Venta V1

Pago P1

Si V1 falla:

P1 → DEPENDENCIA\_RECHAZADA

El pago no se procesa\.

Si físicamente el dinero sí fue recibido, requerirá revisión financiera\.

__25\. Conflictos de conteo__

Un conteo no modifica stock automáticamente, así que normalmente no tendrá conflicto de stock como una venta\.

Puede existir:

- Producto desactivado\.
- Lote desconocido\.
- Conteo duplicado\.
- Conteo de día cerrado\.

El encargado podrá decidir cómo incorporar el conteo\.

__26\. Transferencias__

Como las confirmaciones críticas requieren conexión en V1, reducimos mucho los conflictos offline\.

Aun así pueden existir:

- Stock cambió antes de aprobación\.
- Lote ya no está disponible\.
- Cantidad recibida distinta\.
- Producto dañado\.
- Recepción parcial\.

Estos se gestionan dentro del flujo de transferencias y también pueden aparecer en la bandeja de incidencias/conflictos\.

__27\. Diferencia entre incidencia y conflicto__

Conviene distinguirlos\.

__Incidencia__

Algo ocurrió en el negocio y necesita seguimiento\.

Ejemplo:

Transferencia llegó dañada

__Conflicto de sincronización__

Los datos locales y oficiales no pueden reconciliarse automáticamente\.

Ejemplo:

Venta offline > stock oficial

Pueden aparecer en una bandeja común administrativa, pero internamente son conceptos diferentes\.

__28\. Operaciones relacionadas bloqueadas__

Si una venta está en conflicto:

- Su pago relacionado no se confirma\.
- Su cuenta por cobrar no se crea oficialmente\.
- No genera Kardex\.
- No actualiza stock oficial\.

Pero localmente debe seguir visible como:

Pendiente de resolución\.

__29\. Evitar que el usuario “olvide” un conflicto__

Una operación en conflicto no puede desaparecer de la interfaz\.

Debe mantenerse visible hasta:

- Resolver\.
- Cancelar\.
- Rechazar\.

Y debe aparecer en:

- Bandeja\.
- Indicador PWA\.
- Cierre diario si corresponde\.

__30\. Conflictos y cierre__

Regla:

Un conflicto crítico del día bloquea el cierre\.

Ejemplos:

- Venta pendiente\.
- Pago pendiente\.
- Ajuste de inventario\.
- Kit no resuelto\.

No necesariamente bloquean:

- Cliente duplicado sin operaciones\.
- Alertas de stock bajo\.
- Lote antiguo\.

__31\. Resolución automática debe quedar auditada__

Aunque Laravel resuelva sin usuario:

Ejemplo:

Lote A local

→ reasignado a lote B oficial

Debe quedar:

Tipo resolución: AUTOMÁTICA

Regla aplicada: REASIGNACION\_PEPS

Esto facilita soporte\.

__32\. Resolución manual__

Cuando un usuario interviene, guardaremos:

- Usuario\.
- Rol\.
- Fecha\.
- Conflicto\.
- Acción elegida\.
- Motivo\.
- Datos antes\.
- Datos después\.

__33\. No editar directamente el payload original__

Recomiendo conservar:

payload\_original

y generar:

resolucion\_payload

o una operación corregida\.

Así sabemos qué envió realmente el dispositivo\.

Esto es muy útil para auditoría y depuración\.

__34\. Ejemplo de conflicto de venta__

Original:

Venta local

RK\-428 × 5

Precio: S/ 180

Stock local estimado: 5

Servidor:

Stock oficial: 3

La bandeja mostrará:

Conflicto: Stock insuficiente

Operación original:

5 unidades

Disponible oficial:

3

Opciones:

\- Cancelar operación

\- Revisar inventario

\- Esperar ingreso y reintentar

\- Escalar a administrador

No ofrecer:

Forzar stock negativo\.

__35\. Reintento después de resolver causa externa__

Ejemplo:

Venta en conflicto por stock\.

Luego llega una entrada oficial de cinco unidades\.

Ahora stock:

8

El encargado puede:

Reintentar sincronización\.

Laravel revalida\.

Si todo cumple:

RESUELTO\_MANUAL

y confirma la venta\.

__36\. Riesgo del reintento tardío__

Si la venta ocurrió hace varias horas y el costo promedio cambió, Laravel utilizará la política oficial de confirmación que ya definimos\.

No se recalcula silenciosamente todo el pasado\.

Se conserva:

- Fecha real de operación\.
- Fecha oficial de aceptación\.

__37\. Cancelar operación en conflicto__

Si el encargado determina que la operación no ocurrió realmente:

CANCELAR

La operación local queda:

CANCELADA

No afecta PostgreSQL\.

Si había operaciones dependientes:

- También se cancelan o quedan pendientes de resolución\.

__38\. Operación físicamente realizada pero imposible de confirmar__

Este es el caso más delicado\.

Ejemplo:

Cliente ya se llevó cinco repuestos, pero servidor solo reconoce tres disponibles\.

No debemos “arreglar” el sistema inventando una venta\.

Debe iniciarse investigación:

- ¿Faltó registrar entrada?
- ¿Transferencia no sincronizada?
- ¿Conteo incorrecto?
- ¿Otra venta duplicada?
- ¿Stock físico no registrado?

Después se corrige la causa legítima mediante:

- Entrada\.
- Ajuste\.
- Transferencia\.
- Cancelación de operación errónea\.

Y recién se reintenta la venta\.

__39\. Niveles de resolución__

Recomendación:

__Nivel 1 – Automático__

- UUID duplicado\.
- Reasignación PEPS\.
- Asociación cliente por documento exacto en casos seguros\.

__Nivel 2 – Encargado de sucursal__

- Cliente duplicado simple\.
- Cancelación de operación local\.
- Reintento tras entrada\.
- Corrección de cantidad si no hubo entrega real\.
- Conflictos locales no financieros críticos\.

__Nivel 3 – Administrador general__

- Día cerrado\.
- Pago excesivo complejo\.
- Ajuste de inventario\.
- Dispositivo revocado\.
- Corrección de costo\.
- Conflictos que afectan varias sucursales\.
- Reapertura\.

__40\. Escalamiento__

El encargado tendrá botón:

Escalar al administrador

El conflicto pasa a:

ESCALADO

y ya no podrá resolverlo localmente si la política exige nivel superior\.

__41\. Comentarios internos__

Recomiendo permitir comentarios en la resolución\.

Ejemplo:

“Se verificó que la compra del producto no había sido registrada\.

Se ingresó factura F001\-200 y se reintentó la venta\.”

Esto mejora mucho la auditoría\.

__42\. Evidencias__

Opcionales:

- Foto de inventario\.
- Documento\.
- Comprobante\.
- Captura\.
- Observación firmada\.

Especialmente útil en:

- Pérdidas\.
- Pagos\.
- Transferencias\.
- Diferencias de stock\.

__43\. Notificaciones__

El sistema podrá avisar:

__Al encargado__

- Nuevo conflicto local\.
- Venta pendiente\.
- Pago pendiente\.

__Al administrador__

- Conflicto escalado\.
- Día cerrado\.
- Conflicto crítico\.
- Dispositivo revocado\.

No hace falta implementar WhatsApp/SMS en V1; pueden ser notificaciones internas\.

__44\. Contadores visibles__

Ejemplo en menú:

Sincronización   3

Conflictos       2

Esto ayuda a que no pasen desapercibidos\.

__45\. Conflicto resuelto no se elimina__

Permanece en historial con estado:

RESUELTO

Podremos consultar posteriormente:

- Qué ocurrió\.
- Cuánto tardó\.
- Quién lo resolvió\.
- Qué decisión tomó\.

__46\. Métricas administrativas__

Podemos obtener:

- Conflictos por sucursal\.
- Por dispositivo\.
- Por usuario\.
- Por tipo\.
- Tiempo promedio de resolución\.
- Ventas rechazadas\.
- Pagos conflictivos\.
- Frecuencia de stock insuficiente\.

Esto puede revelar problemas operativos o de conectividad\.

__47\. Conflictos repetitivos__

Ejemplo:

Una sucursal genera constantemente:

STOCK\_INSUFICIENTE

Puede indicar:

- Sincronización poco frecuente\.
- Mal conteo\.
- Pocos dispositivos coordinados\.
- Problemas de registro de entradas\.

El sistema puede generar una alerta administrativa\.

__48\. Seguridad__

Un conflicto nunca debe permitir modificar campos arbitrarios del servidor desde un JSON editable\.

Las opciones de resolución serán acciones controladas\.

Ejemplo:

- Asociar cliente\.
- Cancelar\.
- Reintentar\.
- Reabrir\.
- Crear ajuste mediante flujo correspondiente\.

No:

Editar payload libremente y guardar

__49\. Transacciones durante la resolución__

Una resolución que finalmente confirme una operación debe pasar nuevamente por las mismas reglas transaccionales\.

Ejemplo:

Reintentar venta:

BEGIN

Validar stock

Asignar lotes

Actualizar inventario

Kardex

Venta

Cuenta por cobrar

COMMIT

No debe saltarse reglas porque “ya fue revisada”\.

__50\. Resolución y precio__

Si un administrador autoriza una excepción de precio durante la resolución, debe guardarse:

- Precio original\.
- Precio final\.
- Precio mínimo\.
- Autorizador\.
- Motivo\.

No se pierde la propuesta original\.

__51\. Resolución de cliente duplicado__

Opciones:

__Asociar a existente__

Las operaciones locales pasan a usar el cliente oficial\.

__Crear nuevo__

Solo cuando realmente son personas/empresas diferentes\.

__Corregir documento__

Si hubo error de digitación, con auditoría\.

__52\. Resolución de kit__

Opciones:

- Reintentar con la composición original versionada\.
- Cancelar venta\.
- Revisar stock de componentes\.
- Resolver entrada faltante\.
- Escalar\.

No debemos sustituir componentes automáticamente por productos “parecidos”\.

__53\. Resolución de lote__

Como ya definimos:

- Reasignar automáticamente si existe stock\.
- Permitir encargado/almacenero cambiar lote con motivo cuando la operación es online/preparación\.
- Mantener ambas asignaciones en auditoría\.

__54\. Resolución y cierres__

Cuando el último conflicto crítico se resuelve:

El cierre puede volver a ejecutar sus validaciones\.

No se confirma automáticamente\.

El encargado todavía debe:

Revisar → Confirmar cierre

__55\. Conflicto detectado después de cierre__

Idealmente las validaciones evitan esto, pero podría encontrarse una inconsistencia técnica posteriormente\.

Debe generarse:

ALERTA\_CRITICA\_POST\_CIERRE

y requerir administrador\.

No corregir automáticamente un cierre confirmado\.

__56\. Permisos__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Ver conflicto propio

Sí

Sí

Limitado

Propios

Ver todos locales

Sí

Sí

No

No

Resolver lote

Sí

Sí

Con permiso

No

Resolver cliente

Sí

Sí

No

No

Cancelar operación local

Sí

Sí

Limitado

Propia no sincronizada

Resolver stock crítico

Sí

Limitado

No

No

Resolver pago

Sí

Limitado

No

No

Resolver día cerrado

Sí

No

No

No

Escalar

Sí

Sí

Sí

Sí/solicitar

__57\. Reglas funcionales definitivas del Proceso 14__

1. Los errores técnicos se reintentan\.
2. Los conflictos de negocio requieren reglas de resolución\.
3. Existirá una bandeja de conflictos\.
4. Cada conflicto tiene prioridad\.
5. Los conflictos seguros pueden resolverse automáticamente\.
6. UUID duplicado no genera operación nueva\.
7. Lote agotado puede reasignarse si existe stock total\.
8. Stock insuficiente no se fuerza\.
9. Las ventas no se aceptan parcialmente\.
10. Cliente con documento exacto puede asociarse al existente cuando sea seguro\.
11. Coincidencia solo por nombre requiere revisión\.
12. Pago superior al saldo no se aplica parcialmente de forma automática\.
13. Una venta de kit debe resolverse completa\.
14. Operaciones de día cerrado requieren administrador\.
15. Dispositivos revocados requieren revisión\.
16. Dependencias no se procesan si la operación principal falla\.
17. Conflictos críticos bloquean el cierre\.
18. Un conflicto no desaparece hasta ser resuelto/cancelado\.
19. Se conserva el payload original\.
20. Toda resolución queda auditada\.
21. Las resoluciones automáticas también quedan registradas\.
22. Encargado resuelve casos locales limitados\.
23. Administrador resuelve casos críticos\.
24. Puede escalarse un conflicto\.
25. Resolver causa externa permite reintentar\.
26. Nunca se crea stock negativo como resolución\.
27. Nunca se altera silenciosamente un cierre\.
28. No se editan libremente datos crudos para resolver\.
29. Las operaciones resueltas vuelven a pasar por validaciones normales\.
30. El historial de conflictos nunca se elimina\.

__58\. Criterios de aceptación del Proceso 14__

Consideraremos aprobado el proceso cuando:

- Un error de red no aparezca como conflicto crítico\.
- Una operación duplicada no se procese dos veces\.
- Un lote agotado pueda ser reasignado automáticamente\.
- Una venta sin stock suficiente quede pendiente y no afecte inventario\.
- Un pago superior al saldo no sea aplicado parcialmente\.
- Un cliente duplicado pueda asociarse de forma controlada\.
- Una venta de kit no quede parcialmente procesada\.
- Una operación de día cerrado requiera administrador\.
- Las dependencias permanezcan bloqueadas correctamente\.
- Los conflictos críticos impidan el cierre\.
- El encargado solo vea/resuelva lo permitido en su sucursal\.
- El administrador pueda ver todos los conflictos\.
- Toda resolución tenga usuario, motivo y fecha\.
- El payload original permanezca intacto\.
- Los conflictos resueltos sigan disponibles en historial\.

__Resultado del Proceso 14__

Queda funcionalmente definido:

__El sistema contará con una gestión explícita de conflictos que distinguirá fallas técnicas de inconsistencias de negocio\. Los casos seguros podrán resolverse automáticamente, mientras que los conflictos de stock, pagos, clientes, kits, cierres y permisos serán tratados mediante una bandeja de revisión con niveles de autorización, trazabilidad completa y sin alterar silenciosamente las operaciones originales\.__

Con esto ya tenemos definidos __14 procesos funcionales__\. El siguiente corresponde al __Proceso 15: Alertas y reportes__, donde consolidaremos qué alertas necesita cada rol y cuáles serán los reportes operativos, financieros, de inventario, lotes, Kardex, ventas, deudas, kits, transferencias, cierres y sincronización\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 15: Alertas y reportes__

Este proceso corresponde principalmente a:

- __Módulo 10: Alertas__
- __Módulo 11: Reportes__

y consolida información de prácticamente todo el sistema:

- Inventario\.
- Lotes\.
- Kardex\.
- Ventas\.
- Entradas\.
- Salidas\.
- Transferencias\.
- Clientes\.
- Cuentas por cobrar\.
- Pagos\.
- Kits\.
- Cierres\.
- PWA\.
- Conflictos\.
- Usuarios y sucursales\.

La regla principal será:

__Una alerta sirve para indicar que algo requiere atención; un reporte sirve para analizar información histórica, operativa o financiera\. No deben confundirse\.__

__1\. Objetivo funcional__

El sistema debe permitir que cada rol conozca rápidamente:

- Qué requiere atención hoy\.
- Qué operaciones están pendientes\.
- Qué productos necesitan reposición\.
- Qué deudas están vencidas\.
- Qué transferencias están demoradas\.
- Qué dispositivos no sincronizan\.
- Qué cierres faltan\.
- Qué inconsistencias existen\.

Y además generar reportes para responder preguntas como:

- ¿Cuánto se vendió?
- ¿Qué productos se venden más?
- ¿Cuál es el stock actual?
- ¿Cuánto vale el inventario?
- ¿Qué clientes deben dinero?
- ¿Qué sucursal vende más?
- ¿Cuánto se perdió o ajustó?
- ¿Cuál es la utilidad bruta?
- ¿Qué productos están inmovilizados?

__2\. Alertas vs notificaciones__

Conviene distinguir dos conceptos\.

__Alerta__

Representa una condición del negocio\.

Ejemplo:

Stock bajo de RK\-428

Puede mantenerse activa durante varios días\.

__Notificación__

Representa un evento\.

Ejemplo:

Transferencia TRF\-125 fue recibida\.

Puede marcarse como leída\.

Para V1 podemos manejar ambas dentro de un mismo centro visual, pero internamente es mejor distinguirlas\.

__3\. Severidad de alertas__

Propongo cuatro niveles:

- INFORMATIVA
- ADVERTENCIA
- ALTA
- CRITICA

Ejemplos:

__Informativa__

Transferencia recibida correctamente\.

__Advertencia__

Producto próximo a stock mínimo\.

__Alta__

Cuenta por cobrar vencida\.

__Crítica__

Kardex no coincide con inventario\.

__4\. Estado de una alerta__

Propongo:

- ACTIVA
- VISTA
- EN\_REVISION
- RESUELTA
- DESCARTADA

Una alerta que depende de una condición puede cerrarse automáticamente\.

Ejemplo:

Stock bajo

si posteriormente entra mercadería y supera el mínimo:

RESUELTA AUTOMATICAMENTE

__5\. Alertas por rol__

No todos deben recibir todo\.

__Administrador general__

Debe ver:

- Alertas de todas las sucursales\.
- Conflictos críticos\.
- Cierres pendientes\.
- Diferencias de caja\.
- Diferencias de inventario\.
- Deudas vencidas importantes\.
- Dispositivos sin sincronizar\.
- Movimientos sensibles\.
- Reaperturas\.

__Encargado__

Debe ver principalmente su sucursal:

- Stock bajo\.
- Cierre pendiente\.
- Transferencias\.
- Conflictos\.
- Diferencias de inventario\.
- Deudas locales\.
- Daños y pérdidas pendientes\.

__Almacenero__

- Stock bajo\.
- Lotes antiguos\.
- Ubicaciones pendientes\.
- Transferencias por preparar\.
- Conteos\.
- Producto dañado\.

__Vendedor__

- Stock agotado\.
- Cliente con deuda vencida al vender\.
- Venta pendiente de sincronizar\.
- Conflicto de una operación propia\.

__6\. Alertas de inventario__

Inicialmente:

- Stock agotado\.
- Stock bajo mínimo\.
- Stock crítico\.
- Stock bloqueado\.
- Stock dañado\.
- Producto con stock pero sin ubicación\.
- Producto con stock pero sin costo\.
- Inconsistencia inventario\-lotes\.
- Inconsistencia inventario\-Kardex\.
- Stock reservado excesivo\.
- Stock en tránsito demasiado tiempo\.

__7\. Stock bajo__

Cada producto puede tener mínimo por sucursal\.

Ejemplo:

RK\-428

Sucursal Mazuko

Disponible: 2

Mínimo: 5

Resultado:

ALERTA\_STOCK\_BAJO

__8\. Stock agotado__

Disponible = 0

Debe diferenciarse de:

Físico > 0

pero todo reservado/bloqueado/dañado

En ambos casos el vendedor no puede vender, pero la causa es diferente\.

__9\. Stock mínimo por sucursal__

Esto permitirá que el mismo producto tenga distintos niveles\.

Ejemplo:

Juliaca mínimo: 10

Mazuko mínimo: 3

Huepetuhe mínimo: 5

Esto es mejor que un mínimo global obligatorio\.

__10\. Sugerencia de reposición__

Podemos preparar un reporte:

Productos por reponer

con:

- Stock disponible\.
- Stock mínimo\.
- Consumo reciente\.
- Stock de otras sucursales\.
- Cantidad sugerida\.

Para V1, la cantidad sugerida puede ser simple:

máximo\(0, mínimo \- disponible\)

Más adelante se puede mejorar con rotación histórica\.

__11\. Alertas de lotes__

- Lote antiguo\.
- Lote bloqueado\.
- Lote dañado\.
- Lote sin ubicación\.
- Lote con diferencia\.
- Lote en tránsito demorado\.
- Lote con antigüedad superior al límite configurable\.

No todos los repuestos tienen vencimiento, así que no debemos inventar fechas de caducidad si no aplica\.

__12\. Alertas de ventas__

- Venta pendiente de autorización\.
- Venta offline pendiente\.
- Venta en conflicto\.
- Precio bajo\.
- Venta con margen negativo\.
- Venta anulada\.
- Alta cantidad de anulaciones por usuario\.

La alerta de margen negativo solo debe ser visible a roles con permiso de costo\.

__13\. Margen negativo__

Ejemplo:

Precio venta: S/ 100

Costo oficial: S/ 120

Resultado:

Margen bruto: \-S/ 20

Puede generar:

ALERTA\_MARGEN\_NEGATIVO

No necesariamente bloquear si existe una autorización comercial válida\.

__14\. Alertas de cuentas por cobrar__

- Deuda próxima a vencer\.
- Deuda vencida\.
- Cliente con varias deudas vencidas\.
- Pago pendiente\.
- Pago en conflicto\.
- Pago posiblemente duplicado\.

El número de días para “próxima a vencer” será configurable\.

__15\. Alertas de transferencias__

- Solicitud pendiente\.
- Transferencia aprobada sin preparar\.
- Preparada sin enviar\.
- En tránsito demasiado tiempo\.
- Recepción parcial\.
- Diferencia de recepción\.
- Producto dañado en traslado\.

__16\. Alertas de kits__

- Kit sin composición activa\.
- Componente inactivo\.
- Kit sin costo calculable\.
- Componentes insuficientes\.
- Kit prearmado antiguo\.
- Orden de armado pendiente\.
- Precio mínimo inferior al costo actual\.
- Conflicto offline de kit\.

__17\. Alertas de cierre__

- Sucursal sin cerrar\.
- Cierre con diferencia de caja\.
- Cierre con diferencia de inventario\.
- Cierre bloqueado por sincronización\.
- Cierre reabierto\.
- Cierre atrasado\.

El administrador podrá ver un tablero general\.

__18\. Alertas de PWA y sincronización__

- Dispositivo sin sincronizar\.
- Dispositivo con muchas operaciones pendientes\.
- Error repetido\.
- Conflicto crítico\.
- Dispositivo revocado intentando sincronizar\.
- Datos locales demasiado antiguos\.

__19\. Evitar alertas duplicadas__

Si un producto tiene stock bajo durante cinco días, no debemos crear cinco alertas idénticas cada día\.

Debe existir una alerta activa por condición\.

Ejemplo:

RK\-428 / Mazuko / STOCK\_BAJO

Permanece activa hasta que cambie la condición\.

__20\. Centro de alertas__

Pantalla sugerida:

__Prioridad__

__Tipo__

__Sucursal__

__Descripción__

__Desde__

__Estado__

Filtros:

- Sucursal\.
- Tipo\.
- Prioridad\.
- Estado\.
- Fecha\.
- Módulo\.

__21\. Dashboard administrativo__

Recomiendo que el dashboard no sea solo gráficos decorativos\.

Debe mostrar indicadores accionables\.

Por ejemplo:

Ventas hoy

Cobros hoy

Cuentas vencidas

Valor inventario

Productos con stock bajo

Transferencias en tránsito

Conflictos críticos

Sucursales sin cerrar

__22\. Dashboard de sucursal__

El encargado puede ver:

Ventas de hoy

Cobros de hoy

Stock bajo

Transferencias pendientes

Deudas vencidas locales

Conflictos

Estado del cierre

Última sincronización

__23\. Reportes: principio general__

Todos los reportes deben permitir, cuando corresponda:

- Filtro de fecha\.
- Sucursal\.
- Producto\.
- Marca\.
- Categoría\.
- Cliente\.
- Usuario\.
- Tipo de movimiento\.
- Estado\.

Y tener:

- Vista en pantalla\.
- Exportación a Excel\.
- Exportación a PDF cuando tenga sentido\.

__24\. Reportes de inventario__

Mínimos:

1. Stock actual por sucursal\.
2. Stock consolidado\.
3. Inventario valorizado\.
4. Productos agotados\.
5. Productos bajo mínimo\.
6. Stock reservado\.
7. Stock dañado\.
8. Stock bloqueado\.
9. Stock en tránsito\.
10. Productos sin movimiento\.
11. Productos sin costo\.
12. Productos sin ubicación\.

__25\. Stock actual por sucursal__

Campos:

- Referencia\.
- Producto\.
- Marca\.
- Categoría\.
- Físico\.
- Reservado\.
- Bloqueado\.
- Dañado\.
- Disponible\.
- En tránsito\.
- Costo promedio, según permiso\.
- Valor\.

__26\. Inventario consolidado__

Debe sumar sucursales sin perder detalle\.

Ejemplo:

__Producto__

__Juliaca__

__Mazuko__

__Huepetuhe__

__Tránsito__

__Total__

Importante:

El total consolidado incluye tránsito como patrimonio, pero el tránsito no es disponible en ninguna sucursal\.

__27\. Inventario valorizado__

Por:

producto \+ sucursal

Valor:

cantidad valorizable × costo promedio

Puede agruparse por:

- Sucursal\.
- Marca\.
- Categoría\.
- Producto\.

__28\. Reporte de lotes__

Campos:

- Lote\.
- Producto\.
- Sucursal\.
- Fecha original\.
- Fecha recepción local\.
- Cantidad inicial\.
- Disponible\.
- Reservado\.
- Estado\.
- Ubicación\.
- Procedencia\.
- Lote origen\.
- Costo original\.
- Antigüedad\.

__29\. Reporte de antigüedad de inventario__

Muy útil para identificar mercadería inmovilizada\.

Rangos sugeridos inicialmente:

0–30 días

31–90

91–180

181–365

Más de 365

Pero deben quedar configurables\.

__30\. Producto sin movimiento__

Un reporte de:

Inventario sin movimiento

deberá permitir elegir:

sin venta/salida durante X días

por ejemplo 90, 180, 365\.

No fijaremos un único período rígido\.

__31\. Reportes de Kardex__

- Kardex por producto\.
- Kardex por sucursal\.
- Entradas y salidas por período\.
- Evolución de costo promedio\.
- Ajustes\.
- Reversiones\.
- Transferencias valorizadas\.
- Costo de ventas\.

__32\. Kardex detallado__

Filtros:

Producto

Sucursal

Desde

Hasta

Tipo movimiento

Resultado:

| Fecha | Documento | Tipo | Entrada | Costo | Salida | Costo | Saldo | Promedio |

Debe poder profundizar al documento original\.

__33\. Reportes de ventas__

Mínimos:

- Ventas por día\.
- Ventas por sucursal\.
- Ventas por vendedor\.
- Ventas por cliente\.
- Ventas por producto\.
- Ventas por marca\.
- Ventas por categoría\.
- Ventas por tipo de producto\.
- Ventas de kits\.
- Ventas contado/crédito\.
- Ventas anuladas\.
- Devoluciones\.
- Descuentos\.

__34\. Ventas por producto__

Debe mostrar al menos:

- Cantidad vendida\.
- Venta neta\.
- Costo de venta\.
- Utilidad bruta\.
- Margen %\.

Solo roles con permiso de costo ven costo/utilidad\.

__35\. Utilidad bruta__

Conceptualmente:

Utilidad bruta =

Venta neta

\-

Costo oficial de salida

No representa utilidad neta de la empresa porque no incluye:

- Sueldos\.
- Alquiler\.
- Impuestos\.
- Gastos administrativos\.

Debe llamarse explícitamente:

__Utilidad bruta__

__36\. Margen__

Margen % =

Utilidad bruta / venta neta × 100

Si venta neta es cero, el reporte debe manejarlo sin división inválida\.

__37\. Reporte de descuentos__

Campos:

- Venta\.
- Producto\.
- Precio sugerido\.
- Precio final\.
- Descuento\.
- Usuario\.
- Autorizador\.
- Motivo\.
- Sucursal\.

Esto permitirá controlar quién está vendiendo con descuentos frecuentemente\.

__38\. Reportes de clientes__

- Ventas por cliente\.
- Última compra\.
- Total comprado\.
- Frecuencia\.
- Deuda pendiente\.
- Deuda vencida\.
- Historial de pagos\.
- Devoluciones\.

__39\. Reporte de cuentas por cobrar__

Mínimo:

| Cliente | Documento | Venta | Fecha | Vencimiento | Original | Pagado | Saldo | Estado |

Filtros:

- Sucursal origen\.
- Cliente\.
- Vencidas\.
- Vigentes\.
- Fecha de vencimiento\.

__40\. Antigüedad de cuentas por cobrar__

Rangos:

- Vigente\.
- 1–30 días vencida\.
- 31–60\.
- 61–90\.
- Más de 90\.

Esto permitirá responder:

¿Cuánto dinero tenemos vencido desde hace más de 90 días?

__41\. Reportes de pagos__

- Pagos por fecha\.
- Por sucursal\.
- Por método\.
- Por cliente\.
- Por cobrador\.
- Pagos de ventas del día\.
- Cobro de deudas anteriores\.
- Pagos anulados\.
- Reembolsos\.
- Pagos offline\.
- Conflictos\.

__42\. Reporte por método de pago__

Ejemplo:

__Método__

__Operaciones__

__Total__

Efectivo

25

3,500

Yape

14

2,100

Plin

6

900

Transferencia

8

5,000

Muy útil para cierre y administración\.

__43\. Reportes de entradas y compras__

- Compras por proveedor\.
- Compras por producto\.
- Compras por fecha\.
- Costos de compra\.
- Entradas no comerciales\.
- Ajustes positivos\.
- Devoluciones de cliente\.
- Entradas de transferencia\.
- Entradas de armado\.

__44\. Evolución de costos__

Será útil poder consultar:

Producto RK\-428

y observar:

- Costos de compra\.
- Costo promedio\.
- Fechas\.

No necesitamos necesariamente un gráfico sofisticado desde V1; una tabla histórica puede ser suficiente\.

__45\. Reportes de otras salidas__

- Uso interno\.
- Pérdidas\.
- Daños\.
- Ajustes negativos\.
- Devoluciones a proveedor\.
- Entregas no comerciales\.
- Consumo de kits\.

Con:

- Cantidad\.
- Valor\.
- Motivo\.
- Usuario\.
- Autorizador\.

__46\. Reporte de pérdidas__

Debe ser especialmente visible al administrador\.

Campos:

- Fecha\.
- Sucursal\.
- Producto\.
- Cantidad\.
- Valor\.
- Motivo\.
- Usuario que reportó\.
- Autorizador\.

Esto sirve como control interno\.

__47\. Reportes de transferencias__

- Solicitadas\.
- Aprobadas\.
- En tránsito\.
- Recibidas\.
- Parciales\.
- Con diferencia\.
- Por origen\.
- Por destino\.
- Por producto\.
- Valor transferido\.
- Tiempo de tránsito\.

__48\. Tiempo de tránsito__

Podemos calcular:

fecha\_recepcion \- fecha\_envio

y analizar:

- Promedio por ruta\.
- Transferencias demoradas\.

Por ejemplo:

Juliaca → Mazuko

__49\. Reportes de kits__

- Kits vendidos\.
- Kits prearmados\.
- Kits armados al vender\.
- Órdenes de armado\.
- Componentes consumidos\.
- Costos de kit\.
- Utilidad bruta de kits\.
- Versiones de composición\.
- Capacidad armable actual\.
- Kits antiguos prearmados\.

__50\. Reporte de capacidad armable__

Ejemplo:

__Kit__

__Prearmados__

__Armables adicionales__

__Limitante__

KIT A

2

3

Rodamiento

KIT B

0

5

Retén

Esto será muy útil operativamente\.

__51\. Reportes de cierres__

- Cierres por fecha\.
- Por sucursal\.
- Cierres pendientes\.
- Diferencias de caja\.
- Diferencias de inventario\.
- Cierres reabiertos\.
- Versiones\.
- Responsable\.

__52\. Reportes de sincronización__

- Dispositivos autorizados\.
- Última sincronización\.
- Operaciones offline\.
- Pendientes\.
- Rechazadas\.
- Conflictos\.
- Tiempo de resolución\.
- Reintentos\.

__53\. Reportes de conflictos__

Por:

- Tipo\.
- Sucursal\.
- Usuario\.
- Dispositivo\.
- Fecha\.
- Resolución\.

Ejemplo:

Stock insuficiente: 25 casos

Cliente duplicado: 6

Pago excesivo: 2

Esto puede revelar problemas operativos\.

__54\. Reportes de auditoría__

Para administrador:

- Creación/modificación de productos\.
- Cambios de precio\.
- Cambios de mínimo\.
- Autorizaciones\.
- Anulaciones\.
- Reversiones\.
- Reaperturas\.
- Ajustes\.
- Cambios de lotes PEPS\.
- Resolución de conflictos\.
- Bloqueo de usuarios/dispositivos\.

__55\. Reporte de actividad por usuario__

Debe usarse como trazabilidad, no como métrica simplista de desempeño\.

Podrá mostrar:

- Ventas registradas\.
- Pagos registrados\.
- Anulaciones\.
- Ajustes\.
- Transferencias\.
- Conflictos\.

__56\. Reportes consolidados vs locales__

__Encargado__

Ve principalmente su sucursal\.

__Administrador__

Puede elegir:

Sucursal específica

o:

Todas las sucursales

En consolidado debe poder profundizar hasta la sucursal\.

__57\. Comparación entre sucursales__

Ejemplo:

__Sucursal__

__Ventas__

__Costo__

__Utilidad bruta__

__Cobros__

Esto será útil para administración\.

Pero debemos evitar comparar incorrectamente:

- Ventas\.
- Cobros\.
- Transferencias\.

Las transferencias no son ventas\.

__58\. Filtros y persistencia__

Recomiendo permitir filtros combinados\.

Ejemplo:

Fecha: agosto 2026

Sucursal: Mazuko

Marca: X

Categoría: Sellos

Posteriormente podemos permitir guardar “reportes favoritos”, pero no es indispensable para V1\.

__59\. Exportación Excel__

Será especialmente importante porque actualmente la empresa trabaja mucho con Excel\.

Recomiendo que los principales reportes permitan:

__Exportar \.xlsx__

con:

- Cabeceras claras\.
- Fechas reales\.
- Números como números\.
- Referencias como texto\.
- Sin fórmulas necesarias para interpretar el reporte\.

Esto facilitará la adopción del sistema\.

__60\. Exportación PDF__

Más útil para:

- Cierre diario\.
- Kardex\.
- Cuentas por cobrar\.
- Transferencias\.
- Comprobantes internos\.
- Resúmenes administrativos\.

No todos los reportes necesitan PDF\.

__61\. Información en tiempo real vs histórica__

Debemos diferenciar\.

__Tiempo real__

Ejemplo:

Stock actual

__Histórica__

Ejemplo:

Stock al 31/07/2026

Esta última requiere reconstrucción desde Kardex o snapshots\.

El sistema debe etiquetarlas claramente\.

__62\. Stock histórico__

Podremos calcularlo desde movimientos:

saldo Kardex hasta fecha/hora

y su valorización correspondiente\.

Para períodos grandes, posteriormente se pueden usar snapshots para optimización\.

__63\. Indicadores principales__

Para V1 recomiendo pocos KPI, pero útiles:

- Venta neta\.
- Costo de venta\.
- Utilidad bruta\.
- Cobros\.
- Cuentas por cobrar\.
- Vencido\.
- Valor inventario\.
- Stock bajo\.
- Rotación/movimiento\.
- Pérdidas\.
- Ajustes\.
- Transferencias pendientes\.

__64\. Rotación de inventario__

Podemos preparar reportes de movimiento como:

- Cantidad vendida en período\.
- Días desde última salida\.
- Días desde última venta\.

Una rotación financiera más formal requiere definir períodos y costo promedio de inventario, así que puede quedar para una fase analítica posterior\.

__65\. Producto más vendido__

Debe poder ordenarse por:

- Cantidad\.
- Importe\.
- Utilidad bruta\.

Porque “más vendido” puede significar cosas distintas\.

__66\. Alertas configurables__

Recomiendo una configuración central para algunos umbrales:

- Días para deuda próxima a vencer\.
- Días máximos de transferencia\.
- Días de lote antiguo\.
- Tiempo máximo sin sincronizar\.
- Umbral de diferencia importante\.
- Stock mínimo por producto/sucursal\.

No debemos codificar estas cifras directamente\.

__67\. Alertas automáticas programadas__

Algunas condiciones se detectan al realizar una operación\.

Ejemplo:

Venta deja stock debajo del mínimo

Otras requieren proceso periódico\.

Ejemplo:

Deuda se volvió vencida hoy

Transferencia lleva demasiado tiempo

Dispositivo lleva horas sin sincronizar

Laravel Scheduler puede revisar estas condiciones\.

__68\. Alertas y cierre__

Las alertas informativas no deben bloquear el cierre\.

Solo las condiciones que ya definimos como críticas:

- Kardex inconsistente\.
- Conflictos pendientes\.
- Sincronización pendiente crítica\.
- Diferencias requeridas sin resolver\.

Por tanto:

__Alerta ≠ bloqueo\.__

Debe existir un indicador explícito bloquea\_cierre\.

__69\. Reportes no deben recalcular reglas comerciales históricas actuales__

Ejemplo:

Si hoy cambió el precio mínimo, un reporte de venta de hace seis meses debe mostrar:

- Precio usado entonces\.
- Precio mínimo/version si se almacenó\.

No comparar silenciosamente con la regla actual y decir que estuvo fuera de política\.

El mismo principio aplica a kits y composiciones\.

__70\. Permisos de reportes__

Debemos controlar especialmente costos y utilidad\.

__Información__

__Admin__

__Encargado__

__Vendedor__

__Almacenero__

Stock cantidades

Sí

Sí

Local

Sí local

Costos

Sí

Según permiso

No

Según permiso

Valor inventario

Sí

Según permiso

No

Limitado

Ventas

Sí

Local

Propias/permitidas

No

Utilidad

Sí

Según permiso

No

No

CxC

Sí

Local

Limitado

No

Auditoría global

Sí

No

No

No

Conflictos

Sí

Local

Propios

Limitado

__71\. Rendimiento__

No debemos ejecutar reportes pesados sobre todas las tablas sin índices\.

En la Etapa 4 habrá que definir índices para:

- sucursal\_id
- producto\_id
- fechas
- estados
- tipos de movimiento
- cliente
- documento
- created\_at
- secuencias Kardex

Y posiblemente resúmenes/materializaciones si el volumen crece\.

__72\. Reportes programados__

No son necesarios para arrancar, pero podemos dejar preparada la posibilidad futura de:

- Reporte diario por correo\.
- Resumen semanal\.
- Cuentas vencidas\.
- Sucursales sin cerrar\.

Para V1 priorizaría consulta bajo demanda dentro del sistema\.

__73\. Reglas funcionales definitivas del Proceso 15__

1. Alertas y reportes son conceptos diferentes\.
2. Las alertas tienen prioridad y estado\.
3. Las alertas se muestran según rol/sucursal\.
4. Una misma condición no genera duplicados diarios innecesarios\.
5. Las alertas pueden resolverse automáticamente cuando desaparece la condición\.
6. Stock bajo usa mínimo por sucursal\.
7. Existirán alertas de inventario, lotes, ventas, deudas, transferencias, kits, cierres y sincronización\.
8. Alerta no implica automáticamente bloqueo de cierre\.
9. Los principales reportes tendrán filtros\.
10. El administrador puede consultar consolidado\.
11. El encargado consulta principalmente su sucursal\.
12. Los costos y utilidades requieren permisos\.
13. Las transferencias no se contabilizan como ventas\.
14. Ventas y cobros se reportan separadamente\.
15. Inventario consolidado mantiene tránsito separado\.
16. El Kardex tendrá reporte detallado\.
17. Cuentas por cobrar tendrán antigüedad\.
18. Pagos podrán analizarse por método\.
19. Ajustes/pérdidas tendrán reportes específicos\.
20. Kits tendrán reportes propios\.
21. Cierres y reaperturas serán reportables\.
22. Sincronización y conflictos tendrán reportes administrativos\.
23. Auditoría será visible al administrador\.
24. Exportación Excel será prioritaria\.
25. PDF se usará en documentos y resúmenes relevantes\.
26. Las referencias se exportarán como texto\.
27. Los reportes históricos respetarán la información vigente en el momento de la operación\.
28. Los umbrales de alertas serán configurables\.
29. Laravel Scheduler podrá generar alertas temporales\.
30. Los reportes deben respetar permisos y aislamiento por sucursal\.

__74\. Criterios de aceptación del Proceso 15__

Consideraremos aprobado el proceso cuando:

- Un producto por debajo del mínimo genere una sola alerta activa\.
- La alerta se resuelva cuando el stock se normalice\.
- Un cliente vencido aparezca correctamente en alertas y reportes\.
- Transferencias demoradas sean identificables\.
- El administrador vea alertas de todas las sucursales\.
- El encargado solo vea las que corresponden\.
- El reporte de inventario coincida con el inventario oficial\.
- El reporte de Kardex coincida con los movimientos\.
- Ventas y cobros aparezcan diferenciados\.
- Utilidad bruta utilice el costo oficial\.
- Un vendedor no pueda consultar costos restringidos\.
- El consolidado de sucursales no duplique tránsito\.
- Cuentas por cobrar muestren correctamente antigüedad\.
- Los reportes puedan exportarse a Excel\.
- Las reaperturas y conflictos sean auditables mediante reportes\.

__Resultado del Proceso 15__

Queda funcionalmente definido:

__El sistema tendrá un centro de alertas orientado a excepciones y una capa de reportes operativos, comerciales, financieros y de inventario\. La información podrá consultarse por sucursal o de manera consolidada, respetará los permisos sobre costos y datos sensibles y permitirá exportación principalmente a Excel y, cuando corresponda, PDF\.__

Con esto ya tenemos cubierto el núcleo de __Alertas y Reportes__\.

El siguiente proceso de la __Etapa 3__ será el __Proceso 16: Usuarios, roles, sucursales, sesiones y dispositivos__, donde consolidaremos la administración de accesos, alcance por sucursal, permisos granulares, creación/bloqueo de usuarios, sesiones activas, dispositivos autorizados y auditoría de seguridad\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 16: Usuarios, roles, sucursales, sesiones y dispositivos__

Este proceso corresponde principalmente a:

- __Módulo 1: Usuarios, roles, sesiones y dispositivos__
- __Módulo 2: Sucursales__

y es transversal a todo el sistema porque define __quién puede hacer qué, en qué sucursal y desde qué dispositivo__\.

La regla central será:

__Toda operación sensible debe ejecutarse por un usuario identificado, con permisos suficientes, dentro del alcance de sucursal permitido y dejando trazabilidad\.__

__1\. Objetivo funcional__

El sistema debe controlar:

- Usuarios\.
- Roles\.
- Permisos\.
- Sucursales\.
- Alcance por sucursal\.
- Sesiones activas\.
- Dispositivos autorizados\.
- Bloqueos y revocaciones\.
- Auditoría de accesos\.
- Permisos especiales sobre costos, ajustes, precios y cierres\.

No bastará con saber que alguien inició sesión; debemos saber además:

- Qué rol tiene\.
- En qué sucursal opera\.
- Qué acciones concretas puede realizar\.

__2\. Entidades principales__

Tendremos conceptualmente:

USUARIO

ROL

PERMISO

SUCURSAL

SESION

DISPOSITIVO

Y relaciones como:

Usuario

   ↓

Rol / permisos

   ↓

Sucursal o sucursales autorizadas

   ↓

Sesiones

   ↓

Dispositivos

__3\. Sucursales__

Cada sucursal tendrá al menos:

- ID\.
- UUID\.
- Código\.
- Nombre\.
- Dirección\.
- Estado\.
- Indicador de sucursal principal\.
- Zona/observaciones opcionales\.

Ejemplo:

Código: JUL

Nombre: Juliaca

Tipo: Principal

Estado: Activa

Otra:

Código: MZK

Nombre: Mazuko

Estado: Activa

Los nombres oficiales se confirmarán antes de migración\.

__4\. Una sola base de datos__

Las sucursales __no tendrán bases de datos separadas__\.

Todo estará en PostgreSQL central\.

La separación será lógica mediante:

sucursal\_id

Esto permite:

- Consolidado\.
- Transferencias\.
- Clientes globales\.
- Pagos entre sucursales\.
- Administración central\.

__5\. Sucursal activa__

Un usuario operativo trabajará normalmente en una sucursal activa\.

Ejemplo:

Usuario: vendedor1

Sucursal activa: Mazuko

Las ventas que cree pertenecerán por defecto a Mazuko\.

No debería poder cambiar manualmente a Juliaca si no tiene permiso\.

__6\. Usuarios con varias sucursales__

Algunos usuarios pueden necesitar acceso a más de una\.

Ejemplo:

Administrador general

→ Todas las sucursales

Otro caso:

Supervisor regional

→ Mazuko

→ Huepetuhe

Aunque el rol de supervisor todavía no sea indispensable en V1, la arquitectura debe soportar múltiples sucursales por usuario\.

__7\. Cambio de sucursal__

Para usuarios autorizados:

Sucursal actual: Juliaca

\[ Cambiar a Mazuko \]

La interfaz debe mostrar claramente cuál está activa\.

Esto evita que un administrador registre accidentalmente una operación en la tienda equivocada\.

__8\. Operaciones ligadas a sucursal__

Toda operación relevante tendrá sucursal\_id, por ejemplo:

- Venta\.
- Pago recibido\.
- Entrada\.
- Salida\.
- Inventario\.
- Lote\.
- Cierre\.
- Usuario operativo\.
- Transferencia origen/destino\.

La sucursal nunca debe deducirse solamente del navegador o del nombre del usuario\.

Debe quedar almacenada explícitamente\.

__9\. Roles iniciales__

Quedan consolidados cuatro roles principales:

1. __Administrador general__
2. __Encargado de sucursal__
3. __Almacenero__
4. __Vendedor__

Más adelante se pueden crear roles adicionales\.

__10\. Administrador general__

Tendrá acceso global\.

Puede:

- Ver todas las sucursales\.
- Crear usuarios\.
- Crear roles\.
- Configurar permisos\.
- Administrar sucursales\.
- Ver costos\.
- Configurar precios\.
- Autorizar excepciones\.
- Resolver conflictos críticos\.
- Reabrir cierres\.
- Bloquear dispositivos\.
- Acceder a reportes globales\.
- Auditar operaciones\.

No implica que deba realizar rutinariamente todas las operaciones; simplemente tiene autoridad\.

__11\. Encargado de sucursal__

Opera principalmente dentro de su sucursal\.

Puede:

- Ver inventario local\.
- Registrar/confirmar operaciones permitidas\.
- Ventas\.
- Entradas\.
- Pagos\.
- Transferencias\.
- Conteos\.
- Preparar cierre\.
- Confirmar cierre\.
- Resolver conflictos locales simples\.
- Autorizar ciertas operaciones según permisos\.

No puede:

- Reabrir cierre\.
- Administrar globalmente usuarios\.
- Resolver conflictos críticos globales salvo permiso especial\.

__12\. Almacenero__

Su foco es físico\.

Puede:

- Ver inventario\.
- Ver lotes\.
- Preparar entradas\.
- Preparar transferencias\.
- Registrar conteos\.
- Registrar ubicaciones\.
- Reportar daños/pérdidas\.
- Cambiar lote sugerido PEPS con permiso y motivo\.

Normalmente no debe:

- Ver utilidades\.
- Cambiar precios\.
- Confirmar ajustes sensibles\.
- Administrar usuarios\.
- Resolver pagos\.

__13\. Vendedor__

Puede:

- Buscar productos\.
- Ver stock local disponible\.
- Buscar/crear clientes básicos\.
- Crear ventas\.
- Registrar pagos si tiene permiso\.
- Trabajar offline\.
- Consultar sus operaciones\.

No debe:

- Ver costos\.
- Ajustar inventario\.
- Cambiar lotes\.
- Crear productos maestros\.
- Cambiar precios mínimos\.
- Anular ventas confirmadas\.
- Reabrir cierres\.

__14\. Roles no deben ser demasiado rígidos__

Además del rol tendremos __permisos granulares__\.

Por ejemplo, dos encargados pueden tener diferencias:

Encargado A

→ puede autorizar precio bajo mínimo

Encargado B

→ no puede

Así no necesitamos crear decenas de roles casi iguales\.

__15\. Modelo de permisos__

Conceptualmente:

ROL

  ↓

PERMISOS

y opcionalmente:

USUARIO

  ↓

PERMISOS EXTRA / RESTRICCIONES

Recomendación:

Usar rol como base y excepciones individuales solo cuando sean necesarias\.

Evitar un sistema donde cada usuario tenga cientos de permisos configurados manualmente\.

__16\. Permisos principales__

Entre otros:

__Catálogo__

- Ver productos\.
- Crear producto\.
- Editar producto\.
- Cambiar referencia\.
- Crear alias\.
- Crear kit\.
- Cambiar composición\.

__Inventario__

- Ver stock\.
- Ver costos\.
- Ver lotes\.
- Cambiar lote PEPS\.
- Confirmar ajuste\.
- Registrar daño\.
- Confirmar pérdida\.

__Ventas__

- Crear venta\.
- Cambiar precio\.
- Autorizar bajo mínimo\.
- Anular venta\.
- Ver utilidad\.

__Pagos__

- Registrar pago\.
- Anular pago\.
- Reembolsar\.
- Resolver conflicto financiero\.

__Transferencias__

- Solicitar\.
- Aprobar\.
- Preparar\.
- Enviar\.
- Recibir\.
- Resolver diferencias\.

__Cierres__

- Preparar\.
- Confirmar\.
- Reabrir\.

__Administración__

- Usuarios\.
- Roles\.
- Dispositivos\.
- Sucursales\.
- Configuración\.

__17\. Permiso de ver costos__

Debe ser explícito:

ver\_costos

Sin ese permiso, el backend tampoco debe devolver costos sensibles innecesariamente\.

No basta con ocultar la columna en React\.

__18\. Permiso de utilidad__

Separado de costos si lo consideramos necesario:

ver\_utilidad

Porque alguien puede necesitar ver costos de inventario pero no márgenes comerciales\.

__19\. Permiso de precio bajo mínimo__

Conceptualmente:

autorizar\_precio\_bajo\_minimo

Además puede existir un alcance:

- Solo sucursal propia\.
- Todas las sucursales\.

El usuario autorizador debe ser distinto del vendedor cuando la política lo requiera\.

__20\. Permiso de ajuste__

confirmar\_ajuste\_inventario

No confundir con:

registrar\_conteo

El almacenero puede contar sin tener capacidad de modificar oficialmente el stock\.

__21\. Permiso de PEPS__

cambiar\_lote\_sugerido

Cuando se utilice:

- Motivo obligatorio\.
- Auditoría\.

__22\. Permisos sobre kits__

Ejemplos:

crear\_kit

editar\_composicion\_kit

confirmar\_armado

desarmar\_kit

El desarmado, si se habilita, será especialmente restringido\.

__23\. Permisos de cierre__

Separados:

preparar\_cierre

confirmar\_cierre

reabrir\_cierre

reabrir\_cierre será exclusivo del administrador general en V1\.

__24\. Alcance de sucursal__

Cada permiso debe ejecutarse además dentro del alcance del usuario\.

Ejemplo:

Un encargado tiene:

confirmar\_ajuste = sí

pero solo para:

Mazuko

No puede confirmar uno de Juliaca\.

__25\. Administración de usuarios__

Datos mínimos:

- Nombre\.
- Usuario/email\.
- Rol\.
- Sucursal\(es\)\.
- Estado\.
- Fecha de creación\.
- Último acceso\.

Opcionales:

- Teléfono\.
- Cargo\.
- Observaciones\.

__26\. Estados del usuario__

Propongo:

- ACTIVO
- BLOQUEADO
- INACTIVO

__Activo__

Puede ingresar normalmente\.

__Bloqueado__

Acceso suspendido inmediatamente\.

__Inactivo__

Usuario histórico que ya no trabaja o no debe ingresar\.

No se elimina si tiene operaciones históricas\.

__27\. No eliminar usuarios con historial__

Si un vendedor registró operaciones:

Su usuario debe conservarse siempre para auditoría\.

Se desactiva\.

Así una venta histórica seguirá mostrando:

Registrado por: Juan Pérez

aunque ya no tenga acceso\.

__28\. Contraseñas__

Laravel manejará autenticación segura\.

Requisitos técnicos detallados se definirán después, pero funcionalmente:

- Contraseña nunca visible\.
- No se almacena en texto plano\.
- Puede restablecerse\.
- Administrador no debe conocer la contraseña actual del usuario\.

__29\. Cambio de contraseña__

El usuario podrá cambiar su propia contraseña\.

El administrador podrá:

- Forzar restablecimiento\.
- Bloquear cuenta\.

No debería poder consultar la contraseña existente\.

__30\. Primer ingreso__

Podemos establecer:

requiere\_cambio\_password = true

cuando una cuenta se crea con contraseña temporal\.

En primer acceso online:

Debe cambiarla\.

__31\. Intentos fallidos__

Recomiendo protección contra múltiples intentos de acceso\.

Después de varios intentos:

- Espera temporal\.
- Registro de seguridad\.
- Posible alerta\.

La cantidad exacta será configuración técnica\.

__32\. Sesiones__

Cada acceso generará una sesión identificable\.

El administrador podrá consultar:

- Usuario\.
- Dispositivo\.
- IP aproximada\.
- Navegador\.
- Fecha/hora de acceso\.
- Última actividad\.
- Estado\.

__33\. Sesiones activas__

El usuario puede tener, según política:

PC sucursal

\+

teléfono

Pero para perfiles operativos puede convenir limitar dispositivos\.

La cantidad máxima debe ser configurable, no fija todavía\.

__34\. Cerrar sesión remota__

El administrador podrá:

Cerrar todas las sesiones de un usuario\.

Ejemplo:

- Empleado dejó la empresa\.
- Equipo perdido\.
- Sospecha de acceso\.

__35\. Sesión y PWA offline__

Hay una particularidad\.

Si el dispositivo estaba autorizado y pierde internet, debe poder seguir trabajando temporalmente\.

Por eso:

- Sesión online válida\.
- Autorización previa del dispositivo\.
- Ventana offline\.

Pero no se guardará la contraseña\.

__36\. Caducidad offline__

Debe existir una política:

max\_offline\_session

Después de demasiado tiempo sin validar con servidor, la PWA puede restringir operaciones\.

La duración definitiva se fijará en Etapa 4 según conectividad real\.

__37\. Dispositivos__

Cada dispositivo tendrá:

- UUID\.
- Nombre\.
- Sucursal\.
- Usuario\(s\) asociados\.
- Fecha de alta\.
- Última sincronización\.
- Último acceso\.
- Estado\.
- Versión PWA, si es útil\.

__38\. Nombre amigable__

Ejemplo:

Caja Mazuko 01

Almacén Juliaca

Laptop Administración

Es mejor que mostrar solo un identificador técnico\.

__39\. Estados del dispositivo__

- PENDIENTE
- AUTORIZADO
- BLOQUEADO
- REVOCADO

__40\. Alta de dispositivo__

Flujo recomendado:

Nuevo equipo

   ↓

Usuario inicia sesión online

   ↓

Sistema identifica dispositivo

   ↓

¿Requiere aprobación?

Para perfiles sensibles podemos requerir aprobación administrativa\.

Para equipos normales de sucursal también puede bastar que un encargado autorizado los habilite\.

__41\. Dispositivo y sucursal__

Un dispositivo operativo debería quedar asociado principalmente a una sucursal\.

Ejemplo:

Caja Mazuko 01

Sucursal: Mazuko

Esto ayuda a:

- Control offline\.
- Auditoría\.
- Cierre\.
- Sincronización\.

Un administrador móvil puede tener un dispositivo con alcance más amplio\.

__42\. Cambio de sucursal de dispositivo__

Debe ser controlado\.

No recomiendo que cualquier usuario cambie:

Caja Mazuko → Caja Juliaca

sin autorización\.

Porque las cachés locales de stock/clientes pueden corresponder a otra sucursal\.

El cambio debe disparar una re\-sincronización adecuada\.

__43\. Revocar dispositivo__

Administrador podrá:

REVOCAR

Ejemplos:

- Equipo robado\.
- Equipo vendido\.
- Celular perdido\.
- Equipo ya no utilizado\.

Cuando se conecte:

- Se invalida sesión\.
- No puede seguir sincronizando normalmente\.

__44\. Operaciones pendientes de dispositivo revocado__

No se borran\.

Van a revisión\.

Esto ya quedó definido en conflictos:

CONFLICTO\_DISPOSITIVO\_REVOCADO

para evitar perder ventas legítimas hechas antes de la revocación\.

__45\. Cambio de rol con operaciones offline__

Caso:

Vendedor estaba offline\.

Administrador cambia su rol\.

Luego sincroniza\.

Laravel debe validar:

- Cuándo se creó la operación\.
- Qué permisos tenía\.
- Estado actual\.
- Tipo de operación\.

No asumir automáticamente que todo debe aceptarse o rechazarse\.

Los casos sensibles pueden ir a conflicto\.

__46\. Usuarios globales vs por sucursal__

Recomiendo que los usuarios sean globales en el sistema\.

No duplicaremos:

Juan Mazuko

Juan Juliaca

si es la misma persona\.

Se le asignan una o varias sucursales\.

__47\. Auditoría de seguridad__

Debe registrarse al menos:

- Inicio de sesión\.
- Cierre de sesión\.
- Fallo de acceso relevante\.
- Cambio de contraseña\.
- Bloqueo de usuario\.
- Cambio de rol\.
- Cambio de permisos sensibles\.
- Alta/revocación de dispositivo\.
- Reapertura de cierre\.
- Resoluciones críticas\.

__48\. Auditoría funcional vs de seguridad__

Conviene distinguir:

__Auditoría funcional__

Usuario anuló venta V\-100

__Auditoría de seguridad__

Administrador cambió permiso del usuario X

Ambas pueden consultarse desde el módulo administrativo\.

__49\. Principio de mínimo privilegio__

Cada rol debe comenzar con los permisos necesarios, no con todos\.

Ejemplo:

Vendedor no necesita:

ver\_costos

simplemente porque trabaja con productos\.

Esto reduce errores y exposición de información\.

__50\. Confirmaciones sensibles__

Además del permiso, algunas acciones deben pedir una confirmación adicional\.

Ejemplos:

- Anular venta\.
- Confirmar pérdida\.
- Reabrir cierre\.
- Revocar dispositivo\.
- Ajuste de valorización\.

No necesariamente otra contraseña, pero sí:

- Acción explícita\.
- Motivo\.
- Usuario identificable\.

__51\. Autorización por otro usuario__

Para precio bajo mínimo u otras operaciones se puede usar un flujo:

Vendedor solicita

      ↓

Encargado/Admin autoriza

La autorización debe quedar vinculada a la operación\.

No recomiendo compartir cuentas ni contraseñas para “que el jefe autorice”\.

Cada persona usa su usuario\.

__52\. Prohibir cuentas compartidas__

Operativamente debemos establecer:

Cada empleado debe utilizar su propia cuenta\.

No:

usuario: ventas

password compartido

porque destruiría la auditoría\.

Podemos tener un terminal compartido, pero cada persona debe iniciar su propia sesión\.

__53\. Cambio rápido de usuario__

En una caja compartida podría ser útil posteriormente:

Cerrar sesión usuario A

→ ingresar usuario B

sin borrar la caché general autorizada del dispositivo\.

La implementación debe asegurar que datos sensibles de A no queden expuestos a B\.

__54\. Costos en caché local__

Como ciertos roles no pueden ver costos, debemos evitar exponerlos innecesariamente en la interfaz\.

En la Etapa 4 habrá que decidir si:

- No se sincronizan costos a dispositivos de vendedores\.
- O se almacenan protegidos y nunca se exponen\.

Mi recomendación:

No descargar datos sensibles que el dispositivo/rol no necesita\.

__55\. Sucursales inactivas__

Una sucursal con historial no se elimina\.

Estado:

INACTIVA

No acepta nuevas operaciones, pero:

- Reportes siguen funcionando\.
- Kardex permanece\.
- Ventas históricas permanecen\.
- Transferencias antiguas siguen trazables\.

__56\. Crear nueva sucursal__

Administrador:

Crear sucursal

   ↓

Código

Nombre

Dirección

Configuración

   ↓

Asignar usuarios

   ↓

Configurar stock mínimo/precios locales si aplica

La sucursal inicia sin inventario\.

El inventario debe entrar mediante:

- Inventario inicial\.
- Compra\.
- Transferencia\.

Nunca mediante edición directa\.

__57\. Configuración por sucursal__

Puede incluir:

- Código\.
- Nombre\.
- Dirección\.
- Serie interna\.
- Fondo inicial de caja\.
- Precios locales\.
- Stock mínimo\.
- Política de alertas\.
- Dispositivos\.

Las reglas corporativas críticas siguen siendo globales\.

__58\. Sucursal principal__

Juliaca puede marcarse como:

es\_principal = true

Eso puede ayudar en:

- Reportes\.
- Redistribución\.
- Configuración\.

Pero no debe darle privilegios técnicos especiales de inventario que rompan la lógica general\.

__59\. Impersonación de usuarios__

No recomiendo implementar en V1 una función:

“Entrar como otro usuario”\.

Es riesgosa para auditoría\.

Administrador puede revisar operaciones sin hacerse pasar por el usuario\.

__60\. Logs de acceso__

Para soporte y seguridad podremos conservar:

- Usuario\.
- Fecha\.
- IP\.
- Agente/navegador\.
- Dispositivo\.
- Resultado\.

No necesitamos mostrar todos estos datos a roles normales\.

__61\. Notificaciones de seguridad__

Posibles alertas:

- Dispositivo nuevo\.
- Muchas fallas de ingreso\.
- Usuario bloqueado\.
- Dispositivo revocado\.
- Cuenta activa sin uso prolongado\.
- Sesión desde dispositivo no habitual\.

No es necesario implementar detección avanzada de fraude en V1\.

__62\. Matriz consolidada inicial__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Ver stock local

Sí

Sí

Sí

Sí

Ver todas las sucursales

Sí

Limitado

No

No

Ver costos

Sí

Permiso

Permiso

No

Crear venta

Sí

Sí

No

Sí

Crear entrada

Sí

Sí

Preparar

No

Ajuste inventario

Sí

Permiso

No

No

Crear cliente

Sí

Sí

No

Sí

Registrar pago

Sí

Sí

No

Permiso

Transferencia solicitar

Sí

Sí

Permiso

Permiso

Transferencia aprobar

Sí

Sí local

No

No

Cambiar lote PEPS

Sí

Sí

Permiso

No

Autorizar bajo mínimo

Sí

Permiso

No

No

Confirmar cierre

Sí

Sí

No

No

Reabrir cierre

Sí

No

No

No

Crear usuario

Sí

No

No

No

Revocar dispositivo

Sí

No/limitado

No

No

__63\. Acceso a reportes__

__Administrador__

Global\.

__Encargado__

Sucursal propia\.

__Almacenero__

Operativos de almacén\.

__Vendedor__

Operaciones necesarias para su trabajo y eventualmente sus propias ventas\.

Los filtros del frontend no sustituyen la autorización del backend\.

__64\. Seguridad en Laravel__

Funcionalmente queda definido que las validaciones importantes ocurren en servidor\.

Ejemplo:

Aunque un vendedor manipule una petición y envíe:

sucursal\_id = Juliaca

Laravel deberá comprobar:

¿Tiene acceso a Juliaca?

Si no:

RECHAZAR

Lo mismo para permisos\.

__65\. No confiar en React__

React ocultará botones para mejorar experiencia\.

Pero la seguridad real estará en Laravel mediante:

- Policies\.
- Gates/permisos\.
- Middleware\.
- Validaciones de sucursal\.

Esto se documentará técnicamente en Etapa 4\.

__66\. Operación creada por administrador en otra sucursal__

Debe quedar visible que:

Sucursal operación: Mazuko

Usuario: Administrador general

No debemos confundir:

- Sucursal del usuario\.
- Sucursal de la operación\.

__67\. Aprobador separado del creador__

En operaciones sensibles guardaremos ambos\.

Ejemplo:

Creado por: vendedor Juan

Autorizado por: encargado Luis

Esto es mucho mejor que reemplazar al creador con el jefe\.

__68\. Historial de cambios de rol__

Si un usuario pasa de:

Vendedor

a:

Encargado

las operaciones antiguas siguen mostrando qué realizó\.

Podemos guardar auditoría del cambio de rol para conocer la evolución de permisos\.

No necesitamos recalcular las operaciones históricas\.

__69\. Usuario desactivado con deuda/operaciones pendientes__

Desactivar usuario no debe cancelar automáticamente:

- Ventas\.
- Pagos\.
- Transferencias\.
- Conflictos\.

Esas operaciones pertenecen al negocio y deberán resolverse por otro usuario autorizado\.

__70\. Usuario y cierre diario__

El cierre debe registrar:

- Quién lo inició\.
- Quién lo confirmó\.
- Quién lo reabrió\.

Si hubo varias versiones, cada acción conserva su responsable\.

__71\. Usuario y conflictos__

Cada conflicto tendrá:

- Usuario que originó operación\.
- Usuario que resolvió\.
- Usuario que autorizó, si distinto\.

Esto permitirá reportes de causa y resolución\.

__72\. Reglas funcionales definitivas del Proceso 16__

1. Los usuarios serán globales\.
2. Las sucursales se separan mediante sucursal\_id\.
3. Un usuario puede tener una o varias sucursales\.
4. Existirá una sucursal activa para operación\.
5. Los cuatro roles iniciales serán Admin, Encargado, Almacenero y Vendedor\.
6. Los roles se complementan con permisos granulares\.
7. Los permisos se validan en Laravel\.
8. Ocultar botones en React no es seguridad suficiente\.
9. El permiso de costos será explícito\.
10. El permiso de utilidad puede controlarse separadamente\.
11. Ajuste y conteo son permisos distintos\.
12. Precio bajo mínimo requiere permiso específico\.
13. Cambio de lote PEPS requiere permiso y motivo\.
14. Solo administrador reabre cierres en V1\.
15. Usuarios con historial no se eliminan\.
16. Sucursales con historial no se eliminan\.
17. Dispositivos deben estar autorizados para offline\.
18. El primer acceso offline requiere haber iniciado sesión previamente online\.
19. No se almacenan contraseñas para uso offline\.
20. Los dispositivos pueden bloquearse o revocarse\.
21. Operaciones pendientes de dispositivos revocados se revisan, no se borran\.
22. El administrador puede invalidar sesiones\.
23. Cada empleado debe tener cuenta propia\.
24. No se recomiendan cuentas compartidas\.
25. El usuario creador y autorizador se guardan por separado\.
26. Los permisos siempre respetan alcance de sucursal\.
27. Usuarios desactivados conservan historial\.
28. Cambios de rol quedan auditados\.
29. Se evitará sincronizar datos sensibles innecesarios\.
30. Toda acción administrativa sensible deja auditoría\.

__73\. Criterios de aceptación del Proceso 16__

Consideraremos aprobado este proceso cuando:

- Un vendedor no pueda consultar costos\.
- Un encargado solo pueda operar en sucursales asignadas\.
- Un administrador pueda consultar todas las sucursales\.
- Un almacenero pueda registrar conteo sin poder confirmar ajuste\.
- Un usuario sin permiso no pueda forzar una operación mediante API\.
- Un usuario desactivado conserve todo su historial\.
- Una sucursal inactiva conserve sus movimientos históricos\.
- Un dispositivo nuevo no pueda trabajar offline antes de ser autorizado\.
- Un dispositivo revocado deje de sincronizar automáticamente\.
- Un cambio de rol quede auditado\.
- El creador y autorizador de una operación puedan ser distintos\.
- Solo administrador pueda reabrir cierres\.
- Las sesiones activas puedan consultarse y revocarse\.
- Los permisos sensibles se apliquen tanto online como durante sincronización offline\.

__Resultado del Proceso 16__

Queda funcionalmente definido:

__El sistema utilizará usuarios globales asociados a una o varias sucursales, con roles base y permisos granulares validados por Laravel\. Las sesiones y dispositivos estarán controlados para permitir trabajo offline solo en equipos previamente autorizados, y todas las acciones sensibles conservarán información de usuario, sucursal, autorización y auditoría\.__

Con este proceso queda cubierta también la administración básica de __Sucursales, Usuarios, Roles, Sesiones y Dispositivos__\.

El siguiente paso conveniente de la __Etapa 3__ es el __Proceso 17: Configuración general y parámetros del sistema__, donde consolidaremos todos los valores que hemos decidido dejar configurables —descuentos, mínimos, tolerancias, días de alerta, políticas offline, numeraciones, moneda base, métodos de pago, motivos, unidades y reglas por sucursal— para evitar que estas reglas terminen codificadas directamente en el software\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 17: Configuración general y parámetros del sistema__

Este proceso es transversal a todos los módulos y tiene un objetivo muy claro:

__Evitar que reglas comerciales, tolerancias, numeraciones y comportamientos operativos queden escritos de forma rígida en el código\.__

Todo lo que pueda cambiar por decisión de la empresa debe quedar, cuando sea razonable, como __parámetro configurable__, con permisos y auditoría\.

__1\. Objetivo funcional__

Centralizar parámetros como:

- Moneda base\.
- Métodos de pago\.
- Tipos de documentos\.
- Numeraciones\.
- Límites de descuento\.
- Políticas de precio mínimo\.
- Stock mínimo\.
- Umbrales de alertas\.
- Tolerancias\.
- Reglas de cierre\.
- Políticas offline\.
- Motivos de ajustes/anulaciones\.
- Unidades de medida\.
- Configuraciones por sucursal\.

La idea es que un cambio de política no requiera modificar código cada vez\.

__2\. Niveles de configuración__

No todos los parámetros pertenecen al mismo nivel\.

Propongo tres:

__Global__

Aplica a toda la empresa\.

Ejemplo:

Moneda base = PEN

__Por sucursal__

Ejemplo:

Fondo inicial de caja Mazuko = S/ 300

__Por rol__

Ejemplo:

Vendedor puede descontar hasta X%

En algunos casos puede existir combinación:

Rol \+ sucursal

pero debemos evitar una matriz demasiado compleja salvo que realmente sea necesaria\.

__3\. Principio de precedencia__

Cuando exista una configuración global y una local:

Valor de sucursal

    ↓

si existe, prevalece

    ↓

si no, usar valor global

Ejemplo:

Stock mínimo general RK\-428 = 3

Mazuko = 5

Entonces:

Mazuko → 5

Otras sucursales → 3

__4\. Configuración global de empresa__

Datos básicos:

- Nombre comercial\.
- Razón social, si se necesita\.
- Moneda base\.
- Zona horaria\.
- Formato de fecha\.
- Decimales visibles\.
- Logo\.
- Datos de contacto\.
- Configuración general de documentos internos\.

Estos parámetros no deben mezclarse con el catálogo de productos\.

__5\. Moneda base__

Inicialmente recomendamos:

PEN

pero quedará configurable\.

El Kardex siempre tendrá una moneda base única para valorización\.

Compras en otra moneda conservarán:

- Moneda original\.
- Tipo de cambio\.
- Valor original\.
- Valor convertido\.

No recomiendo permitir cambiar la moneda base libremente después de operar, porque afectaría historia contable\.

Por tanto:

__Cambiar moneda base después de iniciar producción debe ser una operación administrativa excepcional\.__

__6\. Zona horaria__

Debe existir una zona horaria oficial del sistema\.

Esto es importante para:

- Cierres\.
- Ventas\.
- Pagos\.
- Sincronización\.
- Auditoría\.

Los dispositivos no determinan por sí solos la hora oficial\.

__7\. Catálogo de métodos de pago__

En vez de codificar permanentemente:

Efectivo

Yape

Plin

Transferencia

tendremos un catálogo\.

Campos posibles:

- Código\.
- Nombre\.
- Activo\.
- Es efectivo físico\.
- Requiere número de operación\.
- Permite offline\.
- Orden visual\.

Ejemplo:

YAPE

Activo: Sí

Requiere referencia: Opcional

Es efectivo: No

__8\. Métodos de pago inactivos__

Si mañana la empresa deja de usar un método:

INACTIVO

No desaparece de pagos históricos\.

Solo deja de aparecer para operaciones nuevas\.

__9\. Tipos de documento__

Catálogo para:

- Factura\.
- Boleta\.
- Guía\.
- Nota interna\.
- Otro\.

Como la facturación electrónica no forma parte inicial del núcleo, estos documentos pueden registrarse como referencias externas cuando corresponda\.

__10\. Numeraciones internas__

Cada operación puede tener una serie automática\.

Ejemplos:

VEN\-MZK\-2026\-000001

PAG\-MZK\-2026\-000001

TRF\-2026\-000001

AJU\-MZK\-2026\-000001

La configuración debe definir:

- Prefijo\.
- Serie\.
- Sucursal, si aplica\.
- Año, si aplica\.
- Siguiente correlativo\.
- Longitud\.

__11\. La numeración no es identidad técnica__

Muy importante:

VEN\-MZK\-2026\-001

es un código visible\.

La identidad real seguirá siendo:

ID \+ UUID

Así un cambio de numeración no rompe relaciones\.

__12\. Control de correlativos__

El correlativo lo asignará el servidor\.

No la PWA offline\.

Una venta offline puede tener temporalmente:

LOCAL\-0198\.\.\.

y al sincronizar recibir:

VEN\-MZK\-2026\-000145

El UUID sigue siendo el mismo\.

__13\. Precios__

Configuraciones posibles:

- Precio sugerido\.
- Precio mínimo\.
- Precio por sucursal\.
- Precio mayorista\.
- Precio minorista\.
- Máximo descuento\.

No todos deben ser obligatorios\.

__14\. Máximo descuento__

Como todavía no existe un porcentaje confirmado, debe quedar configurable\.

Ejemplo conceptual:

Vendedor:

máximo 5%

Encargado:

máximo 10%

Pero esos valores son solo ejemplos\.

No se fijarán hasta que la empresa los defina\.

__15\. Precio mínimo__

Puede manejarse:

Precio mínimo general

y opcionalmente:

Precio mínimo por sucursal

Si una sucursal no tiene configuración especial, hereda el general\.

Toda modificación debe conservar historial\.

__16\. Historial de configuración de precios__

No basta con sobrescribir:

mínimo = 180

cuando antes era 170\.

Debe conservarse:

- Valor anterior\.
- Valor nuevo\.
- Fecha\.
- Usuario\.
- Sucursal\.
- Motivo opcional\.

Esto permite auditar ventas históricas correctamente\.

__17\. Stock mínimo__

Podrá existir:

mínimo general producto

más:

mínimo específico por sucursal

Ejemplo:

RK\-428

General: 2

Juliaca: 10

Mazuko: 4

__18\. Umbrales de stock__

Podemos dejar preparado:

- Stock bajo\.
- Stock crítico\.

Ejemplo conceptual:

Disponible <= mínimo

→ bajo

Disponible = 0

→ agotado

Una categoría adicional “crítico” puede configurarse si luego tiene utilidad real\.

No necesitamos complicarlo en V1\.

__19\. Alertas temporales__

Parámetros configurables:

- Días antes de vencimiento de deuda\.
- Días para considerar lote antiguo\.
- Días máximos de transferencia en tránsito\.
- Horas máximas sin sincronizar\.
- Días sin movimiento de inventario\.

Ejemplo:

alertar\_deuda\_proxima\_dias = X

No fijaremos X todavía\.

__20\. Tolerancias de cierre de caja__

Puede existir:

tolerancia\_diferencia\_caja

Pero recomiendo que cualquier diferencia quede registrada\.

La tolerancia solo determinará:

- Si basta justificación\.
- Si requiere autorización superior\.

Nunca servirá para ocultarla\.

__21\. Umbral de autorización por valor__

Podemos dejar preparado:

monto\_requiere\_admin

para operaciones como:

- Pérdida\.
- Ajuste\.
- Baja\.
- Reembolso\.

Ejemplo futuro:

Pérdida > determinado valor

→ Admin

Pero no fijamos cantidades hasta tener política de negocio\.

__22\. Motivos configurables__

Es mejor tener catálogos para operaciones sensibles\.

Por ejemplo:

__Anulación de venta__

- Venta duplicada\.
- Error de cliente\.
- Error de producto\.
- Error de cantidad\.
- Operación no realizada\.
- Otro\.

__Ajuste__

- Diferencia de conteo\.
- Producto encontrado\.
- Error histórico\.
- Otro\.

__Daño__

- Golpe\.
- Rotura\.
- Deterioro\.
- Otro\.

El usuario puede además escribir detalle libre\.

__23\. Por qué usar motivos catalogados__

Permite reportes como:

¿Cuál es la principal causa de anulaciones?

Sin catálogo, cada persona podría escribir:

error

equivocación

me confundí

mal digitado

y sería difícil analizar\.

__24\. Unidades de medida__

Tendremos catálogo:

- Unidad\.
- Juego\.
- Kit\.
- Metro\.
- Caja\.
- Otro\.

Cada unidad tendrá:

permite\_decimales

Ejemplo:

UNIDAD → No

METRO → Sí

__25\. Unidades inactivas__

No se eliminan si fueron utilizadas históricamente\.

Simplemente dejan de poder seleccionarse para nuevos productos\.

__26\. Marcas y categorías__

También serán catálogos configurables:

- Marca\.
- Categoría\.

No son exactamente “parámetros generales”, pero su administración sigue la misma lógica:

- Activo/inactivo\.
- No eliminar si existe historial\.
- Auditoría\.

__27\. Configuración de proveedores y clientes__

No propongo configuraciones comerciales complejas por ahora\.

Pero sí podemos tener:

- Tipos de documento\.
- Estados\.
- Parámetros de crédito futuros\.

__28\. Política de cliente moroso__

Ya la dejamos preparada\.

Configuración posible:

NO\_BLOQUEAR

ADVERTIR

REQUERIR\_AUTORIZACION

BLOQUEAR\_CREDITO

Para V1 la recomendación sigue siendo:

ADVERTIR

hasta que la empresa defina otra política\.

__29\. Límite de crédito__

Se puede tener una configuración global:

usar\_limite\_credito = false

Mientras sea falso:

- No se aplican límites obligatorios\.

En el futuro se puede activar por cliente\.

__30\. Pago offline__

Configuración:

permitir\_pago\_offline = true/false

Nuestra definición funcional actual parte de permitirlo provisionalmente\.

Pero dejarlo configurable es conveniente si luego la empresa decide restringirlo\.

__31\. Venta offline__

Parámetros posibles:

permitir\_venta\_offline

permitir\_credito\_offline

permitir\_kit\_componentes\_offline

Esto permitirá endurecer reglas sin cambiar código\.

__32\. Tiempo máximo sin sincronizar__

Debemos parametrizar:

max\_offline\_hours

Puede determinar:

- Advertencia\.
- Restricción\.
- Bloqueo parcial\.

Como todavía no conocemos la duración normal de cortes en todas las sucursales, no fijaremos un valor\.

__33\. Entrada pendiente offline__

Nuestra política V1 es:

entrada\_offline\_aumenta\_stock\_vendible = false

Conviene que exista como configuración futura, pero inicialmente permanecerá desactivada\.

__34\. Transferencias offline__

Inicialmente:

confirmar\_transferencia\_offline = false

para:

- Envío\.
- Recepción\.
- Diferencias\.

No recomiendo permitir que esta regla sea editable por encargados normales\.

Debe ser configuración administrativa/global\.

__35\. Precio inferior al mínimo offline__

Inicialmente:

permitir\_precio\_bajo\_minimo\_offline = false

Esta política debería mantenerse estricta incluso si otras funciones offline se flexibilizan\.

__36\. Kits offline__

Configuración por modalidad:

KIT\_UNICO → permitido

KIT\_COMPONENTES → permitido con versión cacheada

ARMADO\_ANTICIPADO → confirmación online

Estas reglas pueden estar en configuración del sistema, no necesariamente visibles como veinte interruptores en una sola pantalla\.

__37\. Política PEPS__

El método físico oficial inicial será:

PEPS

No recomiendo permitir que cada sucursal cambie libremente a otro método\.

Esto es una política corporativa\.

Podemos guardar:

metodo\_rotacion = FIFO

como parámetro global, aunque en V1 no tenga alternativas\.

__38\. Política de valoración__

Igualmente:

PROMEDIO\_PONDERADO\_MOVIL

Debe estar documentado como configuración/política del sistema\.

Pero no recomiendo un dropdown para cambiarlo en producción\.

Cambiar método de valoración es un cambio estructural, no un ajuste cotidiano\.

__39\. Precisión decimal__

Parámetros técnicos:

- Decimales visibles de precio\.
- Decimales internos de costo\.
- Decimales de cantidades\.

Esto se definirá técnicamente después\.

La regla funcional es:

Mostrar valores amigables, pero calcular con precisión suficiente\.

__40\. Reglas de redondeo__

Debe existir una política única\.

No permitir que:

- Ventas redondeen de una forma\.
- Kardex de otra\.
- Pagos de otra\.

La política exacta se definirá en Etapa 4\.

__41\. Configuración de cierres__

Podremos parametrizar:

- Hora sugerida de cierre\.
- Si requiere conteo de caja\.
- Si requiere revisión de dispositivos\.
- Tolerancia de caja\.
- Bloqueos obligatorios\.
- Conteos selectivos requeridos\.

Pero algunas reglas serán no negociables en V1:

- No cerrar con conflictos críticos\.
- No cerrar con Kardex inconsistente\.
- Solo admin reabre\.

__42\. Fondo inicial por sucursal__

Ejemplo:

Juliaca → S/ 500

Mazuko → S/ 300

Puede ser:

- Valor fijo sugerido\.
- Ingresado diariamente\.

La decisión exacta puede ajustarse al flujo real de caja\.

__43\. Configuración de reservas__

Para V1 tendremos reservas principalmente por:

- Transferencia\.
- Armado\.

Podemos configurar tiempos de expiración futuros\.

Ejemplo:

reserva\_transferencia\_expira\_horas

Pero una reserva ya aprobada no debería desaparecer automáticamente sin registrar por qué\.

__44\. Configuración de ubicaciones__

Cada sucursal puede administrar sus propias:

- Zonas\.
- Estantes\.
- Anaqueles\.
- Posiciones\.

Ejemplo:

ALM\-01

EST\-A

NIVEL\-2

No es necesario imponer la misma estructura física a todas las sucursales\.

__45\. Configuración de documentos internos__

Podemos definir qué documentos admiten:

- Adjuntos\.
- Observaciones\.
- Referencia externa\.
- Firma/confirmación\.

No necesitamos hacerlo excesivamente dinámico en V1\.

__46\. Configuración de adjuntos__

Parámetros futuros:

- Tamaño máximo\.
- Tipos permitidos\.
- Qué operaciones los aceptan\.

Esto es más técnico, pero conviene centralizarlo\.

__47\. Configuraciones que no deben ser modificables rutinariamente__

Algunas políticas pueden almacenarse como parámetros, pero no deberían aparecer como interruptores comunes\.

Ejemplos:

- Método de valoración\.
- Método PEPS\.
- Moneda base\.
- Política de inmutabilidad del Kardex\.
- Permitir stock negativo\.

Especialmente:

permitir\_stock\_negativo = false

No debería existir una opción sencilla para activarlo\.

Para este proyecto la regla es:

__No stock negativo\.__

__48\. Configuración y auditoría__

Todo cambio sensible deberá guardar:

- Parámetro\.
- Valor anterior\.
- Valor nuevo\.
- Usuario\.
- Fecha\.
- Sucursal, si aplica\.
- Motivo cuando corresponda\.

Ejemplo:

Precio mínimo RK\-428

180 → 170

Usuario: Admin

__49\. Vigencia temporal__

Algunas configuraciones deberían tener fecha de vigencia\.

Especialmente:

- Precio\.
- Precio mínimo\.
- Política de descuento\.

Así podemos saber qué regla aplicaba al momento de una operación\.

__50\. No aplicar retroactivamente__

Ejemplo:

Hoy:

descuento máximo = 5%

Mañana cambia:

10%

Una venta histórica no debe reinterpretarse como si el 10% hubiera existido antes\.

Por eso guardaremos la política/versiones relevantes en las operaciones\.

__51\. Configuración de alertas__

Cada alerta puede tener:

- Activa/inactiva\.
- Severidad\.
- Umbral\.
- Roles destinatarios\.
- bloquea\_cierre si corresponde\.

Pero no todos los bloqueos críticos deben poder desactivarse\.

Por ejemplo:

Kardex \!= Inventario

debe seguir siendo crítico\.

__52\. Configuración de reportes__

No necesitamos un generador de reportes totalmente dinámico\.

Para V1:

- Reportes predefinidos\.
- Filtros\.
- Exportación\.

Más adelante se puede permitir guardar filtros favoritos\.

__53\. Configuración de exportación__

Podremos tener:

- Logo\.
- Nombre empresa\.
- Pie de página\.
- Datos de sucursal\.

Para PDF\.

Excel tendrá estructura estándar\.

__54\. Parámetros por sucursal__

Ejemplos apropiados:

- Fondo de caja\.
- Stock mínimo\.
- Precio local\.
- Ubicaciones\.
- Series internas\.
- Tiempo/alertas operativas específicas\.

__55\. Parámetros globales__

Ejemplos apropiados:

- Moneda base\.
- Método de valorización\.
- Método de rotación\.
- Tipos de producto\.
- Políticas de seguridad\.
- Política general offline\.
- Reglas críticas\.
- Tipos de operación\.

__56\. Parámetros por rol__

Ejemplos:

- Máximo descuento\.
- Puede registrar pagos\.
- Puede autorizar precio\.
- Puede visualizar utilidad\.

Sin embargo, estos últimos probablemente se implementen mejor como __permisos__, no como parámetros genéricos\.

Debemos evitar duplicar rol/permisos/configuración\.

__57\. Configuración vs permiso__

Regla conceptual:

__Permiso__

Responde:

¿Puede hacerlo?

Ejemplo:

autorizar\_precio\_bajo\_minimo

__Configuración__

Responde:

¿Bajo qué regla?

Ejemplo:

descuento\_maximo = X%

Esta separación es importante\.

__58\. Pantalla de configuración__

Recomiendo dividirla en secciones:

- Empresa\.
- Sucursales\.
- Ventas\.
- Inventario\.
- Clientes/crédito\.
- Pagos\.
- Transferencias\.
- Kits\.
- Alertas\.
- PWA/offline\.
- Numeraciones\.
- Catálogos auxiliares\.

No colocar cien campos en una sola pantalla\.

__59\. Configuraciones avanzadas__

Algunas opciones deben quedar bajo:

__Configuración avanzada__

y solo administrador\.

Ejemplos:

- Offline\.
- Cierre\.
- Numeraciones\.
- Políticas de costo\.
- Sincronización\.

Así reducimos cambios accidentales\.

__60\. Validación de configuraciones__

El sistema debe impedir valores absurdos\.

Ejemplo:

descuento máximo = 150%

o:

stock mínimo = \-10

o:

días alerta = \-3

Las reglas deben validarse en Laravel\.

__61\. Cambio de configuración con operaciones pendientes__

Algunos cambios no deberían hacerse si hay operaciones offline pendientes\.

Ejemplo:

- Cambiar composición de kit\.
- Cambiar configuración crítica de sincronización\.
- Desactivar producto\.

No necesariamente bloquear el cambio, pero debe generar versionado y conflictos controlados\.

__62\. Sincronización de configuraciones__

Los dispositivos necesitan recibir:

- Precios\.
- Mínimos\.
- Métodos de pago\.
- Motivos\.
- Reglas offline\.
- Versiones de kit\.

Por eso las configuraciones relevantes tendrán:

updated\_at / version

y formarán parte de la sincronización incremental\.

__63\. Parámetro obsoleto en PWA__

La PWA debe saber con qué versión trabajó\.

Ejemplo:

politica\_precio\_version = 12

Esto ayudará al servidor a decidir si una operación offline es legítima bajo una regla antigua conocida\.

__64\. Configuración de CLIENTE VARIOS__

Podemos tener un cliente especial marcado:

es\_cliente\_generico = true

No depender de que tenga exactamente el nombre “CLIENTE VARIOS”\.

Regla:

- Permitido para contado\.
- No permitido para crédito\.

__65\. Configuración de códigos internos__

Puede establecerse generación automática:

PROD\-000001

para productos si se desea\.

La referencia comercial seguirá separada\.

No es necesario que el usuario ingrese manualmente el código interno\.

__66\. Configuración de lotes internos__

Formato sugerido:

MZK\-20260806\-0001

El sistema puede generar el código según:

- Sucursal\.
- Fecha\.
- Correlativo\.

El identificador real del lote seguirá siendo UUID/ID\.

__67\. Configuración de inventario inicial__

No será una opción permanente del usuario\.

Debe existir una ventana/proceso controlado de migración\.

Una vez terminada la implementación inicial:

El inventario inicial normal deja de ser una operación cotidiana\.

Nuevas sucursales sí podrán usar un proceso autorizado de inventario inicial\.

__68\. Configuración de funcionalidades__

Podemos utilizar feature flags para funciones no habilitadas inicialmente\.

Ejemplo:

kit\_disassembly\_enabled = false

credit\_limit\_enabled = false

bank\_reconciliation\_enabled = false

Esto permitirá preparar el modelo sin mostrar funciones incompletas\.

__69\. Funcionalidades recomendadas inicialmente desactivadas__

- Desarmado general de kits\.
- Límite de crédito obligatorio\.
- Saldo a favor\.
- Conciliación bancaria\.
- Confirmación de entradas offline\.
- Transferencias críticas offline\.
- Stock negativo\.
- Facturación electrónica integrada\.

__70\. Configuraciones que sí debemos definir antes del arranque__

Antes de producción necesitaremos confirmar al menos:

- Nombres oficiales de sucursales\.
- Moneda base\.
- Métodos de pago usados\.
- Tipos de documentos\.
- Roles y permisos\.
- Política de descuentos\.
- Quién autoriza bajo mínimo\.
- Política de cliente moroso\.
- Fondo de caja si aplica\.
- Horarios/regla de cierre\.
- Umbrales de alertas más importantes\.
- Políticas de sesión/offline\.
- Formatos de numeración\.

__71\. Lo que puede quedar con valores por defecto__

Por ejemplo:

- Rangos de antigüedad de reportes\.
- Número de días para algunos avisos\.
- Orden visual\.
- Prefijos internos\.
- Umbrales no críticos\.

Siempre podrán ajustarse luego\.

__72\. Permisos__

__Administrador general__

Puede modificar configuraciones globales y locales\.

__Encargado__

Solo parámetros locales expresamente permitidos\.

Por ejemplo:

- Ubicaciones\.
- Quizá ciertos precios locales si tiene permiso\.
- Stock mínimo local si se habilita\.

__Almacenero / vendedor__

Normalmente solo consultan lo que necesitan\.

No cambian configuración\.

__73\. Parámetros críticos__

Para cambios especialmente sensibles recomiendo exigir motivo:

- Precio mínimo\.
- Política de descuentos\.
- Configuración offline\.
- Numeración\.
- Fondo/caja\.
- Reglas de crédito\.
- Políticas de cierre\.
- Activar/desactivar funcionalidades críticas\.

__74\. Reporte de cambios de configuración__

Administrador podrá consultar:

__Fecha__

__Parámetro__

__Antes__

__Después__

__Usuario__

__Sucursal__

Esto será parte de auditoría\.

__75\. Reglas funcionales definitivas del Proceso 17__

1. Las reglas variables no deben quedar hardcodeadas innecesariamente\.
2. Existirán configuraciones globales, por sucursal y algunas por rol\.
3. Los valores locales pueden sobrescribir valores globales cuando corresponda\.
4. Moneda base será única para Kardex\.
5. Métodos de pago serán catálogo configurable\.
6. Los métodos inactivos conservan historia\.
7. Las numeraciones son independientes de UUID/ID\.
8. Los correlativos oficiales los asigna el servidor\.
9. Precios y mínimos pueden tener configuración por sucursal\.
10. Los cambios de precio conservan historial\.
11. Stock mínimo puede variar por sucursal\.
12. Umbrales de alertas serán configurables\.
13. Tolerancias no ocultarán diferencias\.
14. Motivos sensibles serán catálogos\.
15. Las unidades de medida indicarán si aceptan decimales\.
16. La política de morosidad será configurable\.
17. No habrá límite de crédito obligatorio inicialmente\.
18. Las políticas offline podrán parametrizarse\.
19. Las entradas offline no aumentarán stock vendible en V1\.
20. Transferencias críticas seguirán requiriendo conexión\.
21. Precio bajo mínimo offline permanecerá bloqueado\.
22. PEPS y promedio ponderado son políticas corporativas\.
23. No se permitirá stock negativo\.
24. Los cierres conservarán bloqueos críticos obligatorios\.
25. Toda configuración sensible deja auditoría\.
26. Las configuraciones históricas no se aplican retroactivamente\.
27. Las configuraciones sincronizables tendrán versión\.
28. El frontend offline conservará la versión usada\.
29. Configuración y permisos son conceptos diferentes\.
30. Funciones futuras podrán activarse mediante feature flags\.
31. Configuraciones avanzadas serán exclusivas del administrador\.
32. Laravel validará todos los cambios\.
33. Sucursales inactivas y catálogos inactivos conservan historia\.
34. El cliente genérico estará marcado por atributo, no por nombre\.
35. Antes de producción deberán confirmarse los parámetros comerciales pendientes\.

__76\. Criterios de aceptación del Proceso 17__

Consideraremos aprobado este proceso cuando:

- Un cambio de descuento no requiera modificar código\.
- Un stock mínimo pueda variar por sucursal\.
- Los métodos de pago puedan activarse/desactivarse sin perder historia\.
- Un precio mínimo modificado conserve el valor anterior\.
- Los dispositivos reciban versiones actualizadas de configuración\.
- Una operación offline conserve qué versión de política utilizó\.
- Un usuario sin permiso no pueda modificar parámetros\.
- Un encargado no pueda cambiar políticas globales críticas\.
- La numeración oficial se genere únicamente en servidor\.
- Los motivos de anulación/ajuste puedan administrarse\.
- Ningún parámetro permita activar stock negativo\.
- Los cambios sensibles aparezcan en auditoría\.
- Funcionalidades futuras puedan mantenerse desactivadas sin eliminar su diseño\.

__Resultado del Proceso 17__

Queda funcionalmente definido:

__El sistema dispondrá de una capa centralizada de configuración para políticas comerciales, inventario, alertas, cierres, pagos, numeraciones y operación offline\. Las configuraciones tendrán alcance definido, validación, versionado y auditoría, evitando reglas rígidas en código y preservando la política vigente al momento de cada operación\.__

Con esto quedan cubiertos los principales parámetros que habían quedado abiertos durante los procesos anteriores\.

El siguiente paso conveniente es el __Proceso 18: Auditoría, trazabilidad y bitácora general__, donde consolidaremos exactamente qué acciones deben registrarse, qué información se conservará antes/después, cuánto podrá consultar cada rol y cómo relacionaremos usuario, operación, dispositivo, sucursal, autorizaciones, conflictos, reversión y cambios administrativos\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 18: Auditoría, trazabilidad y bitácora general__

Este proceso es transversal a todo el sistema y se relaciona con:

- Usuarios y roles\.
- Sucursales\.
- Ventas\.
- Compras y entradas\.
- Otras salidas\.
- Transferencias\.
- Clientes\.
- Pagos\.
- Cuentas por cobrar\.
- Kits\.
- Kardex\.
- Cierres\.
- PWA\.
- Conflictos\.
- Configuración\.

La regla central será:

__Toda acción sensible debe poder reconstruirse posteriormente indicando quién la realizó, cuándo, desde qué sucursal y dispositivo, qué cambió, por qué cambió y qué operación relacionada produjo sus efectos\.__

__1\. Objetivo funcional__

La auditoría deberá responder preguntas como:

- ¿Quién cambió este precio?
- ¿Quién anuló esta venta?
- ¿Quién autorizó vender bajo el mínimo?
- ¿Quién modificó la composición de un kit?
- ¿Quién resolvió este conflicto?
- ¿Quién reabrió este cierre?
- ¿Desde qué dispositivo se hizo?
- ¿Cuál era el valor anterior?
- ¿Cuál fue el valor nuevo?
- ¿Qué motivo se registró?

No se trata solamente de guardar logs técnicos\.

Debe existir una __auditoría funcional legible para administración__\.

__2\. Tres niveles de trazabilidad__

Conviene separar:

__2\.1 Trazabilidad de operación__

Responde:

¿Qué pasó con esta venta, entrada, pago, transferencia, etc\.?

Ejemplo:

Venta V\-00125

→ creada

→ confirmada

→ pago inicial

→ devolución parcial

→ reembolso

__2\.2 Auditoría administrativa__

Responde:

¿Quién cambió una configuración o tomó una decisión sensible?

Ejemplo:

Precio mínimo

180 → 170

Usuario: Admin

__2\.3 Auditoría técnica__

Para soporte:

- Endpoint\.
- Error\.
- Request ID\.
- Batch de sincronización\.
- Excepción\.
- Reintento\.

Esta última no necesita mostrarse completa al usuario normal\.

__3\. Principio de inmutabilidad__

Los registros de auditoría confirmados no deben poder editarse ni eliminarse desde la interfaz normal\.

Regla:

__La auditoría registra la historia; no se corrige borrando la historia\.__

Si una acción posterior corrige otra, ambas deben permanecer\.

__4\. Qué acciones deben auditarse obligatoriamente__

Como mínimo:

__Seguridad__

- Inicio de sesión relevante\.
- Cierre de sesión remoto\.
- Bloqueo de usuario\.
- Cambio de rol\.
- Cambio de permisos\.
- Alta/revocación de dispositivo\.

__Catálogo__

- Creación de producto\.
- Cambio de referencia\.
- Cambio de tipo\.
- Cambio de unidad\.
- Activación/inactivación\.
- Fusión de duplicados\.
- Cambios de kit\.

__Comercial__

- Cambio de precio\.
- Cambio de precio mínimo\.
- Autorización de descuento\.
- Venta anulada\.
- Devolución\.
- Reembolso\.

__Inventario__

- Ajustes\.
- Pérdidas\.
- Bajas\.
- Cambio de lote PEPS\.
- Conteo confirmado\.
- Correcciones de valorización\.

__Administración__

- Reapertura de cierre\.
- Resolución de conflicto\.
- Cambio de configuración\.
- Cambio de sucursal/dispositivo\.

__5\. Datos mínimos de una auditoría__

Cada evento de auditoría debería guardar:

- UUID\.
- Tipo de evento\.
- Usuario\.
- Rol efectivo\.
- Sucursal\.
- Dispositivo\.
- Fecha/hora del servidor\.
- Fecha/hora local informada, cuando aplique\.
- Módulo\.
- Entidad afectada\.
- ID/UUID de la entidad\.
- Acción\.
- Motivo\.
- Resultado\.
- IP o contexto técnico, cuando sea útil\.

__6\. Antes y después__

Para cambios de datos sensibles debemos conservar:

valor\_anterior

valor\_nuevo

Ejemplo:

Producto: RK\-428

Campo: precio\_minimo

Antes: 180\.00

Después: 170\.00

Esto permite reconstruir el cambio sin revisar la base manualmente\.

__7\. No almacenar todo indiscriminadamente__

No necesitamos guardar un JSON completo de toda la entidad para cada modificación trivial\.

Recomendación:

- Guardar campos realmente cambiados\.
- Guardar contexto de la operación\.
- Para eventos críticos, conservar payload más completo\.

Esto evita una bitácora enorme e inútil\.

__8\. Auditoría de una venta__

Ejemplo de historial:

VENTA V\-00125

10:15 Creada por vendedor Juan

10:17 Precio modificado 200 → 190

10:17 Precio autorizado por encargado Luis

10:18 Confirmada

10:18 Lotes oficiales asignados

15:30 Devolución parcial 1 unidad

Esto debe poder verse desde la propia venta\.

__9\. Creador y autorizador separados__

Ya quedó definido y aquí lo formalizamos\.

Ejemplo:

Creado por: Juan

Autorizado por: Luis

Confirmado por: Juan

No debemos sobrescribir un usuario con otro\.

__10\. Auditoría de precio bajo mínimo__

Debe guardar:

- Producto\.
- Precio sugerido\.
- Precio mínimo\.
- Precio solicitado\.
- Precio autorizado\.
- Solicitante\.
- Autorizador\.
- Motivo\.
- Fecha\.
- Venta relacionada\.

Esto permitirá reportar excepciones comerciales\.

__11\. Auditoría de cambio PEPS__

Ejemplo:

Sistema sugirió:

Lote A

Usuario despachó:

Lote C

Debe quedar:

sugerido: Lote A

utilizado: Lote C

motivo: lote A físicamente inaccesible

usuario: almacenero

__12\. Auditoría de ajustes__

Un ajuste deberá mostrar:

- Conteo original\.
- Diferencia\.
- Reconteo, si existió\.
- Cantidad aprobada\.
- Movimiento generado\.
- Usuario que contó\.
- Usuario que confirmó\.
- Motivo\.

Así podremos diferenciar:

conteo

de:

ajuste oficial

__13\. Auditoría de pérdida__

Debe ser especialmente completa\.

Campos recomendados:

- Producto\.
- Cantidad\.
- Valor\.
- Lote\.
- Fecha detectada\.
- Reportado por\.
- Autorizado por\.
- Motivo\.
- Evidencia\.
- Movimiento de Kardex generado\.

__14\. Auditoría de transferencias__

Historial:

Solicitada

Aprobada

Preparada

Enviada

Recibida

Diferencia registrada

Diferencia resuelta

Para cada etapa:

- Usuario\.
- Fecha\.
- Cantidad\.
- Observación\.

Esto permitirá saber exactamente dónde ocurrió una diferencia\.

__15\. Auditoría de recepción parcial__

Ejemplo:

Enviado: 10

Recepción 1:

6 unidades

Usuario A

Recepción 2:

3 unidades

Usuario B

Diferencia final:

1 faltante

No debemos sobrescribir las recepciones anteriores\.

__16\. Auditoría de clientes__

Cambios importantes:

- Documento\.
- Razón social\.
- Estado\.
- Bloqueo\.
- Fusión de duplicado\.

No es necesario auditar cada corrección menor con el mismo nivel de severidad, pero sí conservar historial suficiente\.

__17\. Fusión de clientes__

Si en el futuro se fusionan registros:

Cliente B

→ fusionado dentro de Cliente A

Debe conservarse:

- Cliente origen\.
- Cliente destino\.
- Usuario\.
- Motivo\.
- Fecha\.

Nunca simplemente eliminar el duplicado\.

__18\. Auditoría de productos duplicados__

Lo mismo para catálogo\.

Si:

RK\.7027

se determina que corresponde realmente al mismo producto que:

RK\-7027

la fusión deberá quedar explícita\.

No será una normalización silenciosa\.

__19\. Auditoría de kits__

Debe conservar:

- Creación del kit\.
- Versión de composición\.
- Componentes anteriores\.
- Componentes nuevos\.
- Usuario que activó versión\.
- Órdenes de armado\.
- Desarmados, si se habilitan\.

Una venta histórica siempre debe apuntar a la versión que utilizó\.

__20\. Auditoría de pagos__

Debe mostrar:

- Registro del pago\.
- Método\.
- Monto\.
- Deudas afectadas\.
- Sucursal de cobro\.
- Usuario\.
- Anulación, si existió\.
- Reembolso, si existió\.

__21\. Pago anulado__

Historial:

Pago P\-001

S/ 500

Confirmado 10:00

Anulado 12:30

Motivo: pago duplicado

Por: encargado

La bitácora no debe mostrar simplemente el estado final sin explicar la transición\.

__22\. Auditoría de cierres__

Para cada cierre:

- Quién inició\.
- Quién confirmó\.
- Diferencias\.
- Observaciones\.
- Hora\.
- Versión\.
- Reapertura\.
- Motivo de reapertura\.
- Nuevo cierre\.

Ejemplo:

Cierre v1 confirmado

↓

Reabierto por Admin

↓

Motivo: venta offline pendiente

↓

Cierre v2 confirmado

__23\. Versiones de cierre__

Cada versión debe seguir disponible\.

No solo:

estado actual = confirmado

sino historial completo\.

__24\. Auditoría de conflictos__

Debe guardar:

- Operación original\.
- Tipo de conflicto\.
- Payload original relevante\.
- Estado oficial encontrado\.
- Resolución\.
- Usuario\.
- Motivo\.
- Resultado\.

Ejemplo:

Venta local: 5 unidades

Stock servidor: 3

Conflicto: STOCK\_INSUFICIENTE

Resolución: reintentar después de entrada

__25\. Resoluciones automáticas__

También deben registrarse\.

Ejemplo:

Lote local A

Lote oficial B

Resolución automática PEPS

Aunque ningún humano intervino\.

__26\. Auditoría PWA__

Para operaciones offline:

- Dispositivo\.
- UUID\.
- Fecha local\.
- Fecha recibida\.
- Fecha confirmada\.
- Número de reintentos\.
- Resultado\.
- Conflicto, si hubo\.

Esto será esencial para soporte\.

__27\. Diferencia entre fecha local y oficial__

Ejemplo:

Operación local:

06/08 14:00

Servidor recibió:

06/08 16:10

Confirmó:

06/08 16:11

Las tres pueden ser relevantes\.

__28\. Cambios de permisos__

Ejemplo:

Usuario: Luis

Permiso:

autorizar\_precio\_bajo\_minimo

Antes: No

Después: Sí

Debe registrar:

- Administrador que cambió\.
- Fecha\.
- Motivo si corresponde\.

__29\. Auditoría de dispositivos__

Historial:

Dispositivo registrado

→ autorizado

→ cambió de sucursal

→ bloqueado

→ revocado

Con usuario administrativo responsable\.

__30\. Auditoría de configuraciones__

Todo parámetro sensible:

max\_offline\_hours

tolerancia\_caja

politica\_morosidad

precio\_minimo

debe registrar cambios\.

__31\. Configuración histórica__

La auditoría no sustituye al versionado cuando la regla debe usarse funcionalmente después\.

Ejemplo:

Para precio mínimo necesitamos:

- Historial/versiones funcionales\.
- Auditoría del cambio\.

Son cosas relacionadas, pero distintas\.

__32\. Bitácora por entidad__

Cada entidad importante debería tener una pestaña:

__Historial__

Ejemplos:

- Producto\.
- Venta\.
- Cliente\.
- Transferencia\.
- Pago\.
- Cierre\.

Así el usuario autorizado no necesita entrar a una bitácora global para cada consulta\.

__33\. Bitácora global__

Además, el administrador tendrá:

__Auditoría general__

Filtros:

- Fecha\.
- Usuario\.
- Sucursal\.
- Módulo\.
- Acción\.
- Entidad\.
- Severidad\.

__34\. Ejemplo de bitácora general__

__Fecha__

__Usuario__

__Sucursal__

__Módulo__

__Acción__

__Entidad__

10:15

Juan

Mazuko

Ventas

Confirmó

V\-125

10:17

Luis

Mazuko

Ventas

Autorizó descuento

V\-126

11:00

Admin

Global

Config

Cambió precio mínimo

RK\-428

__35\. Severidad de auditoría__

Podemos clasificar:

- Informativa\.
- Importante\.
- Crítica\.

Ejemplo:

__Informativa__

Inicio de sesión\.

__Importante__

Cambio de precio\.

__Crítica__

Reapertura de cierre\.

Esto ayuda a filtrar\.

__36\. No auditar clics irrelevantes__

No necesitamos registrar:

- Abrió pantalla\.
- Cerró modal\.
- Cambió filtro\.

La auditoría funcional debe centrarse en acciones que modifican o autorizan información relevante\.

__37\. Lectura de datos sensibles__

En casos muy sensibles podría auditarse acceso a cierta información\.

Por ejemplo:

- Reporte global de costos\.
- Auditoría completa\.

Pero no recomiendo registrar cada consulta normal de inventario porque generaría demasiado ruido\.

Puede dejarse preparado si más adelante existe un requerimiento de cumplimiento\.

__38\. Protección de datos__

La auditoría no debe almacenar:

- Contraseñas\.
- Tokens completos\.
- Secretos\.
- Datos financieros técnicos innecesarios\.

Los logs deben ser útiles sin convertirse en un riesgo de seguridad\.

__39\. IP__

La IP puede guardarse como contexto de seguridad\.

Pero no debe considerarse prueba absoluta de identidad\.

La identidad principal sigue siendo:

usuario \+ sesión \+ dispositivo

__40\. Request ID / correlación técnica__

Recomiendo que cada request importante tenga un identificador\.

Ejemplo:

request\_id

Esto permitirá relacionar:

- Log de Laravel\.
- Sync batch\.
- Operación\.
- Error\.

Muy útil para soporte técnico\.

__41\. Batch de sincronización__

Una auditoría técnica puede mostrar:

Batch SYNC\-00125

Dispositivo Caja Mazuko 01

10 operaciones

8 aceptadas

1 conflicto

1 duplicada

Luego se puede profundizar\.

__42\. Auditoría y Kardex__

No debemos confundirlos\.

__Kardex__

Registra:

Movimiento valorizado del producto\.

__Auditoría__

Registra:

Quién ejecutó/autorizó la operación y qué decisiones hubo\.

Ejemplo:

Kardex:

Venta \-3

Auditoría:

Creada por Juan

Autorizada por Luis

Lote cambiado por Pedro

__43\. Auditoría y cierre__

El cierre no debe depender de que “no existan eventos de auditoría”\.

La auditoría es evidencia\.

Los bloqueos dependen de:

- Conflictos\.
- Diferencias\.
- Pendientes\.

__44\. Conservación__

Dado que el sistema necesita historia comercial e inventario, recomiendo:

La auditoría funcional crítica debe conservarse a largo plazo y no eliminarse rutinariamente\.

La política exacta de retención técnica de logs de servidor podrá ser diferente\.

__45\. Logs técnicos__

Los logs técnicos sí pueden rotarse\.

Ejemplo:

- Logs HTTP antiguos\.
- Errores de aplicación\.
- Trazas\.

Esto no debe eliminar la auditoría funcional de negocio\.

__46\. Exportación de auditoría__

El administrador puede necesitar exportar:

- Excel\.
- PDF en casos específicos\.

Especialmente:

- Ajustes\.
- Anulaciones\.
- Reaperturas\.
- Pérdidas\.
- Conflictos\.

__47\. Auditoría visible por encargado__

El encargado debería poder ver el historial de su sucursal para las operaciones que administra\.

No necesariamente:

- Cambios globales de permisos\.
- Auditoría de otras sucursales\.
- Configuraciones de seguridad global\.

__48\. Vendedor__

El vendedor puede ver historial relevante de sus propias operaciones, por ejemplo:

Venta enviada

Venta sincronizada

Venta en conflicto

No necesita acceso a bitácora administrativa completa\.

__49\. Almacenero__

Puede consultar:

- Historia de lotes\.
- Transferencias\.
- Conteos\.
- Movimientos físicos\.

Pero no necesariamente:

- Cambios financieros\.
- Permisos\.
- Utilidades\.

__50\. Datos “antes/después” restringidos__

Si un cambio contiene costos y el usuario no tiene permiso de ver costos:

La auditoría debe respetar ese permiso\.

No debemos filtrar costos en pantallas normales y luego revelarlos desde la bitácora\.

__51\. Operaciones eliminadas__

Como las operaciones confirmadas no se eliminan, la auditoría no tendrá que reconstruir información desaparecida\.

Los borradores locales cancelados pueden tener trazabilidad mínima, pero no requieren el mismo nivel que una operación oficial\.

__52\. Auditoría de cancelaciones locales__

Para una operación PWA nunca sincronizada:

Venta local

→ CANCELADA\_LOCAL

Puede conservarse localmente y, opcionalmente, enviar un evento resumido cuando vuelva la conexión\.

No debe generar Kardex ni venta oficial\.

__53\. Auditoría de errores administrativos__

Si un administrador corrige algo:

No debemos reemplazar:

error

por:

correcto

sin relación\.

Debe quedar:

Operación original

→ corrección

Esto sigue la política de inmutabilidad\.

__54\. Búsqueda__

La bitácora global debería permitir buscar por:

- Código de venta\.
- Referencia\.
- Cliente\.
- Usuario\.
- UUID\.
- Documento\.
- Transferencia\.
- Pago\.

Esto facilitará investigaciones\.

__55\. Vista de línea temporal__

Para entidades complejas recomiendo una línea de tiempo\.

Ejemplo:

09:00 Venta creada

09:03 Autorización de precio

09:05 Confirmada

11:30 Pago adicional

15:00 Devolución parcial

Es más legible que una tabla de JSON\.

__56\. Motivo obligatorio__

Para acciones críticas:

- Anulación\.
- Reapertura\.
- Ajuste\.
- Pérdida\.
- Reembolso\.
- Cambio PEPS\.
- Resolución crítica\.
- Cambio de costo\.

El evento de auditoría no puede registrarse sin motivo\.

__57\. Catálogo de motivos \+ detalle__

Como ya definimos:

motivo\_codigo

detalle\_motivo

Ejemplo:

Motivo: ERROR\_CANTIDAD

Detalle: se digitó 10 en lugar de 1

Esto combina reportabilidad y contexto\.

__58\. Alertas por auditoría__

Algunas acciones críticas pueden generar una alerta\.

Ejemplos:

- Cierre reabierto\.
- Ajuste grande\.
- Muchas anulaciones\.
- Dispositivo revocado\.
- Cambio de precio mínimo\.

No toda auditoría genera alerta\.

__59\. Detección de patrones__

Más adelante se puede analizar:

- Usuario con muchas anulaciones\.
- Muchas modificaciones PEPS\.
- Ajustes repetitivos\.
- Cierres reabiertos frecuentemente\.

Esto se basa en la auditoría, pero no necesitamos un motor de fraude en V1\.

__60\. Tablas conceptuales__

En Etapa 4 probablemente tendremos algo similar a:

audit\_events

con:

id

uuid

user\_id

branch\_id

device\_id

event\_type

entity\_type

entity\_id

action

reason\_code

reason\_detail

before\_data

after\_data

metadata

created\_at

La estructura final se diseñará después\.

__61\. Eventos específicos vs genéricos__

No recomiendo registrar todo solamente como:

UPDATED

Debemos tener eventos entendibles\.

Ejemplos:

SALE\_CONFIRMED

SALE\_CANCELLED

PRICE\_MINIMUM\_CHANGED

INVENTORY\_ADJUSTMENT\_APPROVED

CLOSING\_REOPENED

CONFLICT\_RESOLVED

DEVICE\_REVOKED

Esto facilita reportes\.

__62\. Actor automático__

Algunas acciones las realiza el sistema\.

Ejemplo:

- Deuda pasa a vencida\.
- Alerta se resuelve\.
- Lote se reasigna automáticamente\.

Debemos permitir:

actor\_type = SYSTEM

en vez de inventar un usuario\.

__63\. Actor API/sincronización__

Una venta offline tiene:

Usuario: Juan

Dispositivo: Caja 01

aunque técnicamente el motor de sincronización sea quien invoque la operación\.

La auditoría debe conservar al usuario original, no atribuirla únicamente al sistema\.

__64\. Operaciones automáticas relacionadas__

Ejemplo: venta confirmada genera:

- Inventario\.
- Kardex\.
- Cuenta por cobrar\.

No necesitamos crear cientos de eventos redundantes si las relaciones ya son claras\.

Podemos registrar:

VENTA\_CONFIRMADA

y los movimientos derivados mantienen sus propios registros funcionales\.

Para operaciones sensibles adicionales sí se registra evento específico\.

__65\. Principio de no duplicación__

Debemos evitar guardar tres copias completas de la misma información en:

- Venta\.
- Kardex\.
- Auditoría\.

Cada capa tiene su propósito\.

__Venta__

Documento comercial\.

__Kardex__

Movimiento de inventario\.

__Auditoría__

Historia de decisiones y cambios\.

__66\. Permisos__

__Acción__

__Admin__

__Encargado__

__Almacenero__

__Vendedor__

Ver historial entidad local

Sí

Sí

Según módulo

Propio/limitado

Ver auditoría global

Sí

No

No

No

Ver cambios de seguridad

Sí

No

No

No

Exportar auditoría

Sí

Limitado

No

No

Ver costos en auditoría

Sí

Con permiso

Con permiso

No

Modificar auditoría

No

No

No

No

La última fila es fundamental:

__Nadie modifica auditoría desde la operación normal del sistema\.__

__67\. Reglas funcionales definitivas del Proceso 18__

1. Toda acción sensible deja auditoría\.
2. La auditoría es inmutable\.
3. Creador y autorizador se registran separadamente\.
4. Usuario, sucursal y dispositivo deben conservarse\.
5. Los cambios sensibles guardan antes/después\.
6. No se almacenan secretos en auditoría\.
7. La auditoría funcional se diferencia de logs técnicos\.
8. Kardex y auditoría cumplen funciones distintas\.
9. Se registran cambios de precios y configuraciones\.
10. Se registran ajustes, pérdidas y bajas\.
11. Se registran anulaciones y devoluciones\.
12. Se registran pagos anulados y reembolsos\.
13. Se registran reaperturas de cierre\.
14. Se registran resoluciones de conflictos\.
15. Las resoluciones automáticas también dejan evidencia\.
16. Se conservan fechas local y oficial en operaciones offline\.
17. Los dispositivos y sesiones relevantes quedan asociados\.
18. Las fusiones de productos/clientes son trazables\.
19. Las versiones de kits conservan historial\.
20. Las transferencias mantienen línea temporal\.
21. Las auditorías respetan permisos sobre datos sensibles\.
22. No se auditan clics o acciones irrelevantes\.
23. Los logs técnicos pueden rotar sin eliminar auditoría funcional\.
24. Debe existir historial por entidad\.
25. Debe existir auditoría global para administración\.
26. Las acciones críticas requieren motivo\.
27. Los eventos deberán ser semánticamente claros, no solo UPDATED\.
28. El sistema podrá actuar como actor automático\.
29. La sincronización conserva el usuario original\.
30. Nadie puede editar manualmente la bitácora desde la interfaz normal\.

__68\. Criterios de aceptación del Proceso 18__

Consideraremos aprobado el proceso cuando:

- Un cambio de precio muestre valor anterior y nuevo\.
- Una venta anulada conserve quién la creó y quién la anuló\.
- Una autorización bajo mínimo quede vinculada a la venta\.
- Un cambio PEPS registre lote sugerido y utilizado\.
- Un ajuste pueda rastrearse hasta el conteo\.
- Una reapertura conserve cierre anterior y responsable\.
- Un conflicto muestre cómo fue resuelto\.
- Una operación offline indique dispositivo, fecha local y fecha oficial\.
- Un usuario sin permiso de costos no pueda descubrirlos desde auditoría\.
- Las fusiones de registros conserven origen/destino\.
- El administrador pueda filtrar auditoría por usuario, sucursal y módulo\.
- Ningún rol pueda editar o borrar eventos de auditoría desde el sistema\.

__Resultado del Proceso 18__

Queda funcionalmente definido:

__El sistema contará con una bitácora inmutable que registrará las acciones sensibles y las decisiones administrativas, relacionando usuario, sucursal, dispositivo, operación, autorizaciones, cambios antes/después y motivos\. El Kardex continuará siendo la trazabilidad económica del inventario, mientras que la auditoría explicará quién tomó cada decisión y cómo evolucionó cada operación\.__

Con este proceso tenemos ya bastante completa la __Etapa 3 funcional__\.

El siguiente paso que conviene abordar es el __Proceso 19: Migración e inicialización de datos__, donde formalizaremos cómo pasaremos del Excel actual al nuevo sistema: catálogo consolidado, referencias, productos, sucursales, stock físico inicial, costos aprobados, lotes iniciales, clientes/deudas si existen, validaciones, archivo de errores y corte definitivo para comenzar a operar\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 19: Migración e inicialización de datos__

Este proceso define cómo pasaremos del esquema actual en Excel al nuevo sistema sin arrastrar errores, fórmulas problemáticas o referencias ambiguas\.

Se relaciona directamente con:

- Sucursales\.
- Catálogo\.
- Inventario\.
- Lotes\.
- Kardex\.
- Clientes\.
- Cuentas por cobrar\.
- Configuración\.
- Auditoría\.

La regla central será:

__No migraremos el Excel “tal cual”\. Primero consolidaremos, validaremos y limpiaremos los datos que sí deben convertirse en información oficial\.__

__1\. Objetivo funcional__

La migración debe dejar el sistema listo para operar con:

- Sucursales correctas\.
- Catálogo consolidado\.
- Referencias como texto\.
- Marcas y categorías normalizadas\.
- Tipos de producto definidos\.
- Stock físico inicial validado\.
- Costo inicial aprobado\.
- Lotes iniciales\.
- Kardex inicial\.
- Precios y mínimos\.
- Clientes/deudas, solo si se entregan y validan\.

__2\. Qué NO significa migrar__

No significa copiar:

KARDEX

ENTRADAS

SALIDAS

VENTAS

celda por celda a PostgreSQL\.

El Excel actual contiene:

- Fórmulas\.
- Filas vacías\.
- Valores faltantes\.
- Posibles duplicidades\.
- Referencias con formatos distintos\.
- Costos incompletos\.
- Registros cancelados ambiguos\.
- Saldos calculados indirectamente\.

Por tanto, debe utilizarse como __fuente de preparación__, no como estructura de destino\.

__3\. Estrategia general__

La migración tendrá estas etapas:

1\. Recibir archivos finales de todas las sucursales

2\. Crear respaldo original

3\. Extraer datos

4\. Consolidar catálogo

5\. Normalizar referencias

6\. Detectar duplicados/conflictos

7\. Validar productos

8\. Configurar sucursales

9\. Realizar inventario físico

10\. Definir costos iniciales

11\. Importar stock inicial

12\. Crear lotes iniciales

13\. Crear Kardex inicial

14\. Validar totales

15\. Realizar corte

16\. Iniciar operación

__4\. Archivos originales__

Los archivos entregados deberán conservarse sin modificación como respaldo\.

Ejemplo:

/migracion/originales/

    juliaca\.xlsx

    mazuko\.xlsx

    huepetuhe\.xlsx

    \.\.\.

El sistema de migración trabajará sobre copias\.

Esto permite volver al origen si existe alguna duda\.

__5\. Archivo maestro de migración__

Recomiendo generar un archivo intermedio consolidado\.

Por ejemplo:

MIGRACION\_MAESTRA\.xlsx

con hojas como:

- Productos\.
- Referencias alternativas\.
- Marcas\.
- Sucursales\.
- Stock inicial\.
- Costos\.
- Precios\.
- Stock mínimo\.
- Errores\.
- Duplicados\.
- Clientes, si aplica\.
- Deudas, si aplica\.

Este archivo será de revisión, no la base permanente\.

__6\. Catálogo antes que inventario__

Primero debemos definir:

__Qué productos existen realmente\.__

Luego podremos decir:

¿Cuánto stock tiene cada sucursal de cada producto?

No debemos importar inventario mientras todavía existan referencias sin resolver\.

__7\. Referencia como texto__

Todas las referencias se importarán como texto\.

Ejemplos válidos:

7027

RK\-7027

RK\.7027

00125

ABC/50

No se almacenarán como números aunque solo contengan dígitos\.

Esto evita perder:

- Ceros iniciales\.
- Separadores\.
- Prefijos\.

__8\. Referencia original y normalizada__

Para cada referencia tendremos:

referencia\_original

referencia\_normalizada

Ejemplo:

Original: RK\.7027

Normalizada: RK7027

Pero:

La normalización será solo para búsqueda y detección de posibles duplicados\.

No significa que ambas referencias sean automáticamente el mismo producto\.

__9\. Posibles duplicados__

Ejemplo:

RK\.7027

RK\-7027

El sistema de migración los marcará como:

POSIBLE\_DUPLICADO

Una persona deberá decidir:

- Son el mismo producto\.
- Son productos diferentes\.
- Una es referencia alternativa\.

Nunca se fusionan automáticamente\.

__10\. Producto canónico__

Si dos referencias resultan ser el mismo producto:

Elegimos un producto oficial:

Producto P001

Referencia principal: RK\-7027

y la otra puede convertirse en alias:

Alias: RK\.7027

Las relaciones futuras usan:

producto\_id

no la referencia\.

__11\. Nombre del producto__

No intentaremos inferir el nombre de una referencia desconocida\.

El nombre debe venir de:

- Catálogo actual\.
- Revisión del negocio\.
- Importación aprobada\.

Si una referencia no tiene descripción confiable:

PENDIENTE\_DE\_VALIDACION

antes de importar como producto oficial\.

__12\. Marcas__

Las marcas se consolidarán\.

Ejemplo:

CATERPILLAR

Caterpillar

CATERPILLAR 

pueden ser una sola marca si la revisión lo confirma\.

Aquí sí puede aplicarse limpieza de espacios/mayúsculas, pero manteniendo un catálogo único\.

__13\. Marca vacía__

Si un producto no tiene marca:

No recomiendo inventar una\.

Opciones:

- SIN MARCA
- Marca pendiente\.

La política final puede definirse antes del import\.

Lo importante es no asignar una marca falsa\.

__14\. Categorías__

Como el Excel actual no necesariamente tiene una categorización completa y confiable:

Las categorías podrán prepararse antes o después de la carga inicial del catálogo\.

No deben bloquear toda la migración si la empresa todavía no tiene una clasificación madura\.

Podemos usar temporalmente:

SIN CATEGORIA

y luego completar\.

__15\. Tipo de producto__

Cada producto debe clasificarse como:

SIMPLE

KIT\_UNICO

KIT\_COMPONENTES

Para la migración inicial, la mayoría probablemente serán SIMPLE\.

Los kits conocidos deberán revisarse explícitamente\.

No intentaremos deducir automáticamente que un producto es kit por su nombre\.

__16\. Unidades de medida__

Cada producto tendrá UOM\.

Si la fuente no la contiene, necesitamos definir un valor inicial razonable por revisión\.

Ejemplos:

- UNIDAD\.
- JUEGO\.
- KIT\.
- METRO\.

No debemos permitir cantidades decimales para una unidad marcada como indivisible\.

__17\. Consolidación entre sucursales__

Si el mismo producto aparece en:

Juliaca

Mazuko

Huepetuhe

debe existir __un solo producto global__\.

Inventario:

producto\_id \+ sucursal\_id

Esto evita tres catálogos independientes\.

__18\. No utilizar stock calculado como única verdad__

El saldo actual del Excel puede servir como referencia, pero la migración definitiva debe apoyarse en:

__Conteo físico por sucursal\.__

Porque el Excel puede contener:

- Registros omitidos\.
- Cancelaciones que todavía descuentan stock\.
- Costos incompletos\.
- Negativos\.
- Fórmulas erróneas\.

__19\. Inventario físico inicial__

Antes del arranque:

Cada sucursal debe contar físicamente sus existencias\.

Idealmente:

Referencia

Producto

Cantidad física

Ubicación

Observación

El conteo debe convertirse en el stock inicial oficial del nuevo sistema\.

__20\. Comparación Excel vs físico__

Generaremos un reporte:

__Producto__

__Excel__

__Físico__

__Diferencia__

A

10

10

0

B

5

3

\-2

C

0

4

\+4

Esto es información de migración\.

No debemos crear ajustes dentro del nuevo sistema para diferencias ocurridas antes de su entrada en producción\.

El sistema comienza con el físico aprobado\.

__21\. Stock negativo histórico__

Si Excel dice:

\-2

no importaremos:

stock\_inicial = \-2

porque la nueva aplicación no permitirá negativos\.

Se debe hacer conteo físico y resolver el producto\.

__22\. Stock cero__

Un producto puede existir en catálogo con:

stock = 0

No es necesario crear un movimiento inicial de cero\.

Se carga producto, pero no un Kardex de inventario inicial hasta que exista stock\.

__23\. Costo inicial__

Cada existencia inicial necesita un costo aprobado para el Kardex\.

No debemos confiar automáticamente en costos:

- Vacíos\.
- Cero\.
- Incorrectos\.
- Provenientes de fórmulas defectuosas\.

__24\. Fuente del costo inicial__

La empresa podrá definir el costo inicial usando, según disponibilidad:

- Último costo confiable\.
- Costo promedio revisado\.
- Documento de compra\.
- Valor aprobado administrativamente\.

El sistema de migración debe guardar:

costo\_inicial\_aprobado

No necesita reconstruir obligatoriamente todo el historial anterior\.

__25\. Stock con costo cero__

Si:

Stock físico = 10

Costo = 0

debe aparecer como error de preparación\.

Recomendación:

No poner en producción stock valorizable sin un costo inicial razonablemente aprobado\.

Puede existir una excepción administrativa, pero deberá quedar explícita\.

__26\. Valorización inicial__

Ejemplo:

Stock físico: 10

Costo inicial aprobado: S/ 120

Movimiento:

INVENTARIO\_INICIAL

Entrada: 10

Costo: 120

Valor: 1,200

Saldo: 10

Promedio: 120

__27\. Lotes iniciales__

Todo stock inicial tendrá lote interno\.

Ejemplo:

MZK\-INICIAL\-000001

con:

- Producto\.
- Sucursal\.
- Cantidad inicial\.
- Cantidad disponible\.
- Costo inicial\.
- Estado\.
- Ubicación\.

__28\. Antigüedad del lote inicial__

Probablemente no sepamos la fecha real de compra de muchas unidades\.

No debemos inventar una fecha exacta\.

Recomendación:

Guardar:

fecha\_ingreso\_original = desconocida

es\_lote\_inicial = true

Y para PEPS:

Los lotes iniciales se consideran anteriores a las nuevas compras realizadas después de la puesta en marcha\.

Dentro de varios lotes iniciales sin fecha se utilizará un orden estable\.

__29\. Si conocemos fecha real__

Si para ciertos productos existe una fecha confiable, puede migrarse\.

Pero no será obligatorio para todos\.

__30\. Un lote inicial por producto__

Para simplificar V1:

Se puede crear un lote inicial por producto \+ sucursal\.

Ejemplo:

RK\-428 / Mazuko

→ MZK\-INICIAL\-000125

→ 10 unidades

Si el inventario físico identifica lotes reales claramente separados, se pueden crear varios\.

__31\. Ubicaciones__

Durante el conteo podemos capturar:

- Almacén\.
- Estante\.
- Anaquel\.

Si no se logra completar todo antes del arranque:

Ubicación puede quedar pendiente sin impedir necesariamente la carga\.

El sistema generará alerta para completar\.

__32\. Precio sugerido__

Los precios pueden importarse si la empresa entrega una lista aprobada\.

No recomiendo deducir precio de venta desde:

- Costo\.
- Última venta\.
- Fórmula automática\.

salvo que la empresa defina esa regla\.

__33\. Precio mínimo__

Igualmente:

- Debe ser aprobado\.
- Puede cargarse general\.
- Puede tener override por sucursal\.

Si aún no existe una política:

Puede iniciarse sin mínimo para ciertos productos, pero antes de habilitar descuentos conviene tener la configuración definida\.

__34\. Stock mínimo__

Puede cargarse:

- Desde una plantilla preparada\.
- O después del arranque\.

No es requisito para que el inventario sea técnicamente válido\.

Pero sí lo necesitamos para alertas de reposición\.

__35\. Clientes__

Actualmente no tenemos una base estructurada confiable proveniente del Excel analizado\.

Por tanto:

No vamos a inventar clientes históricos\.

El sistema puede iniciar con:

- Cliente genérico\.
- Clientes que la empresa entregue explícitamente\.
- Clientes registrados desde el día de puesta en marcha\.

__36\. Clientes activos existentes__

Si antes del arranque la empresa entrega una lista:

Documento

Nombre

Teléfono

Dirección

se puede importar\.

Debemos aplicar:

- Detección de documentos duplicados\.
- Normalización\.
- Validación\.

__37\. Deudas existentes__

Si existen cuentas por cobrar activas fuera del Excel de inventario, pueden migrarse\.

Pero necesitamos como mínimo:

- Cliente\.
- Saldo\.
- Fecha/origen aproximado\.
- Vencimiento, si existe\.
- Sucursal de origen\.

No debemos generar ventas históricas falsas solo para crear deuda\.

__38\. Saldo inicial de cuentas por cobrar__

Podemos tener un tipo especial:

SALDO\_INICIAL\_CXC

relacionado con el cliente\.

Así distinguimos:

Deuda migrada

de:

Venta realizada en el nuevo sistema

__39\. Pagos posteriores a deuda migrada__

Funcionan normalmente\.

Ejemplo:

Saldo inicial migrado: 1,500

Pago nuevo: 500

Saldo: 1,000

El pago sí se registra dentro del sistema nuevo\.

__40\. Historia antigua de ventas__

No recomiendo migrar miles de movimientos históricos del Excel salvo que exista un motivo claro\.

Razones:

- Calidad limitada\.
- Costos faltantes\.
- Cancelaciones ambiguas\.
- No hay clientes estructurados\.
- Puede contaminar el nuevo Kardex\.

Para V1:

Empezar con inventario inicial validado y conservar Excel como archivo histórico\.

__41\. Historia resumida opcional__

Si la administración necesita indicadores históricos, podemos importar datos resumidos como:

ventas históricas mensuales

a una tabla/reporting separada\.

Pero no deben mezclarse con el Kardex oficial nuevo\.

Esto es opcional\.

__42\. Proveedores__

Si las entradas antiguas contienen proveedores confiables, pueden consolidarse\.

Pero tampoco necesitamos reconstruir todas las compras antiguas\.

Podemos iniciar con:

- Proveedores activos conocidos\.
- Nuevos proveedores registrados al operar\.

__43\. Validaciones antes de importar productos__

Cada fila debe pasar reglas como:

- Referencia no vacía\.
- Referencia como texto\.
- Nombre válido\.
- Marca válida o pendiente\.
- Tipo válido\.
- UOM válida\.
- No duplicado confirmado\.
- Estado definido\.

__44\. Validaciones antes de importar stock__

Cada fila:

producto existe

sucursal existe

cantidad >= 0

costo >= 0

UOM permite cantidad

y si:

cantidad > 0

recomendación:

costo > 0

salvo excepción autorizada\.

__45\. Prevalidación__

Nunca hacer:

Subir Excel

→ importar inmediatamente

Flujo correcto:

Subir

↓

Analizar

↓

Mostrar errores

↓

Mostrar advertencias

↓

Corregir

↓

Volver a validar

↓

Aprobar

↓

Importar

__46\. Tipos de resultado__

Cada fila podrá ser:

- VALIDA
- ADVERTENCIA
- ERROR
- REQUIERE\_REVISION

__47\. Error__

Ejemplos:

- Producto inexistente en stock inicial\.
- Cantidad negativa\.
- Referencia vacía\.
- Sucursal inexistente\.
- Código duplicado incompatible\.

No se importa\.

__48\. Advertencia__

Ejemplos:

- Producto sin categoría\.
- Sin ubicación\.
- Sin stock mínimo\.
- Marca SIN MARCA\.

Puede permitirse importación\.

__49\. Requiere revisión__

Ejemplo:

RK\.7027

RK\-7027

posible duplicidad\.

Hasta resolver, no debería importarse esa parte\.

__50\. Reporte de errores__

La prevalidación debe generar un archivo o tabla con:

- Fila\.
- Referencia\.
- Campo\.
- Problema\.
- Severidad\.
- Acción recomendada\.

Esto facilita corregir masivamente\.

__51\. Importación idempotente__

La migración debe poder reintentarse sin duplicar\.

Usaremos:

- Lotes de importación\.
- UUID\.
- Estados\.

No debemos insertar dos veces el mismo inventario inicial por volver a presionar importar\.

__52\. Lote de migración__

Conceptualmente:

migration\_batch

con:

- Archivo\.
- Fecha\.
- Usuario\.
- Estado\.
- Cantidad de filas\.
- Errores\.
- Importados\.

Así podemos auditar todo el proceso\.

__53\. Entorno de prueba__

Antes del corte definitivo recomiendo hacer al menos una migración de ensayo\.

Flujo:

Datos actuales

↓

Migración de prueba

↓

Usuarios revisan

↓

Correcciones

↓

Nueva prueba

↓

Corte final

Esto reduce muchísimo el riesgo\.

__54\. Validación de prueba__

Por sucursal debemos revisar muestras de:

- Productos\.
- Referencias\.
- Stock\.
- Costos\.
- Valor inventario\.
- Precios\.
- Lotes\.

Y totales generales\.

__55\. Cuadre por sucursal__

Antes de producción:

Total físico contado

=

Total stock inicial importado

por producto y sucursal\.

Además:

Valor inicial =

Σ cantidad × costo aprobado

para revisión administrativa\.

__56\. Cuadre de lotes__

Debe cumplirse desde el primer minuto:

Inventario inicial

=

Suma lotes iniciales

=

Saldo Kardex inicial

Esto es requisito obligatorio\.

__57\. Corte definitivo__

Llegará un momento en que se debe dejar de operar en Excel\.

Ejemplo conceptual:

Día X – 18:00

se cierra operación Excel

↓

conteo/corte final

↓

migración definitiva

↓

validación

↓

inicio nuevo sistema

No debemos mantener durante semanas:

Excel \+ sistema nuevo

para registrar las mismas operaciones, porque aparecerán divergencias\.

__58\. Ventana de corte__

La duración dependerá de:

- Cantidad de sucursales\.
- Cantidad de productos\.
- Conteo físico\.
- Calidad de datos\.

Debe planificarse antes del despliegue\.

No necesitamos fijar fecha aún\.

__59\. Cambios después del archivo final__

Una vez extraído el archivo de corte:

No deben seguir registrándose operaciones en ese archivo sin comunicarlas\.

Idealmente se bloquea el Excel para edición o se archiva\.

__60\. Primera operación del sistema__

Después de migración:

Cada producto con stock comienza con:

INVENTARIO\_INICIAL

La siguiente operación ya será normal:

- Compra\.
- Venta\.
- Transferencia\.
- Ajuste\.

__61\. No migrar fórmulas__

Las fórmulas del Excel no se guardan como lógica oficial\.

Ejemplos:

BUSCARV

SUMAR\.SI

stock = entradas \- salidas \- ventas

serán reemplazadas por lógica transaccional real en el sistema\.

__62\. No migrar \#N/A__

Estos son errores de presentación/fórmula, no información\.

Se convierten en:

ERROR\_DE\_VALIDACION

si afectan una fila importante\.

__63\. No migrar filas vacías__

Las plantillas pueden tener miles de filas vacías\.

Se ignoran\.

__64\. No asumir costo cero__

Ya identificado como un problema importante\.

Regla:

costo vacío

≠

costo cero confirmado

Ambos deben tratarse cuidadosamente\.

__65\. Registros cancelados históricos__

Como el Excel actual puede seguir contando cantidades aunque aparezca “CANCELADO”, no debemos intentar reconstruir automáticamente su efecto\.

Para el inicio:

El conteo físico resuelve el saldo real\.

Los movimientos históricos ambiguos permanecen en el archivo antiguo\.

__66\. Documentos faltantes__

No bloquean necesariamente el stock inicial\.

No necesitamos crear una factura ficticia para cada unidad existente\.

El INVENTARIO\_INICIAL es precisamente el punto de corte\.

__67\. Trazabilidad de migración__

Todo producto/stock importado deberá poder indicar:

origen = MIGRACION

migration\_batch\_id

Así sabemos que no fue creado por una compra normal\.

__68\. Usuario de migración__

No recomiendo atribuir movimientos a un usuario ficticio sin contexto\.

Podemos registrar:

actor\_type = SYSTEM

y además:

approved\_by = administrador responsable

Así queda claro:

- Sistema ejecutó la importación\.
- Persona aprobó el lote\.

__69\. Corrección posterior al arranque__

Si después se descubre:

Se contó 10 pero realmente eran 12\.

No se modifica la migración original silenciosamente\.

Una vez en producción:

Conteo

↓

Ajuste positivo \+2

con auditoría\.

__70\. Excepción inmediatamente antes del go\-live__

Mientras la migración todavía no haya sido declarada definitiva, sí puede:

- Borrarse ambiente de prueba\.
- Corregirse archivo\.
- Reimportarse\.

La inmutabilidad estricta empieza con el corte productivo\.

__71\. Backups antes de go\-live__

Antes de iniciar:

- Excel originales\.
- Archivo maestro\.
- Resultado de validación\.
- Backup PostgreSQL recién migrado\.

Todo debe conservarse\.

__72\. Plan de rollback__

Si durante la validación final se descubre un error crítico antes de empezar operaciones:

No abrir operación

↓

restaurar base

↓

corregir migración

↓

reimportar

Una vez que existan ventas reales nuevas, el rollback completo se vuelve mucho más complejo\.

Por eso la validación previa es crítica\.

__73\. Responsable de aprobación__

Recomiendo que la migración definitiva tenga aprobación administrativa por sucursal\.

Ejemplo:

Mazuko

Stock inicial revisado por: Encargado

Aprobado por: Administrador

Especialmente para cantidad y valorización\.

__74\. Checklist por sucursal__

Antes de activar una sucursal:

- Catálogo revisado\.
- Conteo físico terminado\.
- Costos aprobados\.
- Stock importado\.
- Lotes creados\.
- Kardex cuadrado\.
- Usuarios configurados\.
- Dispositivos autorizados\.
- Métodos de pago configurados\.
- PWA sincronizada\.
- Prueba de venta\.
- Prueba de cierre\.

__75\. Activación progresiva__

Podemos desplegar:

Sucursal piloto

↓

validar

↓

resto de sucursales

o todas juntas\.

Por el número de procesos involucrados, recomiendo técnicamente __piloto controlado antes de activación total__, siempre que el negocio pueda manejarlo sin duplicar registros\.

Por ejemplo, una sucursal primero para validar operación real\.

__76\. Riesgo del piloto__

Si varias sucursales se transfieren mercadería entre sí y una sigue en Excel mientras otra ya está en el sistema, aumenta la complejidad\.

Por tanto, el piloto debe tener:

- Alcance bien delimitado\.
- Reglas para transferencias\.
- Duración corta\.

Si esto no es viable, puede ser mejor un corte conjunto\.

__77\. Pruebas mínimas después de migrar__

Antes de abrir:

1. Buscar producto\.
2. Consultar stock\.
3. Consultar lote\.
4. Revisar costo promedio\.
5. Registrar venta de prueba\.
6. Revertirla\.
7. Registrar entrada de prueba\.
8. Probar transferencia\.
9. Probar pago\.
10. Probar cierre\.
11. Probar offline/sincronización\.

En entorno de ensayo, no en datos productivos finales\.

__78\. Reporte final de migración__

Debe incluir:

- Productos importados\.
- Productos omitidos\.
- Duplicados resueltos\.
- Sucursales\.
- Total unidades por sucursal\.
- Valor inicial por sucursal\.
- Productos sin stock\.
- Productos con advertencia\.
- Clientes importados\.
- Deudas iniciales\.
- Errores pendientes\.

__79\. Firma/aprobación funcional__

No necesitamos una firma electrónica compleja\.

Puede existir un registro:

Migración aprobada

por usuario X

fecha/hora

con observaciones\.

__80\. Datos que se migrarán obligatoriamente__

Para el arranque:

1. Sucursales\.
2. Productos\.
3. Referencias\.
4. Nombres\.
5. Marcas\.
6. Tipo de producto\.
7. Unidad\.
8. Precios aprobados, si existen\.
9. Stock físico inicial por sucursal\.
10. Costo inicial aprobado\.
11. Stock mínimo, si está definido\.
12. Lotes iniciales generados\.
13. Kardex inicial generado\.

__81\. Datos opcionales__

- Alias\.
- Categorías\.
- Ubicaciones\.
- Clientes\.
- Proveedores\.
- Cuentas por cobrar activas\.
- Historia resumida\.
- Fechas originales de lotes cuando sean confiables\.

__82\. Datos que no deben migrarse directamente__

- Fórmulas\.
- \#N/A\.
- Filas vacías\.
- Negativos no validados\.
- Costos cero no confiables\.
- Cancelaciones ambiguas\.
- Movimientos sin referencia\.
- Duplicados sin resolver\.
- Saldos calculados cuya fuente sea dudosa\.

__83\. Reglas funcionales definitivas del Proceso 19__

1. El Excel original se conserva como respaldo\.
2. No se migrará celda por celda\.
3. El catálogo se consolida antes del inventario\.
4. Las referencias se almacenan como texto\.
5. La normalización no fusiona automáticamente productos\.
6. Los duplicados requieren revisión\.
7. Un producto será global para todas las sucursales\.
8. El stock inicial provendrá principalmente de conteo físico\.
9. No se migrará stock negativo\.
10. Los costos iniciales deben aprobarse\.
11. Costo vacío no se interpreta automáticamente como cero\.
12. Todo stock inicial tendrá lote\.
13. Todo stock inicial tendrá Kardex INVENTARIO\_INICIAL\.
14. Inventario, lotes y Kardex deben cuadrar desde el inicio\.
15. No es obligatorio reconstruir toda la historia antigua\.
16. El Excel anterior puede conservarse como archivo histórico\.
17. Clientes solo se importan si existe información confiable\.
18. Deudas activas pueden migrarse como saldos iniciales\.
19. No se crearán ventas históricas ficticias para representar deudas\.
20. Toda importación tiene prevalidación\.
21. Los errores bloquean las filas afectadas\.
22. Las advertencias pueden permitirse\.
23. La migración será idempotente\.
24. Existirán lotes/batches de importación\.
25. Se hará al menos una migración de prueba\.
26. La migración final requiere validación por sucursal\.
27. Debe existir un corte claro del Excel\.
28. No se operará indefinidamente en Excel y sistema en paralelo\.
29. Después del go\-live, las correcciones se hacen con operaciones normales\.
30. Toda la migración queda auditada\.

__84\. Criterios de aceptación del Proceso 19__

Consideraremos aprobado el proceso cuando:

- Una referencia con ceros iniciales no se altere\.
- Los posibles duplicados sean detectados\.
- El mismo producto no se duplique por sucursal\.
- El stock inicial coincida con el conteo aprobado\.
- No existan stocks negativos\.
- Todo stock positivo tenga costo aprobado o excepción explícita\.
- Cada existencia inicial tenga lote\.
- El saldo inicial del Kardex coincida con inventario\.
- La suma de lotes coincida con inventario\.
- Reimportar un mismo batch no duplique existencias\.
- Los errores de importación puedan descargarse/revisarse\.
- Los Excel originales queden preservados\.
- El corte de operación quede documentado\.
- El sistema pueda iniciar sin depender de las fórmulas antiguas\.

__Resultado del Proceso 19__

Queda funcionalmente definido:

__La migración será un proceso controlado de consolidación, validación y corte, no una copia directa del Excel\. El sistema iniciará con catálogo global depurado, inventario físico aprobado por sucursal, costos iniciales validados, lotes internos y Kardex de inventario inicial, preservando los archivos anteriores únicamente como respaldo histórico\.__

Con este proceso tenemos también formalizada la estrategia que permitirá cargar los inventarios de cada sucursal __al final, cuando toda la lógica general esté funcionando y validada__\.

El siguiente paso que conviene desarrollar es el __Proceso 20: Respaldo, recuperación y continuidad operativa__, para definir backups de PostgreSQL, archivos adjuntos, recuperación ante fallos del VPS, pérdida de un dispositivo, restauración, retención y cómo evitar que una falla técnica comprometa inventario o la historia del sistema\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 20: Respaldo, recuperación y continuidad operativa__

Este proceso define cómo protegeremos la información del sistema ante:

- Fallo del VPS\.
- Error humano\.
- Daño de base de datos\.
- Eliminación accidental\.
- Pérdida o robo de dispositivos\.
- Problemas de almacenamiento\.
- Fallos durante despliegues\.
- Cortes prolongados de internet\.

Se relaciona directamente con:

- PostgreSQL\.
- Archivos adjuntos\.
- PWA e IndexedDB\.
- Auditoría\.
- Usuarios y dispositivos\.
- Operación de sucursales\.
- Migración\.
- Infraestructura del VPS\.

La regla central será:

__La continuidad del negocio no debe depender de un único servidor, disco, archivo Excel ni dispositivo local\.__

__1\. Objetivo funcional__

El sistema debe poder:

- Crear respaldos automáticos\.
- Conservar varias versiones\.
- Mantener al menos una copia fuera del VPS principal\.
- Restaurar la base de datos\.
- Recuperar archivos adjuntos\.
- Detectar fallos de backup\.
- Proteger operaciones offline pendientes\.
- Revocar dispositivos perdidos\.
- Documentar procedimientos de recuperación\.

No basta con “tener backups”; debemos comprobar que realmente puedan restaurarse\.

__2\. Qué información debe protegerse__

Como mínimo:

__Base de datos PostgreSQL__

Incluye:

- Productos\.
- Inventarios\.
- Lotes\.
- Kardex\.
- Ventas\.
- Entradas\.
- Salidas\.
- Transferencias\.
- Clientes\.
- Cuentas por cobrar\.
- Pagos\.
- Configuración\.
- Usuarios\.
- Auditoría\.
- Conflictos\.

__Archivos__

- Fotografías\.
- Evidencias\.
- Comprobantes internos\.
- Documentos adjuntos\.

__Configuración técnica relevante__

- Variables/configuración necesaria para reconstruir el servicio\.
- Configuración de servidor\.
- Información de despliegue que corresponda\.

__3\. Qué NO se considera un backup suficiente__

No será suficiente:

Base PostgreSQL

\+

backup almacenado en el mismo disco del VPS

Si el disco falla, se pierde:

- Producción\.
- Backup\.

Por tanto:

Debe existir copia externa al servidor principal\.

__4\. Estrategia de respaldos__

Recomiendo trabajar con al menos tres niveles:

__Nivel 1 – Backup automático frecuente__

PostgreSQL\.

__Nivel 2 – Backup diario externo__

Base de datos \+ archivos relevantes\.

__Nivel 3 – Retención histórica__

Backups semanales/mensuales durante períodos mayores\.

La frecuencia exacta técnica se cerrará en la Etapa 4\.

__5\. PostgreSQL__

Para la primera versión podemos utilizar:

- Dumps automáticos\.
- Backups comprimidos\.
- Copia externa\.

Y preparar la arquitectura para una recuperación más avanzada si el volumen lo requiere\.

No necesitamos comenzar con una infraestructura empresarial excesivamente compleja\.

__6\. Frecuencia recomendada__

Como punto de partida técnico a validar:

- Backup diario completo\.
- Respaldos más frecuentes de PostgreSQL si es viable\.
- Copia externa automática diaria\.

Pero antes de fijarlo definitivamente debemos considerar cuánto dato estaría dispuesta la empresa a perder ante una caída grave\.

Esto nos lleva a dos conceptos\.

__7\. RPO__

__Recovery Point Objective__ responde:

¿Cuánta información máxima podemos perder?

Ejemplo:

RPO = 1 hora

significa que ante un desastre extremo podríamos perder como máximo aproximadamente una hora de operaciones\.

No fijaremos todavía el valor contractual, pero el diseño debe minimizar esta ventana\.

__8\. RTO__

__Recovery Time Objective__ responde:

¿Cuánto tiempo puede estar el sistema fuera de servicio antes de recuperarlo?

Ejemplo conceptual:

RTO = algunas horas

Tampoco fijaremos un número final hasta conocer las necesidades operativas\.

__9\. Importancia de la PWA durante una caída__

La PWA ayuda si:

- Internet local cae\.
- El VPS está temporalmente inaccesible\.

Los dispositivos previamente autorizados pueden seguir registrando ciertas operaciones\.

Pero:

La PWA no reemplaza al backup del servidor\.

IndexedDB solo contiene:

- Caché parcial\.
- Operaciones locales\.
- Información del dispositivo\.

No toda la base de datos corporativa\.

__10\. VPS fuera de servicio__

Escenario:

Servidor no responde

Las sucursales con PWA preparada podrán:

- Consultar datos almacenados\.
- Registrar ventas permitidas\.
- Registrar pagos provisionales\.
- Registrar conteos\.
- Registrar ciertas salidas\.

Las operaciones quedarán pendientes\.

Cuando el servidor se recupere:

Sincronizar

__11\. Operaciones que seguirán bloqueadas durante caída del servidor__

Por las políticas ya definidas:

- Ajustes oficiales\.
- Confirmación de transferencias críticas\.
- Reapertura de cierre\.
- Administración global\.
- Cambios de productos\.
- Cambios de precios mínimos\.
- Resolución de conflictos\.
- Confirmación de cierre\.

Esto evita decisiones críticas sin autoridad central\.

__12\. Operaciones locales pendientes y backup__

Existe un riesgo:

Una venta offline todavía no sincronizada está solamente en IndexedDB\.

Si el equipo se pierde antes de sincronizar:

Esa operación podría perderse\.

Por eso debemos reducir este riesgo mediante:

- Sincronización lo antes posible\.
- Indicador visible de pendientes\.
- No borrar datos con pendientes\.
- Procedimientos de cierre\.
- Uso de dispositivos operativos controlados\.

__13\. ¿Copiar IndexedDB al servidor?__

Cuando hay conexión, sí ocurre indirectamente porque las operaciones pendientes se sincronizan\.

No recomiendo crear un segundo mecanismo complejo de “backup de IndexedDB” en V1\.

La estrategia correcta es:

__Sincronización frecuente \+ persistencia local hasta confirmación\.__

__14\. Venta local antes de ser confirmada__

La PWA no debe eliminarla inmediatamente después de enviarla\.

Flujo:

PENDIENTE

↓

SINCRONIZANDO

↓

Servidor confirma

↓

Guardar respuesta oficial

↓

Marcar SINCRONIZADA

Solo entonces puede considerarse segura en PostgreSQL\.

__15\. Pérdida de dispositivo__

Escenario:

Caja Mazuko 01 fue robada

Administrador:

Revocar dispositivo

Debe verificarse además:

- Última sincronización\.
- Últimas operaciones confirmadas\.
- Si existían pendientes conocidos\.

__16\. El problema de pendientes desconocidos__

Si el equipo está totalmente perdido, el servidor no sabe con certeza si había operaciones no sincronizadas\.

Por eso el responsable de sucursal deberá:

- Revisar ventas físicas/comprobantes\.
- Revisar caja\.
- Comparar stock\.
- Regularizar mediante procedimientos autorizados si fuese necesario\.

Esta limitación es inherente a cualquier operación offline local\.

__17\. Pérdida de un dispositivo no significa pérdida de servidor__

Aunque el equipo desaparezca:

- Ventas ya sincronizadas permanecen\.
- Kardex permanece\.
- Clientes permanecen\.
- Inventario permanece\.

Solo están en riesgo las operaciones exclusivamente locales\.

__18\. Backups de archivos adjuntos__

Si guardamos:

- Fotos\.
- Comprobantes\.
- Evidencias\.

también deben incluirse en la política de respaldo\.

No sirve restaurar PostgreSQL si las referencias apuntan a archivos perdidos\.

__19\. Recomendación de almacenamiento__

Podemos empezar con almacenamiento en el VPS para archivos, pero:

Debe existir respaldo externo\.

En una etapa futura se podría usar object storage compatible con S3 si crece el volumen\.

No es requisito para V1\.

__20\. Backup externo__

El backup externo debe estar separado del VPS\.

Opciones técnicas posteriores:

- Object storage\.
- Otro servidor\.
- Almacenamiento administrado\.

La condición importante es:

Un fallo total del VPS no debe destruir también todas las copias\.

__21\. Cifrado de backups__

Los respaldos pueden contener:

- Datos comerciales\.
- Clientes\.
- Costos\.
- Usuarios\.

Por tanto, recomiendo cifrar las copias externas o usar almacenamiento que provea cifrado adecuado\.

Las claves no deben guardarse dentro del mismo backup de manera inútil\.

__22\. Acceso a backups__

Solo personal administrativo/técnico autorizado\.

Un vendedor o encargado normal no necesita:

Descargar backup PostgreSQL

Esto sería un riesgo de seguridad\.

__23\. Retención__

No debemos mantener únicamente:

backup\_actual\.zip

sobrescribiéndolo cada noche\.

Si hoy ocurre una corrupción que no detectamos hasta dentro de tres días, los tres últimos backups podrían contener el mismo problema\.

Necesitamos varias generaciones\.

__24\. Estrategia de retención sugerida__

Conceptualmente:

- Varios backups recientes diarios\.
- Algunos semanales\.
- Algunos mensuales\.

La cantidad exacta se definirá según:

- Espacio\.
- Costo\.
- Política administrativa\.

__25\. No guardar respaldos eternamente sin política__

Tampoco conviene conservar cada backup para siempre\.

Debe existir:

política de retención

para controlar:

- Espacio\.
- Privacidad\.
- Costos\.

__26\. Monitoreo del backup__

Un trabajo programado debe saber si:

backup = exitoso

o:

backup = fallido

El peor escenario sería creer que hay backups durante meses cuando el proceso dejó de funcionar\.

__27\. Alerta de backup fallido__

Debe existir una alerta administrativa:

El respaldo automático no se completó correctamente\.

Severidad alta o crítica según antigüedad\.

__28\. Último backup exitoso__

Dashboard administrativo/técnico puede mostrar:

Último respaldo exitoso:

06/08/2026 03:00

y:

Última prueba de restauración:

fecha

__29\. Probar restauraciones__

Regla importante:

__Un backup que nunca se ha restaurado es un backup no verificado\.__

Periódicamente debe hacerse una prueba en entorno separado:

Backup

↓

Restaurar

↓

Abrir aplicación/pruebas

↓

Validar información

__30\. Prueba de restauración__

Debe revisar una muestra:

- Usuarios\.
- Producto\.
- Stock\.
- Kardex\.
- Venta\.
- Pago\.
- Cierre\.
- Archivos adjuntos\.

No basta con que PostgreSQL diga que el archivo fue importado\.

__31\. Restauración nunca directamente “a ciegas” sobre producción__

Ante un problema, primero:

1. Identificar incidente\.
2. Detener escritura si corresponde\.
3. Preservar base afectada\.
4. Restaurar copia en entorno controlado\.
5. Validar\.
6. Decidir recuperación\.

Así evitamos destruir evidencia o empeorar el problema\.

__32\. Error humano__

Ejemplo:

Administrador ejecuta una acción equivocada\.

Dado nuestro diseño:

- Operaciones confirmadas son inmutables\.
- No se permiten eliminaciones directas\.
- Hay auditoría\.

Eso ya reduce muchísimo la necesidad de restaurar toda la base por un error individual\.

Normalmente se resuelve mediante:

- Reversión\.
- Ajuste\.
- Corrección\.

__33\. Cuándo sí restaurar toda la base__

Casos excepcionales:

- Corrupción grave\.
- Fallo del servidor\.
- Error técnico masivo\.
- Desastre durante despliegue\.
- Pérdida total del almacenamiento\.

No usar restauración total para corregir una venta mal registrada\.

__34\. Backup antes de despliegues importantes__

Antes de:

- Migraciones complejas\.
- Cambios estructurales\.
- Importaciones masivas\.
- Go\-live\.

Debe existir backup reciente verificable\.

__35\. Migraciones de Laravel__

Antes de modificar estructura productiva:

backup

↓

migración

↓

verificación

y la migración de esquema debe ser controlada\.

__36\. Rollback de aplicación vs rollback de datos__

Debemos diferenciar:

__Código__

Puede revertirse a una versión anterior\.

__Datos__

No siempre pueden revertirse simplemente, porque los usuarios podrían haber operado después del despliegue\.

Esto es importante para la estrategia de releases\.

__37\. Versiones del código__

Recomiendo que el despliegue use control de versiones\.

Cada release debe poder identificarse\.

Ejemplo conceptual:

release 1\.0\.4

Así, si surge un problema, sabemos exactamente qué versión está en producción\.

__38\. Auditoría de despliegues__

No necesita ser parte del módulo operativo del vendedor, pero debe existir registro técnico de:

- Versión desplegada\.
- Fecha\.
- Resultado\.
- Migraciones ejecutadas\.

__39\. Recuperación de base y operaciones offline posteriores__

Caso complejo:

1. Backup a las 12:00\.
2. Servidor falla a las 14:00\.
3. Se restaura a 12:00\.
4. Algunos dispositivos tienen operaciones pendientes 12:00–14:00\.

Después de recuperación:

Las PWA pueden ayudar a reenviar operaciones pendientes\.

Pero algunas operaciones que sí llegaron al servidor después de las 12:00 podrían haberse perdido en la restauración y el dispositivo creer que estaban sincronizadas\.

Por eso una restauración a un punto anterior requiere procedimiento especial de reconciliación\.

__40\. Reconciliación posterior a desastre__

Debemos revisar:

- Últimas operaciones por sucursal\.
- Documentos físicos\.
- Caja\.
- Dispositivos\.
- UUID de operaciones\.
- Kardex\.
- Transferencias\.

UUID/idempotencia ayudará a reinsertar operaciones sin duplicar las que sí existan\.

__41\. Recuperación punto en el tiempo__

Una infraestructura más avanzada podría permitir __Point\-in\-Time Recovery__ de PostgreSQL mediante WAL\.

Esto reduciría pérdida entre backups\.

Recomiendo dejarlo como evolución técnica si la criticidad/volumen lo justifica\.

No es imprescindible para arrancar, pero es una opción importante\.

__42\. Alta disponibilidad__

No considero necesario comenzar con:

- Cluster PostgreSQL\.
- Varios servidores activos\.
- Failover automático complejo\.

Para el tamaño inicial, un VPS adecuado \+ buenos backups \+ monitoreo \+ PWA puede ser una solución razonable\.

Podemos evolucionar si el negocio crece\.

__43\. Espacio de disco__

El sistema debe monitorear:

- Uso de PostgreSQL\.
- Archivos\.
- Logs\.
- Backups locales temporales\.

Si el disco llega al 100%, pueden fallar:

- Base\.
- Backups\.
- Aplicación\.

Debe existir alerta antes de llegar a ese punto\.

__44\. Logs__

Los logs de Laravel/Nginx deben rotarse\.

No queremos que:

laravel\.log

crezca indefinidamente hasta llenar el VPS\.

__45\. Redis__

Redis puede utilizarse para:

- Colas\.
- Cache\.
- Scheduler/locks según implementación\.

Pero:

Redis no será la fuente definitiva del inventario\.

Si Redis se pierde, el sistema debe poder reconstruir el estado crítico desde PostgreSQL\.

__46\. Colas fallidas__

Laravel debe registrar jobs fallidos\.

Ejemplo:

- Generación de alerta\.
- Exportación\.
- Procesamiento auxiliar\.

Las transacciones críticas de venta/inventario no deben depender de un job asíncrono para quedar consistentes\.

__47\. Operación crítica síncrona__

Cuando se confirma una venta:

Debe quedar confirmado dentro de la transacción:

- Venta\.
- Stock\.
- Lotes\.
- Kardex\.
- CxC esencial\.

No:

guardar venta

→ poner “actualizar inventario” en cola para después

Eso sería riesgoso\.

__48\. Procesos que sí pueden ir a cola__

Ejemplos:

- Generar un PDF\.
- Enviar notificación\.
- Generar ciertas alertas\.
- Exportación grande\.
- Procesos de mantenimiento\.

Si fallan, no rompen el inventario oficial\.

__49\. Mantenimiento programado__

Si necesitamos detener el sistema:

La interfaz debe mostrar:

Sistema temporalmente en mantenimiento\.

La PWA puede continuar ciertas operaciones locales si ya estaba cargada/autorizada, dependiendo del caso\.

Pero debemos evitar que el usuario piense que está online cuando el servidor está intencionalmente detenido\.

__50\. Modo degradado__

Podemos distinguir:

- Online normal\.
- Offline por conectividad\.
- Servidor en mantenimiento\.
- Servidor con error\.

Desde el punto de vista PWA algunas funciones son similares, pero el mensaje al usuario debe ser claro\.

__51\. Recuperación de IndexedDB corrupta__

Si la caché de un dispositivo se daña:

Primero revisar:

¿hay operaciones pendientes?

Si no hay:

- Limpiar\.
- Descargar nuevamente datos\.

Si hay operaciones pendientes:

No borrar antes de intentar recuperar/exportar/sincronizar esas operaciones\.

__52\. Botón “restablecer datos locales”__

Debe ser administrativo/técnico y protegido\.

No debe hacer:

IndexedDB\.clear\(\)

sin comprobar pendientes\.

__53\. Re\-sincronización completa__

Proceso:

Verificar cola = vacía

↓

Borrar/recrear caché no crítica

↓

Descargar catálogo

↓

Inventario

↓

Lotes

↓

Clientes necesarios

↓

Configuraciones

__54\. Cambio de equipo__

Si una sucursal reemplaza una PC:

1. Sincronizar equipo anterior\.
2. Verificar pendientes = 0\.
3. Revocar equipo anterior si deja de usarse\.
4. Autorizar nuevo equipo\.
5. Descargar caché inicial\.

__55\. Recuperación de contraseña__

Esto no debe afectar información local de manera destructiva automáticamente\.

Pero si se revoca la sesión por seguridad, el dispositivo puede requerir nueva validación online antes de seguir operando\.

__56\. Backups y datos personales__

Si un cliente solicita corrección de datos, no significa que tengamos que modificar cada backup histórico manualmente\.

Los backups son copias de recuperación, no bases activas\.

La política técnica/legal de retención podrá definirse según normativa aplicable\.

__57\. Documentación del procedimiento__

Debe existir un documento operativo para casos como:

__Caso A__

Internet de sucursal caído\.

__Caso B__

VPS caído\.

__Caso C__

Dispositivo perdido\.

__Caso D__

Backup falló\.

__Caso E__

Restauración necesaria\.

Así no dependemos de improvisación\.

__58\. Caída de internet de una sola sucursal__

Procedimiento:

PWA entra offline

↓

Continuar operaciones permitidas

↓

Revisar indicador de pendientes

↓

Cuando vuelva conexión

↓

Sincronizar

↓

Resolver conflictos

↓

Cerrar día

__59\. Caída general del servidor__

Procedimiento conceptual:

1. Confirmar incidente\.
2. No intentar operaciones administrativas sensibles\.
3. Sucursales usan PWA limitada\.
4. Técnico recupera servicio\.
5. Verificar PostgreSQL\.
6. Revisar colas\.
7. Habilitar sincronización\.
8. Resolver conflictos\.
9. Verificar cierres\.

__60\. Corrupción o pérdida de base__

Procedimiento:

1. Detener aplicación\.
2. Preservar estado afectado\.
3. Localizar backup válido\.
4. Restaurar en entorno separado\.
5. Validar\.
6. Restaurar producción\.
7. Reconciliar período perdido\.
8. Reabrir operación\.
9. Auditar incidente\.

__61\. Después de una restauración__

Debemos ejecutar verificaciones:

Kardex = inventario

Inventario = lotes

además de:

- Últimos cierres\.
- Transferencias en tránsito\.
- Cuentas por cobrar\.
- Pagos\.
- Secuencias\.

__62\. Correlativos después de restore__

PostgreSQL debe conservar correctamente:

- Secuencias\.
- Numeraciones\.
- IDs\.

La validación de restauración debe comprobar que el siguiente correlativo no produzca duplicados\.

UUID proporciona una segunda capa de seguridad\.

__63\. Backups de migración inicial__

Los archivos usados en el go\-live deben conservarse especialmente:

- Excel originales\.
- Archivo maestro\.
- Reporte de errores\.
- Migración aprobada\.
- Backup PostgreSQL inmediatamente posterior\.

Esto crea una línea base\.

__64\. Responsabilidad administrativa__

El administrador funcional puede ver:

- Estado del último backup\.
- Alertas\.

Pero la ejecución técnica de restauraciones debería estar limitada a personal técnico autorizado\.

No recomiendo un botón dentro del sistema:

Restaurar base de datos

para el administrador comercial\.

__65\. Por qué no permitir restauración desde la UI__

Una restauración puede:

- Destruir operaciones recientes\.
- Generar inconsistencias\.
- Necesitar mantenimiento\.
- Requerir reconciliación\.

Debe ser un procedimiento técnico controlado\.

__66\. Auditoría de restauraciones__

Debe documentarse:

- Motivo\.
- Backup utilizado\.
- Punto de restauración\.
- Responsable técnico\.
- Fecha\.
- Resultado\.
- Reconciliaciones posteriores\.

__67\. Alertas de infraestructura__

Como mínimo será conveniente monitorear:

- VPS no disponible\.
- Disco alto\.
- Backup fallido\.
- Base no disponible\.
- Cola con fallos repetidos\.
- Certificado HTTPS cercano a problema, si no se renueva automáticamente\.

Esto es monitoreo técnico, distinto a las alertas comerciales\.

__68\. HTTPS__

La aplicación solo deberá operar normalmente mediante HTTPS\.

Esto protege:

- Credenciales\.
- Tokens\.
- Datos comerciales\.

La renovación del certificado debe automatizarse cuando sea posible\.

__69\. Backups y pruebas no deben afectar producción__

Las restauraciones de prueba se harán en entorno separado\.

No utilizar la base de producción como laboratorio\.

__70\. Entorno mínimo recomendado__

Conceptualmente:

PRODUCCIÓN

\+

ENTORNO DE PRUEBA/STAGING

No necesariamente otro VPS de igual potencia permanentemente, pero sí un lugar para validar:

- Migraciones\.
- Restauraciones\.
- Nuevas versiones\.

__71\. Datos reales en staging__

Si se copian datos reales para pruebas, deben tratarse con cuidado\.

Idealmente:

- Acceso restringido\.
- O anonimización si corresponde\.

No debemos distribuir una copia de clientes/costos innecesariamente\.

__72\. Plan ante corrupción de una sola operación__

No restauramos backup\.

Usamos:

- Reversión\.
- Ajuste\.
- Auditoría\.

La arquitectura funcional que ya diseñamos hace que los backups sean último recurso, no herramienta cotidiana\.

__73\. Plan ante borrado accidental de archivo adjunto__

Si existe backup de archivos:

- Restaurar archivo\.
- Mantener relación en DB\.

Si no puede recuperarse:

- Marcar evidencia como no disponible\.
- No romper la operación principal\.

__74\. Integridad de archivos__

Podemos guardar metadatos como:

- Nombre\.
- Tamaño\.
- Tipo MIME\.
- Hash opcional\.

Esto ayuda a verificar archivos en restauraciones\.

No es obligatorio para todos desde V1, pero recomendable\.

__75\. Crecimiento futuro__

Si el sistema crece podremos evolucionar hacia:

- Object storage\.
- PostgreSQL gestionado\.
- PITR\.
- Réplica\.
- Servidor secundario\.
- CDN para archivos\.

El diseño actual no debe impedirlo\.

__76\. Reglas funcionales definitivas del Proceso 20__

1. PostgreSQL debe respaldarse automáticamente\.
2. Los archivos adjuntos también deben respaldarse\.
3. Debe existir copia externa al VPS\.
4. No se conservará una sola versión sobrescrita\.
5. Debe existir política de retención\.
6. Los backups fallidos generan alerta\.
7. Debe conocerse la fecha del último backup exitoso\.
8. Los backups deben probarse mediante restauración\.
9. Las restauraciones se validan fuera de producción primero\.
10. Las restauraciones completas son último recurso\.
11. Errores operativos normales se corrigen mediante reversión/ajuste\.
12. La PWA ayuda en caídas temporales, pero no sustituye al backup\.
13. Las operaciones offline siguen localmente hasta sincronizar\.
14. Una operación local no está protegida por PostgreSQL hasta sincronizar\.
15. Los dispositivos perdidos deben revocarse\.
16. Pendientes desconocidos de un dispositivo perdido requieren reconciliación\.
17. Las operaciones críticas de inventario no dependerán de colas asíncronas\.
18. Procesos secundarios sí pueden utilizar colas\.
19. Los logs deben rotarse\.
20. El uso de disco debe monitorizarse\.
21. Redis no será fuente oficial\.
22. Antes de despliegues importantes debe existir backup reciente\.
23. El código debe estar versionado\.
24. Después de restaurar se valida Kardex, inventario y lotes\.
25. Los correlativos deben verificarse tras recuperación\.
26. La migración inicial tendrá respaldo especial\.
27. Restaurar base no será una acción disponible al usuario comercial\.
28. Toda restauración importante se documenta\.
29. HTTPS será obligatorio\.
30. Debe existir procedimiento operativo de continuidad\.
31. La arquitectura podrá evolucionar hacia PITR/alta disponibilidad si el negocio lo requiere\.
32. Ningún fallo individual de dispositivo debe destruir información ya sincronizada\.

__77\. Criterios de aceptación del Proceso 20__

Consideraremos aprobado este proceso cuando:

- Exista backup automático de PostgreSQL\.
- Exista al menos una copia externa\.
- Los adjuntos importantes estén cubiertos por respaldo\.
- El sistema pueda detectar un backup fallido\.
- Se pueda restaurar una copia en un entorno de prueba\.
- Una restauración mantenga productos, Kardex, inventario, lotes, ventas y pagos\.
- Una venta ya sincronizada sobreviva a la pérdida del dispositivo\.
- Una venta offline permanezca localmente durante una caída\.
- La aplicación no permita borrar datos locales con pendientes sin advertencia/control\.
- Un dispositivo perdido pueda revocarse\.
- Un despliegue tenga estrategia previa de backup\.
- Después de una recuperación puedan ejecutarse verificaciones de consistencia\.
- Los backups no estén únicamente en el mismo VPS\.

__Resultado del Proceso 20__

Queda funcionalmente definido:

__El sistema utilizará respaldos automáticos de PostgreSQL y archivos, con copias externas, retención histórica, monitoreo y pruebas periódicas de restauración\. La PWA permitirá continuidad limitada ante interrupciones, mientras que las restauraciones de datos quedarán reservadas a incidentes técnicos graves y serán seguidas por procesos de reconciliación y validación de integridad\.__

Con este proceso ya tenemos cubiertos __datos, operación offline, seguridad funcional y continuidad del sistema__\.

El siguiente paso recomendable es el __Proceso 21: Pruebas, validación y puesta en producción__, donde definiremos cómo vamos a comprobar todos estos procesos antes del arranque: pruebas unitarias/funcionales, escenarios de stock y costo, PWA, concurrencia, migración de ensayo, pruebas por rol, aceptación de usuarios, sucursal piloto y criterios exactos de go\-live\.

Perfecto\. Continuamos con la __Etapa 3 – Diseño funcional__\.

__Proceso 21: Pruebas, validación y puesta en producción__

Este proceso define cómo comprobaremos que todo lo diseñado funciona correctamente antes de que las sucursales abandonen el Excel y comiencen a operar oficialmente en el nuevo sistema\.

Se relaciona con absolutamente todos los módulos:

- Catálogo\.
- Inventario\.
- Lotes\.
- Kardex\.
- Compras\.
- Ventas\.
- Salidas\.
- Transferencias\.
- Kits\.
- Clientes\.
- Cuentas por cobrar\.
- Pagos\.
- Cierres\.
- PWA/offline\.
- Conflictos\.
- Usuarios y permisos\.
- Migración\.
- Respaldos\.

La regla central será:

__No se pondrá el sistema en producción únicamente porque “la pantalla funciona”\. Debemos demostrar que cantidades, costos, lotes, permisos, sincronización y cierres permanecen consistentes bajo escenarios normales y excepcionales\.__

__1\. Objetivo funcional__

Antes del go\-live debemos demostrar que el sistema:

- Calcula correctamente\.
- No genera stock negativo\.
- No duplica operaciones\.
- Respeta permisos\.
- Mantiene Kardex, inventario y lotes iguales\.
- Funciona con varias sucursales\.
- Funciona offline\.
- Recupera sincronización\.
- Detecta conflictos\.
- Puede cerrar correctamente\.
- Puede recuperarse de errores\.
- Puede importar datos reales sin inconsistencias\.

__2\. Niveles de prueba__

Propongo cinco niveles principales:

1. __Pruebas unitarias__
2. __Pruebas de integración__
3. __Pruebas funcionales__
4. __Pruebas de aceptación de usuario__
5. __Pruebas de puesta en producción__

No dependeremos únicamente de pruebas manuales\.

__3\. Pruebas unitarias__

Validarán reglas pequeñas y determinísticas\.

Ejemplos:

calcular promedio ponderado

calcular saldo de deuda

calcular cantidad armable de kit

validar precio mínimo

calcular stock disponible

determinar deuda vencida

Ejemplo de promedio:

Stock inicial:

10 × 100 = 1,000

Entrada:

5 × 130 = 650

Resultado esperado:

15 unidades

Valor = 1,650

Promedio = 110

La prueba debe verificar exactamente esos valores\.

__4\. Pruebas de salidas__

Ejemplo:

Stock: 15

Promedio: 110

Venta: 4

Esperado:

Stock: 11

Costo salida: 440

Promedio posterior: 110

Debe comprobarse que la salida no recalcula el promedio\.

__5\. Pruebas de precisión decimal__

Necesitamos escenarios con valores no exactos\.

Ejemplo:

3 × 100

\+

2 × 101

para verificar:

- Precisión interna\.
- Redondeo\.
- Valor final\.
- Ausencia de errores acumulativos por float\.

Estas pruebas serán especialmente importantes para Kardex\.

__6\. Pruebas de inventario y lotes__

Después de cada escenario deberá cumplirse:

Inventario físico

=

Suma de lotes físicos

y:

Inventario contable

=

Último saldo Kardex

Si una prueba rompe cualquiera de estas igualdades, debe considerarse fallo crítico\.

__7\. Prueba PEPS__

Ejemplo:

Lote A: 3

Lote B: 5

Lote C: 4

Venta:

6

Esperado:

A → 3

B → 3

Quedan:

B → 2

C → 4

El costo oficial de salida seguirá utilizando el promedio ponderado, no el costo individual de A y B\.

__8\. Cambio manual de lote__

Prueba:

- Sistema recomienda A\.
- Usuario autorizado cambia a B\.
- Motivo obligatorio\.

Validar que:

- Stock sea correcto\.
- Kardex sea correcto\.
- Auditoría conserve lote sugerido y utilizado\.

__9\. Pruebas de stock negativo__

Escenario:

Disponible = 3

Venta = 4

Debe fallar\.

También probar:

- Venta\.
- Uso interno\.
- Transferencia\.
- Armado de kit\.
- Ajuste negativo\.

Ningún flujo debe permitir saldo negativo\.

__10\. Prueba de concurrencia__

Esta es crítica\.

Ejemplo:

Stock disponible: 1

Dos vendedores confirman simultáneamente:

Venta A → 1

Venta B → 1

Resultado correcto:

Una se confirma

Una falla/conflicto

Stock final = 0

Nunca:

Stock final = \-1

__11\. Pruebas de idempotencia__

Enviar exactamente la misma venta dos veces con el mismo UUID\.

Esperado:

1 venta

1 Kardex

1 descuento de stock

La segunda petición devuelve la operación existente\.

Esto debe probarse también con:

- Pagos\.
- Salidas\.
- Sincronización\.
- Importación\.

__12\. Pruebas de compras y entradas__

Escenarios mínimos:

- Compra normal\.
- Compra con stock cero\.
- Compra con stock existente\.
- Entrada con costo diferente\.
- Entrada con dos productos\.
- Documento duplicado\.
- Ajuste positivo\.
- Devolución de cliente\.
- Entrada de transferencia\.

Validar:

- Stock\.
- Lote\.
- Promedio\.
- Kardex\.
- Documento\.

__13\. Compra duplicada__

Registrar:

Proveedor X

Factura F001\-100

dos veces\.

El sistema debe detectar la posible duplicidad según la regla definida\.

__14\. Pruebas de venta__

Como mínimo:

- Venta simple al contado\.
- Venta al crédito\.
- Pago inicial\.
- Venta con varios productos\.
- Venta con descuento válido\.
- Venta bajo mínimo\.
- Venta sin stock\.
- Venta a CLIENTE VARIOS\.
- Crédito con CLIENTE VARIOS\.
- Venta anulada\.
- Devolución parcial\.

__15\. Precio mínimo__

Ejemplo:

Sugerido: 200

Mínimo: 180

Casos:

190 → permitido

180 → permitido

179 → autorización

Vendedor sin autorización no debe confirmar la última\.

__16\. Crédito con cliente genérico__

Debe comprobarse que:

CLIENTE VARIOS \+ contado

sea válido\.

Pero:

CLIENTE VARIOS \+ crédito

sea bloqueado\.

__17\. Pruebas de cuentas por cobrar__

Escenario:

Venta: 1,500

Pago inicial: 500

Esperado:

Saldo: 1,000

Estado: PARCIAL

Después:

Pago 600

Esperado:

Saldo: 400

Después:

Pago 400

Esperado:

Saldo: 0

PAGADA

__18\. Pago superior__

Saldo: 400

Pago: 401

Debe bloquearse\.

__19\. Vencimiento__

Crear deuda:

Vencimiento: ayer

Saldo > 0

Esperado:

VENCIDA

Si saldo pasa a cero:

PAGADA

aunque su fecha de vencimiento ya haya pasado\.

__20\. Pago entre sucursales__

Venta originada en Juliaca\.

Pago registrado en Mazuko\.

Validar:

- Saldo central disminuye\.
- Venta sigue perteneciendo a Juliaca\.
- Cobro aparece en cierre de Mazuko\.
- No aparece como venta de Mazuko\.

__21\. Pruebas de transferencias__

Mínimo:

- Solicitud\.
- Aprobación parcial\.
- Reserva\.
- Preparación\.
- Envío\.
- Tránsito\.
- Recepción completa\.
- Recepción parcial\.
- Faltante\.
- Sobrante\.
- Producto dañado\.
- Cancelación antes de envío\.

__22\. Prueba de reserva__

Origen:

Físico = 10

Disponible = 10

Transferencia aprobada:

4

Esperado:

Físico = 10

Reservado = 4

Disponible = 6

Después del envío:

Físico origen = 6

En tránsito = 4

__23\. Prueba de recepción__

Destino tenía:

5 × costo promedio 130

Recibe:

5 × costo transferencia 110

Esperado:

Stock = 10

Promedio = 120

Debe coincidir exactamente con la política definida\.

__24\. Prueba consolidada de tránsito__

Durante transferencia:

Origen \+ destino \+ tránsito

debe conservar el total empresarial\.

La mercadería no debe:

- Desaparecer\.
- Duplicarse\.

__25\. Pruebas de kits__

Necesitamos separar:

__KIT\_UNICO__

- Compra\.
- Venta\.
- Transferencia\.
- Devolución\.

__KIT\_COMPONENTES__

- Disponibilidad armable\.
- Venta\.
- Componentes insuficientes\.
- PEPS individual\.
- Costo\.
- Composición versionada\.
- Armado anticipado\.

__26\. Cálculo de kits armables__

Composición:

2 A

1 B

4 C

Disponibles:

A=10

B=3

C=20

Resultado esperado:

3 kits

Debe comprobarse que esos tres no se sumen al inventario físico\.

__27\. Venta de kit compuesto__

Venta de dos kits debe consumir exactamente:

A=4

B=2

C=8

y generar Kardex solo para los productos físicos correspondientes si se arma al vender\.

__28\. Versionado de kit__

Crear venta usando versión 1\.

Después crear versión 2\.

Consultar la venta anterior\.

Debe seguir mostrando versión 1 y sus componentes originales\.

__29\. Armado anticipado__

Prueba:

Componentes consumidos valor = 900

Mano de obra = 100

Cantidad kits = 5

Esperado:

Entrada kit total = 1,000

Costo unitario = 200

Y ningún componente debe descontarse nuevamente al vender el kit terminado\.

__30\. Pruebas de devoluciones y reversiones__

Como mínimo:

- Venta no pagada anulada\.
- Venta pagada parcialmente\.
- Devolución parcial\.
- Devolución dañada\.
- Salida anulada\.
- Pago anulado\.
- Reembolso\.
- Entrada no consumida revertida\.
- Entrada parcialmente consumida\.

__31\. Entrada parcialmente consumida__

Entrada:

10

Salieron:

7

Intentar anular entrada completa\.

Esperado:

Bloqueado\.

No puede convertir el stock en inconsistente\.

__32\. Devolución dañada__

Venta de 1 unidad\.

Cliente devuelve dañada\.

Esperado:

Físico \+1

Dañado \+1

Disponible \+0

y Kardex/valor según la política establecida\.

__33\. Pruebas de permisos__

Debemos probar la API directamente, no solo la interfaz\.

Ejemplos:

__Vendedor intenta:__

- Ver costo\.
- Ajustar inventario\.
- Reabrir cierre\.
- Modificar producto\.

Resultado:

DENEGADO

Aunque manipule manualmente la petición\.

__34\. Pruebas de aislamiento por sucursal__

Encargado Mazuko intenta consultar/modificar una operación de Juliaca sin permiso\.

Resultado:

DENEGADO

Esto debe probarse para:

- Inventario\.
- Ventas\.
- Entradas\.
- Pagos\.
- Cierres\.
- Conflictos\.

__35\. Pruebas de PWA__

Escenarios mínimos:

1. Abrir online\.
2. Sincronizar datos\.
3. Cortar internet\.
4. Buscar producto\.
5. Crear cliente\.
6. Crear venta\.
7. Registrar pago\.
8. Cerrar navegador\.
9. Volver a abrir\.
10. Ver que continúan pendientes\.
11. Recuperar internet\.
12. Sincronizar\.

__36\. Persistencia offline__

Una venta pendiente debe sobrevivir:

- Recarga\.
- Cierre de pestaña\.
- Reinicio del navegador\.
- Reinicio del equipo, dentro de las capacidades normales de IndexedDB\.

__37\. Prueba de stock estimado__

Servidor conocido:

10

Ventas locales:

\-3

\-2

La PWA debe mostrar:

Estimado = 5

y no permitir venta local superior a cinco\.

__38\. Prueba de conflicto de stock__

PWA cree:

5 disponibles

Otro dispositivo consume tres\.

Offline vende cinco\.

Al sincronizar:

Servidor disponible = 2

Esperado:

CONFLICTO\_STOCK\_INSUFICIENTE

Sin afectar stock oficial\.

__39\. Reasignación automática de lotes__

PWA usó lote A\.

Servidor ya consumió A, pero lote B tiene suficiente cantidad\.

Esperado:

- Venta confirmada\.
- Lote B oficial\.
- Auditoría de reasignación\.
- Sin conflicto manual\.

__40\. Conflicto de pago offline__

Saldo cacheado:

500

Otro local cobra 400\.

Dispositivo offline cobra 300\.

Al sincronizar:

Saldo oficial = 100

Esperado:

CONFLICTO\_PAGO\_SUPERA\_SALDO

No aplicar solo S/100\.

__41\. Dependencias offline__

Crear offline:

Cliente C1

Venta V1

Pago P1

Prueba 1: todo válido\.

Debe procesarse:

C1 → V1 → P1

Prueba 2: V1 falla\.

Esperado:

P1 no se confirma

__42\. Prueba de UUID duplicado offline__

Simular timeout después de que servidor confirmó, pero antes de que PWA reciba respuesta\.

PWA vuelve a enviar\.

Esperado:

El servidor reconoce UUID y devuelve la venta ya existente\.

Este escenario es crítico\.

__43\. Pruebas de cierre diario__

Mínimo:

- Día normal\.
- Diferencia de efectivo\.
- Venta offline pendiente\.
- Pago offline pendiente\.
- Conflicto\.
- Transferencia en tránsito\.
- Recepción parcial válida\.
- Kardex inconsistente\.
- Conteo con diferencia\.
- Reapertura\.

__44\. Transferencia en tránsito y cierre__

Debe comprobarse que:

EN\_TRANSITO válido

no bloquee el cierre\.

Mientras:

CONFLICTO de transferencia

sí puede bloquear según la situación\.

__45\. Operación pendiente y cierre__

Si existe:

Venta local pendiente

el cierre debe ser bloqueado\.

No basta con mostrar una advertencia\.

__46\. Reapertura__

Prueba:

- Encargado intenta reabrir → denegado\.
- Admin reabre con motivo → permitido\.
- Se conserva versión anterior\.
- Se vuelve a cerrar → nueva versión\.

__47\. Pruebas de auditoría__

Validar que acciones críticas generen eventos:

- Precio cambiado\.
- Lote PEPS cambiado\.
- Ajuste\.
- Pérdida\.
- Venta anulada\.
- Pago anulado\.
- Cierre reabierto\.
- Conflicto resuelto\.
- Dispositivo revocado\.

__48\. Pruebas de reportes__

Los reportes deben comprobarse contra datos conocidos\.

Ejemplo:

Crear un escenario controlado con:

Ventas: 1,000

Costo: 700

Devoluciones: 100

y verificar exactamente qué muestra:

- Venta neta\.
- Costo correspondiente\.
- Utilidad bruta\.

No aprobar un reporte simplemente porque “se ve bien”\.

__49\. Exportación a Excel__

Probar:

- Referencias numéricas con ceros iniciales\.
- Fechas\.
- Cantidades\.
- Decimales\.
- Costos\.
- Filtros\.

Ejemplo:

00125

debe seguir siendo:

00125

y no convertirse en 125\.

__50\. Pruebas de migración__

Antes del go\-live:

- Importar archivo de ensayo\.
- Detectar duplicados\.
- Detectar costos inválidos\.
- Detectar negativos\.
- Reimportar mismo batch\.
- Verificar idempotencia\.
- Validar lotes iniciales\.
- Validar Kardex inicial\.

__51\. Cuadre de migración__

Para cada producto/sucursal:

Conteo aprobado

=

Inventario importado

=

Suma lotes

=

Saldo Kardex

Debe ser una validación automática y no solo manual\.

__52\. Pruebas de backup y restauración__

Antes de producción se debe realizar al menos una restauración real de ensayo\.

Validar:

- PostgreSQL arranca\.
- Usuarios existen\.
- Inventarios cuadran\.
- Ventas existen\.
- Pagos existen\.
- Auditoría existe\.
- Archivos se recuperan\.

__53\. Pruebas de rendimiento__

No necesitamos una plataforma de millones de usuarios, pero sí debemos probar escenarios realistas\.

Ejemplos:

- Catálogo de miles de productos\.
- Kardex acumulado\.
- Búsquedas\.
- Reportes\.
- Varias sucursales\.
- Ventas concurrentes\.

La experiencia no debe degradarse por cargar el catálogo completo en cada pantalla\.

__54\. Prueba de búsqueda__

Con miles de referencias:

Buscar por:

- Referencia exacta\.
- Referencia parcial\.
- Nombre\.
- Marca\.
- Alias\.

Debe responder con rapidez razonable\.

__55\. Prueba de carga del Kardex__

Especialmente un producto con muchos movimientos\.

Debemos usar:

- Paginación\.
- Índices\.
- Filtros\.

No descargar toda la historia siempre\.

__56\. Pruebas de seguridad__

Mínimo:

- Usuario sin autenticar\.
- Usuario inactivo\.
- Usuario bloqueado\.
- Sesión revocada\.
- Dispositivo revocado\.
- Cambio de sucursal manipulado\.
- Permiso manipulado desde frontend\.
- Doble envío\.

Además de las pruebas técnicas de seguridad que se definan en Etapa 4\.

__57\. Datos de prueba__

No recomiendo probar todo únicamente con datos ficticios simples como:

Producto A

Producto B

Debemos incorporar una copia controlada de datos representativos del negocio:

- Referencias numéricas\.
- Alfanuméricas\.
- Con puntos\.
- Guiones\.
- Productos sin stock\.
- Costos variados\.
- Kits\.

Eso descubrirá problemas que datos demasiado limpios no muestran\.

__58\. Ambiente de pruebas__

Debemos tener separado:

STAGING / PRUEBAS

de:

PRODUCCIÓN

Las pruebas destructivas no se ejecutan sobre información real en producción\.

__59\. UAT — aceptación por usuarios__

Una vez superadas las pruebas técnicas, usuarios reales deben ejecutar escenarios\.

Participantes recomendados:

- Administrador\.
- Encargado\.
- Almacenero\.
- Vendedor\.

Cada uno prueba su flujo habitual\.

__60\. Guion de aceptación para vendedor__

Ejemplo:

1. Iniciar sesión\.
2. Buscar cliente\.
3. Crear cliente\.
4. Buscar producto\.
5. Consultar stock\.
6. Crear venta\.
7. Aplicar precio permitido\.
8. Registrar pago\.
9. Trabajar offline\.
10. Sincronizar\.

__61\. Guion del almacenero__

1. Buscar producto\.
2. Consultar lotes\.
3. Registrar conteo\.
4. Preparar transferencia\.
5. Cambiar lote con motivo\.
6. Reportar daño\.
7. Consultar ubicación\.

__62\. Guion del encargado__

1. Confirmar entrada\.
2. Aprobar transferencia\.
3. Revisar diferencia\.
4. Confirmar ajuste\.
5. Revisar CxC\.
6. Resolver conflicto simple\.
7. Preparar y confirmar cierre\.

__63\. Guion del administrador__

1. Crear usuario\.
2. Asignar sucursal\.
3. Cambiar permiso\.
4. Consultar consolidado\.
5. Autorizar precio excepcional\.
6. Resolver conflicto crítico\.
7. Reabrir cierre\.
8. Consultar auditoría\.
9. Revisar dispositivos\.

__64\. Registro de incidencias de UAT__

Cada problema encontrado tendrá:

- Código\.
- Módulo\.
- Descripción\.
- Severidad\.
- Pasos para reproducir\.
- Resultado esperado\.
- Resultado real\.
- Estado\.

No se resolverá mediante mensajes dispersos únicamente\.

__65\. Severidad de defectos__

Propongo:

__Crítico__

- Pierde datos\.
- Duplica inventario\.
- Permite negativo\.
- Rompe Kardex\.
- Falla sincronización esencial\.
- Brecha de permisos importante\.

__Alto__

- Bloquea flujo principal\.
- Cálculo incorrecto significativo\.

__Medio__

- Funciona con alternativa\.
- Problema de usabilidad relevante\.

__Bajo__

- Texto\.
- Diseño\.
- Mejora menor\.

__66\. Condición para go\-live__

No debe existir ningún defecto __crítico__ abierto\.

Los defectos altos deben estar resueltos salvo decisión administrativa explícita y con alternativa segura\.

Problemas cosméticos no necesariamente bloquean\.

__67\. Piloto__

Como ya mencionamos en migración, un piloto puede ser muy útil\.

Pero debe evaluarse considerando transferencias entre sucursales\.

Si hacemos piloto:

- Corto\.
- Controlado\.
- Con reglas claras\.
- Sin mantener doble registro indefinidamente\.

__68\. Qué validar durante piloto__

Especialmente:

- Velocidad real de ventas\.
- Calidad de búsqueda\.
- Uso de PWA\.
- Cortes de internet\.
- Impresión/exportación\.
- Capacitación\.
- Cierre diario\.
- Diferencias de stock\.
- Flujo de soporte\.

__69\. Prueba de operación real offline__

No basta con activar “modo offline” del navegador unos segundos\.

Debemos hacer un ensayo real:

Sucursal sin acceso al servidor

durante un período controlado

Registrar varias operaciones y luego sincronizarlas\.

__70\. Capacitación antes del go\-live__

Debe enfocarse por rol\.

No todos necesitan aprender administración completa\.

__Vendedor__

Ventas, clientes, pagos, offline\.

__Almacén__

Inventario, lotes, transferencias, conteos\.

__Encargado__

Aprobaciones, conflictos, cierre\.

__Admin__

Configuraciones, permisos, auditoría, reportes\.

__71\. Capacitación sobre estados offline__

Especialmente enseñar la diferencia entre:

SINCRONIZADA

PENDIENTE

CONFLICTO

Esto será fundamental para que el usuario no asuma que toda venta local ya fue aceptada centralmente\.

__72\. Manual operativo__

Antes del arranque debe existir al menos documentación breve sobre:

- Venta\.
- Entrada\.
- Transferencia\.
- Pago\.
- Cierre\.
- Offline\.
- Conflictos\.
- Qué hacer si no hay internet\.

No necesitamos un manual de cientos de páginas inicialmente\.

__73\. Checklist de go\-live__

Antes de abrir producción:

- Base productiva preparada\.
- SSL funcionando\.
- Backups funcionando\.
- Restauración probada\.
- Usuarios cargados\.
- Roles revisados\.
- Sucursales configuradas\.
- Dispositivos autorizados\.
- Catálogo importado\.
- Inventario inicial cuadrado\.
- Costos aprobados\.
- Métodos de pago configurados\.
- PWA instalada/cargada\.
- UAT aprobado\.
- Capacitación realizada\.
- Plan de soporte preparado\.

__74\. Prueba de humo final__

Después de la migración productiva pero antes de comenzar ventas reales:

1. Iniciar sesión\.
2. Buscar producto\.
3. Ver stock\.
4. Ver lote\.
5. Consultar cliente\.
6. Ver configuración\.
7. Confirmar que cierres previos no existen incorrectamente\.
8. Verificar sincronización\.

Sin generar movimientos comerciales reales innecesarios\.

__75\. Venta de prueba en producción__

Si se necesita probar una operación real en producción, deberá estar claramente controlada y luego revertida correctamente\.

Preferir hacer toda la validación transaccional en staging\.

__76\. Soporte de arranque__

Durante los primeros días es recomendable tener seguimiento más cercano de:

- Conflictos\.
- Sincronización\.
- Diferencias\.
- Preguntas de usuario\.
- Rendimiento\.
- Errores\.

Esto no significa cambiar reglas improvisadamente; los incidentes deben registrarse y priorizarse\.

__77\. Monitoreo inicial__

Dashboard administrativo/técnico debe vigilar:

- Errores\.
- Backups\.
- Espacio\.
- Colas\.
- Conflictos\.
- Dispositivos no sincronizados\.
- Sucursales sin cerrar\.

__78\. Excel después del go\-live__

Los Excel originales quedan como respaldo histórico\.

No deben continuar como sistema paralelo de operación\.

Puede exportarse información desde el nuevo sistema a Excel cuando sea necesario\.

__79\. Criterio de éxito del arranque__

No será solamente:

“La aplicación está disponible”\.

Debe cumplirse:

Usuarios pueden operar

\+

Inventario cuadra

\+

Kardex cuadra

\+

PWA sincroniza

\+

cierres funcionan

\+

backups funcionan

__80\. Reglas funcionales definitivas del Proceso 21__

1. Habrá pruebas unitarias, integración, funcionales y UAT\.
2. Las reglas financieras e inventario deben probarse automáticamente\.
3. Kardex, inventario y lotes deben comprobarse en los escenarios\.
4. Se probará concurrencia\.
5. Se probará idempotencia\.
6. Ninguna prueba debe aceptar stock negativo\.
7. Se probarán compras, ventas, salidas y transferencias\.
8. Se probarán ambos modelos de kits\.
9. Se probarán devoluciones y reversiones\.
10. Se probarán permisos directamente contra backend\.
11. Se probará aislamiento por sucursal\.
12. La PWA tendrá pruebas reales offline\.
13. Las operaciones deberán persistir al reiniciar\.
14. Se probarán conflictos\.
15. Las dependencias deberán respetarse\.
16. Se probará cierre diario\.
17. Se probará reapertura\.
18. Se probará auditoría\.
19. Se comprobarán reportes contra datos conocidos\.
20. Se probará exportación Excel con referencias como texto\.
21. La migración tendrá ensayo\.
22. El backup deberá restaurarse antes del go\-live\.
23. Se harán pruebas de rendimiento razonables\.
24. Existirá un entorno de staging\.
25. Usuarios reales participarán en UAT\.
26. Los defectos se clasificarán por severidad\.
27. No se saldrá con defectos críticos abiertos\.
28. El piloto será opcional pero controlado\.
29. Habrá capacitación por rol\.
30. Existirá checklist formal de puesta en producción\.
31. Excel dejará de ser sistema operativo después del corte\.
32. Los primeros días tendrán monitoreo reforzado\.

__81\. Criterios de aceptación del Proceso 21__

Este proceso estará aprobado cuando:

- El promedio ponderado pase todos los casos de prueba\.
- PEPS consuma los lotes correctos\.
- Dos ventas simultáneas no generen stock negativo\.
- Un UUID repetido no duplique la operación\.
- Una venta offline sobreviva al reinicio\.
- Un conflicto de stock se detecte correctamente\.
- Un pago offline excesivo entre en conflicto\.
- Una transferencia conserve cantidad y valor empresarial\.
- Los kits consuman exactamente sus componentes\.
- Los permisos impidan acceso indebido incluso por API\.
- El cierre bloquee correctamente pendientes/conflictos\.
- La migración de ensayo cuadre inventario, lotes y Kardex\.
- Un backup pueda restaurarse satisfactoriamente\.
- Los usuarios responsables aprueben los flujos de UAT\.
- No existan defectos críticos antes del corte\.

__Resultado del Proceso 21__

Queda funcionalmente definido:

__La puesta en producción estará condicionada a una validación integral del sistema mediante pruebas automáticas, pruebas funcionales, escenarios de concurrencia y offline, migración de ensayo, restauración de backups y aceptación por usuarios reales\. El go\-live solo se realizará cuando inventario, lotes, Kardex, permisos, sincronización y cierres hayan demostrado consistencia\.__

Con esto ya tenemos __21 procesos funcionales definidos__ y, a nivel de negocio, la __Etapa 3 está prácticamente completa__\.

El paso que recomiendo ahora no es seguir agregando procesos indefinidamente, sino realizar un __Proceso 22: Cierre formal de la Etapa 3 y matriz consolidada de requisitos__, donde reuniremos las decisiones de los 21 procesos, identificaremos únicamente los puntos que todavía están pendientes de decisión empresarial, separaremos __V1 / posterior__, y obtendremos una lista final que servirá directamente como entrada para la __Etapa 4: Diseño técnico, modelo de datos y arquitectura detallada__\.

