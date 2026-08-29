// Components
import { Head, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';

function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
return decodeURIComponent(parts.pop()?.split(';').shift() || '');
}

    return null;
}

export default function ForgotPassword() {
    const [step, setStep] = useState<1 | 2>(1);
    const [dni, setDni] = useState('');
    const [questionType, setQuestionType] = useState<'ubigeo' | 'expiration_date' | null>(null);
    const [answer, setAnswer] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<string | null>(null);

    const handleRequestQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setMessage(null);
        
        try {
            const token = getCookie('XSRF-TOKEN');
            const response = await fetch('/auth/forgot-password-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': token || '',
                },
                body: JSON.stringify({ dni })
            });
            const data = await response.json();
            
            if (response.ok) {
                setQuestionType(data.question_type);
                setStep(2);
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setMessage(data.message || 'Ocurrió un error. Verifica tu DNI.');
                }
            }
        } catch (error: any) {
            setMessage('Error de red. Intenta nuevamente.');
        } finally {
            setProcessing(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setMessage(null);
        
        try {
            const token = getCookie('XSRF-TOKEN');
            const response = await fetch('/auth/reset-password-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': token || '',
                },
                body: JSON.stringify({
                    dni,
                    answer,
                    password,
                    password_confirmation: passwordConfirmation,
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                setMessage(data.message);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ answer: data.message || 'Ocurrió un error al restablecer.' });
                }
            }
        } catch (error: any) {
            setErrors({ answer: 'Error de red. Intenta nuevamente.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <Head title="Recuperar contraseña" />
            <div className="flex flex-col gap-6">
            {message && (
                <div className="mb-6 text-center text-sm font-medium text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                    {message}
                </div>
                )}

            <div className="space-y-6">
                {step === 1 && (
                    <form onSubmit={handleRequestQuestion}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dni">Número de DNI</Label>
                                <Input
                                        id="dni"
                                        type="text"
                                        value={dni}
                                        onChange={(e) => setDni(e.target.value)}
                                        maxLength={8}
                                        autoComplete="off"
                                        autoFocus
                                        placeholder="Ingresa tu DNI"
                                    />
                                <InputError message={errors.dni} />
                            </div>

                            <Button className="w-full" disabled={processing || dni.length !== 8}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Continuar
                            </Button>
                        </div>
                    </form>
                    )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="answer">
                                    {questionType === 'ubigeo' 
                                            ? '¿Cuál es el código de Ubigeo de tu DNI?' 
                                            : '¿Cuál es la fecha de vencimiento de tu DNI?'}
                                </Label>
                                <Input
                                        id="answer"
                                        type={questionType === 'ubigeo' ? 'text' : 'date'}
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        autoComplete="off"
                                        autoFocus
                                        placeholder={questionType === 'ubigeo' ? 'Ej: 150101' : ''}
                                        maxLength={questionType === 'ubigeo' ? 6 : undefined}
                                    />
                                <InputError message={errors.answer} />
                                <p className="text-xs text-muted-foreground">
                                    {questionType === 'ubigeo' 
                                            ? 'El ubigeo es un código de 6 dígitos que aparece en el anverso de tu DNI.' 
                                            : 'Busca la fecha de caducidad impresa en tu DNI.'}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Nueva Contraseña</Label>
                                <PasswordInput
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirmar Contraseña</Label>
                                <PasswordInput
                                        id="password_confirmation"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        autoComplete="new-password"
                                    />
                            </div>

                            <Button className="w-full" disabled={processing || answer.length === 0 || password.length < 8}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Restablecer Contraseña
                            </Button>
                        </div>
                    </form>
                    )}

                <div className="space-x-1 text-center text-sm text-muted-foreground mt-6">
                    <span>O, volver para</span>
                    <Link href={login()} className="font-medium text-primary hover:underline">
                            iniciar sesión
                    </Link>
                </div>

                </div>
            </div>
        </>
    );
}
ForgotPassword.layout = {
    title: 'Recuperar contraseña',
    description: 'Ingresa tus datos para restablecer tu contraseña',
};
