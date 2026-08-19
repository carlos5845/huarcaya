# Etapa 6: Usuarios, roles, sesiones y sucursales

## Resumen de la Implementación
En esta etapa se establecieron las bases de seguridad, administración de personal, y control de accesos del Sistema de Gestión Integrado.

### 1. Sistema de Autenticación Personalizado
- **DNI como identificador:** Se configuró Laravel Fortify para que el inicio de sesión utilice el `dni` en lugar del correo electrónico tradicional.
- **Login de Dos Pasos:** La pantalla de inicio de sesión verifica primero la existencia del usuario mediante AJAX antes de solicitar la contraseña.
- **Contraseñas por Defecto:** Al crear un nuevo usuario, el sistema asigna el DNI como su contraseña inicial, obligándolo a modificarla en su primer inicio de sesión válido.

### 2. Gestión de Sucursales (Branches)
- **CRUD de Sucursales:** Módulo que permite administrar las tiendas físicas o sedes (Crear, Listar, Editar, Desactivar lógicamente).
- **Asignación de Sucursal Base:** Cada usuario tiene una "Sucursal Base" predeterminada al ser registrado en el sistema.
- **Branch Scope (Middleware):** Se preparó la estructura para que los usuarios estándar solo puedan visualizar y operar dentro de los datos correspondientes a su sucursal, aislando la información de otras sedes (A excepción del `Super Admin` que tiene visibilidad global).

### 3. Roles y Permisos (Spatie)
- **Implementación de Spatie/Laravel-Permission:** Para la administración granular de accesos.
- **Rol Inicial:** Creación e integración del rol `Super Admin`, el cual tiene acceso completo a todas las sucursales y gestión de usuarios.

### 4. Administración de Usuarios (CRUD)
- **Panel de Control:** Interfaz para crear, visualizar, editar y desactivar usuarios del sistema.
- **Desactivación Lógica:** Los usuarios no se eliminan físicamente de la base de datos (para mantener el historial y evitar problemas de integridad referencial). Se utiliza una columna `status` (ACTIVE/INACTIVE).
- **Restricción de Acceso:** Los usuarios con estado `INACTIVE` son automáticamente rechazados por el sistema de autenticación si intentan iniciar sesión.

### 5. Control de Sesiones y Límite de Dispositivos
- **Límite de Dispositivos Simultáneos:** Se estableció un límite global de **1 dispositivo activo por usuario**.
- **Regla de Bloqueo:** Si el usuario tiene una sesión activa (por ejemplo, en su celular o en su computadora) e intenta iniciar sesión desde un segundo dispositivo, el sistema rechazará la solicitud y mostrará una alerta clara indicando que ya tiene una sesión abierta.
- **Gestor Remoto de Sesiones:** El administrador del sistema puede visualizar (desde la tabla de Usuarios) una lista con las sesiones activas de cualquier empleado (incluyendo IP, Navegador, Sistema Operativo, Última actividad).
- **Cierre Remoto:** A través de un botón en el gestor, el Administrador puede destruir inmediatamente cualquier sesión en curso, liberando el acceso para que el usuario pueda volver a ingresar al sistema.
