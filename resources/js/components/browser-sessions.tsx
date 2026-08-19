import { Form } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Computer, Smartphone } from 'lucide-react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type Session = {
    agent: {
        is_desktop: boolean;
        platform: string;
        browser: string;
    };
    ip_address: string;
    is_current_device: boolean;
    last_active: string;
};

export type Props = {
    sessions: Session[];
};

export default function BrowserSessions({ sessions }: Props) {
    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6 pt-6 border-t border-border">
            <Heading
                variant="small"
                title="Sesiones de Navegador"
                description="Gestiona y cierra sesión de tus sesiones activas en otros navegadores y dispositivos."
            />

            <div className="max-w-xl text-sm text-muted-foreground">
                Si es necesario, puedes cerrar sesión en todas las demás sesiones de tu navegador en todos tus dispositivos. Algunas de tus sesiones recientes se enumeran a continuación; sin embargo, esta lista puede no ser exhaustiva. Si crees que tu cuenta ha sido comprometida, también debes actualizar tu contraseña.
            </div>

            {sessions.length > 0 && (
                <div className="mt-5 space-y-6">
                    {sessions.map((session, i) => (
                        <div key={i} className="flex items-center">
                            <div>
                                {session.agent.is_desktop ? (
                                    <Computer className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>

                            <div className="ml-3">
                                <div className="text-sm text-foreground">
                                    {session.agent.platform ? session.agent.platform : 'Desconocido'} -{' '}
                                    {session.agent.browser ? session.agent.browser : 'Desconocido'}
                                </div>

                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        {session.ip_address},
                                        {session.is_current_device ? (
                                            <span className="text-green-500 font-semibold ml-1">Este dispositivo</span>
                                        ) : (
                                            <span className="ml-1">Última vez activo {session.last_active}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center mt-5">
                <Button onClick={() => setConfirmingLogout(true)}>
                    Cerrar sesión en otros dispositivos
                </Button>
            </div>

            <Dialog open={confirmingLogout} onOpenChange={setConfirmingLogout}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cerrar sesión en otros dispositivos</DialogTitle>
                        <DialogDescription>
                            Por favor, introduce tu contraseña para confirmar que deseas cerrar sesión en todas las demás sesiones de tus dispositivos.
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        {...SecurityController.destroyBrowserSessions.form()}
                        onSuccess={() => setConfirmingLogout(false)}
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }
                        }}
                    >
                        {({ errors, processing }) => (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        className="mt-1 block w-full"
                                        placeholder="Contraseña"
                                        autoComplete="current-password"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setConfirmingLogout(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button disabled={processing} type="submit">
                                        Cerrar sesión
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
