import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { notifyConnectivityChange, setInertiaVersion } from '@/services/sync-service';
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

// Handle offline and network errors gracefully across the application
if (typeof window !== 'undefined') {
    router.on('networkError', (event) => {
        // Prevent uncaught promise rejection and Inertia error modal when offline
        event.preventDefault();
        notifyConnectivityChange(false);
        toast.warning('Módulo no disponible sin conexión', {
            id: 'global-network-error',
            description: 'Esta pantalla requiere conexión a internet. Puedes seguir registrando Ventas y Compras en modo offline.',
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
                description: 'Este módulo no está disponible sin internet. Puedes seguir registrando Ventas y Compras en modo offline.',
            });
        }
    });

    router.on('success', (event) => {
        if (event.detail.page?.version) {
            setInertiaVersion(event.detail.page.version);
        }
        if (navigator.onLine) {
            notifyConnectivityChange(true);
        }
    });

    router.on('navigate', (event) => {
        if (event.detail.page?.version) {
            setInertiaVersion(event.detail.page.version);
        }
    });

    router.on('before', (event) => {
        if (!navigator.onLine) {
            const method = (event.detail.visit.method || 'get').toLowerCase();
            const path = event.detail.visit.url.pathname;
            
            // Allow GET requests (cache or local) and offline-handled forms (sales, purchases)
            const restrictedMutationPrefixes = [
                '/users',
                '/branches',
                '/catalog/brands',
                '/catalog/categories',
                '/catalog/units',
                '/customers',
                '/suppliers',
            ];

            const isRestrictedMutation = method !== 'get' && restrictedMutationPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));

            if (isRestrictedMutation) {
                // If it's not handled by an offline specialized page
                const isInsideSalesOrPurchases = window.location.pathname.startsWith('/sales/create') || window.location.pathname.startsWith('/purchases/create');
                if (!isInsideSalesOrPurchases) {
                    event.preventDefault();
                    toast.warning('Modo sin conexión', {
                        id: 'offline-restricted-mutation',
                        description: 'La creación o edición de este registro requiere conexión activa al servidor.',
                    });
                    return false;
                }
            }
        }
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

