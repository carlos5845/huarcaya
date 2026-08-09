import React from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Shield, PowerOff, Monitor, Smartphone, Globe, Clock, ArrowLeft } from 'lucide-react';

type Session = {
    id: string;
    ip_address: string;
    is_current_device: boolean;
    agent: {
        is_desktop: boolean;
        platform: string;
        browser: string;
        raw: string;
    };
    last_active: string;
};

type Props = {
    user: {
        id: number;
        name: string;
        dni: string;
    };
    sessions: Session[];
    flash: {
        success?: string;
    };
};

export default function UserSessions({ user, sessions, flash }: Props) {
    const handleCloseSession = (sessionId: string) => {
        if (confirm('¿Estás seguro de que deseas cerrar esta sesión remotamente? El usuario será desconectado inmediatamente.')) {
            router.delete(`/users/${user.id}/sessions/${sessionId}`);
        }
    };

    return (
        <>
            <Head title={`Sesiones: ${user.name}`} />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.get('/users')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Shield className="h-6 w-6 text-primary" />
                                Sesiones Activas
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Administrando las sesiones de <span className="font-medium text-foreground">{user.name}</span> (DNI: {user.dni})
                            </p>
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <div className="rounded-md bg-green-50 p-4 border border-green-200 dark:bg-green-900/20 dark:border-green-900">
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">{flash.success}</p>
                    </div>
                )}

                <div className="grid gap-4">
                    {sessions.length === 0 ? (
                        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                            Este usuario no tiene ninguna sesión activa en este momento.
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div key={session.id} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-md">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${session.is_current_device ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {session.agent.is_desktop ? <Monitor className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            {session.agent.platform} - {session.agent.browser}
                                            {session.is_current_device && (
                                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Este dispositivo</span>
                                            )}
                                        </h3>
                                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-3.5 w-3.5" />
                                                <span>IP: {session.ip_address}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>Última actividad: {session.last_active}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground/60 mt-2 line-clamp-1" title={session.agent.raw}>
                                                {session.agent.raw}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto flex justify-end">
                                    <Button 
                                        variant="destructive" 
                                        className="w-full sm:w-auto flex items-center gap-2"
                                        onClick={() => handleCloseSession(session.id)}
                                    >
                                        <PowerOff className="h-4 w-4" />
                                        Cerrar sesión
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

UserSessions.layout = {
    breadcrumbs: [
        { title: 'Usuarios', href: '/users' },
        { title: 'Sesiones', href: '#' },
    ],
};
