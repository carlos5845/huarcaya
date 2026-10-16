import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    UserPlus,
    CreditCard,
    Hash,
    User,
    Phone,
    Mail,
    MapPin,
    X,
    Check,
    Loader2,
    WifiOff,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ShieldAlert
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
import { db } from '@/lib/db';

export interface QuickCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleType?: string; // 'BOLETA' | 'FACTURA' | etc.
    existingCustomers?: any[];
    onCustomerCreated?: (docNumber: string, customerData?: any) => void;
    onSelectExistingCustomer?: (customer: any) => void;
    isOnline?: boolean;
}

export default function QuickCustomerDialog({
    open,
    onOpenChange,
    saleType = 'BOLETA',
    existingCustomers = [],
    onCustomerCreated,
    onSelectExistingCustomer,
    isOnline = true
}: QuickCustomerDialogProps) {
    const isFactura = saleType === 'FACTURA';
    const [showContactFields, setShowContactFields] = useState(false);

    const { data, setData, post, processing, errors, setError, clearErrors, reset } = useForm({
        document_type: isFactura ? 'RUC' : 'DNI',
        document_number: '',
        legal_name: '',
        phone: '',
        email: '',
        address: '',
        status: 'ACTIVE'
    });

    // Resetear formulario cada vez que se abre el modal o cambia el tipo de venta
    useEffect(() => {
        if (open) {
            clearErrors();
            setData({
                document_type: isFactura ? 'RUC' : 'DNI',
                document_number: '',
                legal_name: '',
                phone: '',
                email: '',
                address: '',
                status: 'ACTIVE'
            });
            setShowContactFields(false);
        }
    }, [open, isFactura]);

    // Detectar si el documento ya existe en la lista de clientes
    const matchedCustomer = React.useMemo(() => {
        const cleanDoc = data.document_number.trim();
        if (!cleanDoc || cleanDoc.length < 5) return null;
        return existingCustomers.find((c: any) => 
            c.document_number?.trim() === cleanDoc &&
            (!c.document_type || c.document_type.toUpperCase() === data.document_type.toUpperCase())
        );
    }, [data.document_number, data.document_type, existingCustomers]);

    const handleSelectMatched = () => {
        if (matchedCustomer && onSelectExistingCustomer) {
            onSelectExistingCustomer(matchedCustomer);
            onOpenChange(false);
            toast.info(`Cliente seleccionado: ${matchedCustomer.legal_name}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        const docType = data.document_type.toUpperCase();
        const docNum = data.document_number.trim();
        const legalName = data.legal_name.trim();

        if (isFactura && docType !== 'RUC') {
            setError('document_number', 'Para emitir Factura, el cliente debe registrarse obligatoriamente con RUC.');
            return;
        }

        if (docType === 'RUC' && !/^\d{11}$/.test(docNum)) {
            setError('document_number', 'El RUC debe tener exactamente 11 dígitos numéricos.');
            return;
        }

        if (docType === 'DNI' && !/^\d{8}$/.test(docNum)) {
            setError('document_number', 'El DNI debe tener exactamente 8 dígitos numéricos.');
            return;
        }

        if (!legalName) {
            setError('legal_name', docType === 'RUC' ? 'La Razón Social es obligatoria.' : 'El nombre completo es obligatorio.');
            return;
        }

        // Modo Offline
        if (!isOnline) {
            const offlineUuid = crypto.randomUUID();
            const tempId = `offline_${Date.now()}`;
            const newCustomerItem = {
                id: tempId,
                uuid: offlineUuid,
                document_type: docType,
                document_number: docNum,
                legal_name: legalName,
                phone: data.phone.trim() || null,
                email: data.email.trim() || null,
                address: data.address.trim() || null,
                is_offline: true,
            };

            try {
                await db.customers.put(newCustomerItem);
                await db.syncQueue.add({
                    uuid: offlineUuid,
                    entity_type: 'Customer',
                    operation_type: 'CREATE',
                    payload: {
                        uuid: offlineUuid,
                        document_type: newCustomerItem.document_type,
                        document_number: newCustomerItem.document_number,
                        legal_name: newCustomerItem.legal_name,
                        phone: newCustomerItem.phone,
                        email: newCustomerItem.email,
                        address: newCustomerItem.address,
                    },
                    status: 'PENDING',
                    retry_count: 0,
                    client_timestamp: new Date().toISOString(),
                });

                if (onCustomerCreated) {
                    onCustomerCreated(docNum, newCustomerItem);
                }
                onOpenChange(false);
                reset();

                toast.success('Cliente registrado en modo offline', {
                    description: 'Se guardó en el dispositivo y se sincronizará al recuperar conexión.',
                });
            } catch (err: any) {
                toast.error('Error al guardar cliente offline', {
                    description: err.message || 'Error en almacenamiento local',
                });
            }
            return;
        }

        // Modo Online
        post('/customers', {
            preserveScroll: true,
            onSuccess: () => {
                if (onCustomerCreated) {
                    onCustomerCreated(docNum);
                }
                onOpenChange(false);
                reset();
                toast.success('Cliente registrado exitosamente');
            },
            onError: () => {
                toast.error('No se pudo registrar el cliente. Verifica los datos.');
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border shadow-xl">
                <DialogHeader className="border-b pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                {isFactura ? 'Registrar Cliente con RUC (Factura)' : 'Registrar Nuevo Cliente'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {isFactura
                                    ? 'Normativa SUNAT: Requiere RUC válido de 11 dígitos y Razón Social oficial.'
                                    : 'Ingresa los datos del cliente para asociarlo de inmediato a la venta.'}
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
                                    El cliente se guardará localmente y se sincronizará automáticamente al volver internet.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Alerta inteligente si ya existe */}
                    {matchedCustomer && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-900 dark:text-blue-300 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <p className="font-semibold">Cliente ya registrado</p>
                                    <p className="text-[11px] truncate max-w-[240px] text-blue-800 dark:text-blue-300">
                                        {matchedCustomer.legal_name}
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

                    {/* Fila: Tipo y Número de Documento */}
                    <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="qc_doc_type" className="text-xs font-medium flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                Tipo Doc.
                            </Label>
                            <Select
                                value={isFactura ? 'RUC' : data.document_type}
                                disabled={isFactura}
                                onValueChange={(val) => {
                                    setData('document_type', val);
                                    setData('document_number', '');
                                }}
                            >
                                <SelectTrigger id="qc_doc_type" className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {!isFactura && <SelectItem value="DNI">DNI (8 dígitos)</SelectItem>}
                                    <SelectItem value="RUC">RUC (11 dígitos)</SelectItem>
                                    {!isFactura && (
                                        <>
                                            <SelectItem value="CE">Carné de Extranjería</SelectItem>
                                            <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                                            <SelectItem value="OTRO">Otro Documento</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-3 space-y-1.5">
                            <Label htmlFor="qc_doc_num" className="text-xs font-medium flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                                    {data.document_type === 'RUC' || isFactura
                                        ? 'N° de RUC (11 dígitos)'
                                        : data.document_type === 'DNI'
                                            ? 'N° de DNI (8 dígitos)'
                                            : 'N° de Documento'}
                                </span>
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="qc_doc_num"
                                required
                                placeholder={data.document_type === 'RUC' || isFactura ? '10/20XXXXXXXXX' : '8 dígitos'}
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

                    {/* Razón Social / Nombre */}
                    <div className="space-y-1.5">
                        <Label htmlFor="qc_legal_name" className="text-xs font-medium flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                {data.document_type === 'RUC' || isFactura ? 'Razón Social / Negocio' : 'Nombre Completo'}
                            </span>
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="qc_legal_name"
                            required
                            placeholder={data.document_type === 'RUC' || isFactura ? 'Ej. INVERSIONES HUARCAYA S.A.C.' : 'Ej. Juan Pérez Quispe'}
                            value={data.legal_name}
                            onChange={(e) => setData('legal_name', e.target.value)}
                            className="h-9 text-xs"
                        />
                        <InputError message={errors.legal_name} />
                    </div>

                    {/* Toggle Datos de Contacto Opcionales */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => setShowContactFields(!showContactFields)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                        >
                            {showContactFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {showContactFields ? 'Ocultar datos adicionales' : '+ Agregar teléfono, email o dirección (opcional)'}
                        </button>
                    </div>

                    {showContactFields && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/40 border text-xs animate-in fade-in-50 duration-150">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="qc_phone" className="text-[11px] font-medium flex items-center gap-1 text-muted-foreground">
                                        <Phone className="w-3 h-3" /> Teléfono
                                    </Label>
                                    <Input
                                        id="qc_phone"
                                        placeholder="Ej. 987654321"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="qc_email" className="text-[11px] font-medium flex items-center gap-1 text-muted-foreground">
                                        <Mail className="w-3 h-3" /> Correo Electrónico
                                    </Label>
                                    <Input
                                        id="qc_email"
                                        type="email"
                                        placeholder="cliente@ejemplo.com"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="qc_address" className="text-[11px] font-medium flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="w-3 h-3" /> Dirección / Referencia
                                </Label>
                                <Input
                                    id="qc_address"
                                    placeholder="Av. Los Álamos 123, Urb. Primavera"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    )}

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
                            disabled={processing}
                            className="h-9 gap-1.5 text-xs font-semibold"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" /> Guardar Cliente
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
