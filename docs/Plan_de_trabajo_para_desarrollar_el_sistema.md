            __Plan de trabajo para desarrollar el sistema__

El desarrollo se organizará por etapas para construir primero la base del sistema, después el inventario y finalmente el funcionamiento offline mediante PWA\.

La planificación inicial considera:

- Desarrollo progresivo por módulos\.
- Revisiones periódicas con el cliente\.

__Etapa 1\. Definición del proyecto__


El objetivo será establecer claramente qué se desarrollará y qué quedará para futuras versiones\.

__Actividades__

- Revisar toda la información recopilada\.
- Confirmar las sucursales actuales\.
- Confirmar los tipos de usuarios\.
- Definir las operaciones permitidas por rol\.
- Definir los módulos de la primera entrega\.
- Identificar funcionalidades futuras\.
- Establecer criterios de aceptación\.
- Definir responsables para aprobar avances\.

__Entregables__

- Documento de alcance\.
- Lista definitiva de módulos\.
- Matriz de roles y permisos\.
- Lista de funcionalidades offline\.
- Lista de funcionalidades que requerirán internet\.
- Cronograma general aprobado\.

__Etapa 2\. Análisis del negocio y del Excel__

Esta etapa permitirá entender con exactitud cómo trabaja actualmente cada sucursal\.

__Actividades__

- Revisar los archivos Excel de cada tienda\.
- Identificar hojas, columnas y fórmulas\.
- Revisar códigos y marcas de productos\.
- Detectar códigos repetidos\.
- Identificar productos vendidos como conjuntos\.
- Revisar cómo se registran compras, ventas y transferencias\.
- Revisar cómo se controlan clientes y deudas\.
- Identificar información faltante o incorrecta\.
- Definir qué datos se migrarán\.

__Entregables__

- Diccionario de datos actuales\.
- Informe de calidad de la información\.
- Reglas para normalizar códigos\.
- Plantilla oficial para importar productos\.
- Plantilla de inventario inicial por sucursal\.
- Estrategia de migración desde Excel\.

__Etapa 3\. Diseño funcional__

Se diseñará el funcionamiento detallado de cada módulo antes de empezar la programación\.

__Procesos que deben definirse__

- Compra y entrada\.
- Venta y salida\.
- Venta al contado\.
- Venta al crédito\.
- Pago parcial\.
- Transferencia entre sucursales\.
- Recepción con diferencias\.
- Devolución\.
- Ajuste de inventario\.
- Cierre diario\.
- Operación offline\.
- Sincronización y conflictos\.

__Entregables__

- Diagramas de flujo\.
- Reglas de negocio\.
- Estados de cada operación\.
- Validaciones\.
- Casos excepcionales\.
- Criterios para aceptar o rechazar operaciones offline\.

__Etapa 4\. Diseño técnico y base de datos__

Se diseñará la estructura que soportará todos los módulos\.

__Actividades__

- Diseñar el modelo entidad\-relación\.
- Definir tablas y relaciones\.
- Definir claves primarias y UUID\.
- Definir índices\.
- Definir estados de sincronización\.
- Diseñar el motor de movimientos\.
- Definir las transacciones críticas\.
- Diseñar los endpoints de sincronización\.
- Definir la estructura de IndexedDB\.
- Preparar migraciones de Laravel\.

__Entidades principales__

- Usuarios\.
- Roles y permisos\.
- Dispositivos\.
- Sucursales\.
- Productos\.
- Marcas y categorías\.
- Inventarios por sucursal\.
- Movimientos de inventario\.
- Compras y entradas\.
- Ventas y detalles\.
- Transferencias\.
- Clientes\.
- Pagos\.
- Cuentas por cobrar\.
- Cierres diarios\.
- Alertas\.
- Lotes de sincronización\.
- Operaciones y conflictos de sincronización\.

__Entregables__

- Diagrama entidad\-relación\.
- Diccionario de base de datos\.
- Diseño de IndexedDB\.
- Contratos de sincronización\.
- Migraciones iniciales\.

__Etapa 5\. Preparación del proyecto y la infraestructura de desarrollo__

__Configuración tecnológica__

- Laravel\.
- React\.
- TypeScript\.
- Inertia\.
- Tailwind CSS\.
- PostgreSQL\.
- Redis\.
- Laravel Sanctum\.
- Pest\.
- Git y GitHub\.

__Configuración PWA__

- vite\-plugin\-pwa\.
- Workbox\.
- Dexie\.js\.
- dexie\-react\-hooks\.
- Zod\.
- UUID\.
- Axios\.

__Actividades__

- Crear el repositorio\.
- Configurar ramas de desarrollo\.
- Crear entornos de desarrollo y pruebas\.
- Configurar variables de entorno\.
- Configurar herramientas de formato y análisis\.
- Preparar datos de prueba\.
- Definir estructura modular del código\.

__Entregable__

Una aplicación base ejecutándose con autenticación, React, Laravel y PostgreSQL\.

__Etapa 6\. Usuarios, roles, sesiones y sucursales__

__Funcionalidades__

- Inicio y cierre de sesión\.
- Creación de usuarios\.
- Asignación de roles\.
- Asignación de sucursal\.
- Restricción por permisos\.
- Activación y bloqueo de cuentas\.
- Registro de sesiones\.
- Dispositivos conectados\.
- Cierre remoto de sesiones\.
- Límite de sesiones simultáneas\.
- Registro y administración de sucursales\.

__Pruebas necesarias__

- Un trabajador no puede consultar otra sucursal\.
- El administrador puede visualizar todas las tiendas\.
- Una sesión cerrada remotamente deja de funcionar\.
- Un dispositivo bloqueado no puede operar\.
- Un usuario inactivo no puede iniciar sesión\.

__Entregable__

Administración de usuarios y sucursales completamente funcional\.

__Etapa 7\. Catálogo e inventario inicial__

__Funcionalidades__

- Marcas\.
- Categorías\.
- Unidades de medida\.
- Registro de repuestos\.
- Códigos y referencias\.
- Precios y costos\.
- Stock mínimo\.
- Productos compuestos o vendidos en conjunto\.
- Inventario por sucursal\.
- Carga de stock inicial\.
- Importación desde Excel\.
- Validación de duplicados\.

__Entregable__

Catálogo centralizado e inventario inicial separado por sucursal\.

__Etapa 8\. Motor de inventario y Kardex__

Esta será una de las etapas más importantes\.

__Funcionalidades__

- Registro único de movimientos\.
- Entradas y salidas\.
- Saldo por producto y sucursal\.
- Kardex automático\.
- Prevención de stock negativo\.
- Bloqueos para operaciones simultáneas\.
- Transacciones de base de datos\.
- Reversión controlada de operaciones\.
- Consulta del historial\.

__Pruebas críticas__

- Dos usuarios intentan vender la última unidad\.
- Una operación falla durante su registro\.
- Una salida no puede duplicarse\.
- El saldo del Kardex coincide con el inventario\.
- Las operaciones anuladas generan movimientos inversos\.
- Una sucursal no afecta el inventario de otra\.

__Entregable__

Motor central de inventario estable y probado\.

__Etapa 9\. Compras, entradas, ventas y salidas__

__Compras y entradas__

- Registro de compras\.
- Productos, cantidades y costos\.
- Documentos de referencia\.
- Entradas por devolución\.
- Ajustes positivos autorizados\.
- Actualización automática del Kardex\.

__Ventas y salidas__

- Registro de ventas\.
- Validación de stock\.
- Cálculo de totales\.
- Otras salidas\.
- Productos dañados o perdidos\.
- Ajustes negativos\.
- Actualización automática del Kardex\.

__Entregable__

Flujos completos de ingreso y salida de mercadería\.

__Etapa 10\. Transferencias entre sucursales__

__Funcionalidades__

- Solicitar transferencia\.
- Aprobar o rechazar\.
- Preparar y enviar\.
- Marcar productos en tránsito\.
- Confirmar recepción\.
- Recepciones parciales\.
- Recepción con diferencias\.
- Cancelaciones\.
- Historial de estados\.

__Pruebas__

- La salida afecta únicamente al origen\.
- El destino no recibe stock antes de confirmar\.
- Una recepción parcial registra la diferencia\.
- No se duplica el inventario en tránsito\.
- Una transferencia cancelada revierte correctamente sus movimientos\.

__Entregable__

Transferencias controladas entre todas las sucursales\.

__Etapa 11\. Clientes, pagos y cuentas por cobrar__

__Funcionalidades__

- Registro de clientes\.
- Venta al contado\.
- Venta al crédito\.
- Pago inicial\.
- Pagos parciales\.
- Saldo pendiente\.
- Fecha de vencimiento\.
- Métodos de pago\.
- Historial de pagos\.
- Deudas vencidas\.
- Anulación controlada de pagos\.

__Reglas principales__

- El pago no puede superar el saldo\.
- La venta al crédito requiere un cliente\.
- Cada pago se almacena individualmente\.
- El estado se calcula automáticamente\.
- Los pagos no modifican el Kardex\.
- Las devoluciones físicas sí afectan el inventario\.

__Entregable__

Control básico de pagos y cuentas por cobrar integrado con ventas\.

__Etapa 12\. PWA y funcionamiento offline__

Esta será otra de las etapas más complejas\.

__Primera parte: PWA instalable__

- Manifest\.
- Iconos\.
- Service Worker\.
- Instalación en computadoras y teléfonos\.
- Caché de archivos estáticos\.
- Gestión de actualizaciones\.

__Segunda parte: base local__

- IndexedDB con Dexie\.
- Catálogo local\.
- Último stock conocido\.
- Clientes locales\.
- Cola de operaciones\.
- Estados de sincronización\.
- Persistencia después de cerrar el navegador\.

__Tercera parte: sincronización__

- Generación de UUID\.
- Envío por lotes\.
- Procesamiento idempotente\.
- Reintentos automáticos\.
- Respuestas por operación\.
- Registro de errores\.
- Actualización del estado local\.

__Operaciones offline iniciales__

- Consultar catálogo\.
- Consultar último stock conocido\.
- Registrar ventas\.
- Registrar determinadas salidas\.
- Registrar clientes básicos\.
- Registrar pagos\.
- Registrar conteos físicos\.

__Entregable__

Aplicación instalable que continúa trabajando durante cortes temporales y sincroniza posteriormente\.

__Etapa 13\. Resolución de conflictos__

__Conflictos considerados__

- Stock oficial insuficiente\.
- Operación duplicada\.
- Producto desactivado\.
- Datos desactualizados\.
- Operaciones registradas fuera de orden\.
- Venta creada en dos dispositivos\.
- Pago aplicado a una deuda ya cancelada\.

__Funcionalidades__

- Bandeja de conflictos\.
- Detalle de información local y del servidor\.
- Rechazar operación\.
- Corregir datos\.
- Autorizar una excepción\.
- Registrar quién resolvió el conflicto\.
- Mantener el historial de la decisión\.

__Entregable__

Panel administrativo para gestionar operaciones que no puedan sincronizarse automáticamente\.

__Etapa 14\. Cierre diario__

__Funcionalidades__

- Resumen de entradas\.
- Resumen de ventas y salidas\.
- Transferencias enviadas y recibidas\.
- Pagos recibidos\.
- Conteo físico\.
- Stock esperado\.
- Diferencias\.
- Observaciones\.
- Borradores offline\.
- Confirmación definitiva en línea\.

__Regla esencial__

No se podrá confirmar el cierre mientras existan operaciones pendientes de sincronización\.

__Entregable__

Cierre diario completo por sucursal\.

__Etapa 15\. Alertas y reportes__

__Alertas__

- Stock bajo\.
- Producto agotado\.
- Stock negativo\.
- Cierre pendiente\.
- Diferencia de inventario\.
- Transferencia pendiente\.
- Deuda vencida\.
- Operaciones offline pendientes\.
- Conflictos de sincronización\.
- Dispositivo desconocido\.

__Reportes__

- Inventario por sucursal\.
- Inventario consolidado\.
- Kardex\.
- Compras\.
- Ventas\.
- Salidas\.
- Transferencias\.
- Cierres\.
- Pagos\.
- Cuentas por cobrar\.
- Operaciones offline\.
- Conflictos\.

__Entregable__

Panel de alertas y reportes exportables\.

__Etapa 16\. Pruebas integrales__

__Tipos de prueba__

- Pruebas unitarias\.
- Pruebas funcionales\.
- Pruebas de permisos\.
- Pruebas de concurrencia\.
- Pruebas offline\.
- Pruebas de sincronización\.
- Pruebas de duplicados\.
- Pruebas de recuperación\.
- Pruebas de importación de Excel\.
- Pruebas de cierre diario\.
- Pruebas en diferentes navegadores y dispositivos\.

__Escenarios importantes__

- Pérdida de internet durante una venta\.
- Cierre del navegador con operaciones pendientes\.
- Sincronización repetida del mismo lote\.
- Dos dispositivos vendiendo el mismo producto\.
- Caída del servidor durante la sincronización\.
- Operaciones offline durante varias horas\.
- Sesión vencida antes de sincronizar\.

__Entregable__

Informe de errores, correcciones y resultados de pruebas\.

__Etapa 17\. Migración y preparación de producción__

__Actividades__

- Limpiar datos de los Excel\.
- Importar productos\.
- Importar stock inicial\.
- Crear sucursales\.
- Crear usuarios\.
- Validar cantidades\.
- Configurar stock mínimo\.
- Realizar inventario físico de corte\.
- Congelar temporalmente los Excel\.
- Establecer fecha oficial de inicio\.

__Entregable__

Base de producción preparada y validada\.

__Etapa 18\. Implementación en el VPS__

__Actividades__

- Preparar Ubuntu Server\.
- Configurar Nginx\.
- Configurar PHP\-FPM\.
- Instalar PostgreSQL\.
- Instalar Redis\.
- Configurar workers y Scheduler\.
- Configurar dominio\.
- Instalar certificado HTTPS\.
- Configurar firewall\.
- Configurar respaldos\.
- Desplegar la aplicación\.
- Verificar la PWA\.
- Configurar monitoreo\.

__Entregable__

Sistema disponible en producción mediante un dominio seguro\.

__Etapa 19\. Capacitación y puesta en marcha__

__Capacitaciones__

- Administrador general\.
- Encargados de sucursal\.
- Vendedores\.
- Almaceneros\.

__Contenido__

- Inicio de sesión\.
- Compras y entradas\.
- Ventas y salidas\.
- Transferencias\.
- Pagos\.
- Cierre diario\.
- Trabajo sin conexión\.
- Sincronización\.
- Resolución de errores básicos\.
- Procedimiento de contingencia\.

__Entregables__

- Manual de usuario\.
- Guía rápida\.
- Videos cortos opcionales\.
- Lista de responsables por sucursal\.
- Acta de capacitación\.

__Etapa 20\. Prueba piloto__

No recomiendo activar todas las tiendas el mismo día\.

__Estrategia__

1. Iniciar con Juliaca\.
2. Agregar una sucursal con movimiento frecuente\.
3. Revisar inventario, ventas y sincronización\.
4. Corregir problemas\.
5. Incorporar las demás sucursales progresivamente\.

__Entregable__

Informe del piloto y autorización para el despliegue general\.

__Etapa 21\. Soporte posterior__

__Incluye__

- Corrección de errores\.
- Seguimiento de sincronización\.
- Revisión de inventarios\.
- Apoyo a usuarios\.
- Ajustes menores\.
- Supervisión del servidor\.
- Revisión de respaldos\.
- Optimización de consultas\.

Las nuevas funcionalidades deben cotizarse por separado\.

__Entregas recomendadas__

__Entrega 1: Administración básica__

- Usuarios\.
- Roles\.
- Dispositivos\.
- Sucursales\.
- Catálogo\.

__Entrega 2: Inventario central__

- Inventario por sucursal\.
- Compras\.
- Entradas\.
- Ventas\.
- Salidas\.
- Kardex\.

__Entrega 3: Operaciones avanzadas__

- Transferencias\.
- Clientes\.
- Pagos\.
- Cuentas por cobrar\.

__Entrega 4: PWA__

- Instalación\.
- IndexedDB\.
- Operaciones offline\.
- Sincronización\.
- Conflictos\.

__Entrega 5: Control administrativo__

- Cierre diario\.
- Alertas\.
- Reportes\.
- Exportaciones\.

__Entrega 6: Producción__

- Migración\.
- VPS\.
- Capacitación\.
- Piloto\.
- Puesta en marcha\.

__Prioridad técnica__

El orden más seguro para construir el sistema es:

Usuarios y sucursales

        ↓

Catálogo

        ↓

Motor de inventario

        ↓

Kardex

        ↓

Compras y ventas

        ↓

Transferencias

        ↓

Pagos

        ↓

PWA local

        ↓

Sincronización

        ↓

Conflictos

        ↓

Cierre diario

        ↓

Alertas y reportes

No conviene comenzar directamente por la PWA\. Primero debe existir un motor central de inventario estable, porque la sincronización offline reutilizará exactamente las mismas reglas del backend\.

__Criterio de finalización__

El sistema estará listo para producción cuando:

- El inventario y el Kardex coincidan\.
- Los permisos por sucursal funcionen\.
- Las ventas no puedan duplicarse\.
- Las transferencias respeten sus estados\.
- Los pagos calculen correctamente los saldos\.
- Las operaciones offline sobrevivan al cierre del navegador\.
- La sincronización sea idempotente\.
- Los conflictos puedan revisarse\.
- El cierre no acepte operaciones pendientes\.
- Los respaldos puedan restaurarse\.
- El cliente apruebe la prueba piloto\.

