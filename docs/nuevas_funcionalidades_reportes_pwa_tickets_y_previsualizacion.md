# Documentación de Nuevas Funcionalidades: Reportes, PWA Desktop, Tickets con Logo y Previsualización Integrada

**Fecha:** Octubre 2026  
**Rama:** `feature/etapa-10-transferencias` / Principal  
**Sistema:** Inversiones Huarcaya S.A.C.  

---

## 1. Resumen Ejecutivo de Implementaciones

En esta etapa se implementaron las siguientes mejoras operativas, visuales y de arquitectura en el sistema:

1. **Inclusión de Reportes Diarios, Semanales y Mensuales en Cuentas por Cobrar**:
   - Pestaña dedicada con filtros temporales preconfigurados (*Hoy / Diario*, *Esta Semana*, *Este Mes*, *Personalizado*).
   - Tarjetas KPI dinámicas (Monto Total Emitido, Total Cobrado / Amortizado, Saldo Pendiente por Cobrar, Tasa de Recuperación porcentual).
   - Tabla detallada agrupada por cliente con desglose de comprobante, vencimiento, montos y estado de cobro.
   - Botón de exportación e impresión directa para auditoría y gerencia.

2. **Estandarización de "Nota de Traslado Interno" en Transferencias**:
   - Nomenclatura oficial unificada en listados y detalles.
   - Uso prioritario de la Nota de Traslado Interno (formatos A4 y Ticket 80mm) para movimientos intersucursales de la empresa.
   - Conservación opcional de la Guía de Remisión SUNAT únicamente para traslados que exigen circular por vía pública o carretera nacional.

3. **Habilitación de Instalación de la Aplicación Web (PWA Desktop)**:
   - Configuración completa de Progressive Web App con `manifest.webmanifest` y soporte de service worker.
   - Hook reactivo `usePwaInstall` que detecta el evento de instalación nativo del navegador (`beforeinstallprompt`).
   - Botón de instalación discreto y estilizado en la cabecera del sistema (`PwaInstallButton`), que permite a los usuarios de terminales de escritorio instalar la aplicación como software independiente con un solo clic.

4. **Incorporación del Logotipo de la Marca en Todos los Documentos Imprimibles**:
   - Se insertó el logotipo corporativo oficial (`logo-text.png`) con escala y contraste optimizados para papel e impresoras en:
     - **Ticket Térmico de Venta (80 mm)** (`sales/print/ticket-80mm.blade.php`).
     - **Ticket Térmico de Traslado Interno (80 mm)** (`transfers/print/internal-ticket.blade.php`).
     - **Nota de Traslado Interno (Formato A4)** (`transfers/print/internal-a4.blade.php`).
     - **Guía de Remisión Remitente SUNAT (A4)** (`transfers/print/guide-sunat.blade.php`).
     - **Hoja de Picking y Armado de Carga** (`transfers/print/picking.blade.php`).

5. **Apertura de Documentos Dentro del Sistema (Sin Pestañas Nuevas `_blank`)**:
   - Creación del componente reutilizable `DocumentPreviewModal` (`resources/js/components/document-preview-modal.tsx`).
   - El documento se previsualiza instantáneamente en un diálogo modal responsive de alta resolución mediante un `iframe`.
   - Incorpora barra de control superior con:
     - Título y metadatos del documento.
     - Botón de **Imprimir** directo (`iframeRef.current.contentWindow.print()`) que abre la ventana de impresión nativa sin abandonar la pantalla.
     - Botón de recarga y botón de cierre.
   - Sincronización bidireccional vía `postMessage('close-preview')`: si el usuario pulsa el botón "✕ Cerrar" dentro de la propia plantilla del documento, la ventana modal se cierra suavemente.
   - Reemplazo completo de `window.open(..., '_blank')` en:
     - Módulo de Ventas (`resources/js/pages/sales/show.tsx`).
     - Listado de Transferencias (`resources/js/pages/transfers/index.tsx`).
     - Detalle de Transferencias (`resources/js/pages/transfers/show.tsx`).

---

## 2. Archivos Afectados y Nuevos Componentes

| Archivo | Acción | Descripción |
|---|---|---|
| `app/Http/Controllers/ReceivableController.php` | Modificado | Cálculo de métricas de reportes por rango diario/semanal/mensual |
| `resources/js/pages/receivables/index.tsx` | Modificado | Nueva pestaña "Reportes de Cobranza" con KPIs y desglose |
| `app/Http/Controllers/SalePrintController.php` | Creado | Controlador para renderizar el ticket térmico de 80mm de ventas |
| `resources/views/sales/print/ticket-80mm.blade.php` | Creado | Plantilla térmica de 80mm con logo para comprobantes de venta |
| `resources/views/transfers/print/internal-a4.blade.php` | Modificado | Incorporación de logo corporativo y botón de cierre compatible con iframe |
| `resources/views/transfers/print/guide-sunat.blade.php` | Modificado | Incorporación de logo corporativo y botón de cierre |
| `resources/views/transfers/print/picking.blade.php` | Modificado | Incorporación de logo corporativo en cabecera de recolección |
| `resources/views/transfers/print/internal-ticket.blade.php` | Modificado | Botón de cierre con comunicación `postMessage` |
| `resources/js/components/document-preview-modal.tsx` | Creado | Modal unificado para visor e impresión de documentos dentro del sistema |
| `resources/js/pages/sales/show.tsx` | Modificado | Reemplazo de `_blank` por `DocumentPreviewModal` para tickets de venta |
| `resources/js/pages/transfers/index.tsx` | Modificado | Reemplazo de `_blank` por `DocumentPreviewModal` en tabla general |
| `resources/js/pages/transfers/show.tsx` | Modificado | Reemplazo de `_blank` por `DocumentPreviewModal` en vista de detalle |
| `resources/js/hooks/use-pwa-install.ts` | Creado | Hook para detección del prompt de instalación de PWA de escritorio |
| `resources/js/components/pwa-install-button.tsx` | Creado | Componente de botón para instalar la app en el escritorio |
| `resources/js/components/app-sidebar-header.tsx` | Modificado | Integración del botón de instalación en la barra superior |
| `tests/Feature/SalePrintTest.php` | Creado | Pruebas automatizadas de impresión de tickets con logo |
| `tests/Feature/ReceivableTest.php` | Modificado | Pruebas de reportes en cuentas por cobrar |

---

## 3. Verificación de Calidad

- **PHP Pint Formatter**: Ejecutado y conforme (`pint --dirty --format agent`).
- **Pest PHP Unit & Feature Tests**: 20 pruebas ejecutadas con 137 aserciones satisfactorias (`PASS`).
- **Compilación Frontend (Vite / TypeScript)**: Compilación de producción (`npm run build`) completada con éxito en 13.97s sin errores ni advertencias de tipos.
