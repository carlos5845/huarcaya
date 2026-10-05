import { useState } from 'react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { MonitorDown, CheckCircle2, Laptop, Chrome } from 'lucide-react';

export function PwaInstallButton() {
    const { canInstall, isStandalone, promptInstall } = usePwaInstall();
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    if (isStandalone) {
        return null;
    }

    const handleClick = async () => {
        if (canInstall) {
            const installed = await promptInstall();
            if (!installed) {
                // User dismissed or something failed, show help if needed
            }
        } else {
            setIsHelpOpen(true);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClick}
                className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                title="Instalar SIMAQ como aplicación de escritorio en tu PC"
            >
                <MonitorDown className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="hidden sm:inline">Instalar en PC</span>
            </Button>

            <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <Laptop className="h-5 w-5 text-primary" /> Instalar SIMAQ en tu Computadora
                        </DialogTitle>
                        <DialogDescription>
                            Puedes usar SIMAQ como un programa nativo de Windows o macOS, con acceso directo en el escritorio y soporte offline rápido.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs text-muted-foreground">
                        <div className="p-3 rounded-lg bg-muted/60 border space-y-2">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                                <Chrome className="h-4 w-4 text-primary" /> Desde Google Chrome o Microsoft Edge:
                            </div>
                            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                                <li>
                                    Mira el extremo derecho de tu <strong>barra de direcciones (URL)</strong>.
                                </li>
                                <li>
                                    Haz clic en el ícono de <strong>Instalar SIMAQ</strong> (una pantalla con flecha hacia abajo).
                                </li>
                                <li>
                                    O abre el menú del navegador <strong>(&#8942; o &#8230;)</strong> &rarr; <strong>Aplicaciones</strong> &rarr; <strong>"Instalar este sitio como aplicación"</strong>.
                                </li>
                            </ol>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                            <span>
                                Una vez instalada, la aplicación se abrirá en su propia ventana sin barras del navegador y quedará guardada en tu menú de Inicio.
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
