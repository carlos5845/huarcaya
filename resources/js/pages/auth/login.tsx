import { Form, Head, useForm, usePage, Link, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Monitor, Smartphone, ShieldAlert, AlertTriangle } from "lucide-react";
import React, { useState, useEffect } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type UserInfo = {
    name: string;
    role: string;
    branch: string;
};

type ActiveSessionInfo = {
    device: string;
    platform: string;
    browser: string;
    is_desktop: boolean;
    ip_address: string;
    last_activity: string;
    last_activity_date: string;
    message: string;
};

type Props = {
    canResetPassword?: boolean;
    status?: string;
    terminatedInfo?: {
        device?: string;
        is_desktop?: boolean;
        ip?: string;
        time?: string;
    };
};

// Helper to get XSRF token for fetch
function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    }

    return null;
}

export default function Login({ status: propStatus, terminatedInfo: propTerminatedInfo }: Props) {
    const page = usePage<any>();
    const status = propStatus || page.props.flash?.status;
    const terminatedInfo = propTerminatedInfo || page.props.flash?.terminated_info;

    const [step, setStep] = useState<1 | 2>(1);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [dniError, setDniError] = useState<string>('');
    const [checkingDni, setCheckingDni] = useState(false);
    const [confirmOverrideModalOpen, setConfirmOverrideModalOpen] = useState(false);
    const [activeSessionData, setActiveSessionData] = useState<ActiveSessionInfo | null>(null);

    // Main Login Form
    const { data: loginData, setData: setLoginData, post: postLogin, processing: loginProcessing, errors: loginErrors } = useForm({
        dni: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        if (loginErrors.active_session_found) {
            try {
                const raw = loginErrors.active_session_found;
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                setActiveSessionData(parsed);
                setConfirmOverrideModalOpen(true);
            } catch {
                setActiveSessionData({
                    device: 'Otro dispositivo',
                    platform: '',
                    browser: '',
                    is_desktop: false,
                    ip_address: '',
                    last_activity: '',
                    last_activity_date: '',
                    message: String(loginErrors.active_session_found),
                });
                setConfirmOverrideModalOpen(true);
            }
        }
    }, [loginErrors.active_session_found]);

    const handleConfirmOverride = () => {
        setConfirmOverrideModalOpen(false);
        router.post('/login', {
            dni: loginData.dni,
            password: loginData.password,
            remember: loginData.remember,
            confirm_override: true,
        });
    };

    const handleCheckDni = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckingDni(true);
        setDniError('');

        try {
            const xsrfCookie = getCookie('XSRF-TOKEN');
            const metaCsrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };
            if (xsrfCookie) {
                headers['X-XSRF-TOKEN'] = xsrfCookie;
            }
            if (metaCsrfToken) {
                headers['X-CSRF-TOKEN'] = metaCsrfToken;
            }

            const response = await fetch('/auth/check-dni', {
                method: 'POST',
                headers,
                body: JSON.stringify({ dni: loginData.dni })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setUserInfo(data.data);
                setStep(2);
            } else {
                // Si el mensaje es el mismo de sesión terminada que ya se muestra arriba en el banner de aviso, no duplicarlo en rojo
                if (data.session_terminated || (status && data.message === status)) {
                    // No duplicar en rojo
                } else {
                    setDniError(data.message || 'Error al validar el DNI');
                }
            }
        } catch {
            setDniError('Error de red al validar el DNI');
        } finally {
            setCheckingDni(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        postLogin('/login');
    };

    return (
        <>
            <Head title="Iniciar Sesión" />

            {/* Aviso de Sesión Desconectada / Finalizada Remotamente */}
            {status && (
                <div className="mb-6 rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 shadow-sm dark:border-amber-800/60 dark:from-amber-950/40 dark:to-orange-950/20">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs tracking-wider uppercase text-amber-800 dark:text-amber-300">
                                    Sesión Desconectada
                                </span>
                                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-200/60 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                    Seguridad
                                </span>
                            </div>
                            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-normal">
                                {status}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {step === 1 && (
                <form onSubmit={handleCheckDni} className="flex flex-col gap-6">
                        {(dniError || loginErrors.dni) && (
                            <Alert variant="destructive" className="mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {dniError || loginErrors.dni}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="dni">Documento de Identidad (DNI)</Label>
                            <Input
                                id="dni"
                                type="text"
                                inputMode="numeric"
                                pattern="\d{8}"
                                name="dni"
                                value={loginData.dni}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setLoginData('dni', val);
                                }}
                                required
                                autoFocus
                                placeholder="Ej: 12345678"
                                maxLength={8}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={checkingDni || !loginData.dni}>
                            {checkingDni && <Spinner className="mr-2" />}
                            Siguiente
                        </Button>
                        
                        <div className="text-center text-sm">
                            <Link 
                                href="/forgot-password"
                                className="text-primary hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </form>
                )}

                {step === 2 && userInfo && (
                    <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        {loginErrors.dni && (
                            <Alert variant="destructive" className="mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {loginErrors.dni}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 mb-2">
                            <p className="text-sm text-muted-foreground mb-1">Hola,</p>
                            <p className="font-semibold text-lg text-gray-900 dark:text-white">{userInfo.name}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400">
                                    {userInfo.role}
                                </span>
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-900/30 dark:text-purple-400">
                                    {userInfo.branch}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                value={loginData.password}
                                onChange={(e) => setLoginData('password', e.target.value)}
                                required
                                autoFocus
                                placeholder="Tu contraseña segura"
                            />
                            <InputError message={loginErrors.password} />
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={loginData.remember}
                                onCheckedChange={(checked) => setLoginData('remember', checked as boolean)}
                            />
                            <Label htmlFor="remember">Mantener sesión iniciada</Label>
                        </div>

                        <div className="flex gap-3">
                            <Button type="button" variant="outline" className="w-full" onClick={() => {
 setStep(1); setLoginData('password', ''); 
}}>
                                Volver
                            </Button>
                            <Button type="submit" className="w-full" disabled={loginProcessing}>
                                {loginProcessing && <Spinner className="mr-2" />}
                                Ingresar
                            </Button>
                        </div>
                    </form>
                )}

            {/* Modal de confirmación de sesión activa tipo WhatsApp */}
            <Dialog open={confirmOverrideModalOpen} onOpenChange={setConfirmOverrideModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-center text-lg font-bold">
                            ¿Iniciar sesión en este dispositivo?
                        </DialogTitle>
                        <DialogDescription className="text-center text-xs text-muted-foreground mt-1">
                            Tu cuenta ya tiene una sesión activa abierta en otro equipo.
                        </DialogDescription>
                    </DialogHeader>

                    {activeSessionData && (
                        <div className="bg-muted/50 rounded-lg p-3.5 border border-border text-xs space-y-2">
                            <div className="flex items-center gap-2.5 font-medium text-foreground">
                                {activeSessionData.is_desktop ? (
                                    <Monitor className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                    <Smartphone className="h-4 w-4 text-primary shrink-0" />
                                )}
                                <span>{activeSessionData.device}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px] pt-1.5 border-t border-border/50">
                                <div>
                                    <span className="font-semibold text-foreground/80">Dirección IP:</span> {activeSessionData.ip_address}
                                </div>
                                <div>
                                    <span className="font-semibold text-foreground/80">Última actividad:</span> {activeSessionData.last_activity}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        Al continuar aquí, la sesión abierta en el otro dispositivo se cerrará automáticamente para mantener la seguridad de tu cuenta.
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto text-xs"
                            onClick={() => setConfirmOverrideModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="w-full sm:w-auto text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={handleConfirmOverride}
                            disabled={loginProcessing}
                        >
                            Continuar e iniciar sesión aquí
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
Login.layout = {
    title: 'Bienvenido',
    description: 'Sistema de Gestión Integrado',
    showBackArrow: true,
};
