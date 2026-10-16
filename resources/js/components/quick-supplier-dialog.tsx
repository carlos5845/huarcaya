import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Building2,
    CreditCard,
    Hash,
    Phone,
    Mail,
    MapPin,
    X,
    Check,
    Loader2,
    WifiOff,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import { toast } from 'sonner';

export interface QuickSupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingSuppliers?: any[];
    onSupplierCreated?: (docNumber: string) => void;
    onSelectExistingSupplier?: (supplier: any) => void;
    isOnline?: boolean;
    purchaseDocumentType?: string; // 'FACTURA' | 'BOLETA' | etc.
}

export default function QuickSupplierDialog({
    open,
    onOpenChange,
    existingSuppliers = [],
    onSupplierCreated,
    onSelectExistingSupplier,
    isOnline = true,
    purchaseDocumentType = 'FACTURA'
}: QuickSupplierDialogProps) {
    const isPurchaseFactura = purchaseDocumentType === 'FACTURA';

    const { data, setData, post, processing, errors, setError, clearErrors, reset } = useForm({
        document_type: 'RUC',
        document_number: '',
        legal_name: '',
        phone: '',
        email: '',
        address: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        if (open) {
            clearErrors();
            setData({
                document_type: 'RUC',
                document_number: '',
                legal_name: '',
                phone: '',
                email: '',
                address: '',
                status: 'ACTIVE'
            });
        }
    }, [open]);

    // Detectar si el proveedor ya existe en la lista cargada
    const matchedSupplier = React.useMemo(() => {
        const cleanDoc = data.document_number.trim();
        if (!cleanDoc || cleanDoc.length < 5) return null;
        return existingSuppliers.find((s: any) =>
            s.document_number?.trim() === cleanDoc &&
            (!s.document_type || s.document_type.toUpperCase() === data.document_type.toUpperCase())
        );
    }, [data.document_number, data.document_type, existingSuppliers]);

    const handleSelectMatched = () => {
        if (matchedSupplier && onSelectExistingSupplier) {
            onSelectExistingSupplier(matchedSupplier);
            onOpenChange(false);
            toast.info(`Proveedor seleccionado: ${matchedSupplier.legal_name}`);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'La creación de proveedores requiere conexión al servidor para validar datos fiscales. Conéctate a internet o selecciona uno existente.',
            });
            return;
        }

        const docType = data.document_type.toUpperCase();
        const docNum = data.document_number.trim();
        const legalName = data.legal_name.trim();

        if (docType === 'RUC' && !/^\d{11}$/.test(docNum)) {
            setError('document_number', 'El RUC debe tener exactamente 11 dígitos numéricos.');
            return;
        }

        if (docType === 'DNI' && !/^\d{8}$/.test(docNum)) {
            setError('document_number', 'El DNI debe tener exactamente 8 dígitos numéricos.');
            return;
        }

        if (!legalName) {
            setError('legal_name', 'La Razón Social o Nombre del proveedor es obligatorio.');
            return;
        }

        post('/suppliers', {
            preserveScroll: true,
            onSuccess: () => {
                if (onSupplierCreated) {
                    onSupplierCreated(docNum);
                }
                onOpenChange(false);
                reset();
                toast.success('Proveedor registrado y asociado exitosamente');
            },
            onError: () => {
                toast.error('No se pudo registrar el proveedor. Verifica los datos.');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border shadow-xl">
                <DialogHeader className="border-b pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                Registrar Nuevo Proveedor
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Ingresa los datos fiscales para asociarlo automáticamente a esta compra.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {!isOnline && (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                            <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                                <p className="font-semibold">Modo sin conexión</p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                    La creación de proveedores requiere conexión al servidor. Por favor selecciona uno existente o conéctate a internet.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Alerta inteligente si ya existe el proveedor */}
                    {matchedSupplier && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-900 dark:text-blue-300 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <p className="font-semibold">Proveedor ya registrado</p>
                                    <p className="text-[11px] truncate max-w-[240px] text-blue-800 dark:text-blue-300">
                                        {matchedSupplier.legal_name}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handleSelectMatched}
                                className="h-7 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 shrink-0 gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Seleccionar
                            </Button>
                        </div>
                    )}

                    {/* Fila: Tipo Doc y Número */}
                    <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="qsup_doc_type" className="text-xs font-medium flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                Tipo Doc.
                            </Label>
                            <Select
                                value={data.document_type}
                                onValueChange={(val) => {
                                    setData('document_type', val);
                                    setData('document_number', '');
                                }}
                            >
                                <SelectTrigger id="qsup_doc_type" className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RUC">RUC (11 dígitos)</SelectItem>
                                    <SelectItem value="DNI">DNI (8 dígitos)</SelectItem>
                                    <SelectItem value="CE">Carné de Extranjería</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-3 space-y-1.5">
                            <Label htmlFor="qsup_doc_num" className="text-xs font-medium flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                                    {data.document_type === 'RUC'
                                        ? 'N° de RUC (11 dígitos)'
                                        : data.document_type === 'DNI'
                                            ? 'N° de DNI (8 dígitos)'
                                            : 'N° de Documento'}
                                </span>
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="qsup_doc_num"
                                required
                                placeholder={data.document_type === 'RUC' ? '20XXXXXXXXX / 10XXXXXXXXX' : '8 dígitos'}
                                maxLength={data.document_type === 'DNI' ? 8 : data.document_type === 'RUC' ? 11 : 15}
                                value={data.document_number}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (data.document_type === 'DNI' || data.document_type === 'RUC') {
                                        if (val === '' || /^[0-9]+$/.test(val)) {
                                            setData('document_number', val);
                                        }
                                    } else {
                                        setData('document_number', val);
                                    }
                                }}
                                className="h-9 text-xs font-mono"
                            />
                            <InputError message={errors.document_number} />
                        </div>
                    </div>

                    {isPurchaseFactura && data.document_type !== 'RUC' && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span>La compra es una Factura: generalmente el comprobante de proveedor requiere RUC.</span>
                        </div>
                    )}

                    {/* Razón Social */}
                    <div className="space-y-1.5">
                        <Label htmlFor="qsup_name" className="text-xs font-medium flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                Razón Social / Nombre Comercial
                            </span>
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="qsup_name"
                            required
                            placeholder="Ej. DISTRIBUIDORA AUTOMOTRIZ S.A.C."
                            value={data.legal_name}
                            onChange={(e) => setData('legal_name', e.target.value)}
                            className="h-9 text-xs"
                        />
                        <InputError message={errors.legal_name} />
                    </div>

                    {/* Fila Teléfono y Email */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="qsup_phone" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" /> Teléfono
                            </Label>
                            <Input
                                id="qsup_phone"
                                placeholder="Ej. (01) 456-7890 / 999888777"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="h-9 text-xs"
                            />
                            <InputError message={errors.phone} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="qsup_email" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                            </Label>
                            <Input
                                id="qsup_email"
                                type="email"
                                placeholder="ventas@proveedor.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="h-9 text-xs"
                            />
                            <InputError message={errors.email} />
                        </div>
                    </div>

                    {/* Dirección */}
                    <div className="space-y-1.5">
                        <Label htmlFor="qsup_address" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" /> Dirección Fiscal
                        </Label>
                        <Input
                            id="qsup_address"
                            placeholder="Av. Industrial 450, Lima"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            className="h-9 text-xs"
                        />
                        <InputError message={errors.address} />
                    </div>

                    <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-9 gap-1.5 text-xs"
                        >
                            <X className="w-4 h-4" /> Cancelar
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={processing || !isOnline}
                            className="h-9 gap-1.5 text-xs font-semibold"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" /> Guardar Proveedor
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
