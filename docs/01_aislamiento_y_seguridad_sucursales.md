# Documentacin de Aislamiento de Sucursales y Seguridad

## 1. Modelo de Asignacin de Usuarios a Sucursales

Se ha modificado la lgica de negocio para establecer que **cada usuario normal slo puede pertenecer a una nica sucursal a la vez**. Anteriormente, el sistema permita asignaciones mltiples a travs de la tabla `user_branches`, lo que generaba fugas de informacin (un usuario reasignado a una nueva sucursal an retena acceso a la antigua). 

**Acciones realizadas:**
- Limpieza en la base de datos para eliminar registros residuales en `user_branches`. Todo usuario posee ahora una nica asignacin sincronizada con su `default_branch_id`.
- Modificacin en `UserController@update` y `UserController@store`: Al reasignar un usuario desde el panel, el sistema automticamente borra la asignacin anterior y crea la nueva. 

## 2. Aislamiento de Vistas por Sucursal

Se implement un blindaje a nivel de interfaz de usuario y de servidor para garantizar que los usuarios regulares no tengan forma de ver ni interactuar con la informacin de otras sedes:

- **Configuracin de Productos (Precios y Stock):** Los selectores de sucursal para definir precios por excepcin, precios mnimos y stock mnimo se han ocultado por completo para usuarios normales. El backend asume automticamente la sucursal del usuario para cualquier guardado.
- **Kardex y Existencias:** La tabla de "Existencias Actuales por Sucursal" dentro de la ficha del producto fue filtrada a nivel de controlador (`ProductController`). Los usuarios slo ven la fila de su propia sucursal.
- **Selectores de Filtro:** Se eliminaron las opciones de buscar por sucursal en el mdulo de Ajustes de Inventario y Kardex para perfiles regulares.

## 3. Privilegios Extendidos del Super Admin

Para la cuenta con el rol **Super Admin**, se configur el sistema para mantener la visin global, aadiendo adems herramientas especficas:

- **Filtros Globales de Operaciones:** Se aadi un selector de "Todas las Sucursales" en los paneles de **Ventas (`sales/index.tsx`)** y **Compras (`purchases/index.tsx`)**.
- Los controladores `SaleController` y `PurchaseController` evalan si el solicitante es un Super Admin para aplicar el filtro dinmico o, de lo contrario, forzar obligatoriamente el `branch_id` del empleado que realiza la consulta.

## 4. Proteccin de la Cuenta Maestra (Super Admin)

Para evitar prdida de acceso al sistema (lockout) por errores humanos o sabotaje, se estableci un sistema de proteccin inviolable sobre la cuenta con el rol "Super Admin".

**Proteccin en Frontend (`users/index.tsx`):**
- El botn rpido de "Desactivar" cuenta est deshabilitado para el Super Admin.
- En la ventana modal de Edicin, los selectores de "Rol" estn deshabilitados, impidiendo degradar el nivel de la cuenta.

**Proteccin en Backend (`UserController.php`):**
- Validacin estricta en el mtodo `update`: Se aborta la peticin con error si se detecta un intento de modificar el rol o cambiar el `status` a `INACTIVE` en la cuenta Super Admin.
- Validacin estricta en el mtodo `destroy`: Se bloquea cualquier intento de conmutacin de estado mediante solicitudes directas a la API.

---
*Documentacin autogenerada tras la implementacin del sistema de aislamiento de sucursales.*
