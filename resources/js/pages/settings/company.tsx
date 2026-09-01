import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
    exchange_rate: string;
}

export default function CompanySettings({ exchange_rate }: Props) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        exchange_rate: exchange_rate || '3.80',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/settings/company', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Configuración de Empresa" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-medium">Configuración General de la Empresa</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Actualiza los parámetros generales para todas las sucursales, como el tipo de cambio.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-2 max-w-sm">
                        <Label htmlFor="exchange_rate">Tipo de Cambio Base (USD)</Label>
                        <Input
                            id="exchange_rate"
                            type="number"
                            step="0.001"
                            min="0.01"
                            value={data.exchange_rate}
                            onChange={(e) => setData('exchange_rate', e.target.value)}
                            required
                        />
                        <InputError message={errors.exchange_rate} />
                        <p className="text-xs text-muted-foreground">
                            Este valor se utilizará automáticamente como sugerencia al realizar compras o ventas en dólares.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing}>Guardar Cambios</Button>

                        {recentlySuccessful && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                                Guardado.
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}
