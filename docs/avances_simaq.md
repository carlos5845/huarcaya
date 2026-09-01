# Historial de Desarrollo - SIMAQ (Actualización Reciente)

Este documento detalla todas las implementaciones, correcciones y mejoras realizadas en el sistema SIMAQ hasta la fecha actual.

## 1. Seguridad y Autorización (Roles y Permisos)

### Protección Estricta de Rutas (Backend)
- Se han envuelto todas las rutas principales de los módulos (`/dashboard`, `/inventory`, `/sales`, `/purchases`, `/brands`, `/categories`, etc.) dentro de grupos con el middleware `role_or_permission:` de Spatie en `routes/web.php`.
- **Propósito:** Prevenir que los usuarios accedan a módulos para los que no tienen permiso escribiendo la URL manualmente (lo que generaría una brecha de seguridad).

### Redirección Dinámica post-login (Fortify)
- Se detectó que al bloquear el `/dashboard` para los usuarios sin dicho permiso, el sistema devolvía un error `403 Forbidden` inmediatamente después de hacer login (debido a que Laravel Fortify redirigía por defecto a `/dashboard`).
- **Solución:** 
  - Se cambió la ruta por defecto de Fortify en `config/fortify.php` a `home => '/init'`.
  - Se creó la ruta `/init` en `routes/web.php` que analiza en tiempo real los permisos del usuario logueado y lo redirige automáticamente al primer módulo al que tenga acceso (Dashboard, Inventario, Ventas, Compras, etc.).

### Botones Dinámicos en la Landing Page (`welcome.tsx`)
- Los botones de navegación o inicio rápido en la página principal ahora analizan el prop `auth.permissions` en el Frontend. 
- En lugar de decir estáticamente "Ir al Dashboard", el sistema renderiza el destino basado en los accesos (ej. "Ir al Inventario", "Ir a Ventas").

## 2. Gestión de Inventarios (Permisos Granulares)

### Separación de Permisos: Inventario Común vs Inventario General
- Se implementó la diferenciación entre dos niveles de permisos para visualizar el inventario:
  - **Inventario Común:** El usuario solo puede ver y gestionar el stock de su sucursal asignada (filtro bloqueado u oculto).
  - **Inventario General:** El usuario puede seleccionar y visualizar los inventarios de cualquiera de las sucursales de la empresa mediante un dropdown.
- **Implementación:** Se actualizaron las interfaces y los controladores de `Kardex`, `Inventory`, y `Adjustments` para renderizar el selector de sucursal únicamente si el usuario es "Super Admin" o posee el permiso `view_inventory_general`.

### Accesibilidad en la Barra Lateral (`app-sidebar.tsx`)
- Se corrigió la visibilidad del módulo de inventario en la barra lateral, habilitándolo si el usuario tiene `view_inventory` o `view_inventory_general`.

## 3. Buscadores Globales y Tolerancia de Caracteres

### Búsqueda Insensible a Mayúsculas y Tildes
- **Backend:** Se implementó compatibilidad en la base de datos (tanto para SQLite en desarrollo como PostgreSQL en producción) permitiendo buscar términos sin considerar acentos (ej. "Peña" y "PEÑARANDA" arrojan el mismo resultado).
- **Frontend:** Se implementó una función utilitaria `normalizeSearch` en los componentes de React para limpiar tildes y convertir los términos a minúsculas, filtrando arreglos locales sin conflictos con caracteres especiales.

## 4. Correcciones en Formularios e Interfaz (UI/UX)

### Obligatoriedad de Documentos en Clientes y Proveedores
- **Problema:** El sistema permitía registrar clientes/proveedores sin Tipo de Documento ni Número de Documento. Esto causaba la creación accidental de registros duplicados bajo el mismo nombre.
- **Solución:**
  - Se actualizaron las validaciones en `CustomerController` y `SupplierController` cambiando `nullable` por `required` en los campos `document_type` y `document_number`.
  - Se añadió la validación HTML `required` y el indicador visual `*` (asterisco rojo) en los formularios `create.tsx` e `index.tsx` correspondientes.
  - Al ser obligatorios, la lógica estricta del backend que rechaza duplicados actúa efectivamente sobre cada nuevo registro.

### Traducción de Autenticación
- Se tradujo completamente al español la vista de confirmación de contraseña (`confirm-password.tsx`) utilizada para áreas seguras de la aplicación (texto, placeholders, botones y labels).

### Limpieza de Layouts Duplicados (Configuración)
- **Problema:** En el panel de configuración, al ingresar a la opción de "Empresa", el menú lateral se renderizaba por duplicado (un efecto inception).
- **Solución:** Se corrigió el archivo `company.tsx` para eliminar la importación y envoltura explícita de `<SettingsLayout>`, ya que el archivo principal `app.tsx` de Inertia ya se encargaba de inyectar este layout automáticamente para todas las rutas dentro de `/settings`.

---
*Documentación generada automáticamente como registro de los avances recientes de la fase actual.*
