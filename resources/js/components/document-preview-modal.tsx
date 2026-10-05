import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Loader2, RefreshCw } from 'lucide-react';

interface DocumentPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
    title?: string;
    subtitle?: string;
}

export function DocumentPreviewModal({
    open,
    onOpenChange,
    url,
    title = 'Vista Previa del Documento',
    subtitle,
}: DocumentPreviewModalProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loading, setLoading] = useState(true);

    // Reset loading state whenever URL changes or dialog opens
    useEffect(() => {
        if (open && url) {
            setLoading(true);
        }
    }, [open, url]);

    // Handle postMessage from iframe (e.g. user clicking "Cerrar" inside the printed document)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'close-preview') {
                onOpenChange(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [onOpenChange]);

    const handlePrint = () => {
        if (iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
            } catch (e) {
                console.error('Error invoking print from iframe:', e);
            }
        }
    };

    const handleReload = () => {
        if (iframeRef.current && url) {
            setLoading(true);
            iframeRef.current.src = url;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-5xl w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden sm:max-w-5xl rounded-xl border shadow-2xl bg-background"
                showCloseButton={false}
            >
                {/* Header Bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b bg-card/60 backdrop-blur-xs select-none">
                    <div className="flex flex-col gap-0.5">
                        <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Printer className="size-4 text-primary" />
                            {title}
                        </DialogTitle>
                        {subtitle && (
                            <DialogDescription className="text-xs text-muted-foreground">
                                {subtitle}
                            </DialogDescription>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium"
                            onClick={handleReload}
                            disabled={loading || !url}
                            title="Recargar vista previa"
                        >
                            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Recargar</span>
                        </Button>

                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                            onClick={handlePrint}
                            disabled={loading || !url}
                        >
                            <Printer className="size-3.5" />
                            <span>Imprimir</span>
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onOpenChange(false)}
                            title="Cerrar vista previa"
                        >
                            <X className="size-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>
                </div>

                {/* Content Area with Iframe */}
                <div className="relative flex-1 w-full bg-muted/30 overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-2xs gap-3">
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-xs font-medium text-muted-foreground">
                                Cargando documento para impresión...
                            </p>
                        </div>
                    )}

                    {url ? (
                        <iframe
                            ref={iframeRef}
                            src={url}
                            title={title}
                            className="w-full h-full border-0 bg-white"
                            onLoad={() => setLoading(false)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                            No se especificó un documento válido.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
