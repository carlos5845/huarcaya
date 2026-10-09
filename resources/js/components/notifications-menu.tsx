import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Bell, 
    CheckCheck, 
    Truck, 
    DollarSign, 
    Package, 
    Calculator, 
    AlertTriangle, 
    ExternalLink,
    Volume2,
    VolumeX,
    Laptop
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

interface NotificationItem {
    id: string;
    type: string;
    created_at: string;
    read_at: string | null;
    data: {
        title?: string;
        message: string;
        action_url?: string | null;
        category?: 'transfers' | 'sales' | 'inventory' | 'closings' | 'alerts' | 'system';
        severity?: 'info' | 'warning' | 'critical' | 'success';
        transfer_id?: number;
        transfer_number?: string;
        receivable_id?: number;
        customer_name?: string;
        closing_id?: number;
        amount?: number;
        difference?: number;
    };
}

export function NotificationsMenu() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [hasBrowserPerm, setHasBrowserPerm] = useState<boolean>(() => {
        return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    });
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const initialLoadRef = useRef(true);

    const resolveNotifActionUrl = (notifData: any) => {
        let url = notifData?.action_url || (notifData?.transfer_id ? `/transfers/${notifData.transfer_id}` : null);
        if (!url) return null;

        if (url === '/inventory' || url === '/inventory/') {
            const params = new URLSearchParams();
            if (notifData.branch_id) {
                params.set('branch_id', String(notifData.branch_id));
            }
            if (notifData.product_id) {
                params.set('product_id', String(notifData.product_id));
            }
            if (notifData.product_name) {
                params.set('search', notifData.product_name);
            }
            const qs = params.toString();
            return qs ? `/inventory?${qs}` : '/inventory';
        }

        return url;
    };

    const getCsrfToken = () => {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    };

    const requestBrowserPermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    setHasBrowserPerm(true);
                    toast.success('Notificaciones del sistema activadas');
                    new Notification('Huarcaya Autopartes', {
                        body: 'Las notificaciones de escritorio están configuradas correctamente.',
                        icon: '/favicon.ico',
                    });
                } else {
                    setHasBrowserPerm(false);
                    toast.info('Permiso de notificaciones denegado en tu navegador');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const notifyBrowser = useCallback((title: string, message: string, url?: string | null) => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                const notif = new Notification(title || 'Huarcaya Inversiones', {
                    body: message,
                    icon: '/favicon.ico',
                });
                if (url) {
                    notif.onclick = () => {
                        window.focus();
                        router.visit(url);
                        notif.close();
                    };
                }
            } catch (e) {
                console.error('Error showing system notification:', e);
            }
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        // Pausar o evitar polling innecesario si la pestaña está oculta
        if (typeof document !== 'undefined' && document.hidden) {
            return;
        }

        try {
            const response = await fetch('/api/notifications/unread');
            if (response.ok) {
                const data = await response.json();
                const fetchedNotifs: NotificationItem[] = data.notifications || [];

                setNotifications(prev => {
                    const prevIds = new Set(prev.map(n => n.id));
                    const newItems = fetchedNotifs.filter(n => !prevIds.has(n.id));

                    // Si no es la carga inicial y entraron nuevas notificaciones
                    if (!initialLoadRef.current && newItems.length > 0) {
                        newItems.forEach(n => {
                            const title = n.data.title || 'Nueva Notificación';
                            const targetUrl = resolveNotifActionUrl(n.data);
                            toast.info(title, {
                                description: n.data.message,
                                action: targetUrl ? {
                                    label: 'Ver detalle',
                                    onClick: () => {
                                        markAsRead(n.id, targetUrl);
                                    }
                                } : undefined
                            });

                            // Notificación nativa si la ventana no tiene el foco
                            if (document.hidden || !document.hasFocus()) {
                                notifyBrowser(title, n.data.message, targetUrl);
                            }
                        });
                    }

                    initialLoadRef.current = false;
                    return fetchedNotifs;
                });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [notifyBrowser]);

    useEffect(() => {
        fetchNotifications();

        // Polling cada 12 segundos
        const interval = setInterval(fetchNotifications, 12000);

        // Al volver a la pestaña, refrescar de inmediato
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchNotifications]);

    const markAsRead = async (id: string, actionUrl?: string | null) => {
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken()
                }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (actionUrl) {
                setIsOpen(false);
                router.visit(actionUrl);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const markAllAsRead = async () => {
        if (notifications.length === 0 || isMarkingAll) return;
        setIsMarkingAll(true);
        try {
            const res = await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken()
                }
            });
            if (res.ok) {
                setNotifications([]);
                toast.success('Todas las notificaciones se marcaron como leídas');
            }
        } catch (error) {
            console.error(error);
            toast.error('No se pudo marcar las notificaciones como leídas');
        } finally {
            setIsMarkingAll(false);
        }
    };

    const getIconForCategory = (category?: string, severity?: string) => {
        switch (category) {
            case 'transfers':
                return <Truck className="h-4 w-4 text-blue-500" />;
            case 'sales':
                return <DollarSign className="h-4 w-4 text-emerald-500" />;
            case 'closings':
                return <Calculator className="h-4 w-4 text-amber-500" />;
            case 'inventory':
                return severity === 'critical' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Package className="h-4 w-4 text-orange-500" />;
            case 'alerts':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getSeverityBadge = (severity?: string) => {
        switch (severity) {
            case 'critical':
                return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Crítico</Badge>;
            case 'warning':
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 bg-amber-500/10">Atención</Badge>;
            case 'success':
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">Completado</Badge>;
            default:
                return null;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filterCategory === 'all') return true;
        return (n.data.category || 'system') === filterCategory;
    });

    const formatTimestamp = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

            if (diffMinutes < 1) return 'Hace un momento';
            if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `Hace ${diffHours} h`;
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-9 w-9 text-muted-foreground hover:text-foreground transition-transform active:scale-95"
                    title="Centro de notificaciones"
                >
                    <Bell className="size-5 shrink-0" />
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md ring-2 ring-background animate-in zoom-in-50">
                            {notifications.length > 9 ? '9+' : notifications.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-[360px] sm:w-[400px] p-0 shadow-xl border-border/80" align="end">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Notificaciones</h3>
                        {notifications.length > 0 && (
                            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                                {notifications.length} nuevas
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Permiso de escritorio */}
                        {!hasBrowserPerm && typeof window !== 'undefined' && 'Notification' in window && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={requestBrowserPermission}
                                title="Habilitar avisos en el escritorio"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                            >
                                <Laptop className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Escritorio</span>
                            </Button>
                        )}

                        {notifications.length > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={markAllAsRead}
                                disabled={isMarkingAll}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Limpiar todo</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filtros rápidos si hay varias categorías */}
                {notifications.length > 0 && (
                    <div className="flex items-center gap-1 px-3 py-2 border-b bg-background/50 overflow-x-auto text-xs">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                filterCategory === 'all'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Todas ({notifications.length})
                        </button>
                        {notifications.some(n => n.data.category === 'transfers') && (
                            <button
                                onClick={() => setFilterCategory('transfers')}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterCategory === 'transfers'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Traslados
                            </button>
                        )}
                        {notifications.some(n => n.data.category === 'sales') && (
                            <button
                                onClick={() => setFilterCategory('sales')}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterCategory === 'sales'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Cobranzas
                            </button>
                        )}
                        {notifications.some(n => n.data.category === 'closings') && (
                            <button
                                onClick={() => setFilterCategory('closings')}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterCategory === 'closings'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Cierres
                            </button>
                        )}
                        {notifications.some(n => n.data.category === 'inventory') && (
                            <button
                                onClick={() => setFilterCategory('inventory')}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filterCategory === 'inventory'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Inventario
                            </button>
                        )}
                    </div>
                )}

                {/* Lista de Notificaciones */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                                <CheckCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground">¡Estás al día!</p>
                            <p className="text-xs text-muted-foreground">
                                {filterCategory !== 'all' 
                                    ? 'No hay avisos pendientes en esta categoría.' 
                                    : 'No tienes notificaciones pendientes por revisar.'}
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => {
                            const { data, created_at, id } = notification;
                            const actionUrl = resolveNotifActionUrl(data);

                            return (
                                <div
                                    key={id}
                                    onClick={() => markAsRead(id, actionUrl)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            markAsRead(id, actionUrl);
                                        }
                                    }}
                                    className="w-full text-left p-3.5 hover:bg-muted/60 transition-colors flex items-start gap-3 cursor-pointer group select-none relative"
                                >
                                    {/* Icono de Categoría */}
                                    <div className="h-8 w-8 rounded-full bg-muted/80 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                                        {getIconForCategory(data.category, data.severity)}
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-xs text-foreground truncate">
                                                {data.title || 'Aviso del Sistema'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {formatTimestamp(created_at)}
                                            </span>
                                        </div>

                                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                            {data.message}
                                        </p>

                                        <div className="flex items-center justify-between mt-1 pt-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {getSeverityBadge(data.severity)}

                                                {data.transfer_number && (
                                                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                        Guía {data.transfer_number}
                                                    </span>
                                                )}

                                                {data.amount && (
                                                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                        S/ {Number(data.amount).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            {actionUrl && (
                                                <span className="text-[11px] text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                                    Ir <ExternalLink className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
