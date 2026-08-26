import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

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

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Nombre"
                                    />
                                    <InputError className="mt-2" message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="last_name">Apellido Paterno</Label>
                                    <Input
                                        id="last_name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.last_name || ''}
                                        name="last_name"
                                        placeholder="Apellido Paterno"
                                    />
                                    <InputError className="mt-2" message={errors.last_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mother_last_name">Apellido Materno</Label>
                                    <Input
                                        id="mother_last_name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.mother_last_name || ''}
                                        name="mother_last_name"
                                        placeholder="Apellido Materno"
                                    />
                                    <InputError className="mt-2" message={errors.mother_last_name} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dni">DNI</Label>

                                <Input
                                    id="dni"
                                    className="mt-1 block w-full bg-muted cursor-not-allowed"
                                    defaultValue={auth.user.dni}
                                    name="dni"
                                    disabled
                                    placeholder="DNI"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.dni}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono (opcional)</Label>

                                <Input
                                    id="phone"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.phone || ''}
                                    name="phone"
                                    placeholder="Teléfono"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.phone}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Correo electrónico (opcional)</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    autoComplete="username"
                                    placeholder="Correo electrónico"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dni_ubigeo">Ubigeo DNI (6 dígitos, opcional)</Label>

                                <Input
                                    id="dni_ubigeo"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.dni_ubigeo || ''}
                                    name="dni_ubigeo"
                                    maxLength={6}
                                    placeholder="Ej: 150101"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.dni_ubigeo}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dni_expiration_date">Fecha de Caducidad DNI (opcional)</Label>

                                <Input
                                    id="dni_expiration_date"
                                    type="date"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.dni_expiration_date ? auth.user.dni_expiration_date.substring(0, 10) : ''}
                                    name="dni_expiration_date"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.dni_expiration_date}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Tu dirección de correo electrónico no está verificada.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Haz clic aquí para reenviar el
                                                correo de verificación.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                Se ha enviado un nuevo enlace de verificación
                                                a tu dirección de correo electrónico.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Configuración del perfil',
            href: edit(),
        },
    ],
};
