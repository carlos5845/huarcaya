import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import {
    enqueueOfflineHttpMutation,
    getLastConnectivityStatus,
    notifyConnectivityChange,
    setInertiaVersion,
} from '@/services/sync-service';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

function buildOfflineMutationLabel(method: string, pathname: string): string {
    const verb = method === 'delete' ? 'Eliminar' : method === 'put' || method === 'patch' ? 'Actualizar' : 'Crear';
    if (pathname.startsWith('/customers')) return `${verb} Cliente`;
    if (pathname.startsWith('/suppliers')) return `${verb} Proveedor`;
    if (pathname.startsWith('/products')) return `${verb} Producto`;
    if (pathname.startsWith('/catalog/brands')) return `${verb} Marca`;
    if (pathname.startsWith('/catalog/categories')) return `${verb} Categoría`;
    if (pathname.startsWith('/catalog/units')) return `${verb} Unidad de Medida`;
    if (pathname.startsWith('/quotations')) return `${verb} Cotización`;
    if (pathname.startsWith('/receivables')) return 'Registrar Abono / Cobranza';
    if (pathname.startsWith('/customer-returns')) return `${verb} Devolución`;
    if (pathname.startsWith('/inventory/adjustments')) return `${verb} Ajuste de Inventario`;
    if (pathname.startsWith('/transfers')) return `${verb} Transferencia`;
    if (pathname.startsWith('/closings')) return 'Guardar Borrador de Cierre';
    if (pathname.startsWith('/branches')) return `${verb} Sucursal`;
    if (pathname.startsWith('/company')) return 'Actualizar Empresa';
    if (pathname.startsWith('/users')) return `${verb} Usuario`;
    return `${verb} Registro (${pathname})`;
}

// Handle offline and network errors gracefully across the application
if (typeof window !== 'undefined') {
    // Auto-recover ES module chunk load failures when internet returns (without requiring manual F5)
    // Guarded with 15s sessionStorage cooldown to prevent reload loops on captive portals / no-internet WiFi
    const tryRecoverChunkError = (reason: unknown) => {
        const msg = String((reason as any)?.message || reason || '');
        const isChunkErr =
            msg.includes('Failed to fetch dynamically imported module') ||
            msg.includes('error loading dynamically imported module') ||
            msg.includes('Importing a module script failed') ||
            msg.includes('ChunkLoadError');

        if (!isChunkErr) return;

        if (!navigator.onLine || !getLastConnectivityStatus()) {
            notifyConnectivityChange(false);
            toast.warning('Módulo no disponible sin conexión', {
                id: 'global-network-error',
                description: 'Este módulo aún no estaba en caché offline. Se habilitará automáticamente al volver internet.',
            });
            return;
        }

        try {
            const lastReload = Number(sessionStorage.getItem('simaq_chunk_reload_at') || '0');
            if (Date.now() - lastReload > 15000) {
                sessionStorage.setItem('simaq_chunk_reload_at', String(Date.now()));
                window.location.reload();
            }
        } catch {
            // ignore sessionStorage errors
        }
    };

    window.addEventListener('unhandledrejection', (event) => {
        tryRecoverChunkError(event.reason);
    });

    router.on('networkError', (event) => {
        // Prevent uncaught promise rejection and Inertia error modal when offline
        event.preventDefault();
        notifyConnectivityChange(false);
        toast.warning('Módulo no disponible sin conexión', {
            id: 'global-network-error',
            description: 'Esta pantalla requiere conexión a internet. Puedes seguir trabajando en los módulos precargados.',
        });
    });

    router.on('httpException', (event) => {
        // Prevent Inertia plain-JSON modal if a proxy/SW returns 502/503 while offline
        const status = event.detail.response?.status;
        if (!navigator.onLine || status === 502 || status === 503 || status === 504) {
            event.preventDefault();
            notifyConnectivityChange(false);
            toast.warning('Sin conexión con el servidor', {
                id: 'global-network-error',
                description: 'No se pudo contactar al servidor. Tus operaciones se guardarán en modo offline.',
            });
        }
    });

    // Keep Inertia asset version synced (DO NOT mark online=true here, as cached offline responses also trigger success)
    router.on('success', (event) => {
        if (event.detail.page?.version) {
            setInertiaVersion(event.detail.page.version);
        }
    });

    router.on('navigate', (event) => {
        if (event.detail.page?.version) {
            setInertiaVersion(event.detail.page.version);
        }
    });

    router.on('before', (event) => {
        const isOfflineNow = !navigator.onLine || !getLastConnectivityStatus();
        if (!isOfflineNow) return;

        const visit = event.detail.visit;
        const method = (visit.method || 'get').toLowerCase();
        if (method === 'get') return;

        const path = visit.url.pathname;

        // Security & accounting-integrity actions that strictly require live server connection
        const blockedOfflinePrefixes = ['/login', '/logout', '/settings/password', '/auth/'];
        const isClosingConfirm =
            path.startsWith('/closings') &&
            visit.data &&
            typeof visit.data === 'object' &&
            (visit.data as any).action === 'confirm';

        if (blockedOfflinePrefixes.some((p) => path === p || path.startsWith(p)) || isClosingConfirm) {
            event.preventDefault();
            toast.warning('Requiere conexión activa', {
                id: 'offline-restricted-mutation',
                description: isClosingConfirm
                    ? 'El Cierre Diario definitivo requiere conexión para verificar que no existan operaciones offline pendientes.'
                    : 'Esta acción de seguridad requiere conexión activa al servidor.',
            });
            return false;
        }

        // Sales & Purchases create screens already handle offline enqueueing with local FIFO stock
        const isSpecializedOfflineScreen =
            (window.location.pathname.startsWith('/sales/create') && path === '/sales') ||
            (window.location.pathname.startsWith('/purchases/create') && path === '/purchases');

        if (isSpecializedOfflineScreen) {
            return;
        }

        // Universal Offline Mutation Queue for all CRUD forms (POST, PUT, PATCH, DELETE)
        event.preventDefault();
        const upperMethod = method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        const label = buildOfflineMutationLabel(method, path);

        enqueueOfflineHttpMutation({
            url: path + (visit.url.search || ''),
            method: upperMethod,
            data: visit.data ?? {},
            label,
        })
            .then((res) => {
                if (res.duplicated) {
                    toast.info('Operación ya en cola offline', {
                        id: 'offline-mutation-dup',
                        description: `"${label}" ya fue guardada en la cola de sincronización.`,
                    });
                    return;
                }
                toast.success('Guardado en modo offline', {
                    id: 'offline-mutation-queued',
                    description: `"${label}" quedó en cola y se sincronizará automáticamente al volver internet. (Los registros nuevos aparecerán en otros módulos al sincronizarse).`,
                    duration: 5000,
                });
            })
            .catch((err) => {
                toast.error('No se pudo guardar offline', {
                    description: err?.message || 'Error al almacenar en IndexedDB.',
                });
            });

        return false;
    });
}

// Register PWA Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { updateViaCache: 'none' })
            .then((registration) => {
                // Check for SW updates periodically when online
                registration.update().catch(() => {});
            })
            .catch((err) => {
                console.warn('[PWA] ServiceWorker registration failed:', err);
            });
    });
}

