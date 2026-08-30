import { Head, useForm, router } from '@inertiajs/react';
import { Search, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Catálogo', href: '#' },
    { title: 'Proveedores', href: '/suppliers' },
];

export default function SuppliersIndex({ suppliers }: { suppliers: any[] }) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    
    const getDocumentProps = (type: string) => {
        switch(type) {
            case 'DNI': return { maxLength: 8, placeholder: 'Ej: 12345678', pattern: "\\d{8}" };
            case 'RUC': return { maxLength: 11, placeholder: 'Ej: 10123456789', pattern: "\\d{11}" };
            case 'CE': return { maxLength: 12, placeholder: 'Ej: 000123456' };
            case 'PASAPORTE': return { maxLength: 15, placeholder: 'Ej: P1234567' };
            default: return { maxLength: 20, placeholder: 'Ingrese número...' };
        }
    };

    const { data, setData, post, put, reset, errors, clearErrors, processing } = useForm({
        document_type: '',
        document_number: '',
        legal_name: '',
        trade_name: '',
        phone: '',
        email: '',
        address: '',
        contact_name: '',
        notes: '',
        status: 'ACTIVE',
    });

    const filteredSuppliers = suppliers.filter(s =>
        s.legal_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.document_number && s.document_number.includes(search))
    );

    const openCreate = () => {
        setEditingId(null);
        reset();
        clearErrors();
        setIsOpen(true);
    };

    const openEdit = (supplier: any) => {
        setEditingId(supplier.id);
        setData({
            document_type: supplier.document_type || '',
            document_number: supplier.document_number || '',
            legal_name: supplier.legal_name,
            trade_name: supplier.trade_name || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            contact_name: supplier.contact_name || '',
            notes: supplier.notes || '',
            status: supplier.status,
        });
        clearErrors();
        setIsOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            put(`/suppliers/${editingId}`, {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post('/suppliers', {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const toggleStatus = (id: number) => {
        if (confirm('¿Estás seguro de cambiar el estado de este proveedor?')) {
            router.delete(`/suppliers/${id}`);
        }
    };

    return (
        <>
            <Head title="Proveedores" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Proveedores</h2>
                        <p className="text-sm text-gray-500">Gestiona los proveedores para el registro de compras.</p>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Nuevo Proveedor
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por nombre o documento..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border bg-card text-card-foreground">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead>Razón Social / Nombre</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Teléfono / Email</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                            <div className="font-medium">{s.document_number || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{s.document_type || ''}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{s.legal_name}</div>
                                            {s.trade_name && <div className="text-xs text-muted-foreground">{s.trade_name}</div>}
                                        </TableCell>
                                        <TableCell>{s.contact_name || '-'}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{s.phone || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{s.email || ''}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                s.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }`}>
                                                {s.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => toggleStatus(s.id)} className={s.status === 'ACTIVE' ? "text-red-600" : "text-green-600"}>
                                                    {s.status === 'ACTIVE' ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron proveedores.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-[700px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
                            <DialogDescription>
                                Ingresa los datos del proveedor. La razón social es obligatoria.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="document_type">Tipo de Documento</Label>
                                    <Select value={data.document_type} onValueChange={(val) => setData('document_type', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RUC">RUC</SelectItem>
                                            <SelectItem value="DNI">DNI</SelectItem>
                                            <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                                            <SelectItem value="OTRO">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.document_type} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="document_number">Número de Documento</Label>
                                    <Input 
                                        id="document_number" 
                                        value={data.document_number} 
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            // Solo permitir números para DNI y RUC
                                            if (data.document_type === 'DNI' || data.document_type === 'RUC') {
                                                val = val.replace(/\D/g, '');
                                            }
                                            setData('document_number', val);
                                        }} 
                                        {...getDocumentProps(data.document_type)}
                                    />
                                    <InputError message={errors.document_number} />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="legal_name">Nombre / Razón Social <span className="text-red-500">*</span></Label>
                                <Input id="legal_name" value={data.legal_name} onChange={(e) => setData('legal_name', e.target.value)} required />
                                <InputError message={errors.legal_name} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="trade_name">Nombre Comercial (Opcional)</Label>
                                    <Input id="trade_name" value={data.trade_name} onChange={(e) => setData('trade_name', e.target.value)} />
                                    <InputError message={errors.trade_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_name">Nombre de Contacto</Label>
                                    <Input id="contact_name" value={data.contact_name} onChange={(e) => setData('contact_name', e.target.value)} />
                                    <InputError message={errors.contact_name} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                                    <InputError message={errors.phone} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Textarea id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                                <InputError message={errors.address} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Estado</Label>
                                    <Select value={data.status} onValueChange={(val) => setData('status', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Activo</SelectItem>
                                            <SelectItem value="INACTIVE">Inactivo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.status} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notas Internas</Label>
                                    <Textarea id="notes" value={data.notes} onChange={(e) => setData('notes', e.target.value)} className="h-10" />
                                    <InputError message={errors.notes} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}


SuppliersIndex.layout = {
    breadcrumbs,
};
