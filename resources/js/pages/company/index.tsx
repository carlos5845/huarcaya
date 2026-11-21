import { Head, useForm, router } from '@inertiajs/react';
import {
    Building2,
    Coins,
    Upload,
    Image as ImageIcon,
    Landmark,
    Save,
    CreditCard,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    AlertCircle,
    X,
    Lock
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/confirm-dialog';
import { useConfirmDialog } from '@/hooks/use-confirm';

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

interface BankAccount {
    id: number;
    company_id: number;
    bank_name: string;
    account_type: string;
    currency_code: string;
    account_number: string;
    cci: string | null;
    beneficiary_name: string;
    is_active: boolean;
}

interface Props {
    company: CompanyData | null;
    bank_accounts: BankAccount[];
    exchange_rate: string;
}

export default function CompanyIndex({ company, bank_accounts, exchange_rate }: Props) {
    const { confirm, dialogProps } = useConfirmDialog();
    const [logoPreview, setLogoPreview] = useState<string | null>(
        company?.logo_url || null,
    );

    // Modal de Cuenta Bancaria
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

    const bankForm = useForm({
        bank_name: '',
        account_type: 'Cuenta Corriente',
        currency_code: 'PEN',
        account_number: '',
        cci: '',
        beneficiary_name: company?.business_name || 'INVERSIONES HUARCAYA S.A.C.',
        is_active: true,
    });

    const openAddBankModal = () => {
        setEditingAccount(null);
        bankForm.setData({
            bank_name: '',
            account_type: 'Cuenta Corriente',
            currency_code: 'PEN',
            account_number: '',
            cci: '',
            beneficiary_name: company?.business_name || 'INVERSIONES HUARCAYA S.A.C.',
            is_active: true,
        });
        bankForm.clearErrors();
        setIsBankModalOpen(true);
    };

    const openEditBankModal = (account: BankAccount) => {
        setEditingAccount(account);
        bankForm.setData({
            bank_name: account.bank_name,
            account_type: account.account_type,
            currency_code: account.currency_code,
            account_number: account.account_number,
            cci: account.cci || '',
            beneficiary_name: account.beneficiary_name,
            is_active: account.is_active,
        });
        bankForm.clearErrors();
        setIsBankModalOpen(true);
    };

    const handleBankSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAccount) {
            bankForm.put(`/company/bank-accounts/${editingAccount.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsBankModalOpen(false);
                    toast.success('Cuenta bancaria actualizada');
                },
                onError: () => toast.error('Verifica los campos obligatorios'),
            });
        } else {
            bankForm.post('/company/bank-accounts', {
                preserveScroll: true,
                onSuccess: () => {
                    setIsBankModalOpen(false);
                    toast.success('Cuenta bancaria agregada');
                },
                onError: () => toast.error('Verifica los campos obligatorios'),
            });
        }
    };

    const handleDeleteAccount = (account: BankAccount) => {
        confirm({
            title: '¿Eliminar cuenta bancaria?',
            description: `Se eliminará la cuenta de ${account.bank_name} (${account.account_number}) de los datos de la empresa y no saldrá en futuras cotizaciones.`,
            confirmText: 'Eliminar cuenta',
            variant: 'danger',
            onConfirm: () => {
                router.delete(`/company/bank-accounts/${account.id}`, {
                    preserveScroll: true,
                    onSuccess: () => toast.success('Cuenta bancaria eliminada'),
                });
            },
        });
    };

    const handleToggleActive = (account: BankAccount) => {
        router.put(`/company/bank-accounts/${account.id}`, {
            bank_name: account.bank_name,
            account_type: account.account_type,
            currency_code: account.currency_code,
            account_number: account.account_number,
            cci: account.cci,
            beneficiary_name: account.beneficiary_name,
            is_active: !account.is_active,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`Cuenta bancaria ${!account.is_active ? 'activada' : 'desactivada'}`),
        });
    };

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

                        {/* 3. Cuentas Bancarias de Recaudación (Cotizaciones y Pagos) */}
                        <div className="lg:col-span-2">
                            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Landmark className="h-4 w-4 text-primary" />
                                        <div>
                                            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                3. Cuentas Bancarias de Recaudación
                                            </h2>
                                            <p className="text-[11px] text-muted-foreground">
                                                Estas cuentas se imprimen en las hojas A4 de cotización y pedidos
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={openAddBankModal}
                                        className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-2xs self-start sm:self-auto"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Agregar Cuenta
                                    </Button>
                                </div>

                                {bank_accounts.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
                                        <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-xs font-medium text-foreground">No hay cuentas bancarias registradas</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Agrega cuentas en Soles o Dólares para que figuren en las cotizaciones a clientes.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {bank_accounts.map((acc) => (
                                            <div
                                                key={acc.id}
                                                className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                                    acc.is_active ? 'bg-card border-border/70 hover:border-border' : 'bg-muted/30 border-dashed border-border/50 opacity-75'
                                                }`}
                                            >
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                                            <Landmark className="h-3.5 w-3.5 text-primary" />
                                                            {acc.bank_name}
                                                        </span>
                                                        <Badge variant="outline" className={`text-[10px] py-0 font-mono ${acc.currency_code === 'PEN' ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10' : 'border-blue-500/40 text-blue-600 bg-blue-500/10'}`}>
                                                            {acc.currency_code} ({acc.currency_code === 'PEN' ? 'Soles' : 'Dólares'})
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-[10px] py-0">
                                                            {acc.account_type}
                                                        </Badge>
                                                        {!acc.is_active && (
                                                            <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-400 bg-amber-50">
                                                                Inactiva
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                                                        <span>N° Cuenta: <strong className="text-foreground select-all">{acc.account_number}</strong></span>
                                                        {acc.cci && <span>CCI: <strong className="text-foreground select-all">{acc.cci}</strong></span>}
                                                    </div>

                                                    <p className="text-[11px] text-muted-foreground">
                                                        Titular: <span className="font-medium text-foreground">{acc.beneficiary_name}</span>
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleToggleActive(acc)}
                                                    >
                                                        {acc.is_active ? 'Desactivar' : 'Activar'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-primary"
                                                        title="Editar cuenta"
                                                        onClick={() => openEditBankModal(acc)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                        title="Eliminar cuenta"
                                                        onClick={() => handleDeleteAccount(acc)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                {/* Modal para Agregar / Editar Cuenta Bancaria */}
                <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-primary" />
                                {editingAccount ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria de Recaudación'}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Configura los datos de la cuenta bancaria para los pagos de cotizaciones.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleBankSubmit} className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Banco *</Label>
                                    <Input
                                        value={bankForm.data.bank_name}
                                        onChange={(e) => bankForm.setData('bank_name', e.target.value)}
                                        placeholder="Ej: BCP, BBVA, Interbank..."
                                        className="h-9 text-xs"
                                        required
                                    />
                                    <InputError message={bankForm.errors.bank_name} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Moneda *</Label>
                                    <Select
                                        value={bankForm.data.currency_code}
                                        onValueChange={(val) => bankForm.setData('currency_code', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">Soles (PEN S/)</SelectItem>
                                            <SelectItem value="USD">Dólares (USD $)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={bankForm.errors.currency_code} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tipo de Cuenta *</Label>
                                <Select
                                    value={bankForm.data.account_type}
                                    onValueChange={(val) => bankForm.setData('account_type', val)}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                                        <SelectItem value="Cuenta de Ahorros">Cuenta de Ahorros</SelectItem>
                                        <SelectItem value="Cuenta Maestra">Cuenta Maestra</SelectItem>
                                        <SelectItem value="Billetera Digital">Billetera Digital (Yape / Plin)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={bankForm.errors.account_type} />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Número de Cuenta *</Label>
                                <Input
                                    value={bankForm.data.account_number}
                                    onChange={(e) => bankForm.setData('account_number', e.target.value)}
                                    placeholder="Ej: 191-2345678-0-12"
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                                <InputError message={bankForm.errors.account_number} />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Código de Cuenta Interbancario (CCI)</Label>
                                <Input
                                    value={bankForm.data.cci}
                                    onChange={(e) => bankForm.setData('cci', e.target.value)}
                                    placeholder="Ej: 002-191-002345678012-54"
                                    className="h-9 text-xs font-mono"
                                />
                                <InputError message={bankForm.errors.cci} />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Titular / Beneficiario *</Label>
                                <Input
                                    value={bankForm.data.beneficiary_name}
                                    onChange={(e) => bankForm.setData('beneficiary_name', e.target.value)}
                                    placeholder="Ej: INVERSIONES HUARCAYA S.A.C."
                                    className="h-9 text-xs"
                                    required
                                />
                                <InputError message={bankForm.errors.beneficiary_name} />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsBankModalOpen(false)}
                                    className="h-9 text-xs"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={bankForm.processing}
                                    className="h-9 text-xs font-bold gap-1.5 bg-primary"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {bankForm.processing ? 'Guardando...' : (editingAccount ? 'Actualizar Cuenta' : 'Guardar Cuenta')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <ConfirmDialog {...dialogProps} />
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
