import { Head, useForm } from '@inertiajs/react';
import {
    Building2,
    Coins,
    Upload,
    Image as ImageIcon,
    Landmark,
    Save,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanyData {
    id: number;
    name: string;
    business_name: string;
    trade_name: string;
    document_number: string;
    economic_activity: string;
    address: string;
    ubigeo: string;
    phone: string;
    email: string;
    logo_url: string;
    has_custom_logo: boolean;
}

interface Props {
    company: CompanyData | null;
    exchange_rate: string;
}

export default function CompanyIndex({ company, exchange_rate }: Props) {
    const [logoPreview, setLogoPreview] = useState<string | null>(
        company?.logo_url || null,
    );

    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm<{
            _method: string;
            business_name: string;
            trade_name: string;
            document_number: string;
            economic_activity: string;
            address: string;
            ubigeo: string;
            phone: string;
            email: string;
            logo: File | null;
            exchange_rate: string;
        }>({
            _method: 'PUT',
            business_name:
                company?.business_name || 'INVERSIONES HUARCAYA S.A.C.',
            trade_name: company?.trade_name || 'SIMAQ',
            document_number: company?.document_number || '20600000000',
            economic_activity:
                company?.economic_activity ||
                'VENTA DE REPUESTOS AUTOMOTRICES & MAQUINARIA PESADA',
            address: company?.address || '',
            ubigeo: company?.ubigeo || '150101',
            phone: company?.phone || '',
            email: company?.email || '',
            logo: null,
            exchange_rate: exchange_rate || '3.80',
        });

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setData('logo', file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/company', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success('Datos de la empresa actualizados');
            },
            onError: () => {
                toast.error('Revisa los campos marcados en rojo');
            },
        });
    };

    return (
        <>
            <Head title="Datos de Empresa" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
                {/* Encabezado del Módulo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Landmark className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">
                                Datos de la Empresa
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Administra la identidad tributaria, el logotipo corporativo de los comprobantes y el tipo de cambio.
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant="outline"
                        className="font-mono text-xs px-2.5 py-1"
                    >
                        RUC: {data.document_number || '-----------'}
                    </Badge>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 1. Identidad Tributaria Matriz */}
                        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    1. Identidad Tributaria
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="document_number"
                                        className="text-xs font-semibold"
                                    >
                                        Número de RUC (11 dígitos){' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="document_number"
                                        value={data.document_number}
                                        maxLength={11}
                                        onChange={(e) =>
                                            setData(
                                                'document_number',
                                                e.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        placeholder="20600000000"
                                        className="font-mono"
                                        required
                                    />
                                    <InputError
                                        message={errors.document_number}
                                    />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <Label
                                        htmlFor="business_name"
                                        className="text-xs font-semibold"
                                    >
                                        Razón Social{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="business_name"
                                        value={data.business_name}
                                        onChange={(e) =>
                                            setData(
                                                'business_name',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. INVERSIONES HUARCAYA S.A.C."
                                        required
                                    />
                                    <InputError message={errors.business_name} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="trade_name"
                                        className="text-xs font-semibold"
                                    >
                                        Nombre Comercial
                                    </Label>
                                    <Input
                                        id="trade_name"
                                        value={data.trade_name}
                                        onChange={(e) =>
                                            setData(
                                                'trade_name',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. SIMAQ"
                                    />
                                    <InputError message={errors.trade_name} />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <Label
                                        htmlFor="economic_activity"
                                        className="text-xs font-semibold"
                                    >
                                        Giro / Actividad Económica (Impreso en Comprobantes)
                                    </Label>
                                    <Input
                                        id="economic_activity"
                                        value={data.economic_activity}
                                        onChange={(e) =>
                                            setData(
                                                'economic_activity',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ej. VENTA DE REPUESTOS AUTOMOTRICES & MAQUINARIA PESADA"
                                    />
                                    <InputError
                                        message={errors.economic_activity}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label
                                        htmlFor="address"
                                        className="text-xs font-semibold"
                                    >
                                        Dirección del Domicilio Fiscal Principal
                                    </Label>
                                    <Input
                                        id="address"
                                        value={data.address}
                                        onChange={(e) =>
                                            setData('address', e.target.value)
                                        }
                                        placeholder="Ej. Av. Nicolás Ayllón 1234, Ate - Lima"
                                    />
                                    <InputError message={errors.address} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="ubigeo"
                                        className="text-xs font-semibold"
                                    >
                                        Ubigeo Fiscal (6 dígitos)
                                    </Label>
                                    <Input
                                        id="ubigeo"
                                        value={data.ubigeo}
                                        maxLength={6}
                                        onChange={(e) =>
                                            setData(
                                                'ubigeo',
                                                e.target.value.replace(
                                                    /\D/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        placeholder="150101"
                                        className="font-mono"
                                    />
                                    <InputError message={errors.ubigeo} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="phone"
                                        className="text-xs font-semibold"
                                    >
                                        Teléfono Corporativo
                                    </Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData('phone', e.target.value)
                                        }
                                        placeholder="Ej. (01) 456-7890 / 987 654 321"
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="email"
                                        className="text-xs font-semibold"
                                    >
                                        Correo Electrónico Corporativo
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        placeholder="ventas@inversioneshuarcaya.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            {/* Logotipo para Documentos A4 y Tickets */}
                            <div className="pt-3 border-t border-border/50">
                                <Label className="text-xs font-semibold block mb-2.5">
                                    Logotipo Corporativo (para Comprobantes A4, Notas de Crédito y Tickets 80mm)
                                </Label>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="h-20 w-48 rounded-lg border border-border bg-white p-2.5 flex items-center justify-center shrink-0 overflow-hidden">
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="Vista previa del logo"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <ImageIcon className="h-4 w-4" />
                                                <span>Sin logo</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label
                                            htmlFor="logo-upload"
                                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-input bg-background hover:bg-muted text-xs font-medium cursor-pointer transition-colors"
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                            <span>
                                                Subir nuevo logotipo (PNG, JPG, WEBP, SVG)
                                            </span>
                                            <input
                                                id="logo-upload"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                className="hidden"
                                                onChange={handleLogoChange}
                                            />
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Recomendado: fondo transparente o blanco, proporción horizontal (máx. 2 MB).
                                        </p>
                                        <InputError message={errors.logo} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Parámetros Monetarios */}
                        <div>
                            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                                    <Coins className="h-4 w-4 text-primary" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        2. Parámetros Monetarios
                                    </h2>
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="exchange_rate"
                                        className="text-xs font-semibold"
                                    >
                                        Tipo de Cambio Base (USD a PEN)
                                    </Label>
                                    <Input
                                        id="exchange_rate"
                                        type="number"
                                        step="0.001"
                                        min="0.01"
                                        value={data.exchange_rate}
                                        onChange={(e) =>
                                            setData(
                                                'exchange_rate',
                                                e.target.value,
                                            )
                                        }
                                        className="font-mono"
                                        required
                                    />
                                    <InputError
                                        message={errors.exchange_rate}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Se sugiere automáticamente al registrar compras o ventas en dólares.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 border-t border-border pt-4">
                        {recentlySuccessful && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                Cambios guardados correctamente.
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={processing}
                            className="gap-2 font-semibold"
                        >
                            <Save className="h-4 w-4" />
                            <span>
                                {processing
                                    ? 'Guardando...'
                                    : 'Guardar Datos de la Empresa'}
                            </span>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

CompanyIndex.layout = {
    breadcrumbs: [
        {
            title: 'Datos de Empresa',
            href: '/company',
        },
    ],
};
