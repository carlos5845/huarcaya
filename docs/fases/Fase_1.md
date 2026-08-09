# Fase 1: Organización y Seguridad

## Resumen de la Fase
En esta primera fase establecimos las bases organizativas del sistema. Extendimos la autenticación estándar de Laravel (Starter Kit) para que soporte nuestro esquema multi-sucursal y la infraestructura de dispositivos para la futura PWA.

## Tareas Completadas

1. **Instalación de Dependencias**
   - **Backend:** Instalamos `spatie/laravel-permission` para gestionar de forma robusta los roles y permisos, evitando crear tablas propias redundantes.
   - **Frontend:** Instalamos los cimientos del motor PWA (`vite-plugin-pwa`, `dexie`, `dexie-react-hooks`, `zod`, `uuid`).

2. **Migraciones Creadas/Modificadas (Tablas Base)**
   - `0000_01_01_000001_create_companies_table`: Administra la empresa matriz (soporta multi-empresa futura).
   - `0000_01_01_000002_create_branches_table`: Establecimientos físicos (tiendas o almacenes).
   - `users` (Extendida): Añadimos los campos `uuid`, `company_id`, `default_branch_id`, y controles de seguridad como `must_change_password` y `status`.
   - `2026_08_07_234652_create_user_branches_table`: Define el alcance territorial. Indica en qué sucursales específicas puede operar un usuario.
   - `2026_08_07_234655_create_devices_table`: Control de dispositivos físicos y su estado de sincronización.
   - `2026_08_07_234657_create_device_users_table`: Tabla pivote que autoriza a un usuario específico en una caja/dispositivo específico.

## Modelos Eloquent
Se han creado los modelos `Company`, `Branch`, `UserBranch`, `Device` y `DeviceUser` (relaciones pendientes de documentar según avancemos).
