import { Head, router, usePoll } from '@inertiajs/react';
import { 
    Shield, 
    PowerOff, 
    Monitor, 
    Smartphone, 
    Tablet,
    Globe, 
    Clock, 
    ArrowLeft, 
    Search, 
    Activity, 
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Laptop,
    Radio
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Session = {
    id: number;
    session_id: string;
    ip_address: string;
    is_current_device: boolean;
    is_active: boolean;
    agent: {
        is_desktop: boolean;
        is_mobile?: boolean;
        is_tablet?: boolean;
        platform: string;
        browser: string;
        raw: string;
    };
    login_at: string;
    login_at_human?: string;
    logout_at: string | null;
    duration?: string | null;
};

type Metrics = {
    total: number;
    active: number;
    desktop: number;
    mobile: number;
    last_login: string;
};

type Props = {
    user: {
        id: number;
        name: string;
        dni: string;
        email?: string;
    };
    sessions: Session[];
    metrics?: Metrics;
    flash?: {
        success?: string;
    };
};

export default function UserSessions({ user, sessions, metrics, flash }: Props) {
    // Sincronización en tiempo real cada 5 segundos
    usePoll(5000, { only: ['sessions', 'metrics'] });

    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'closed'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sessionToClose, setSessionToClose] = useState<Session | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    // Filtrar sesiones según tab y búsqueda
    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            // Filtro por Tab
            if (activeTab === 'active' && !s.is_active) return false;
            if (activeTab === 'closed' && s.is_active) return false;

            // Filtro por Búsqueda
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                s.ip_address?.toLowerCase().includes(q) ||
                s.agent.platform?.toLowerCase().includes(q) ||
                s.agent.browser?.toLowerCase().includes(q) ||
                s.login_at?.toLowerCase().includes(q) ||
                s.agent.raw?.toLowerCase().includes(q)
            );
        });
    }, [sessions, activeTab, searchQuery]);

    const handleConfirmClose = () => {
        if (!sessionToClose) return;
        setIsClosing(true);
        router.delete(`/users/${user.id}/sessions/${sessionToClose.session_id}`, {
            preserveScroll: true,
            onFinish: () => {
                setIsClosing(false);
                setSessionToClose(null);
            },
        });
    };

    const getDeviceIcon = (agent: Session['agent']) => {
        if (agent.is_tablet) return <Tablet className="h-5 w-5" />;
        if (agent.is_mobile || !agent.is_desktop) return <Smartphone className="h-5 w-5" />;
        return <Laptop className="h-5 w-5" />;
    };

    return (
        <>
            <Head title={`Historial de Sesiones - ${user.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Header Superior */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-xl shrink-0" 
                            onClick={() => router.get('/users')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Shield className="h-6 w-6 text-primary" />
                                    Historial de Sesiones
                                </h1>
                                <Badge variant="outline" className="font-mono text-xs">
                                    DNI: {user.dni}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Supervisión de accesos, dispositivos y control de conexiones remotas para <span className="font-medium text-foreground">{user.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border">
                            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                            Actualización en vivo cada 5s
                        </span>
                    </div>
                </div>

                {/* Métricas / KPI Cards */}
                {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="rounded-xl border shadow-xs py-4">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Sesiones Activas
                                </CardTitle>
                                <Activity className={`h-4 w-4 ${metrics.active > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold text-foreground">{metrics.active}</div>
                                    {metrics.active > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                            En línea
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {metrics.active === 1 ? '1 conexión en curso' : `${metrics.active} conexiones en curso`}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl border shadow-xs py-4">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Último Acceso
                                </CardTitle>
                                <Clock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="text-lg font-bold text-foreground truncate" title={metrics.last_login}>
                                    {metrics.last_login}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Registro más reciente
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl border shadow-xs py-4">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Dispositivos
                                </CardTitle>
                                <Monitor className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="text-2xl font-bold text-foreground">
                                    {metrics.desktop} <span className="text-xs font-normal text-muted-foreground">PC</span> / {metrics.mobile} <span className="text-xs font-normal text-muted-foreground">Móvil</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Desglose de terminales
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl border shadow-xs py-4">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Total Histórico
                                </CardTitle>
                                <Calendar className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="text-2xl font-bold text-foreground">{metrics.total}</div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Inicios de sesión registrados
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Barra de Filtros y Búsqueda */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                            <TabsTrigger value="all" className="text-xs">
                                Todos ({sessions.length})
                            </TabsTrigger>
                            <TabsTrigger value="active" className="text-xs">
                                En Línea ({sessions.filter(s => s.is_active).length})
                            </TabsTrigger>
                            <TabsTrigger value="closed" className="text-xs">
                                Finalizadas ({sessions.filter(s => !s.is_active).length})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Buscar por IP, SO, navegador..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 text-xs h-9"
                        />
                    </div>
                </div>

                {/* Listado de Sesiones */}
                <div className="grid gap-3.5">
                    {filteredSessions.length === 0 ? (
                        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                            <Shield className="h-10 w-10 text-muted-foreground/40" />
                            <div className="text-sm font-medium">No se encontraron sesiones</div>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                {searchQuery 
                                    ? `No hay coincidencias para el término "${searchQuery}". Intenta con otra búsqueda.`
                                    : 'No hay sesiones registradas en este filtro.'}
                            </p>
                        </div>
                    ) : (
                        filteredSessions.map((session) => (
                            <div 
                                key={session.id} 
                                className={`rounded-xl border bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                    session.is_active 
                                        ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/[0.03] to-transparent dark:border-emerald-500/30' 
                                        : 'opacity-85 hover:opacity-100 hover:border-foreground/20'
                                }`}
                            >
                                <div className="flex items-start gap-3.5 min-w-0">
                                    {/* Icono del tipo de dispositivo */}
                                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                                        session.is_current_device
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : session.is_active
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {getDeviceIcon(session.agent)}
                                    </div>

                                    {/* Información detallada de la sesión */}
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
                                                {session.agent.platform} • {session.agent.browser}
                                            </h3>

                                            {session.is_current_device && (
                                                <Badge variant="default" className="text-[10px] py-0 px-2 h-5 font-semibold">
                                                    Este dispositivo
                                                </Badge>
                                            )}

                                            {session.is_active ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-2 h-5 font-medium flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    En línea
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 px-2 h-5 font-normal">
                                                    Sesión cerrada
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Metadata (IP, Inicio, Fin, Duración) */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1 font-mono">
                                                <Globe className="h-3 w-3 text-muted-foreground/70" />
                                                {session.ip_address}
                                            </span>

                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-muted-foreground/70" />
                                                Inicio: <span className="font-medium text-foreground/80">{session.login_at}</span>
                                            </span>

                                            {session.logout_at && (
                                                <span className="inline-flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3 text-muted-foreground/70" />
                                                    Cierre: <span className="font-medium text-foreground/80">{session.logout_at}</span>
                                                </span>
                                            )}

                                            {session.duration && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/70 text-[11px] font-medium text-foreground/70">
                                                    {session.duration}
                                                </span>
                                            )}
                                        </div>

                                        {/* User Agent Raw (colapsado visualmente con tooltip) */}
                                        <div className="text-[11px] text-muted-foreground/60 line-clamp-1 max-w-xl" title={session.agent.raw}>
                                            {session.agent.raw}
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones (Cerrar sesión remota) */}
                                <div className="w-full sm:w-auto flex justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                                    {session.is_active && session.session_id && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-950/40 flex items-center gap-1.5"
                                            onClick={() => setSessionToClose(session)}
                                        >
                                            <PowerOff className="h-3.5 w-3.5" />
                                            Cerrar sesión
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Confirmación de Desconexión Remota */}
            <Dialog open={!!sessionToClose} onOpenChange={(open) => !open && setSessionToClose(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-rose-100 dark:bg-rose-950/60 p-2.5 text-rose-600 dark:text-rose-400 shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Cerrar Sesión Remotamente</DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    Esta acción desconectará el dispositivo de inmediato.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {sessionToClose && (
                        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 border">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Usuario:</span>
                                <span className="font-semibold">{user.name} ({user.dni})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dispositivo:</span>
                                <span className="font-medium">{sessionToClose.agent.platform} • {sessionToClose.agent.browser}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dirección IP:</span>
                                <span className="font-mono">{sessionToClose.ip_address}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Conectado desde:</span>
                                <span>{sessionToClose.login_at}</span>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        Al confirmar, el usuario perderá acceso inmediatamente en esa pantalla y recibirá una notificación indicando que su sesión fue cerrada por un administrador.
                    </p>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSessionToClose(null)} 
                            disabled={isClosing}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleConfirmClose} 
                            disabled={isClosing}
                            className="flex items-center gap-1.5"
                        >
                            <PowerOff className="h-3.5 w-3.5" />
                            {isClosing ? 'Cerrando sesión...' : 'Confirmar Cierre'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

UserSessions.layout = {
    breadcrumbs: [
        { title: 'Usuarios', href: '/users' },
        { title: 'Sesiones', href: '#' },
    ],
};
