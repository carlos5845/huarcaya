import { Form, Head, useForm, usePage, Link } from '@inertiajs/react';
import { AlertCircle, CheckCircle2 } from "lucide-react";
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type UserInfo = {
    name: string;
    role: string;
    branch: string;
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

export default function Login() {
    const [step, setStep] = useState<1 | 2>(1);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [dniError, setDniError] = useState<string>('');
    const [checkingDni, setCheckingDni] = useState(false);

    // Main Login Form
    const { data: loginData, setData: setLoginData, post: postLogin, processing: loginProcessing, errors: loginErrors } = useForm({
        dni: '',
        password: '',
        remember: false,
    });



    const handleCheckDni = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckingDni(true);
        setDniError('');

        try {
            const token = getCookie('XSRF-TOKEN');
            const response = await fetch('/auth/check-dni', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': token || '',
                },
                body: JSON.stringify({ dni: loginData.dni })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setUserInfo(data.data);
                setStep(2);
            } else {
                setDniError(data.message || 'Error al validar el DNI');
            }
        } catch (error: any) {
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Head title="Iniciar Sesión" />
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
                
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <img src="/logo-huarcaya.webp" alt="Logo" className="h-12 w-auto object-contain block dark:hidden" />
                        <img src="/logo-dark.png" alt="Logo" className="h-12 w-auto object-contain hidden dark:block" />
                        <img src="/logo-text.png" alt="Huarcaya" className="h-8 w-auto object-contain block dark:hidden" />
                        <img src="/logo-dark-text.png" alt="Huarcaya" className="h-8 w-auto object-contain hidden dark:block" />
                    </div>
                    <h1 className="text-2xl font-bold text-primary mb-2">Bienvenido</h1>
                    <p className="text-muted-foreground text-sm">
                        Sistema de Gestión Integrado
                    </p>
                </div>



                {step === 1 && (
                    <form onSubmit={handleCheckDni} className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="dni">Documento de Identidad (DNI)</Label>
                            <Input
                                id="dni"
                                type="text"
                                name="dni"
                                value={loginData.dni}
                                onChange={(e) => setLoginData('dni', e.target.value)}
                                required
                                autoFocus
                                placeholder="Ej: 12345678"
                                maxLength={15}
                            />
                            {dniError && <InputError message={dniError} />}
                            <InputError message={loginErrors.dni} />
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
            </div>
        </div>
    );
}

Login.layout = (page: any) => <>{page}</>;
