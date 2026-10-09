import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Printer,
    X,
    Loader2,
    RefreshCw,
    Download,
    ZoomIn,
    ZoomOut,
    RotateCw,
    ImageIcon,
    FileText,
} from 'lucide-react';

interface DocumentPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
    title?: string;
    subtitle?: string;
    fileName?: string;
}

export function DocumentPreviewModal({
    open,
    onOpenChange,
    url,
    title = 'Vista Previa del Documento',
    subtitle,
    fileName,
}: DocumentPreviewModalProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const isImageFile = Boolean(
        url && (
            url.startsWith('data:image/') ||
            /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(url)
        )
    );

    // Reset loading state and zoom whenever URL changes or dialog opens
    useEffect(() => {
        if (open && url) {
            setLoading(true);
            setZoom(1);
            setRotation(0);
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
        if (!url) return;

        if (isImageFile) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>${title}</title>
                            <style>
                                @page { margin: 1cm; size: auto; }
                                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                            </style>
                        </head>
                        <body>
                            <img src="${url}" onload="window.print();window.close();" />
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } else if (iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
            } catch (e) {
                console.error('Error invoking print from iframe:', e);
            }
        }
    };

    const handleReload = () => {
        if (url) {
            setLoading(true);
            setZoom(1);
            setRotation(0);
            if (iframeRef.current && !isImageFile) {
                iframeRef.current.src = url;
            } else {
                setTimeout(() => setLoading(false), 200);
            }
        }
    };

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => {
        setZoom(1);
        setRotation(0);
    };
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

    const derivedFileName = fileName || (url?.includes('/') ? url.split('/').pop()?.split('?')[0] : 'documento');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-5xl w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden sm:max-w-5xl rounded-xl border shadow-2xl bg-background"
                showCloseButton={false}
            >
                {/* Header Bar */}
                <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b bg-card/70 backdrop-blur-xs select-none gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0 max-w-[50%]">
                        <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground truncate">
                            {isImageFile ? (
                                <ImageIcon className="size-4 text-primary shrink-0" />
                            ) : (
                                <FileText className="size-4 text-primary shrink-0" />
                            )}
                            <span className="truncate">{title}</span>
                        </DialogTitle>
                        {subtitle && (
                            <DialogDescription className="text-xs text-muted-foreground truncate">
                                {subtitle}
                            </DialogDescription>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {isImageFile && (
                            <div className="flex items-center bg-muted/60 rounded-md p-0.5 border border-border mr-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={handleZoomOut}
                                    title="Alejar (-)"
                                >
                                    <ZoomOut className="size-3.5" />
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleResetZoom}
                                    className="px-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Restablecer zoom"
                                >
                                    {Math.round(zoom * 100)}%
                                </button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={handleZoomIn}
                                    title="Acercar (+)"
                                >
                                    <ZoomIn className="size-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 ml-0.5"
                                    onClick={handleRotate}
                                    title="Girar 90°"
                                >
                                    <RotateCw className="size-3.5" />
                                </Button>
                            </div>
                        )}

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

                        {url && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-medium"
                                asChild
                            >
                                <a
                                    href={url}
                                    download={derivedFileName}
                                    title="Descargar archivo"
                                >
                                    <Download className="size-3.5" />
                                    <span className="hidden sm:inline">Descargar</span>
                                </a>
                            </Button>
                        )}

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
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground ml-1"
                            onClick={() => onOpenChange(false)}
                            title="Cerrar vista previa"
                        >
                            <X className="size-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>
                </div>

                {/* Content Area with Image or Iframe */}
                <div className="relative flex-1 w-full bg-muted/30 overflow-auto flex items-center justify-center min-h-0">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-2xs gap-3">
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-xs font-medium text-muted-foreground">
                                Cargando documento...
                            </p>
                        </div>
                    )}

                    {url ? (
                        isImageFile ? (
                            <div className="w-full h-full p-4 overflow-auto flex items-center justify-center">
                                <img
                                    src={url}
                                    alt={title}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md border border-border bg-card transition-transform duration-200"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                    }}
                                    onLoad={() => setLoading(false)}
                                    onError={() => setLoading(false)}
                                />
                            </div>
                        ) : (
                            <iframe
                                ref={iframeRef}
                                src={url}
                                title={title}
                                className="w-full h-full border-0 bg-white"
                                onLoad={() => setLoading(false)}
                            />
                        )
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
