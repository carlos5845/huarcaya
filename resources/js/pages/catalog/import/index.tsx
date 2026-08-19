import React, { useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ImportIndex() {
    const { flash } = usePage<any>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const { data, setData, post, processing, errors, progress, reset } = useForm({
        file: null as File | null,
    });

    const handleFile = (file: File | null) => {
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls'))) {
            setData('file', file);
        } else {
            alert('Por favor selecciona un archivo Excel (.xlsx, .csv)');
            setData('file', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/catalog/import', {
            onSuccess: () => {
                reset();
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <>
            <Head title="Importación Masiva" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-4xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                            Importación Masiva desde Excel
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Sube el catálogo de repuestos y registra tu inventario inicial de forma masiva.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="gap-2">
                        <a href="/catalog/import/template">
                            <Download className="h-4 w-4" />
                            Descargar Plantilla
                        </a>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Cargar Archivo</CardTitle>
                        <CardDescription>
                            Selecciona el archivo llenado con la plantilla descargada.
                        </CardDescription>
                    </CardHeader>
                    
                    <form onSubmit={submit}>
                        <CardContent>
                            <div 
                                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors ${
                                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50'
                                }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-sm font-medium mb-1">
                                    Arrastra y suelta tu archivo aquí
                                </p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    o haz clic para examinar (solo .xlsx, .csv)
                                </p>
                                
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.csv,.xls"
                                    onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
                                />
                                
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Seleccionar Archivo
                                </Button>
                                
                                {data.file && (
                                    <div className="mt-4 p-3 bg-muted rounded-md text-sm flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                                        <span className="font-medium">{data.file.name}</span>
                                        <span className="text-muted-foreground text-xs">
                                            ({Math.round(data.file.size / 1024)} KB)
                                        </span>
                                    </div>
                                )}
                                
                                {errors.file && (
                                    <p className="text-sm text-destructive mt-2">{errors.file}</p>
                                )}
                            </div>

                            {progress && (
                                <div className="w-full bg-secondary rounded-full h-2.5 mt-4">
                                    <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${progress.percentage}%` }}></div>
                                </div>
                            )}
                        </CardContent>
                        
                        <CardFooter className="flex justify-end border-t pt-6 bg-muted/20">
                            <Button 
                                type="submit" 
                                disabled={!data.file || processing}
                                className="w-full sm:w-auto"
                            >
                                {processing ? 'Procesando...' : 'Iniciar Importación'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg border">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> 
                        Reglas de Importación
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Referencia Original</strong> y <strong>Nombre del Repuesto</strong> son obligatorios.</li>
                        <li>Las referencias serán normalizadas (se quitarán espacios y guiones) para evitar crear duplicados.</li>
                        <li>Si un repuesto ya existe globalmente, <strong>NO se duplicará</strong>; solo se le asignará el nuevo stock inicial a tu sucursal.</li>
                        <li>Si el <strong>Stock Inicial</strong> está vacío o es 0, el producto se creará en el catálogo pero no se sumará a tu inventario físico.</li>
                    </ul>
                </div>
            </div>
        </>
    );
}
