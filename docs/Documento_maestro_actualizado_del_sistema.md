__Documento maestro actualizado del sistema__

__1\. Nombre provisional del proyecto__

__Sistema centralizado de inventario, Kardex, ventas, transferencias y cuentas por cobrar para repuestos de maquinaria pesada\.__

__2\. Descripción general__

El proyecto consiste en desarrollar una aplicación web instalable tipo __PWA__ para administrar el inventario y las operaciones de una empresa con múltiples sucursales\.

Actualmente, cada sucursal trabaja con una plantilla Excel que contiene las hojas:

- KARDEX
- ENTRADAS
- SALIDAS
- VENTAS

Todas las sucursales utilizan la misma estructura y el mismo flujo de trabajo\.

El sistema nuevo reemplazará el uso aislado de archivos Excel por una plataforma centralizada, permitiendo que:

- Cada sucursal gestione su propio inventario\.
- El administrador consulte todas las sucursales\.
- El Kardex se actualice automáticamente\.
- Las ventas, entradas, salidas y transferencias tengan trazabilidad\.
- La aplicación continúe funcionando durante cortes de internet\.
- Las operaciones offline se sincronicen posteriormente\.
- Se controlen clientes, pagos y cuentas por cobrar\.
- Se gestionen lotes, rotación PEPS y costos promedio\.
- Se manejen productos simples y kits\.

__3\. Problema identificado__

El proceso actual presenta los siguientes inconvenientes:

- Cada sucursal mantiene su propio Excel\.
- Los reportes llegan con retraso\.
- No existe inventario consolidado en tiempo real\.
- Pueden aparecer stocks negativos\.
- Las referencias se escriben de diferentes maneras\.
- Las anulaciones no revierten correctamente el inventario\.
- Las ventas funcionan como simples salidas\.
- No existe gestión completa de clientes ni deudas\.
- No hay control de usuarios ni dispositivos\.
- No hay trazabilidad de transferencias\.
- Los costos están incompletos\.
- El funcionamiento depende de fórmulas editables\.
- No existe soporte real para trabajar sin conexión\.
- No existe control estructurado de kits o componentes\.

__4\. Objetivo general__

Desarrollar un sistema centralizado que permita gestionar de forma segura y trazable los productos, inventarios, movimientos, ventas, transferencias, pagos y cierres de todas las sucursales, incluyendo funcionamiento offline mediante PWA\.

__5\. Objetivos específicos__

- Centralizar el catálogo de repuestos\.
- Controlar inventario por sucursal\.
- Consultar el inventario consolidado\.
- Registrar compras, entradas, ventas y salidas\.
- Gestionar transferencias entre tiendas\.
- Generar el Kardex automáticamente\.
- Valorizar el inventario mediante promedio ponderado móvil\.
- Controlar físicamente los lotes mediante PEPS\.
- Gestionar productos simples y kits\.
- Registrar clientes y cuentas por cobrar\.
- Permitir pagos parciales y totales\.
- Controlar usuarios, sesiones y dispositivos\.
- Permitir trabajo offline\.
- Sincronizar operaciones sin duplicarlas\.
- Detectar y resolver conflictos\.
- Generar cierres, alertas y reportes\.

__6\. Arquitectura general__

__6\.1 Arquitectura central__

El sistema tendrá:

- Una aplicación web\.
- Una base PostgreSQL central\.
- Una separación lógica por sucursal\.
- Un servidor VPS\.
- Acceso mediante internet y HTTPS\.

Sucursales

    │

    ▼

Aplicación PWA

React \+ TypeScript \+ Inertia

    │

    ▼

Backend Laravel

    │

    ▼

PostgreSQL central

__6\.2 Base de datos por sucursal__

No existirá una base PostgreSQL independiente para cada sucursal\.

Todas compartirán una misma base central, utilizando campos como:

sucursal\_id

producto\_id

usuario\_id

Cada usuario solo verá la información para la que tenga permiso\.

__6\.3 Funcionamiento offline__

Cada dispositivo autorizado utilizará IndexedDB como base local\.

PWA

 ├── Catálogo local

 ├── Último stock conocido

 ├── Clientes sincronizados

 ├── Lotes conocidos

 ├── Kits y componentes

 └── Operaciones pendientes

Cuando regrese la conexión:

IndexedDB

    ↓

Laravel valida

    ↓

PostgreSQL registra

    ↓

Kardex e inventario se actualizan

PostgreSQL será siempre la fuente oficial\.

__7\. Tecnologías definidas__

__Backend__

- Laravel\.
- PHP\.
- Laravel Sanctum\.
- Laravel Queues\.
- Laravel Scheduler\.
- Pest\.

__Frontend__

- React\.
- TypeScript\.
- Inertia\.
- Tailwind CSS\.
- Vite\.

__PWA y offline__

- vite\-plugin\-pwa\.
- Workbox\.
- IndexedDB\.
- Dexie\.js\.
- dexie\-react\-hooks\.
- Zod\.
- UUID v7\.
- Axios\.
- navigator\.onLine\.
- Endpoint de comprobación del servidor\.

__Base de datos__

- PostgreSQL central\.
- IndexedDB local\.

__Infraestructura__

- VPS KVM 2\.
- Ubuntu Server\.
- Nginx\.
- PHP\-FPM\.
- Redis\.
- Supervisor\.
- HTTPS\.
- Respaldos externos\.

__8\. Sucursales__

La empresa cuenta con una sede principal y varias sucursales\.

Sucursales identificadas durante el análisis:

- Juliaca\.
- Mazuko\.
- Huepetuhe\.
- Zarayaco o nombre pendiente de validación\.
- Otras sucursales que deberán confirmarse\.
- Posibles nuevas sucursales futuras\.

Cada sucursal tendrá:

- Código\.
- Nombre\.
- Dirección\.
- Teléfono\.
- Responsable\.
- Estado\.
- Usuarios\.
- Inventario\.
- Lotes\.
- Ventas\.
- Entradas\.
- Salidas\.
- Transferencias\.
- Cierres\.

La sede principal tendrá:

- Su inventario local\.
- Una vista consolidada de toda la empresa\.

__9\. Roles definidos__

__Administrador general__

Podrá:

- Consultar todas las sucursales\.
- Administrar usuarios y permisos\.
- Administrar productos\.
- Ver costos\.
- Modificar precios\.
- Aprobar operaciones sensibles\.
- Resolver conflictos\.
- Revisar transferencias\.
- Consultar reportes\.
- Administrar dispositivos\.
- Revisar cierres\.

__Encargado de sucursal__

Podrá:

- Administrar operaciones locales\.
- Registrar entradas y ventas\.
- Registrar salidas\.
- Solicitar transferencias\.
- Confirmar recepciones\.
- Registrar pagos\.
- Preparar cierres\.
- Revisar inventario de su sucursal\.

__Almacenero__

Podrá:

- Consultar inventario\.
- Registrar entradas autorizadas\.
- Preparar salidas\.
- Preparar transferencias\.
- Realizar conteos\.
- Consultar lotes\.
- Seguir sugerencias PEPS\.

__Vendedor__

Podrá:

- Consultar stock local\.
- Registrar ventas\.
- Registrar clientes\.
- Registrar pagos autorizados\.
- Modificar precios dentro de límites\.
- Trabajar offline\.

No podrá:

- Modificar costos\.
- Ajustar inventario directamente\.
- Administrar usuarios\.
- Aprobar transferencias\.
- Resolver conflictos sensibles\.

__10\. Módulos definitivos__

El sistema tendrá __13 módulos principales__\.

__1\. Usuarios, roles, sesiones y dispositivos__

Incluye:

- Usuarios\.
- Roles\.
- Permisos\.
- Sucursal asignada\.
- Sesiones activas\.
- Navegador\.
- Sistema operativo\.
- IP\.
- Último acceso\.
- Cierre remoto de sesiones\.
- Dispositivos autorizados\.
- Historial de accesos\.
- Bloqueo de dispositivos\.

__2\. Sucursales__

Incluye:

- Registro de sucursales\.
- Sede principal\.
- Responsables\.
- Estados\.
- Dirección y teléfono\.
- Asociación con usuarios y operaciones\.

__3\. Catálogo de repuestos y definición de kits__

Incluye:

- Referencia\.
- Código interno\.
- Nombre\.
- Marca\.
- Categoría\.
- Unidad de medida\.
- Tipo de producto\.
- Precio sugerido\.
- Precio mínimo\.
- Stock mínimo\.
- Control de lotes\.
- Aplicación de PEPS\.
- Alias de referencias\.
- Composición de kits\.

__4\. Inventario por sucursal, lotes y armado de kits__

Incluye:

- Stock disponible\.
- Stock reservado\.
- Stock dañado\.
- Stock en tránsito\.
- Costo promedio\.
- Valor del inventario\.
- Lotes\.
- Ubicaciones\.
- Antigüedad\.
- Armado de kits\.
- Desarmado de kits\.
- Componentes disponibles\.

__5\. Compras y entradas__

Incluye:

- Compras\.
- Inventario inicial\.
- Devoluciones de clientes\.
- Recepciones\.
- Ajustes positivos\.
- Entradas por armado\.
- Creación de lotes\.
- Recalculo de costos\.

__6\. Ventas y salidas__

Incluye:

- Ventas\.
- Salidas internas\.
- Pérdidas\.
- Productos dañados\.
- Uso interno\.
- Ajustes negativos\.
- Precios editables con límites\.
- Consumo PEPS\.
- Venta de kits\.
- Costo de venta\.
- Utilidad bruta\.

__7\. Transferencias entre sucursales__

Incluye:

- Solicitud\.
- Aprobación\.
- Rechazo\.
- Envío\.
- Tránsito\.
- Recepción\.
- Recepción parcial\.
- Diferencias\.
- Cancelación\.
- Lotes transferidos\.
- Kits o componentes transferidos\.

__8\. Kardex automático__

Incluye:

- Movimientos permanentes\.
- Entradas\.
- Salidas\.
- Saldos\.
- Costos\.
- Valores\.
- Promedio ponderado móvil\.
- Relación con lotes PEPS\.
- Reversiones\.
- Historial completo\.

__9\. Cierre diario__

Incluye:

- Compras\.
- Ventas\.
- Salidas\.
- Transferencias\.
- Pagos\.
- Conteo físico\.
- Diferencias\.
- Observaciones\.
- Operaciones offline pendientes\.
- Validación de lotes\.
- Validación de kits\.

__10\. Alertas__

Incluye:

- Stock bajo\.
- Producto agotado\.
- Stock negativo\.
- Diferencias\.
- Cierre pendiente\.
- Transferencia pendiente\.
- Deuda vencida\.
- Lote antiguo\.
- Lote inconsistente\.
- Kit incompleto\.
- Conflicto de sincronización\.
- Dispositivo desconocido\.

__11\. Reportes__

Incluye:

- Inventario por sucursal\.
- Inventario consolidado\.
- Kardex\.
- Compras\.
- Ventas\.
- Salidas\.
- Transferencias\.
- Cierres\.
- Cuentas por cobrar\.
- Pagos\.
- Costos\.
- Utilidades\.
- Lotes\.
- Antigüedad\.
- Kits\.
- Componentes\.
- Operaciones offline\.

__12\. Clientes, pagos y cuentas por cobrar__

Incluye:

- Clientes\.
- Ventas al contado\.
- Ventas al crédito\.
- Pago inicial\.
- Pagos parciales\.
- Pagos totales\.
- Saldo pendiente\.
- Vencimientos\.
- Métodos de pago\.
- Historial\.
- Deudas vencidas\.

__13\. PWA, sincronización y conflictos__

Incluye:

- Instalación de aplicación\.
- Funcionamiento offline\.
- IndexedDB\.
- Cola de operaciones\.
- UUID\.
- Sincronización por lotes\.
- Reintentos\.
- Idempotencia\.
- Validaciones\.
- Conflictos\.
- Resolución administrativa\.

__11\. Análisis del Excel actual__

__11\.1 Flujo general__

El flujo común de todas las sucursales es:

Crear producto en KARDEX

        ↓

Registrar ENTRADA, SALIDA o VENTA

        ↓

Buscar producto por referencia

        ↓

Sumar o restar cantidades

        ↓

Actualizar stock

__11\.2 KARDEX__

Se llenan manualmente:

- Referencia\.
- Nombre\.
- Marca\.

El resto se calcula mediante fórmulas\.

La lógica actual es:

Stock = Entradas − Salidas − Ventas

__11\.3 ENTRADAS__

Registra:

- Procedencia\.
- Documento\.
- Fecha\.
- Marca\.
- Referencia\.
- Detalle\.
- Cantidad\.
- Precio en dólares\.
- Tipo de cambio\.
- Costo\.
- Total\.

El detalle se obtiene por referencia\.

__11\.4 SALIDAS__

Registra:

- Documento o destino\.
- Número\.
- Fecha\.
- Marca\.
- Referencia\.
- Detalle\.
- Cantidad\.
- Costo\.
- Total\.
- Cancelado\.

La columna CANCELADO no evita que la salida siga restando inventario\.

__11\.5 VENTAS__

Tiene prácticamente la misma estructura que Salidas\.

Actualmente no contiene una venta comercial completa porque faltan:

- Cliente\.
- Precio de venta\.
- Descuento\.
- Forma de pago\.
- Crédito\.
- Saldo\.
- Vencimiento\.
- Utilidad\.

Por tanto, la hoja Ventas se comporta como otra salida de inventario\.

__12\. Referencias y códigos__

__12\.1 Regla general__

La referencia seguirá siendo el código visible del repuesto\.

Ejemplos:

RK\-428

11103402

N\-11103241

F\-217411

6013\-C3

32213J2/Q

Todas las referencias se almacenarán como texto\.

__12\.2 Búsqueda automática__

El sistema permitirá escribir una referencia y recuperar:

- Nombre\.
- Marca\.
- Stock\.
- Precio\.
- Lotes\.
- Ubicación\.

Ejemplo:

Usuario escribe: RK\-428

Resultado:

RK\-428

ACC BLOQUE DE ORBITROL

TRANSCALLAO

__12\.3 Limitación__

El sistema no podrá deducir el nombre de un producto nuevo únicamente a partir de la referencia\.

Las referencias no siguen un patrón uniforme\.

El sistema podrá:

- Buscar referencias existentes\.
- Detectar similitudes\.
- Sugerir coincidencias\.
- Advertir posibles duplicados\.

No deberá inventar nombres automáticamente\.

__12\.4 Normalización__

Cada producto tendrá:

codigo\_interno

referencia\_original

referencia\_normalizada

Ejemplo:

Código interno: PRD\-000285

Referencia original: RK\-428

Referencia normalizada: RK428

__12\.5 Alias__

Se podrán registrar referencias alternativas:

RK\-428

RK 428

RK\.428

Código de proveedor

Código antiguo

Todos los alias apuntarán al mismo producto\.

__12\.6 Reglas__

- Convertir búsqueda a mayúsculas\.
- Eliminar espacios externos\.
- Uniformizar separadores solo para comparación\.
- Conservar la referencia original\.
- No eliminar prefijos\.
- No fusionar automáticamente\.
- Mostrar posibles coincidencias\.
- Permitir decisión administrativa\.

__13\. Método de Kardex definido__

El sistema utilizará dos métodos complementarios\.

__13\.1 Promedio ponderado móvil__

Será el método oficial de valorización\.

Determinará:

- Costo promedio\.
- Valor del inventario\.
- Costo de ventas\.
- Costo de salidas\.
- Utilidad\.
- Valor de transferencias\.

Se calculará por:

Producto \+ sucursal

__13\.2 PEPS/FIFO__

Será el método operativo de rotación física\.

Determinará:

- Qué lote sale primero\.
- Qué mercadería es más antigua\.
- Qué lote se utilizó\.
- Qué lotes quedan disponibles\.
- Qué lotes se transfieren\.

__Regla central__

Promedio ponderado:

determina el costo oficial\.

PEPS:

determina el lote físico\.

No existirán dos costos oficiales\.

__14\. Ejemplo de promedio ponderado y PEPS__

Entradas:

__Lote__

__Cantidad__

__Costo__

A

10

S/ 100

B

5

S/ 130

Promedio:

\(10 × 100 \+ 5 × 130\) ÷ 15 = S/ 110

Venta de 12 unidades:

__PEPS físico__

10 unidades del lote A

2 unidades del lote B

__Costo oficial__

12 × S/ 110 = S/ 1,320

Saldo:

3 unidades

Costo promedio: S/ 110

Valor: S/ 330

__15\. Gestión de costos y precios__

__Costo__

El vendedor no ingresará ni modificará el costo\.

El costo se calculará automáticamente según el promedio ponderado\.

Solo podrá cambiar mediante:

- Compra\.
- Inventario inicial\.
- Transferencia recibida\.
- Devolución valorizada\.
- Ajuste autorizado\.

__Precio de venta__

El precio podrá ser editable con límites\.

Cada producto podrá tener:

- Precio sugerido\.
- Precio mínimo\.
- Precio mayorista\.
- Precio minorista\.
- Descuento máximo\.

Regla:

Precio final igual o mayor al mínimo:

venta permitida\.

Precio menor al mínimo:

requiere autorización\.

Se guardará:

- Precio original\.
- Precio final\.
- Descuento\.
- Motivo\.
- Usuario\.
- Autorizador\.

__16\. Gestión de lotes__

Cada entrada creará un lote\.

Información principal:

- Producto\.
- Sucursal\.
- Código\.
- Fecha original\.
- Fecha de recepción\.
- Cantidad inicial\.
- Cantidad disponible\.
- Costo original\.
- Ubicación\.
- Estado\.
- Lote de origen\.
- Movimiento relacionado\.

Si no existe lote del proveedor, el sistema generará uno\.

Ejemplo:

MZK\-20260805\-0001

Estados:

- Disponible\.
- Reservado\.
- Agotado\.
- En tránsito\.
- Dañado\.
- Bloqueado\.
- Devuelto\.
- En revisión\.

__17\. Kits y productos compuestos__

Los kits se integrarán dentro de Catálogo, Inventario, Ventas y Transferencias\.

__17\.1 Kit inventariado como producto único__

Tendrá:

- Referencia propia\.
- Stock propio\.
- Lotes propios\.
- Costo promedio propio\.
- Precio propio\.
- Kardex propio\.

Se utilizará cuando el proveedor entregue el kit armado\.

__17\.2 Kit armado desde componentes__

Tendrá una composición\.

Ejemplo:

Kit de reparación

\- 2 retenes

\- 1 rodamiento

\- 4 sellos

Al venderlo:

- Se validan los componentes\.
- Se consumen lotes PEPS\.
- Cada componente sale a su costo promedio\.
- El costo del kit es la suma de componentes\.

__17\.3 Armado al vender__

No se mantiene stock independiente del kit\.

La venta descuenta directamente los componentes\.

__17\.4 Armado anticipado__

Se crea una orden de armado:

Salida de componentes

        ↓

Consumo PEPS

        ↓

Entrada de kit terminado

        ↓

Creación de lote del kit

El kit terminado tendrá stock y Kardex propios\.

__18\. Transferencias__

Estados:

- Solicitada\.
- Aprobada\.
- Rechazada\.
- Enviada\.
- En tránsito\.
- Recibida\.
- Recibida con diferencia\.
- Cancelada\.

Funcionamiento:

__Origen__

- Selecciona lotes PEPS\.
- Reduce disponibilidad\.
- Registra salida\.
- Pasa productos a tránsito\.
- Mantiene trazabilidad\.

__Destino__

- Confirma recepción\.
- Crea lotes vinculados\.
- Conserva fecha de origen\.
- Recalcula costo promedio\.

Los kits podrán transferirse:

- Como producto armado\.
- Como componentes individuales\.

__19\. Clientes y cuentas por cobrar__

Actualmente no existe información estructurada de clientes\.

Por ello, el módulo se implementará desde cero\.

__Cliente__

Campos iniciales:

- Tipo de documento\.
- Número\.
- Nombre o razón social\.
- Teléfono\.
- Dirección\.
- Correo\.
- Observaciones\.
- Estado\.

__Venta al crédito__

Creará una cuenta por cobrar con:

- Cliente\.
- Venta\.
- Total\.
- Pago inicial\.
- Saldo\.
- Vencimiento\.
- Estado\.
- Pagos\.

Estados:

- Pendiente\.
- Parcial\.
- Pagada\.
- Vencida\.
- Anulada\.

Reglas:

- Cliente obligatorio para crédito\.
- Pago no puede superar el saldo\.
- Pagos registrados individualmente\.
- Los pagos no afectan el Kardex\.
- Las devoluciones físicas sí afectan inventario\.

__20\. Funcionamiento offline__

__Operaciones permitidas__

- Consultar catálogo\.
- Consultar último stock conocido\.
- Consultar lotes conocidos\.
- Registrar ventas\.
- Registrar determinadas salidas\.
- Registrar clientes básicos\.
- Registrar pagos\.
- Registrar conteos\.
- Consultar operaciones pendientes\.
- Vender kits con validación local\.

__Operaciones que requerirán internet__

- Crear usuarios\.
- Modificar roles\.
- Crear sucursales\.
- Autorizar dispositivos\.
- Modificar catálogo maestro\.
- Cambiar composiciones de kits\.
- Aprobar transferencias\.
- Resolver conflictos\.
- Ejecutar ajustes oficiales\.
- Confirmar cierre diario\.
- Consultar consolidado actualizado\.

__21\. Sincronización__

Cada operación offline tendrá:

- UUID\.
- Sucursal\.
- Usuario\.
- Dispositivo\.
- Fecha real\.
- Fecha de creación\.
- Tipo\.
- Datos\.
- Estado\.
- Número de intentos\.

Estados:

- Pendiente\.
- Sincronizando\.
- Sincronizada\.
- Rechazada\.
- Duplicada\.
- Con conflicto\.
- Anulada localmente\.

Flujo:

Registrar operación

        ↓

Validar con Zod

        ↓

Guardar en IndexedDB

        ↓

Asignar UUID

        ↓

Esperar conexión

        ↓

Enviar a Laravel

        ↓

Validación central

        ↓

Aceptar, rechazar o marcar conflicto

Laravel tendrá la decisión final sobre:

- Stock\.
- Costo\.
- Precio mínimo\.
- Lotes\.
- Kits\.
- Permisos\.
- Cierre\.

__22\. Conflictos posibles__

- Stock insuficiente\.
- Lote ya consumido\.
- Operación duplicada\.
- Producto desactivado\.
- Precio mínimo cambiado\.
- Cliente modificado\.
- Composición de kit desactualizada\.
- Componentes insuficientes\.
- Pago aplicado a deuda ya cancelada\.
- Transferencia que modificó el stock\.
- Sesión vencida\.
- Operación fuera de fecha\.

El sistema tendrá una bandeja de conflictos\.

__23\. Cierre diario__

El cierre incluirá:

- Entradas\.
- Ventas\.
- Salidas\.
- Transferencias\.
- Pagos\.
- Stock esperado\.
- Conteo físico\.
- Diferencias\.
- Observaciones\.
- Operaciones pendientes\.
- Lotes\.
- Kits\.
- Componentes\.

No se podrá cerrar si existen:

- Operaciones offline pendientes\.
- Conflictos sin resolver\.
- Transferencias inconsistentes\.
- Diferencias no justificadas\.
- Órdenes de armado incompletas\.

__24\. Reglas principales del sistema__

1. Una base PostgreSQL central\.
2. Separación por sucursal\.
3. PostgreSQL es la fuente oficial\.
4. IndexedDB es almacenamiento temporal\.
5. El vendedor no modifica costos\.
6. El precio se edita dentro de límites\.
7. Promedio ponderado valoriza\.
8. PEPS controla lotes\.
9. Cada entrada crea un lote\.
10. Cada salida consume lotes\.
11. El Kardex es automático\.
12. El stock no se edita directamente\.
13. Las anulaciones generan movimientos inversos\.
14. Las transferencias conservan trazabilidad\.
15. Los kits únicos tienen stock propio\.
16. Los kits por componentes consumen componentes\.
17. Las composiciones de kits tienen versión\.
18. Una modificación no altera ventas históricas\.
19. Las operaciones offline son provisionales\.
20. Laravel confirma costos y lotes\.
21. No se eliminan operaciones confirmadas\.
22. No se cierra el día con operaciones pendientes\.
23. Los importes se calculan con decimales\.
24. La suma de lotes debe coincidir con el stock\.

__25\. Migración de datos__

__Datos obligatorios__

- Sucursales\.
- Productos\.
- Referencias\.
- Nombres\.
- Marcas\.
- Tipo de producto\.
- Precios aprobados\.
- Stock mínimo\.
- Stock físico inicial\.
- Costo inicial aprobado\.

__Datos opcionales__

- Alias\.
- Categorías\.
- Ubicaciones\.
- Clientes\.
- Deudas vigentes\.
- Historial resumido\.

__Datos que no se migrarán directamente__

- Fórmulas\.
- Errores \#N/A\.
- Filas vacías\.
- Totales incorrectos\.
- Stock negativo sin validar\.
- Costos sin respaldo\.
- Cancelaciones ambiguas\.
- Movimientos sin referencia\.

__Orden de migración__

Consolidar catálogo

        ↓

Normalizar referencias

        ↓

Validar productos y kits

        ↓

Configurar sucursales

        ↓

Realizar inventario físico

        ↓

Importar stock inicial

        ↓

Crear lotes iniciales

        ↓

Generar Kardex inicial

El inventario inicial se cargará al final, cuando la lógica esté implementada y probada\.

__26\. Estado de las etapas__

__Etapa 1: definición del proyecto__

__Completada funcionalmente\.__

Se definieron:

- Objetivo\.
- Alcance\.
- Módulos\.
- Roles\.
- Arquitectura\.
- Funcionalidades offline\.
- Funcionalidades en línea\.
- Criterios generales\.

__Etapa 2: análisis del negocio y del Excel__

__Completada funcionalmente\.__

Se confirmó que todas las sucursales utilizan la misma plantilla\.

Se analizaron:

- Kardex\.
- Entradas\.
- Salidas\.
- Ventas\.
- Fórmulas\.
- Referencias\.
- Códigos\.
- Costos\.
- Kits\.
- Migración\.
- Clientes y deudas como nueva lógica\.

La carga definitiva de productos e inventarios se realizará posteriormente\.

__27\. Entregables completados de la Etapa 2__

- Diccionario de datos actuales\.
- Informe de calidad\.
- Reglas de normalización\.
- Plantilla conceptual de productos\.
- Plantilla conceptual de inventario inicial\.
- Estrategia de migración\.
- Flujo actual del negocio\.
- Definición del nuevo Kardex\.
- Reglas para lotes y kits\.

__28\. Próxima etapa__

La siguiente etapa es:

__Etapa 3: diseño funcional\.__

En esta etapa se deberán documentar detalladamente los procesos de:

- Registro de productos\.
- Compras\.
- Entradas\.
- Ventas\.
- Salidas\.
- Transferencias\.
- Kardex\.
- Kits\.
- Clientes\.
- Pagos\.
- Cierre\.
- Operación offline\.
- Sincronización\.
- Resolución de conflictos\.

El resultado deberá incluir:

- Diagramas de flujo\.
- Estados de las operaciones\.
- Validaciones\.
- Reglas de negocio\.
- Excepciones\.
- Criterios de aceptación por proceso\.

