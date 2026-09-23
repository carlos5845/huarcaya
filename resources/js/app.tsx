import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
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
        // Prevent uncaught promise rejection in the browser console
        event.preventDefault();
        toast.error('Sin conexión con el servidor', {
            id: 'global-network-error',
            description: 'La acción no pudo completarse. Por favor verifica tu conexión a internet.',
        });
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
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('[PWA] ServiceWorker registration failed:', err);
        });
    });
}

