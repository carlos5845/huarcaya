# Fase 2: Catálogo de Productos y Kits

## Estado
**COMPLETADO** ✅

## Tareas Realizadas

1. **Creación de Migraciones y Modelos Base:**
   Se generaron las migraciones y modelos para las 13 entidades que conforman el catálogo y el sistema de kits:
   - `brands` (Marcas)
   - `categories` (Categorías)
   - `units` (Unidades de medida)
   - `products` (Productos maestros)
   - `product_aliases` (Alias de referencias)
   - `product_prices` (Precios)
   - `product_min_prices` (Precios mínimos)
   - `product_min_stocks` (Stocks mínimos)
   - `warehouse_locations` (Ubicaciones físicas en almacén)
   - `kit_versions` (Versiones de un Kit)
   - `kit_components` (Componentes de cada versión de Kit)
   - `assembly_orders` (Órdenes de Ensamblaje de Kits)
   - `assembly_order_components` (Detalle de uso en la Orden)

2. **Aplicación de Esquema Físico (PostgreSQL):**
   - Se configuraron los atributos y restricciones `UNIQUE` (ej: `company_id` y `normalized_name` en brands).
   - Se aplicaron las llaves foráneas (`foreignId`) alineadas con la Fase 1 y las políticas de eliminación en cascada (`cascadeOnDelete`) o restricción (`restrictOnDelete`) según el modelo lógico.
   - Uso de `uuid` como campo único en todas las tablas.
   - Uso de `decimal(15, 6)` para cantidades, montos, precios y stocks.
   - Se ejecutó satisfactoriamente `php artisan migrate`.

3. **Configuración de Modelos Eloquent:**
   - Se asignaron todos los campos a `$fillable` de cada uno de los 13 modelos.
   - Se establecieron las conversiones necesarias (ej: booleanos y `decimal:6` a través de la función `casts()`).
   - Se mapearon las relaciones `HasMany` y `BelongsTo` (ej: un producto pertenece a una marca, categoría y unidad; un kit tiene componentes, etc.).

## Base de Datos
Todos los esquemas de esta fase se han aplicado al entorno local correctamente y reflejan el modelo lógico propuesto para resolver la complejidad de precios, kits y manejo multimarca.
