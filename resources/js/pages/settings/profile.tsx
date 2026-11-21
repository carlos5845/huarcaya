import { Form, Head, usePage, Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';
import { 
    User, 
    CreditCard, 
    Phone, 
    Mail, 
    MapPin, 
    Calendar, 
    ShieldCheck, 
    Save, 
    CheckCircle2, 
    AlertCircle, 
    Lock,
    Building2,
    Sparkles
} from 'lucide-react';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    // Iniciales para avatar visual
    const initials = (user.name ? user.name[0] : 'U') + (user.last_name ? user.last_name[0] : '');

    return (
        <>
            <Head title="Mi Perfil" />

            <div className="space-y-6">
                {/* Banner de Bienvenida y Avatar de Usuario */}
                <Card className="border border-border/60 shadow-xs bg-linear-to-r from-primary/5 via-background to-background">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xl flex items-center justify-center shadow-md uppercase tracking-wider">
                                    {initials}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                                            {user.name} {user.last_name || ''}
                                        </h2>
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold">
                                            Activo
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>DNI: <strong className="font-mono text-foreground">{user.dni || 'No asignado'}</strong></span>
                                        <span>•</span>
                                        <span>Usuario: <strong className="font-mono text-foreground">@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</strong></span>
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/50">
                                <span className="block font-medium text-foreground">Perfil Corporativo</span>
                                <span className="text-[11px]">Inversiones Huarcaya S.A.C.</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Formulario Estilizado con Tarjetas */}
                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors, recentlySuccessful }) => (
                        <>
                            {/* Tarjeta 1: Información Personal */}
                            <Card className="border border-border/60 shadow-xs">
                                <CardHeader className="pb-3 border-b border-border/40">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        Información Personal
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Nombre oficial y apellidos tal como figuran en tu documento de identidad
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1.5">
                                                <span>Primer Nombre</span>
                                                <span className="text-rose-500">*</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    defaultValue={user.name}
                                                    required
                                                    autoComplete="name"
                                                    placeholder="Ej: Juan"
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="last_name" className="text-xs font-semibold">
                                                Apellido Paterno
                                            </Label>
                                            <Input
                                                id="last_name"
                                                name="last_name"
                                                defaultValue={user.last_name || ''}
                                                placeholder="Ej: Pérez"
                                                className="h-9 text-xs"
                                            />
                                            <InputError message={errors.last_name} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="mother_last_name" className="text-xs font-semibold">
                                                Apellido Materno
                                            </Label>
                                            <Input
                                                id="mother_last_name"
                                                name="mother_last_name"
                                                defaultValue={user.mother_last_name || ''}
                                                placeholder="Ej: García"
                                                className="h-9 text-xs"
                                            />
                                            <InputError message={errors.mother_last_name} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tarjeta 2: Documento de Identidad y SUNAT/RENIEC */}
                            <Card className="border border-border/60 shadow-xs">
                                <CardHeader className="pb-3 border-b border-border/40">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-primary" />
                                        Documento Nacional de Identidad (DNI)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Datos fiscales y de verificación ante entidades estatales
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* DNI (Solo lectura) */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="dni" className="text-xs font-semibold flex items-center justify-between">
                                                <span>Número de DNI</span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                                                    <Lock className="h-2.5 w-2.5" /> Protegido
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="dni"
                                                    name="dni"
                                                    defaultValue={user.dni}
                                                    disabled
                                                    className="h-9 text-xs font-mono bg-muted/60 text-muted-foreground cursor-not-allowed font-bold"
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Para modificar tu DNI contacta al Administrador del sistema.
                                            </p>
                                        </div>

                                        {/* Ubigeo DNI */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="dni_ubigeo" className="text-xs font-semibold flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                                <span>Ubigeo DNI (6 dígitos)</span>
                                            </Label>
                                            <Input
                                                id="dni_ubigeo"
                                                name="dni_ubigeo"
                                                defaultValue={user.dni_ubigeo || ''}
                                                maxLength={6}
                                                placeholder="Ej: 150101"
                                                className="h-9 text-xs font-mono"
                                            />
                                            <InputError message={errors.dni_ubigeo} />
                                        </div>

                                        {/* Fecha Caducidad DNI */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="dni_expiration_date" className="text-xs font-semibold flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                <span>Fecha de Caducidad DNI</span>
                                            </Label>
                                            <Input
                                                id="dni_expiration_date"
                                                name="dni_expiration_date"
                                                type="date"
                                                defaultValue={user.dni_expiration_date ? user.dni_expiration_date.substring(0, 10) : ''}
                                                className="h-9 text-xs font-mono"
                                            />
                                            <InputError message={errors.dni_expiration_date} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tarjeta 3: Canales de Contacto */}
                            <Card className="border border-border/60 shadow-xs">
                                <CardHeader className="pb-3 border-b border-border/40">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-primary" />
                                        Canales de Comunicación
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Información para notificaciones comerciales, emisión y recuperación de cuenta
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Teléfono */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1.5">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <span>Teléfono / Celular</span>
                                            </Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                defaultValue={user.phone || ''}
                                                placeholder="Ej: 987654321"
                                                className="h-9 text-xs font-mono"
                                            />
                                            <InputError message={errors.phone} />
                                        </div>

                                        {/* Correo Electrónico */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                <span>Correo Electrónico Corporativo / Personal</span>
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                defaultValue={user.email || ''}
                                                autoComplete="username"
                                                placeholder="ejemplo@huarcaya.com"
                                                className="h-9 text-xs"
                                            />
                                            <InputError message={errors.email} />
                                        </div>
                                    </div>

                                    {mustVerifyEmail && user.email_verified_at === null && (
                                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 space-y-2">
                                            <div className="flex items-center gap-2 font-medium">
                                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                                <span>Tu correo electrónico no ha sido verificado.</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="underline text-foreground font-semibold hover:text-primary transition-colors"
                                                >
                                                    Haz clic aquí para reenviar el enlace de verificación
                                                </Link>
                                            </p>

                                            {status === 'verification-link-sent' && (
                                                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                    ✓ Se ha enviado un nuevo enlace de verificación a tu correo.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Barra de Guardado Inferior */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-muted-foreground">
                                    Los cambios realizados tendrán efecto inmediato en todos tus documentos emitidos.
                                </div>
                                <div className="flex items-center gap-3">
                                    {recentlySuccessful && (
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                                            <CheckCircle2 className="h-4 w-4" /> Guardado correctamente
                                        </span>
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="h-9 px-5 gap-2 font-bold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                                    >
                                        <Save className="h-4 w-4" />
                                        {processing ? 'Guardando...' : 'Guardar Cambios'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Configuración',
            href: edit(),
        },
        {
            title: 'Mi Perfil',
            href: edit(),
        },
    ],
};
