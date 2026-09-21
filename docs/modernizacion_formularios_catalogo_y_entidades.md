# Documentación: Modernización de Formularios del Catálogo Maestro y Entidades Comerciales

Este documento describe las mejoras, reestructuración ergonómica y optimizaciones de experiencia de usuario (UX) implementadas en los formularios de **Repuestos (Productos)**, **Marcas**, **Categorías**, **Unidades de Medida**, **Clientes** y **Proveedores**.

---

## 1. Formulario de Repuestos / Productos (`catalog/products/form.tsx`)

### Problemática Previa
- El formulario estaba fragmentado en 3 pestañas (`Datos Generales`, `Códigos y Alias`, `Configuración Comercial`), provocando que campos críticos como el **Tipo de Producto** (`SIMPLE`, `KIT_UNICO`, `KIT_COMPONENTES`) o el **Estado** pasaran desapercibidos al estar ocultos en la última pestaña.
- Carencia de una vista previa en tiempo real de la ficha técnica.

### Mejoras Realizadas
1. **Layout Ergonómico en 2 Columnas**:
   - **Columna Principal (8 columnas)**:
     - **Bloque 1: Identificación y Referencias**:
       - *Referencia Principal*: Input mono en mayúsculas con verificación debounced de unicidad/similitud en tiempo real conectada a `/products/check-similarity` y badges de estado compactos.
       - *Código Interno (SKU / barras)* y *Nombre Comercial*.
       - *Referencias Secundarias y Alias*: Sub-bloque integrado con contador dinámico de alias (`#1`, `#2`...) para registrar códigos alternativos de fabricantes o clientes sin cambiar de pantalla.
     - **Bloque 2: Clasificación Técnica**:
       - Grid responsivo de 3 columnas para **Marca**, **Categoría** y **Unidad de Medida**.
       - Los botones de acción rápida (`+ Nueva` y `⚙ Gestionar`) se reubicaron en la fila del `Label` de cada campo, permitiendo que los selectores ocupen el 100% del ancho (`w-full`) sin colapsos ni desbordamientos horizontales.
       - Área de texto para *Descripción Técnica / Observaciones*.
     - **Bloque 3: Clasificación Operativa y Estado**:
       - Selector visual mediante **Tarjetas Interactivas Clickeables** para el *Tipo de Producto*:
         - `SIMPLE`: Repuesto individual para stock y venta directa.
         - `KIT_UNICO`: Kit pre-armado con lote y costo consolidado.
         - `KIT_COMPONENTES`: Kit virtual que descuenta existencias dinámicamente de sus componentes.
       - Selector visual de *Estado de Catálogo* (`Activo` vs `Inactivo`).
   - **Columna Lateral (4 columnas, Sticky)**:
     - **Ficha Técnica en Vivo (Live Preview)**:
       - Muestra en tiempo real la referencia principal, descripción comercial, badges de marca, categoría, unidad, lista de alias y recordatorio de políticas de inventario (*Trazabilidad por Lotes obligatoria* y *Salida FIFO automática*).
     - **Barra de Acciones**: Botones de "Guardar Repuesto" (con spinner `Loader2`) y "Cancelar".

---

## 2. Gestores Modales (`BrandManager`, `CategoryManager`, `UnitManager`)

### Mejoras Realizadas
1. **Auto-selección Inmediata tras la Creación**:
   - Al registrar una nueva marca, categoría o unidad mediante el modal `+`, el sistema detecta el nuevo registro en el callback `onSuccess` de Inertia y lo selecciona automáticamente en el formulario sin requerir que el operador lo busque de nuevo.
2. **Reemplazo de `<select>` HTML por Shadcn `<Select>`**:
   - Se erradicaron los selectores estándar de HTML para el estado y categoría padre, garantizando una estética homogénea en modo claro y oscuro.
3. **Buscador en Tiempo Real en "Gestionar"**:
   - Los diálogos de gestión ahora cuentan con una barra de búsqueda para filtrar colecciones grandes por nombre o código.
   - Acceso rápido a "+ Nueva [Entidad]" desde la cabecera del diálogo de gestión.

---

## 3. Directorio y Formulario de Clientes (`catalog/customers/index.tsx`)

### Mejoras Realizadas
1. **Modal de Registro / Edición Rediseñado (2 Columnas)**:
   - **Bloque 1: Identificación Tributaria**:
     - Selector de tipo de documento (`DNI`, `RUC`, `CE`, `PASAPORTE`, `OTRO`).
     - Input con **contador de caracteres en vivo** (`8/8` para DNI, `11/11` para RUC) y auto-filtrado numérico.
     - Razón Social / Nombre Completo y Nombre Comercial opcional.
   - **Bloque 2: Contacto y Ubicación**: Teléfono, Correo Electrónico y Dirección Fiscal.
   - **Bloque 3: Estado Operativo**: Selector visual interactivo para `Activo` vs `Inactivo` tanto en creación como en edición.
   - **Ficha de Cliente en Vivo**: Tarjeta lateral interactiva que detecta automáticamente si el contribuyente es *Persona Jurídica (RUC 20)* o *Persona Natural (DNI/RUC 10)*.
2. **Pestañas de Filtrado Rápido en la Tabla**:
   - Tabs `Todos`, `Activos` e `Inactivos` con conteo de registros en tiempo real.

---

## 4. Directorio y Formulario de Proveedores (`catalog/suppliers/index.tsx`)

### Mejoras Realizadas
1. **Modal de Registro / Edición Rediseñado (2 Columnas)**:
   - **Bloque 1: Identificación Fiscal / SUNAT**: Tipo de documento (`RUC` predeterminado), número de documento con contador en vivo, Razón Social y Nombre Comercial.
   - **Bloque 2: Contacto Comercial y Condiciones**: Asesor de ventas / contacto, teléfono, correo electrónico, dirección fiscal y área para **Condiciones Comerciales / Notas Internas** (crédito, plazos, días de despacho).
   - **Bloque 3: Estado Operativo**: Selector visual para `Activo` vs `Inactivo`.
   - **Ficha de Proveedor en Vivo**: Tarjeta lateral con resumen de datos fiscales, contacto y condiciones de compra.
2. **Pestañas de Filtrado Rápido en la Tabla**:
   - Tabs `Todos`, `Activos` e `Inactivos` sincronizadas con la tabla TanStack.

---

## 5. Control de Calidad y Verificación

- **Compilación de Frontend**: `npm run build` ejecutado exitosamente con 0 advertencias de tipo y generación completa de bundles Vite.
- **Pruebas Automatizadas**:
  - `CustomerTest`: Aprobado (4 pruebas, 7 aserciones).
  - `PurchaseFlowTest`: Aprobado (5 pruebas, 36 aserciones).
  - `CompleteProductFlowTest`: Aprobado (1 prueba, 19 aserciones).
- **Estándar de Código**: `vendor/bin/pint --dirty --format agent` verificado.
