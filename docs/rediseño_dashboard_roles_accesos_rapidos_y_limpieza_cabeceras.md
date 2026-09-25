# Documentación Técnica: Rediseño de Dashboard por Rol, Accesos Rápidos y Limpieza de Cabeceras

**Fecha:** 24 de Septiembre de 2026  
**Rama:** `feature/etapa-10-transferencias`  
**Estado:** Implementado, compilado y verificado con pruebas automatizadas (Pest).

---

## 1. Resumen Ejecutivo de Cambios

En esta iteración se realizaron cuatro grandes grupos de mejoras en el sistema:
1. **Corrección de formato decimal** en amortizaciones de Cuentas por Cobrar.
2. **Arquitectura y Rediseño Completo del Dashboard (`/dashboard`)**:
   - Separación de vistas y métricas según el rol: **Administrador** vs. **Usuario Normal (Operativo)**.
   - Botonera superior de **Accesos Rápidos (Quick Actions)** con iconos a color.
   - Encabezado personalizado de bienvenida con **Nombre**, **Rol** y **Sucursal Asignada**.
3. **Limpieza de Migas de Pan Redundantes en 20 Módulos del Sistema**:
   - Eliminación de la doble cabecera (`Dashboard › [Módulo]`) que duplicaba el título de la barra superior.
4. **Pruebas Automatizadas y Compilación**:
   - Suite Pest completa para el dashboard y verificación de activos con Vite.

---

## 2. Detalle de Implementaciones

### A. Formato Decimal en Cuentas por Cobrar (`receivables/show.tsx`)
- **Problema**: Al hacer clic en "Registrar Pago" en el detalle de una deuda, el input precargaba el saldo con precisión excesiva de base de datos (ej. `140.000000`).
- **Solución**:
  - Se formateó con `parseFloat(balance).toFixed(2)` en la inicialización y en el evento `onOpenChange` del modal.
  - Se delimitó el atributo `max` con 2 decimales.
  - Corrección tipográfica en la etiqueta `Método de Pago`.

---

### B. Arquitectura Backend: `DashboardController`
Se desacopló la lógica que residía como un closure en `routes/web.php` hacia [`app/Http/Controllers/DashboardController.php`](file:///d:/inversiones/huarcaya/app/Http/Controllers/DashboardController.php):

- **Control de Acceso y Roles**:
  - Identificación de perfil administrativo: `$user->hasRole('Super Admin') || $user->hasRole('Gerente') || $user->hasRole('Administrador de Tienda')`.
  - Roles operativos: `Cajero`, `Almacenero`, etc.
  - Actualización de [`database/seeders/RolesAndPermissionsSeeder.php`](file:///d:/inversiones/huarcaya/database/seeders/RolesAndPermissionsSeeder.php) sincronizando el permiso `view_dashboard` para que todos los roles autorizados puedan acceder.
- **Gestión de Sucursales**:
  - **Admin**: Acceso a "Todas las sucursales" (`all`) o filtro por sucursal específica.
  - **Normal**: Limitado automáticamente a su sucursal por defecto (`default_branch_id`) o asignada.
- **Estructura de Datos `user_info`**:
  - `name`: Nombre del usuario autenticado.
  - `role_name`: Nombre legible del rol asignado.
  - `branch_name`: Nombre de la sucursal de operación o `Acceso Global`.

---

### C. Vistas Diferenciadas en el Dashboard (`resources/js/pages/dashboard.tsx`)

#### 1. Banner Superior de Bienvenida
- Saludo personalizado: `¡Hola, [Nombre]! 👋`
- Badge con icono `ShieldCheck` indicando el rol activo.
- Badge con icono `MapPin` indicando la sucursal activa.
- Subtítulo explicativo con el alcance de sus funciones.
- Indicador visual `Sistema en vivo` con pulso dinámico.

#### 2. Barra de Accesos Rápidos con Iconos a Color
Diseñada con tarjetas interactivas, badges temáticos a todo color y micro-animaciones al pasar el cursor (`hover:scale-110`):
- **Para Administrador**:
  - 🛒 *Nueva Venta* (`/sales/create`) - Icono Verde Esmeralda (`bg-emerald-500/10 text-emerald-600`)
  - 📥 *Nueva Compra* (`/purchases/create`) - Icono Azul Cielo (`bg-sky-500/10 text-sky-600`)
  - 🔄 *Transferencia* (`/transfers/create`) - Icono Ámbar (`bg-amber-500/10 text-amber-600`)
  - 📦 *Consultar Stock* (`/inventory`) - Icono Índigo (`bg-indigo-500/10 text-indigo-600`)
  - 💳 *Cobranzas* (`/receivables`) - Icono Púrpura (`bg-purple-500/10 text-purple-600`)
  - 📊 *Reporte Kardex* (`/kardex`) - Icono Carmesí (`bg-rose-500/10 text-rose-600`)
- **Para Usuario Normal**:
  - 🛒 *Nueva Venta (POS)* (`/sales/create`) - Verde Esmeralda
  - 📦 *Consultar Stock* (`/inventory`) - Índigo
  - 🔄 *Transferencias* (`/transfers`) - Ámbar
  - 👥 *Clientes* (`/customers`) - Azul Cielo

#### 3. Métricas y KPIs Condicionales
- **Administrador**:
  - *Ingresos del Mes* (Ventas confirmadas S/.) vs mes anterior.
  - *Gastos del Mes* (Compras a proveedores S/.) vs mes anterior.
  - *Ventas Realizadas* (Conteo total) vs mes anterior.
  - *Productos Activos* (Catálogo general).
- **Usuario Normal**:
  - *Mis Ventas del Mes* (Facturado por el propio usuario `created_by = auth()->id()`) vs mes anterior.
  - *Mis Ventas de Hoy* (Facturado hoy y conteo de tickets del día).
  - *Comprobantes del Mes* (Total emitido por el usuario).
  - *Stock en Tienda* (Productos con existencias físicas en su sucursal).
  - *Privacidad*: Los gastos confidenciales de compras a proveedores no se exponen al personal de tienda.

#### 4. Gráficos y Tablas
- **Administrador**: Gráfico comparativo de barras de ventas por vendedor, ranking desglosado con porcentaje de aporte del equipo, y últimas ventas globales.
- **Usuario Normal**: Gráfico de evolución de ventas diarias ("Mi Evolución de Ventas"), resumen de desempeño con ticket promedio, y tabla con sus últimas ventas realizadas para reimpresión o consulta directa.

---

### D. Eliminación de Migas de Pan Redundantes

Se eliminó la barra secundaria interna `Dashboard › [Módulo]` que se repetía justo debajo de la cabecera superior en 20 vistas:
1. `resources/js/pages/branches/index.tsx`
2. `resources/js/pages/users/index.tsx`
3. `resources/js/pages/catalog/products/index.tsx`
4. `resources/js/pages/catalog/customers/index.tsx`
5. `resources/js/pages/catalog/suppliers/index.tsx`
6. `resources/js/pages/sales/index.tsx`
7. `resources/js/pages/sales/create.tsx`
8. `resources/js/pages/sales/edit.tsx`
9. `resources/js/pages/sales/show.tsx`
10. `resources/js/pages/purchases/index.tsx`
11. `resources/js/pages/purchases/create.tsx`
12. `resources/js/pages/purchases/edit.tsx`
13. `resources/js/pages/purchases/show.tsx`
14. `resources/js/pages/transfers/index.tsx`
15. `resources/js/pages/transfers/create.tsx`
16. `resources/js/pages/transfers/show.tsx`
17. `resources/js/pages/inventory/adjustments/index.tsx`
18. `resources/js/pages/inventory/kardex/index.tsx`
19. `resources/js/pages/customer-returns/index.tsx`
20. `resources/js/pages/customer-returns/create.tsx`

Ahora la navegación se apoya exclusivamente en el componente oficial [`AppSidebarHeader`](file:///d:/inversiones/huarcaya/resources/js/components/app-sidebar-header.tsx), garantizando un diseño limpio, coherente y sin duplicaciones visuales.

---

## 3. Pruebas y Aseguramiento de Calidad

- **Pruebas Automatizadas (Pest)**:
  - Archivo: [`tests/Feature/DashboardTest.php`](file:///d:/inversiones/huarcaya/tests/Feature/DashboardTest.php)
  - Casos cubiertos:
    1. Redirección al login para invitados.
    2. Admin: verificación de recepción de `is_admin = true`, KPIs de compras y catálogo, gráfico comparativo y sedes.
    3. Usuario Normal: verificación de recepción de `is_admin = false`, ventas personales, ausencia de gastos de compras y limitación a sucursal.
  - Resultado: **Aprobadas al 100%**.
- **Compilación de Activos (Vite)**:
  - Comando: `npm run build`
  - Resultado: Compilación exitosa de todos los bundles JavaScript/TypeScript y CSS.
- **Estándares de Código**:
  - Código PHP formateado con Laravel Pint (`vendor/bin/pint --dirty --format agent`).
