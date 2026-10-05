# Documentación del Sistema de Notificaciones Inteligentes y Mejoras de Usabilidad

## 1. Visión General
Esta actualización moderniza y expande el sistema de notificaciones de la plataforma, dotándolo de capacidades multicanal, compatibilidad con notificaciones nativas de escritorio (Web Notifications API), payload polimórfico estandarizado y cobertura transversal en múltiples módulos operativos del negocio.

---

## 2. Eventos y Notificaciones Soportadas

| Categoría | Clase de Notificación | Evento Desencadenante | Destinatarios | Enlace Directo (`action_url`) |
| :--- | :--- | :--- | :--- | :--- |
| **Traslados** | `TransferRequestedNotification` | Solicitud de traslado, despacho en camino, recepción de mercadería con o sin discrepancias | Usuarios de la sucursal origen/destino y Super Admin | `/transfers/{id}` |
| **Cobranzas y Ventas** | `PaymentReceivedNotification` | Abono registrado o cancelación total de una cuenta por cobrar | Cajeros/personal de la sucursal y Super Admin | `/receivables/{id}` |
| **Cierres de Caja** | `DailyClosingDiscrepancyNotification` | Cierre diario confirmado con descuadre (faltante o sobrante $\ge 0.01$) | Administradores y cajeros de la sucursal | `/closings/{id}` |
| **Inventario** | `StockAlertNotification` | Repuesto agotado (stock 0) o alcance de nivel de seguridad mínimo | Personal de almacén y administradores | `/inventory` |

---

## 3. Arquitectura del Backend

### 3.1. Estandarización del Payload (`NotificationController.php`)
El endpoint `GET /api/notifications/unread` transforma los registros de la tabla `notifications` en una estructura uniforme:

```json
{
  "id": "uuid-de-notificacion",
  "type": "App\\Notifications\\PaymentReceivedNotification",
  "created_at": "2026-10-04T21:18:29.000000Z",
  "read_at": null,
  "data": {
    "title": "Abono Registrado",
    "message": "Transportes SAC abonó S/ 300.00 (Venta B001-0001). Saldo restante: S/ 200.00.",
    "action_url": "/receivables/1",
    "category": "sales",
    "severity": "info",
    "amount": 300.0,
    "customer_name": "Transportes SAC"
  }
}
```

### 3.2. Endpoints Disponibles
- `GET /api/notifications/unread`: Obtiene hasta las últimas 20 notificaciones no leídas formateadas.
- `POST /api/notifications/{id}/read`: Marca una notificación individual como atendida y leída.
- `POST /api/notifications/read-all`: Marca todas las notificaciones pendientes del usuario como leídas.

---

## 4. Frontend y Experiencia de Usuario (`notifications-menu.tsx`)

### 4.1. Icono y Disparador Visual (Campanita)
- **Componente:** `Bell` de `lucide-react` con dimensiones garantizadas `size-5 shrink-0` en un botón `h-9 w-9`.
- **Badge Flotante:** Badge rojo circular (`bg-red-600`) posicionado en la esquina superior derecha (`-top-1 -right-1`) para no superponer ni tapar el cuerpo de la campanita.

### 4.2. Capacidades del Menú Desplegable
1. **Limpieza en 1 Clic:** Botón *"Limpiar todo"* en la cabecera del popover que invoca `/api/notifications/read-all`.
2. **Pestañas de Filtrado Dinámico:** Botones de filtro rápido (*Todas*, *Traslados*, *Cobranzas*, *Cierres*, *Inventario*) que aparecen según el tipo de notificaciones existentes.
3. **Navegación al Detalle:** Al hacer clic en un aviso, se marca como leído automáticamente y se redirige con `router.visit(action_url)`.
4. **Notificaciones de Escritorio (Web Push API):** Botón *"Escritorio"* para solicitar permisos al usuario y emitir avisos del sistema operativo cuando la pestaña se encuentra minimizada o en segundo plano.
5. **Optimización de Polling:** Se respeta `document.hidden` para pausar consultas innecesarias en segundo plano y refrescar de inmediato al volver a enfocar la aplicación.

---

## 5. Pruebas Automatizadas

Se cuenta con una suite completa de pruebas Pest en `tests/Feature/NotificationTest.php`:
- `it returns unread notifications with standardized payload`
- `it marks a single notification as read`
- `it marks all notifications as read`
- `payment notification is structured with sales category and proper details`
- `daily closing discrepancy notification is structured with closings category`

Todas las pruebas se ejecutan con:
```bash
php artisan test --compact tests/Feature/NotificationTest.php
```
