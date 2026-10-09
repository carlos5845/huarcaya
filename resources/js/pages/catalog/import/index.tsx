import React, { useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    FileSpreadsheet,
    Upload,
    Download,
    AlertCircle,
    CheckCircle2,
    Building2,
    RefreshCw,
    PlusCircle,
    AlertTriangle,
    Layers,
    ArrowRight,
    ArrowLeft,
    Check,
    Clock,
    FileText,
    History,
    X,
    ExternalLink,
    Boxes,
    Settings2,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs = [
    { title: 'Catálogo', href: '/products' },
    { title: 'Importación Masiva', href: '/catalog/import' },
];

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface ImportBatch {
    id: number;
    uuid: string;
    entity_type: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
    total_rows: number;
    processed_rows: number;
    failed_rows: number;
    file_path: string | null;
    created_at: string;
    creator?: {
        id: number;
        name: string;
        username: string;
    } | null;
}

interface SampleRow {
    row_number: number;
    referencia_original: string;
    nombre_repuesto: string;
    codigo_interno?: string;
    marca?: string;
    categoria?: string;
    unidad_medida?: string;
    costo_compra: number;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
    status: 'NEW' | 'EXISTS' | 'INVALID';
    error_message?: string | null;
}

interface PreviewData {
    temp_token: string;
    file_name: string;
    file_size: number;
    total_rows: number;
    valid_new: number;
    valid_existing: number;
    invalid_rows: number;
    sample_rows: SampleRow[];
}

interface ImportResult {
    batch_id: number;
    batch_uuid: string;
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    status: string;
    message: string;
}

interface Props {
    branches: Branch[];
    defaultBranchId: number | null;
    recentBatches: ImportBatch[];
}

export default function ImportIndex({ branches = [], defaultBranchId, recentBatches = [] }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [selectedBranchId, setSelectedBranchId] = useState<string>(
        defaultBranchId ? String(defaultBranchId) : branches[0]?.id ? String(branches[0].id) : ''
    );
    const [duplicateStrategy, setDuplicateStrategy] = useState<'UPDATE_AND_ADD_STOCK' | 'ONLY_NEW' | 'OVERWRITE_STOCK'>('UPDATE_AND_ADD_STOCK');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState<boolean>(false);

    // Wizard & preview state
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Execution state
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');

    const handleFileChange = (file: File | null) => {
        if (!file) {
            setSelectedFile(null);
            return;
        }

        const validExts = ['.xlsx', '.xls', '.csv'];
        const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

        if (!hasValidExt) {
            setPreviewError('El archivo debe ser en formato Excel (.xlsx, .xls) o CSV (.csv).');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setPreviewError(null);
        setSelectedFile(file);
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
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handlePreview = async () => {
        if (!selectedFile) {
            setPreviewError('Por favor selecciona un archivo para continuar.');
            return;
        }

        if (!selectedBranchId) {
            setPreviewError('Debes seleccionar la sucursal de destino del inventario.');
            return;
        }

        setIsPreviewing(true);
        setPreviewError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('branch_id', selectedBranchId);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const response = await fetch('/catalog/import/preview', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Error al validar el archivo.');
            }

            setPreviewData(result.data);
            setStep(2);
        } catch (err: any) {
            setPreviewError(err.message || 'Error al comunicarse con el servidor.');
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleExecuteImport = async () => {
        if (!selectedBranchId) {
            setPreviewError('Sucursal no válida.');
            return;
        }

        setIsImporting(true);
        setPreviewError(null);

        const formData = new FormData();
        formData.append('branch_id', selectedBranchId);
        formData.append('duplicate_strategy', duplicateStrategy);

        if (previewData?.temp_token) {
            formData.append('temp_file_token', previewData.temp_token);
            formData.append('file_name', previewData.file_name);
        } else if (selectedFile) {
            formData.append('file', selectedFile);
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const response = await fetch('/catalog/import', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error al procesar la importación.');
            }

            setImportResult({
                ...data.result,
                message: data.message,
            });
            setStep(3);
        } catch (err: any) {
            setPreviewError(err.message || 'Error durante la ejecución de la importación.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSelectedFile(null);
        setPreviewData(null);
        setPreviewError(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return new Intl.DateTimeFormat('es-PE', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(date);
        } catch {
            return isoString;
        }
    };

    return (
        <>
            <Head title="Importación Masiva de Repuestos" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-primary/10 text-primary rounded-lg">
                                <FileSpreadsheet className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Importación Masiva de Repuestos
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                            Carga tu catálogo automotriz, precios de venta y registra tu inventario inicial con auditoría Kardex.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button asChild variant="outline" className="gap-2 shadow-xs w-full sm:w-auto">
                            <a href="/catalog/import/template">
                                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                Descargar Plantilla Oficial
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'history')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="import" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Nueva Importación
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="h-4 w-4" />
                            Historial de Lotes ({recentBatches.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB: NUEVA IMPORTACIÓN */}
                    <TabsContent value="import" className="space-y-6 mt-4">
                        {/* Stepper Header */}
                        <div className="flex items-center justify-between max-w-xl mx-auto py-2">
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                                    step === 1 ? 'bg-primary text-primary-foreground shadow-xs' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {step > 1 ? <Check className="h-4 w-4" /> : '1'}
                                </div>
                                <span className={`text-sm font-medium ${step === 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                    Configurar & Cargar
                                </span>
                            </div>

                            <div className={`h-0.5 flex-1 mx-4 transition-colors ${step > 1 ? 'bg-emerald-600' : 'bg-muted'}`} />

                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                                    step === 2 ? 'bg-primary text-primary-foreground shadow-xs' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {step > 2 ? <Check className="h-4 w-4" /> : '2'}
                                </div>
                                <span className={`text-sm font-medium ${step === 2 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                    Validar Muestra
                                </span>
                            </div>

                            <div className={`h-0.5 flex-1 mx-4 transition-colors ${step > 2 ? 'bg-emerald-600' : 'bg-muted'}`} />

                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                                    step === 3 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-muted text-muted-foreground'
                                }`}>
                                    3
                                </div>
                                <span className={`text-sm font-medium ${step === 3 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                    Resultados
                                </span>
                            </div>
                        </div>

                        {previewError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Observación</AlertTitle>
                                <AlertDescription>{previewError}</AlertDescription>
                            </Alert>
                        )}

                        {/* STEP 1: CONFIGURACIÓN Y CARGA */}
                        {step === 1 && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card className="shadow-xs">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Settings2 className="h-5 w-5 text-primary" />
                                                1. Parámetros de Carga
                                            </CardTitle>
                                            <CardDescription>
                                                Define la sede destino y cómo tratar los repuestos que ya existan en tu catálogo.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-5">
                                            {/* Selector de Sucursal */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    Sucursal Destino del Inventario:
                                                </label>
                                                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Seleccionar sucursal..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {branches.map((b) => (
                                                            <SelectItem key={b.id} value={String(b.id)}>
                                                                <span className="font-medium">{b.name}</span>
                                                                <span className="text-xs text-muted-foreground ml-2">({b.code})</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    El stock inicial de cada repuesto se cargará a esta sucursal seleccionada.
                                                </p>
                                            </div>

                                            {/* Política de Duplicados */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                                    ¿Qué hacer si un repuesto ya existe en el catálogo?
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    {/* Opción 1 */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDuplicateStrategy('UPDATE_AND_ADD_STOCK')}
                                                        className={`text-left p-3.5 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                                                            duplicateStrategy === 'UPDATE_AND_ADD_STOCK'
                                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-medium'
                                                                : 'border-border hover:bg-muted/50 text-muted-foreground'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-foreground flex items-center justify-between mb-1">
                                                                <span>Actualizar & Sumar</span>
                                                                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    Recomendado
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                                Actualiza ficha técnica y añade el stock importado a esta sede.
                                                            </p>
                                                        </div>
                                                    </button>

                                                    {/* Opción 2 */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDuplicateStrategy('ONLY_NEW')}
                                                        className={`text-left p-3.5 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                                                            duplicateStrategy === 'ONLY_NEW'
                                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-medium'
                                                                : 'border-border hover:bg-muted/50 text-muted-foreground'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-foreground mb-1">
                                                                Solo Repuestos Nuevos
                                                            </div>
                                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                                Ignora los repuestos que ya existan sin alterar su inventario ni precios.
                                                            </p>
                                                        </div>
                                                    </button>

                                                    {/* Opción 3 */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDuplicateStrategy('OVERWRITE_STOCK')}
                                                        className={`text-left p-3.5 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                                                            duplicateStrategy === 'OVERWRITE_STOCK'
                                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-medium'
                                                                : 'border-border hover:bg-muted/50 text-muted-foreground'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-foreground mb-1">
                                                                Sobrescribir Stock
                                                            </div>
                                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                                Ajusta el inventario de esta sede para que coincida exactamente con el Excel.
                                                            </p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Zona de Carga Drag & Drop */}
                                    <Card className="shadow-xs">
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Upload className="h-5 w-5 text-primary" />
                                                2. Selección del Archivo Excel / CSV
                                            </CardTitle>
                                            <CardDescription>
                                                Arrastra el archivo completado o selecciónalo desde tu equipo.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div
                                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                    dragActive
                                                        ? 'border-primary bg-primary/5 scale-[0.99]'
                                                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                                                }`}
                                                onDragEnter={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDragOver={handleDrag}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <div className="p-3 bg-primary/10 rounded-full text-primary mb-3">
                                                    <Upload className="h-8 w-8" />
                                                </div>
                                                <p className="text-sm font-semibold mb-1 text-foreground">
                                                    Haz clic para examinar o arrastra tu archivo aquí
                                                </p>
                                                <p className="text-xs text-muted-foreground mb-4">
                                                    Formatos soportados: .xlsx, .xls, .csv (Hasta 20 MB)
                                                </p>

                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept=".xlsx,.xls,.csv"
                                                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                                                />

                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fileInputRef.current?.click();
                                                    }}
                                                >
                                                    Explorar en el equipo
                                                </Button>
                                            </div>

                                            {selectedFile && (
                                                <div className="mt-4 p-3 bg-muted/60 border rounded-lg flex items-center justify-between">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileSpreadsheet className="h-6 w-6 text-emerald-600 shrink-0" />
                                                        <div className="truncate">
                                                            <p className="text-sm font-semibold truncate text-foreground">
                                                                {selectedFile.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                                                        onClick={() => {
                                                            setSelectedFile(null);
                                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>

                                        <CardFooter className="flex justify-between items-center border-t pt-4 bg-muted/10">
                                            <span className="text-xs text-muted-foreground">
                                                Paso 1 de 3
                                            </span>
                                            <Button
                                                onClick={handlePreview}
                                                disabled={!selectedFile || !selectedBranchId || isPreviewing}
                                                className="gap-2 shadow-xs"
                                            >
                                                {isPreviewing ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                        Analizando archivo...
                                                    </>
                                                ) : (
                                                    <>
                                                        Previsualizar y Validar
                                                        <ArrowRight className="h-4 w-4" />
                                                    </>
                                                )}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </div>

                                {/* Sidebar de Ayuda y Reglas */}
                                <div className="space-y-4">
                                    <Card className="shadow-xs bg-muted/20 border-border">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-primary" />
                                                Columnas Reconocidas
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                El sistema normaliza automáticamente nombres y mayúsculas.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="text-xs space-y-2.5">
                                            <div className="p-2 bg-background rounded border">
                                                <span className="font-semibold text-primary block">referencia_original *</span>
                                                <span className="text-muted-foreground">Código de parte o número de fabricante único (ej. 04465-02220).</span>
                                            </div>
                                            <div className="p-2 bg-background rounded border">
                                                <span className="font-semibold text-primary block">nombre_repuesto *</span>
                                                <span className="text-muted-foreground">Descripción clara del producto (ej. Pastillas Delanteras Corolla).</span>
                                            </div>
                                            <div className="p-2 bg-background rounded border">
                                                <span className="font-semibold block">codigo_interno (SKU)</span>
                                                <span className="text-muted-foreground">Código interno de barra o estante del taller.</span>
                                            </div>
                                            <div className="p-2 bg-background rounded border">
                                                <span className="font-semibold block">costo_compra & precio_venta</span>
                                                <span className="text-muted-foreground">Costo de adquisición para Kardex y Precio Público para el POS.</span>
                                            </div>
                                            <div className="p-2 bg-background rounded border">
                                                <span className="font-semibold block">stock_inicial & stock_minimo</span>
                                                <span className="text-muted-foreground">Unidades físicas iniciales y umbral para alertas de stock bajo.</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 space-y-2">
                                        <div className="font-semibold flex items-center gap-1.5">
                                            <Boxes className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            Trazabilidad Contable Garantizada
                                        </div>
                                        <p>
                                            Cada repuesto con stock mayor a cero generará un asiento automático en el <strong>Kardex Valorizado</strong> como <em>INVENTARIO INICIAL</em> y creará su respectivo lote para auditoría.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PREVISUALIZACIÓN Y ANÁLISIS PREVIO */}
                        {step === 2 && previewData && (
                            <div className="space-y-6">
                                {/* Resumen Métricas */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <Card className="shadow-xs border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Total Filas</p>
                                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{previewData.total_rows}</p>
                                            </div>
                                            <FileSpreadsheet className="h-8 w-8 text-blue-500 opacity-60" />
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-xs border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Nuevos a Crear</p>
                                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{previewData.valid_new}</p>
                                            </div>
                                            <PlusCircle className="h-8 w-8 text-emerald-500 opacity-60" />
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-xs border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Existentes Detectados</p>
                                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{previewData.valid_existing}</p>
                                            </div>
                                            <RefreshCw className="h-8 w-8 text-amber-500 opacity-60" />
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-xs border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Observadas / Errores</p>
                                                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{previewData.invalid_rows}</p>
                                            </div>
                                            <AlertTriangle className="h-8 w-8 text-rose-500 opacity-60" />
                                        </CardContent>
                                    </Card>
                                </div>

                                {previewData.invalid_rows > 0 && (
                                    <Alert variant="destructive" className="bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900">
                                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                                        <AlertTitle className="text-rose-900 dark:text-rose-300 font-semibold">
                                            Atención: Se detectaron {previewData.invalid_rows} fila(s) con datos no válidos
                                        </AlertTitle>
                                        <AlertDescription className="text-xs text-rose-800 dark:text-rose-400">
                                            Las filas con errores serán omitidas del inventario y registradas en el reporte de auditoría para que puedas descargarlas y corregirlas fácilmente.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Tabla Muestra */}
                                <Card className="shadow-xs">
                                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                Muestra de Verificación (Primeras {previewData.sample_rows.length} filas)
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Verifica cómo se mapearon las columnas principales antes de aplicar cambios permanentes.
                                            </CardDescription>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-muted-foreground">Política activa:</span>
                                            <Badge variant="outline" className="font-normal text-xs">
                                                {duplicateStrategy === 'UPDATE_AND_ADD_STOCK' && 'Actualizar y Sumar Stock'}
                                                {duplicateStrategy === 'ONLY_NEW' && 'Solo Repuestos Nuevos'}
                                                {duplicateStrategy === 'OVERWRITE_STOCK' && 'Sobrescribir Stock'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead className="w-12 text-center">#</TableHead>
                                                        <TableHead className="w-24">Estado</TableHead>
                                                        <TableHead>Referencia</TableHead>
                                                        <TableHead>Nombre del Repuesto</TableHead>
                                                        <TableHead>Marca / Categoría</TableHead>
                                                        <TableHead className="text-right">Costo</TableHead>
                                                        <TableHead className="text-right">P. Venta</TableHead>
                                                        <TableHead className="text-right">Stock Ini.</TableHead>
                                                        <TableHead>Observación</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {previewData.sample_rows.map((row, idx) => (
                                                        <TableRow key={idx} className={row.status === 'INVALID' ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}>
                                                            <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                                {row.row_number}
                                                            </TableCell>
                                                            <TableCell>
                                                                {row.status === 'NEW' && (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                                                                        Nuevo
                                                                    </Badge>
                                                                )}
                                                                {row.status === 'EXISTS' && (
                                                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300">
                                                                        Existe
                                                                    </Badge>
                                                                )}
                                                                {row.status === 'INVALID' && (
                                                                    <Badge variant="destructive">
                                                                        Observado
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs font-semibold">
                                                                {row.referencia_original}
                                                            </TableCell>
                                                            <TableCell className="max-w-[200px] truncate text-xs font-medium">
                                                                {row.nombre_repuesto}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {row.marca || '-'} / {row.categoria || '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-mono">
                                                                S/ {row.costo_compra.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                                                S/ {row.precio_venta.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-mono font-semibold">
                                                                {row.stock_inicial} {row.unidad_medida || 'UND'}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {row.error_message ? (
                                                                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                                        {row.error_message}
                                                                    </span>
                                                                ) : row.status === 'EXISTS' ? (
                                                                    <span className="text-amber-700 dark:text-amber-400">
                                                                        Se aplicará política {duplicateStrategy}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                                        Listo para alta
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-between items-center border-t p-4 bg-muted/10">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="gap-2"
                                            disabled={isImporting}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Volver / Cambiar Archivo
                                        </Button>

                                        <Button
                                            onClick={handleExecuteImport}
                                            disabled={isImporting}
                                            className="gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            {isImporting ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                    Procesando importación en BD...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Confirmar e Importar ({previewData.total_rows} filas)
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}

                        {/* STEP 3: RESULTADOS DE IMPORTACIÓN */}
                        {step === 3 && importResult && (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <Card className="shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-background text-center py-6">
                                    <CardContent className="space-y-4">
                                        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <CheckCircle2 className="h-8 w-8" />
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-bold text-foreground">
                                                ¡Importación Finalizada!
                                            </h2>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                {importResult.message}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 max-w-lg mx-auto">
                                            <div className="p-3 bg-muted/40 rounded-lg border text-center">
                                                <p className="text-xs text-muted-foreground">Total</p>
                                                <p className="text-xl font-bold font-mono text-foreground">{importResult.total}</p>
                                            </div>
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-center">
                                                <p className="text-xs text-emerald-800 dark:text-emerald-300">Creados</p>
                                                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">{importResult.created}</p>
                                            </div>
                                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-center">
                                                <p className="text-xs text-blue-800 dark:text-blue-300">Actualizados</p>
                                                <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400">{importResult.updated}</p>
                                            </div>
                                            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg text-center">
                                                <p className="text-xs text-rose-800 dark:text-rose-300">Observados</p>
                                                <p className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400">{importResult.failed}</p>
                                            </div>
                                        </div>

                                        {importResult.failed > 0 && (
                                            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-300">
                                                        {importResult.failed} fila(s) no pudieron procesarse
                                                    </p>
                                                    <p className="text-xs text-rose-800 dark:text-rose-400">
                                                        Descarga el archivo Excel con el motivo de observación para corregirlas.
                                                    </p>
                                                </div>

                                                <Button asChild size="sm" variant="destructive" className="gap-2 shrink-0">
                                                    <a href={`/catalog/import/batches/${importResult.batch_id}/errors`}>
                                                        <Download className="h-4 w-4" />
                                                        Descargar Errores
                                                    </a>
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center border-t pt-6 bg-muted/10">
                                        <Button onClick={handleReset} variant="outline" className="gap-2 w-full sm:w-auto">
                                            <Upload className="h-4 w-4" />
                                            Realizar otra Importación
                                        </Button>

                                        <Button asChild className="gap-2 w-full sm:w-auto">
                                            <Link href="/products">
                                                <ExternalLink className="h-4 w-4" />
                                                Ir al Catálogo de Repuestos
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB: HISTORIAL DE LOTES */}
                    <TabsContent value="history" className="space-y-4 mt-4">
                        <Card className="shadow-xs">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <History className="h-4 w-4 text-primary" />
                                        Historial de Lotes Importados
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Registro de auditoría de todas las importaciones masivas efectuadas en la empresa.
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {recentBatches.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        No se han registrado importaciones masivas todavía.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-16">Lote #</TableHead>
                                                    <TableHead>Fecha y Hora</TableHead>
                                                    <TableHead>Usuario</TableHead>
                                                    <TableHead>Archivo Origen</TableHead>
                                                    <TableHead className="text-center">Total Filas</TableHead>
                                                    <TableHead className="text-center">Procesadas</TableHead>
                                                    <TableHead className="text-center">Fallidas</TableHead>
                                                    <TableHead className="text-center">Estado</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentBatches.map((batch) => (
                                                    <TableRow key={batch.id}>
                                                        <TableCell className="font-mono font-bold text-xs">
                                                            #{batch.id}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {formatDate(batch.created_at)}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {batch.creator?.name || batch.creator?.username || 'Sistema'}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono max-w-[180px] truncate">
                                                            {batch.file_path || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-mono font-semibold">
                                                            {batch.total_rows}
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-mono text-emerald-600 font-semibold">
                                                            {batch.processed_rows}
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-mono">
                                                            {batch.failed_rows > 0 ? (
                                                                <span className="text-rose-600 font-bold">{batch.failed_rows}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground">0</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {batch.status === 'COMPLETED' && (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    Completado
                                                                </Badge>
                                                            )}
                                                            {batch.status === 'PARTIAL' && (
                                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                    Parcial
                                                                </Badge>
                                                            )}
                                                            {batch.status === 'FAILED' && (
                                                                <Badge variant="destructive">
                                                                    Fallido
                                                                </Badge>
                                                            )}
                                                            {batch.status === 'PROCESSING' && (
                                                                <Badge variant="outline" className="animate-pulse">
                                                                    En Proceso
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {batch.failed_rows > 0 ? (
                                                                <Button asChild size="sm" variant="ghost" className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                                                                    <a href={`/catalog/import/batches/${batch.id}/errors`}>
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        Errores ({batch.failed_rows})
                                                                    </a>
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground pr-2">Sin observaciones</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

ImportIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
