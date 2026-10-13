import { Head, useForm } from '@inertiajs/react';
import { Building2, ShieldCheck, Coins, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { edit as editCompany } from '@/routes/company';

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
    sunat_environment: 'BETA' | 'PRODUCTION';
    sunat_sol_user: string;
    has_sol_password: boolean;
}

interface Props {
    company: CompanyData | null;
    exchange_rate: string;
}

export default function CompanySettings({ company, exchange_rate }: Props) {
    const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<{
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
        sunat_environment: 'BETA' | 'PRODUCTION';
        sunat_sol_user: string;
        sunat_sol_password: string;
        exchange_rate: string;
    }>({
        _method: 'PUT',
        business_name: company?.business_name || 'INVERSIONES HUARCAYA S.A.C.',
        trade_name: company?.trade_name || 'SIMAQ',
        document_number: company?.document_number || '20600000000',
        economic_activity: company?.economic_activity || 'VENTA DE REPUESTOS AUTOMOTRICES & MAQUINARIA PESADA',
        address: company?.address || '',
        ubigeo: company?.ubigeo || '150101',
        phone: company?.phone || '',
        email: company?.email || '',
        logo: null,
        sunat_environment: company?.sunat_environment || 'BETA',
        sunat_sol_user: company?.sunat_sol_user || '',
        sunat_sol_password: '',
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
        post('/settings/company', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setData('sunat_sol_password', '');
                toast.success('Datos fiscales de la empresa actualizados');
            },
            onError: () => {
                toast.error('Revisa los campos marcados en rojo');
            },
        });
    };

    return (
        <>
            <Head title="Datos de la Empresa y Facturación SUNAT" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        Datos Fiscales de la Empresa (SUNAT)
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Configura la identidad tributaria matriz, logotipo de comprobantes, credenciales SOL y tipo de cambio.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* 1. Datos Tributarios Matrices */}
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    1. Identidad Tributaria Matriz
                                </h3>
                            </div>
                            <Badge variant="outline" className="font-mono text-[11px]">
                                RUC Emisor: {data.document_number || '-----------'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="document_number" className="text-xs font-semibold">
                                    Número de RUC (11 dígitos) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="document_number"
                                    value={data.document_number}
                                    maxLength={11}
                                    onChange={(e) => setData('document_number', e.target.value.replace(/\D/g, ''))}
                                    placeholder="20600000000"
                                    className="font-mono"
                                    required
                                />
                                <InputError message={errors.document_number} />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="business_name" className="text-xs font-semibold">
                                    Razón Social <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="business_name"
                                    value={data.business_name}
                                    onChange={(e) => setData('business_name', e.target.value)}
                                    placeholder="Ej. INVERSIONES HUARCAYA S.A.C."
                                    required
                                />
                                <InputError message={errors.business_name} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="trade_name" className="text-xs font-semibold">
                                    Nombre Comercial
                                </Label>
                                <Input
                                    id="trade_name"
                                    value={data.trade_name}
                                    onChange={(e) => setData('trade_name', e.target.value)}
                                    placeholder="Ej. SIMAQ"
                                />
                                <InputError message={errors.trade_name} />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="economic_activity" className="text-xs font-semibold">
                                    Giro / Actividad Económica (Impreso en Comprobantes)
                                </Label>
                                <Input
                                    id="economic_activity"
                                    value={data.economic_activity}
                                    onChange={(e) => setData('economic_activity', e.target.value)}
                                    placeholder="Ej. VENTA DE REPUESTOS AUTOMOTRICES & MAQUINARIA PESADA"
                                />
                                <InputError message={errors.economic_activity} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="address" className="text-xs font-semibold">
                                    Dirección del Domicilio Fiscal Principal
                                </Label>
                                <Input
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Ej. Av. Nicolás Ayllón 1234, Ate - Lima"
                                />
                                <InputError message={errors.address} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="ubigeo" className="text-xs font-semibold">
                                    Ubigeo Fiscal (6 dígitos)
                                </Label>
                                <Input
                                    id="ubigeo"
                                    value={data.ubigeo}
                                    maxLength={6}
                                    onChange={(e) => setData('ubigeo', e.target.value.replace(/\D/g, ''))}
                                    placeholder="150101"
                                    className="font-mono"
                                />
                                <InputError message={errors.ubigeo} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-semibold">
                                    Teléfono Corporativo
                                </Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="Ej. (01) 456-7890 / 987 654 321"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold">
                                    Correo Electrónico Corporativo
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="ventas@inversioneshuarcaya.com"
                                />
                                <InputError message={errors.email} />
                            </div>
                        </div>

                        {/* Logotipo para Documentos A4 y Tickets */}
                        <div className="pt-2 border-t border-border/50">
                            <Label className="text-xs font-semibold block mb-2">
                                Logotipo de la Empresa (para Comprobantes A4, Notas de Crédito y Tickets 80mm)
                            </Label>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="h-16 w-44 rounded-lg border border-border bg-white p-2 flex items-center justify-center shrink-0 overflow-hidden">
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
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted text-xs font-medium cursor-pointer transition-colors"
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>Subir nuevo logotipo (PNG, JPG, WEBP, SVG)</span>
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

                    {/* 2. Credenciales de Facturación Electrónica SUNAT */}
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    2. Credenciales de Facturación Electrónica (SUNAT SOL)
                                </h3>
                            </div>
                            <Badge
                                variant="outline"
                                className={
                                    data.sunat_environment === 'PRODUCTION'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px]'
                                }
                            >
                                {data.sunat_environment === 'PRODUCTION' ? 'PRODUCCIÓN' : 'BETA / HOMOLOGACIÓN'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="sunat_environment" className="text-xs font-semibold">
                                    Entorno de Emisión
                                </Label>
                                <Select
                                    value={data.sunat_environment}
                                    onValueChange={(val: 'BETA' | 'PRODUCTION') => setData('sunat_environment', val)}
                                >
                                    <SelectTrigger id="sunat_environment">
                                        <SelectValue placeholder="Seleccionar entorno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BETA">BETA / Homologación (Pruebas)</SelectItem>
                                        <SelectItem value="PRODUCTION">PRODUCCIÓN (Envío Real SUNAT)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.sunat_environment} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="sunat_sol_user" className="text-xs font-semibold">
                                    Usuario SOL Secundario
                                </Label>
                                <Input
                                    id="sunat_sol_user"
                                    value={data.sunat_sol_user}
                                    onChange={(e) => setData('sunat_sol_user', e.target.value)}
                                    placeholder="Ej. MODDATOS"
                                    className="font-mono"
                                />
                                <InputError message={errors.sunat_sol_user} />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="sunat_sol_password" className="text-xs font-semibold">
                                        Clave SOL Secundaria
                                    </Label>
                                    {company?.has_sol_password && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                            <CheckCircle2 className="h-3 w-3" /> Configurada
                                        </span>
                                    )}
                                </div>
                                <Input
                                    id="sunat_sol_password"
                                    type="password"
                                    value={data.sunat_sol_password}
                                    onChange={(e) => setData('sunat_sol_password', e.target.value)}
                                    placeholder={company?.has_sol_password ? '•••••••• (Dejar vacío para mantener)' : 'Ingrese clave SOL'}
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.sunat_sol_password} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Tipo de Cambio */}
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                            <Coins className="h-4 w-4 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                3. Parámetros Monetarios
                            </h3>
                        </div>

                        <div className="grid gap-2 max-w-xs">
                            <Label htmlFor="exchange_rate" className="text-xs font-semibold">
                                Tipo de Cambio Base (USD a PEN)
                            </Label>
                            <Input
                                id="exchange_rate"
                                type="number"
                                step="0.001"
                                min="0.01"
                                value={data.exchange_rate}
                                onChange={(e) => setData('exchange_rate', e.target.value)}
                                className="font-mono"
                                required
                            />
                            <InputError message={errors.exchange_rate} />
                            <p className="text-[11px] text-muted-foreground">
                                Se sugiere automáticamente al registrar compras o ventas en dólares.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : 'Guardar Datos de la Empresa'}
                        </Button>

                        {recentlySuccessful && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                Cambios guardados correctamente.
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}

CompanySettings.layout = {
    breadcrumbs: [
        {
            title: 'Datos de la Empresa',
            href: editCompany(),
        },
    ],
};
