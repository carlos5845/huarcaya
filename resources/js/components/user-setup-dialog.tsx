import { useForm, usePage } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/password-input';
import { Label } from '@/components/ui/label';

export function UserSetupDialog() {
    const { auth } = usePage<any>().props;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const hasDismissed = sessionStorage.getItem('user_setup_dismissed');

        if (auth?.requires_setup && !hasDismissed) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [auth?.requires_setup]);

    const handleClose = () => {
        sessionStorage.setItem('user_setup_dismissed', 'true');
        setOpen(false);
    };

    // Solo se renderiza si el servidor indica que requiere setup
    if (!auth?.requires_setup) {
        return null;
    }

    const { data, setData, post, processing, errors } = useForm({
        dni_ubigeo: '',
        dni_expiration_date: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/user/setup-profile', {
            preserveScroll: true,
            // Al ser exitoso, auth.requires_setup cambiará a false en el backend 
            // y este modal desaparecerá automáticamente
            onSuccess: () => setOpen(false),
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            handleClose();
        } else {
            setOpen(true);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Bienvenido(a)</DialogTitle>
                    <DialogDescription>
                        Te sugerimos completar tu perfil y actualizar tu contraseña de seguridad para mantener tu cuenta protegida.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="dni_ubigeo">Ubigeo del DNI <span className="text-red-500">*</span></Label>
                        <Input 
                            id="dni_ubigeo" 
                            placeholder="Ej: 150101" 
                            maxLength={6} 
                            value={data.dni_ubigeo} 
                            onChange={(e) => setData('dni_ubigeo', e.target.value)} 
                            required 
                        />
                        <InputError message={errors.dni_ubigeo} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="dni_expiration_date">Fecha de Caducidad del DNI <span className="text-red-500">*</span></Label>
                        <Input 
                            id="dni_expiration_date" 
                            type="date" 
                            value={data.dni_expiration_date} 
                            onChange={(e) => setData('dni_expiration_date', e.target.value)} 
                            required 
                        />
                        <InputError message={errors.dni_expiration_date} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Nueva Contraseña <span className="text-red-500">*</span></Label>
                        <PasswordInput
                            id="password" 
                            value={data.password} 
                            onChange={(e) => setData('password', e.target.value)} 
                            required 
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirmar Contraseña <span className="text-red-500">*</span></Label>
                        <PasswordInput
                            id="password_confirmation" 
                            value={data.password_confirmation} 
                            onChange={(e) => setData('password_confirmation', e.target.value)} 
                            required 
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Más tarde
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
