# Resumen de Progreso - Etapa 9: Transacciones (Compras y Ventas)

**Fecha de actualización:** 19 de Agosto de 2026
**Rama de desarrollo:** `feature/etapa-9-transacciones`

## 📦 Lo que se ha completado hasta ahora

### 1. Gestión de Entidades Base
- **Módulo de Clientes:** Implementado (`CustomerController` y vistas en React). Validaciones de documentos duplicados funcionando.
- **Módulo de Proveedores:** Implementado (`SupplierController` y vistas en React). 

### 2. Módulo de Compras (Entradas)
- **Modelos y Migraciones:** 
  - `Purchase` y `PurchaseLine` validados y con sus relaciones.
  - Generación de `Lot` (Lotes) automática a partir de compras confirmadas.
- **Lógica de Backend (`PurchaseController`):**
  - **Estado Borrador:** La compra se crea inicialmente como "DRAFT". Si el usuario que registra no tiene `branch_id`, se asume la sucursal por defecto.
  - **Confirmación (`confirm`):** Mueve la compra a "CONFIRMED", interactúa con `KardexService` para generar las entradas físicas (KardexEntry) y recalcula el costo promedio.
- **Frontend (React/Inertia):**
  - Vista Index (Listado de historial de compras con estados).
  - Vista Create (Formulario de nueva compra con búsqueda asíncrona de Repuestos usando la API del `ProductController`).
  - Vista Show (Detalles de compra en borrador y botón de "Confirmar e Ingresar a Kardex").
- **Correcciones UI/UX:**
  - Remoción de envoltorios redundantes `<AppLayout>` que causaban la duplicación del Sidebar.
  - Configuración de `breadcrumbs` como propiedades estáticas de layout para Inertia v3.
  - Ajustes de `route()` no definidos en el entorno JS (Wayfinder/Ziggy) usando URLs relativas.

### 3. Modelo Kardex
- **Reparación de Relaciones:** Se implementaron las relaciones `user()`, `originalEntry()` y `reversedByEntry()` en `App\Models\KardexEntry` para evitar caídas de vistas por `RelationNotFoundException`.

---

## ⏳ Tareas Pendientes para continuar (Próxima Sesión)

### 1. Módulo de Ventas (Salidas)
- [ ] Desarrollar `SaleController` (backend) que gestione la creación de ventas en estado "DRAFT".
- [ ] Construir la lógica de confirmación de Venta:
  - Consumo del Stock General vía `KardexService`.
  - **Descarga de Lotes (PEPS/FIFO):** Buscar los lotes más antiguos del producto en la sucursal (`Lot::where('quantity', '>', 0)->orderBy('created_at')`) y descontar progresivamente las cantidades requeridas, registrando en `lot_allocations`.
  - Validar rígidamente que `cantidad_solicitada <= stock_disponible` antes de permitir la salida.
- [ ] Desarrollar las interfaces en React: `sales/index.tsx`, `sales/create.tsx` (con buscador de repuestos, cálculo de subtotales, e IGV) y `sales/show.tsx`.

### 2. Módulo de Ajustes Manuales (Entradas/Salidas misceláneas)
- [ ] Crear interfaces simplificadas para hacer correcciones de inventario (Entradas/Salidas directas) sin comprobantes tributarios, pero dejando rastros de auditoría obligatorios (motivos de ajuste).

### 3. Pruebas de Integración y Merge
- [ ] Probar el flujo completo "Compra de Repuestos -> Kardex -> Venta de Repuestos -> Descuento Kardex/Lotes".
- [ ] Validar los costos ponderados en el Kardex.
- [ ] Finalizar los detalles y crear un Merge Request/Pull Request de `feature/etapa-9-transacciones` hacia la rama principal (`main`).
