# Documentación de Implementación: Etapa 7 y Etapa 8

El presente documento detalla el cumplimiento de la **Etapa 7: Catálogo e inventario inicial** y la **Etapa 8: Motor de inventario y Kardex**, en base al documento rector `Plan_de_trabajo_para_desarrollar_el_sistema.md`.

---

## ETAPA 7: Catálogo e inventario inicial

### Objetivo
Desarrollar un catálogo centralizado para gestionar repuestos y sus atributos, y preparar el modelo de datos para separar inventarios por sucursal.

### Funcionalidades Implementadas

1. **Marcas, Categorías y Unidades de medida**: 
   - Se crearon los módulos completos (`CRUD` y vistas) para administrar `Brands`, `Categories` y `Units`.
   - Se implementó la normalización de textos (mayúsculas) y validación estricta en la Base de Datos para evitar duplicados (ej: "AUTRISA" vs "autrisa").
   - Las validaciones frontend (Inertia + React) muestran mensajes de error amigables.

2. **Registro de repuestos (Catálogo Central)**:
   - Pantalla principal `/products` que permite listar, buscar y filtrar.
   - Manejo de códigos y referencias principales y alternas (`primary_reference`, `internal_code`, `oem_code`).
   - Soporte para diferentes tipos de repuestos.

3. **Precios, Costos y Stock mínimo**:
   - Tablas `product_prices`, `product_minimum_prices`, y `product_minimum_stocks`.
   - Soporte para reglas de precios por sucursal.

4. **Inventario por Sucursal**:
   - Creación de la tabla `inventories` con la llave compuesta única `(branch_id, product_id)`.
   - Esto aísla el stock, garantizando que el inventario y costo de una sucursal no afecte a otra.

5. **Importación desde Excel**:
   - Lógica de importación mediante `ProductImportController` con validación masiva.
   - Permite cargar inventario y repuestos validando datos faltantes o nulos permitidos.

**Estado del Entregable:** ✅ **Completado.** (Catálogo centralizado e inventario inicial separado por sucursal).

---

## ETAPA 8: Motor de inventario y Kardex

### Objetivo
Desarrollar el core financiero y logístico del sistema: un motor matemático a prueba de fallas para auditar entradas, salidas y promedios ponderados en entornos concurrentes.

### Funcionalidades Implementadas

1. **Registro único de movimientos y Kardex Automático**:
   - Creación de la tabla `kardex_entries` con soporte para datos de auditoría (`sequence_number`, `user_id`, `device_id`, `operation_date`, `operation_type`).
   - Cálculos matemáticos precisos del **Costo Promedio Ponderado Móvil** en el módulo centralizado `app/Services/KardexService.php`.

2. **Transacciones de base de datos y Bloqueos (Concurrency)**:
   - Uso de transacciones nativas de base de datos (`DB::transaction`).
   - Uso de bloqueo de fila pesimista (`lockForUpdate()`) al leer `Inventory`. Esto evita las temidas condiciones de carrera (ej. cuando dos cajeros venden la última bujía exactamente en el mismo milisegundo).

3. **Prevención estricta de stock negativo**:
   - Antes de registrar una salida (`recordExit`), el servicio valida rígidamente si existe suficiente stock físico. Si no lo hay, la transacción aborta automáticamente arrojando una excepción "No existe inventario o stock insuficiente".

4. **Reversión controlada de operaciones**:
   - Implementación de la regla sagrada contable: "Nunca se elimina un movimiento financiero, se revierte".
   - El método `reverseMovement()` toma un registro y genera automáticamente un movimiento espejo (una salida si era entrada, y viceversa) usando referencias cruzadas `original_entry_id` y `reversed_by_entry_id`.
   - Protección contra doble reversos (un registro ya revertido no puede revertirse de nuevo).

5. **Consulta del historial**:
   - Se construyó la interfaz React en `/kardex` con un tablero analítico de Entradas, Salidas y Saldos.
   - Diferenciación de colores en frontend (Entradas Verdes, Salidas Naranjas, Reversos Rojos y tachados).

### Pruebas Críticas Superadas (Pest PHP)

Se construyó una suite de pruebas rigurosas en `tests/Feature/KardexServiceTest.php` que certifican el cumplimiento de los requerimientos:

- ✅ *Dos usuarios intentan vender la última unidad:* Soportado por `lockForUpdate`.
- ✅ *Una operación falla durante su registro:* Protegido por `DB::transaction()`.
- ✅ *Una salida no puede duplicarse:* Lógica de idempotencia mediante `UUID` (preparado para PWA/Offline).
- ✅ *El saldo del Kardex coincide con el inventario:* Validado en pruebas mediante `expect()`.
- ✅ *Las operaciones anuladas generan movimientos inversos:* Validado; el saldo físico retorna a 0 tras revertir la entrada inicial.
- ✅ *Una sucursal no afecta el inventario de otra:* Separación lógica por `branch_id`.

**Estado del Entregable:** ✅ **Completado.** (Motor central de inventario estable, matemáticamente probado y a prueba de fallos).
