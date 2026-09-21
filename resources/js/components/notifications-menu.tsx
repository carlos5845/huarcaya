import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';


export function NotificationsMenu() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
        
        // Polling every 60 seconds
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications/unread');
            if (response.ok) {
                const data = await response.json();
                const fetchedNotifs = data.notifications || [];
                
                // Si ya teníamos notificaciones previas, comparamos para ver si hay nuevas
                setNotifications(prev => {
                    if (prev.length > 0 || fetchedNotifs.length > 0) {
                        const prevIds = new Set(prev.map((n: any) => n.id));
                        const newNotifs = fetchedNotifs.filter((n: any) => !prevIds.has(n.id));
                        
                        // Solo mostramos toast si no es la carga inicial (prev.length > 0)
                        if (prev.length > 0 && newNotifs.length > 0) {
                            newNotifs.forEach((n: any) => {
                                toast.info('Nueva Notificación', {
                                    description: n.data.message
                                });
                            });
                        }
                    }
                    return fetchedNotifs;
                });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markAsRead = async (id: string, transferId: number) => {
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            await fetch(`/api/notifications/${id}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token || ''
                }
            });
            setNotifications(notifications.filter(n => n.id !== id));
            router.visit(`/transfers/${transferId}`);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                    <h3 className="font-semibold text-sm">Notificaciones</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {notifications.length} nuevas
                    </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No tienes notificaciones nuevas.
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => markAsRead(notification.id, notification.data.transfer_id)}
                                className="w-full text-left p-3 text-sm border-b hover:bg-muted/50 transition-colors flex flex-col gap-1"
                            >
                                
                                <p className="text-foreground">
                                    {notification.data.message}
                                </p>

                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                        Guía {notification.data.transfer_number}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
