import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import InputError from '@/components/input-error';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Catálogo', href: '#' },
    { title: 'Clientes', href: '/customers' },
];

export default function CustomersIndex({ customers }: { customers: any[] }) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, reset, errors, clearErrors, processing } = useForm({
        document_type: '',
        document_number: '',
        legal_name: '',
        trade_name: '',
        phone: '',
        email: '',
        address: '',
        status: 'ACTIVE',
    });

    const filteredCustomers = customers.filter(c =>
        c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.document_number && c.document_number.includes(search))
    );

    const openCreate = () => {
        setEditingId(null);
        reset();
        clearErrors();
        setIsOpen(true);
    };

    const openEdit = (customer: any) => {
        setEditingId(customer.id);
        setData({
            document_type: customer.document_type || '',
            document_number: customer.document_number || '',
            legal_name: customer.legal_name,
            trade_name: customer.trade_name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            status: customer.status,
        });
        clearErrors();
        setIsOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            put(route('customers.update', editingId), {
                onSuccess: () => setIsOpen(false),
            });
        } else {
            post(route('customers.store'), {
                onSuccess: () => setIsOpen(false),
            });
        }
    };

    const toggleStatus = (id: number) => {
        if (confirm('¿Estás seguro de cambiar el estado de este cliente?')) {
            router.delete(route('customers.destroy', id));
        }
    };

    return (
        <>
            <Head title="Clientes" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Clientes</h2>
                        <p className="text-sm text-gray-500">Gestiona los clientes para ventas y cuentas por cobrar.</p>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Nuevo Cliente
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
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="font-medium">{c.document_number || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{c.document_type || ''}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{c.legal_name}</div>
                                            {c.trade_name && <div className="text-xs text-muted-foreground">{c.trade_name}</div>}
                                        </TableCell>
                                        <TableCell>{c.phone || '-'}</TableCell>
                                        <TableCell>{c.email || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                c.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }`}>
                                                {c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => toggleStatus(c.id)} className={c.status === 'ACTIVE' ? "text-red-600" : "text-green-600"}>
                                                    {c.status === 'ACTIVE' ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron clientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                            <DialogDescription>
                                Ingresa los datos del cliente. El nombre o razón social es obligatorio.
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
                                            <SelectItem value="DNI">DNI</SelectItem>
                                            <SelectItem value="RUC">RUC</SelectItem>
                                            <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                                            <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.document_type} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="document_number">Número de Documento</Label>
                                    <Input id="document_number" value={data.document_number} onChange={(e) => setData('document_number', e.target.value)} />
                                    <InputError message={errors.document_number} />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="legal_name">Nombre / Razón Social <span className="text-red-500">*</span></Label>
                                <Input id="legal_name" value={data.legal_name} onChange={(e) => setData('legal_name', e.target.value)} required />
                                <InputError message={errors.legal_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="trade_name">Nombre Comercial (Opcional)</Label>
                                <Input id="trade_name" value={data.trade_name} onChange={(e) => setData('trade_name', e.target.value)} />
                                <InputError message={errors.trade_name} />
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


CustomersIndex.layout = {
    breadcrumbs,
};
