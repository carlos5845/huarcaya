<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\ImportBatch;
use App\Models\ImportBatchRow;
use App\Models\Inventory;
use App\Models\Lot;
use App\Models\Product;
use App\Models\ProductMinStock;
use App\Models\ProductPrice;
use App\Models\Unit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Spatie\SimpleExcel\SimpleExcelReader;
use Spatie\SimpleExcel\SimpleExcelWriter;

class ProductImportService
{
    public function __construct(
        protected KardexService $kardexService
    ) {}

    /**
     * Mapeo de sinónimos de encabezados a las columnas canónicas del sistema.
     *
     * @var array<string, string>
     */
    protected array $headerSynonyms = [
        // Referencia
        'referencia_original' => 'referencia_original',
        'referencia' => 'referencia_original',
        'codigo_original' => 'referencia_original',
        'ref' => 'referencia_original',
        'part_number' => 'referencia_original',
        'nro_parte' => 'referencia_original',
        'numero_parte' => 'referencia_original',
        'codigo' => 'referencia_original',

        // Nombre
        'nombre_repuesto' => 'nombre_repuesto',
        'nombre' => 'nombre_repuesto',
        'descripcion_repuesto' => 'nombre_repuesto',
        'repuesto' => 'nombre_repuesto',
        'producto' => 'nombre_repuesto',
        'articulo' => 'nombre_repuesto',
        'item' => 'nombre_repuesto',
        'descripcion_corta' => 'nombre_repuesto',

        // Código interno
        'codigo_interno' => 'codigo_interno',
        'cod_interno' => 'codigo_interno',
        'sku' => 'codigo_interno',
        'codigo_barras' => 'codigo_interno',
        'barcode' => 'codigo_interno',

        // Marca
        'marca' => 'marca',
        'brand' => 'marca',
        'fabricante' => 'marca',
        'make' => 'marca',

        // Categoría
        'categoria' => 'categoria',
        'linea' => 'categoria',
        'familia' => 'categoria',
        'rubro' => 'categoria',
        'category' => 'categoria',

        // Unidad de medida
        'unidad_medida' => 'unidad_medida',
        'unidad' => 'unidad_medida',
        'medida' => 'unidad_medida',
        'und' => 'unidad_medida',
        'unit' => 'unidad_medida',
        'u_medida' => 'unidad_medida',

        // Costo de compra
        'costo_compra' => 'costo_compra',
        'costo' => 'costo_compra',
        'costo_unitario' => 'costo_compra',
        'precio_base' => 'costo_compra',
        'precio_costo' => 'costo_compra',
        'cost' => 'costo_compra',
        'valor_compra' => 'costo_compra',

        // Precio de venta
        'precio_venta' => 'precio_venta',
        'precio_publico' => 'precio_venta',
        'pvp' => 'precio_venta',
        'precio' => 'precio_venta',
        'price' => 'precio_venta',
        'venta' => 'precio_venta',

        // Stock inicial
        'stock_inicial' => 'stock_inicial',
        'stock' => 'stock_inicial',
        'cantidad' => 'stock_inicial',
        'cant' => 'stock_inicial',
        'qty' => 'stock_inicial',
        'existencia' => 'stock_inicial',

        // Stock mínimo
        'stock_minimo' => 'stock_minimo',
        'minimo' => 'stock_minimo',
        'stock_min' => 'stock_minimo',
        'alerta_stock' => 'stock_minimo',
        'min_stock' => 'stock_minimo',

        // Descripción
        'descripcion' => 'descripcion',
        'detalles' => 'descripcion',
        'nota' => 'descripcion',
        'notas' => 'descripcion',
        'observaciones' => 'descripcion',
        'description' => 'descripcion',
    ];

    /**
     * Genera la plantilla oficial XLSX enriquecida con ejemplos representativos.
     */
    public function generateTemplate(): string
    {
        $directory = storage_path('app/public');
        File::ensureDirectoryExists($directory);

        $path = $directory.'/plantilla_importacion_repuestos.xlsx';
        if (file_exists($path)) {
            @unlink($path);
        }

        $headers = [
            'referencia_original',
            'nombre_repuesto',
            'codigo_interno',
            'marca',
            'categoria',
            'unidad_medida',
            'costo_compra',
            'precio_venta',
            'stock_inicial',
            'stock_minimo',
            'descripcion',
        ];

        $writer = SimpleExcelWriter::create($path)->addHeader($headers);

        $writer->addRows([
            [
                'referencia_original' => '04465-02220',
                'nombre_repuesto' => 'Pastillas de Freno Delanteras Cerámicas Corolla',
                'codigo_interno' => 'PF-04465',
                'marca' => 'Toyota',
                'categoria' => 'Frenos',
                'unidad_medida' => 'Juego',
                'costo_compra' => '85.00',
                'precio_venta' => '130.00',
                'stock_inicial' => '15',
                'stock_minimo' => '4',
                'descripcion' => 'Juego de 4 pastillas cerámicas delanteras con láminas antiruido para Corolla 2014-2020.',
            ],
            [
                'referencia_original' => '90915-YZZE1',
                'nombre_repuesto' => 'Filtro de Aceite Blindado Yaris / Corolla',
                'codigo_interno' => 'FL-90915',
                'marca' => 'Denso',
                'categoria' => 'Filtros',
                'unidad_medida' => 'Unidad',
                'costo_compra' => '18.50',
                'precio_venta' => '32.00',
                'stock_inicial' => '50',
                'stock_minimo' => '10',
                'descripcion' => 'Filtro de aceite blindado rosca 3/4-16 con válvula de alivio y bypass.',
            ],
            [
                'referencia_original' => '334431',
                'nombre_repuesto' => 'Amortiguador Delantero Derecho Gas Excel-G',
                'codigo_interno' => 'AM-334431',
                'marca' => 'KYB',
                'categoria' => 'Suspensión',
                'unidad_medida' => 'Unidad',
                'costo_compra' => '160.00',
                'precio_venta' => '245.00',
                'stock_inicial' => '6',
                'stock_minimo' => '2',
                'descripcion' => 'Amortiguador bitubo a gas presurizado para eje delantero derecho.',
            ],
        ]);

        $writer->close();

        return $path;
    }

    /**
     * Normaliza un nombre de encabezado para hacerlo insensible a mayúsculas, acentos y signos.
     */
    public function canonicalizeHeader(string $header): ?string
    {
        $ascii = Str::ascii(trim($header));
        $clean = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $ascii));
        $clean = trim($clean, '_');

        return $this->headerSynonyms[$clean] ?? null;
    }

    /**
     * Mapea una fila sin procesar a las claves canónicas reconocidas.
     *
     * @param  array<string, mixed>  $rawRow
     * @return array<string, mixed>
     */
    public function mapRow(array $rawRow): array
    {
        $mapped = [
            'referencia_original' => null,
            'nombre_repuesto' => null,
            'codigo_interno' => null,
            'marca' => null,
            'categoria' => null,
            'unidad_medida' => null,
            'costo_compra' => 0.0,
            'precio_venta' => 0.0,
            'stock_inicial' => 0.0,
            'stock_minimo' => 0.0,
            'descripcion' => null,
            '_raw' => $rawRow,
        ];

        foreach ($rawRow as $key => $value) {
            $canonical = $this->canonicalizeHeader((string) $key);
            if ($canonical) {
                if (in_array($canonical, ['costo_compra', 'precio_venta', 'stock_inicial', 'stock_minimo'])) {
                    $cleanedNum = str_replace([',', ' '], ['', ''], (string) $value);
                    $mapped[$canonical] = is_numeric($cleanedNum) ? (float) $cleanedNum : $value;
                } else {
                    $mapped[$canonical] = is_string($value) ? trim($value) : $value;
                }
            }
        }

        return $mapped;
    }

    /**
     * Valida y analiza un archivo cargado antes de procesarlo en la BD.
     * Genera un token temporal para evitar volver a subir el archivo al confirmar.
     *
     * @return array{
     *     temp_token: string,
     *     file_name: string,
     *     file_size: int,
     *     total_rows: int,
     *     valid_new: int,
     *     valid_existing: int,
     *     invalid_rows: int,
     *     sample_rows: array<int, array<string, mixed>>
     * }
     */
    public function analyze(UploadedFile|string $file, int $companyId, ?int $branchId = null): array
    {
        $tempDir = storage_path('app/temp_imports');
        File::ensureDirectoryExists($tempDir);

        $tempToken = (string) Str::uuid();

        if ($file instanceof UploadedFile) {
            $extension = $file->getClientOriginalExtension() ?: 'xlsx';
            $fileName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $targetPath = $tempDir.'/'.$tempToken.'.'.$extension;
            copy($file->getRealPath(), $targetPath);
        } else {
            $extension = pathinfo($file, PATHINFO_EXTENSION) ?: 'xlsx';
            $fileName = basename($file);
            $fileSize = file_exists($file) ? filesize($file) : 0;
            $targetPath = $tempDir.'/'.$tempToken.'.'.$extension;
            copy($file, $targetPath);
        }

        $reader = SimpleExcelReader::create($targetPath);
        $headers = $reader->getHeaders();

        // Validar que existan encabezados reconocibles para referencia y nombre
        $hasRef = false;
        $hasName = false;
        foreach ($headers as $header) {
            $canon = $this->canonicalizeHeader((string) $header);
            if ($canon === 'referencia_original') {
                $hasRef = true;
            }
            if ($canon === 'nombre_repuesto') {
                $hasName = true;
            }
        }

        if (! $hasRef || ! $hasName) {
            @unlink($targetPath);
            throw new InvalidArgumentException(
                "El archivo no contiene las columnas mínimas obligatorias ('referencia_original' y 'nombre_repuesto'). Por favor descarga y utiliza la plantilla oficial."
            );
        }

        $totalRows = 0;
        $validNew = 0;
        $validExisting = 0;
        $invalidRows = 0;
        $sampleRows = [];

        // Cache local de referencias para chequear existencia rápidamente
        $existingRefs = Product::where('company_id', $companyId)
            ->pluck('normalized_reference')
            ->flip()
            ->all();

        $reader->getRows()->each(function (array $rawRow) use (
            &$totalRows, &$validNew, &$validExisting, &$invalidRows, &$sampleRows, $existingRefs
        ) {
            $totalRows++;
            $mapped = $this->mapRow($rawRow);

            $ref = (string) ($mapped['referencia_original'] ?? '');
            $name = (string) ($mapped['nombre_repuesto'] ?? '');

            $errors = [];
            if ($ref === '') {
                $errors[] = 'Falta la referencia original.';
            }
            if ($name === '') {
                $errors[] = 'Falta el nombre del repuesto.';
            }

            if (! is_numeric($mapped['costo_compra']) || (float) $mapped['costo_compra'] < 0) {
                $errors[] = 'El costo de compra debe ser un número mayor o igual a 0.';
            }
            if (! is_numeric($mapped['precio_venta']) || (float) $mapped['precio_venta'] < 0) {
                $errors[] = 'El precio de venta debe ser un número mayor o igual a 0.';
            }
            if (! is_numeric($mapped['stock_inicial']) || (float) $mapped['stock_inicial'] < 0) {
                $errors[] = 'El stock inicial debe ser un número mayor o igual a 0.';
            }
            if (! is_numeric($mapped['stock_minimo']) || (float) $mapped['stock_minimo'] < 0) {
                $errors[] = 'El stock mínimo debe ser un número mayor o igual a 0.';
            }

            $normalizedRef = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $ref));
            $isExisting = isset($existingRefs[$normalizedRef]);

            if (! empty($errors)) {
                $invalidRows++;
                $status = 'INVALID';
            } elseif ($isExisting) {
                $validExisting++;
                $status = 'EXISTS';
            } else {
                $validNew++;
                $status = 'NEW';
            }

            if (count($sampleRows) < 15) {
                $sampleRows[] = [
                    'row_number' => $totalRows + 1,
                    'referencia_original' => $ref ?: '(Vacío)',
                    'nombre_repuesto' => $name ?: '(Vacío)',
                    'codigo_interno' => $mapped['codigo_interno'] ?? '',
                    'marca' => $mapped['marca'] ?? '',
                    'categoria' => $mapped['categoria'] ?? '',
                    'unidad_medida' => $mapped['unidad_medida'] ?? 'Unidad',
                    'costo_compra' => is_numeric($mapped['costo_compra']) ? (float) $mapped['costo_compra'] : 0,
                    'precio_venta' => is_numeric($mapped['precio_venta']) ? (float) $mapped['precio_venta'] : 0,
                    'stock_inicial' => is_numeric($mapped['stock_inicial']) ? (float) $mapped['stock_inicial'] : 0,
                    'stock_minimo' => is_numeric($mapped['stock_minimo']) ? (float) $mapped['stock_minimo'] : 0,
                    'status' => $status,
                    'error_message' => ! empty($errors) ? implode(' ', $errors) : null,
                ];
            }
        });

        return [
            'temp_token' => $tempToken,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'total_rows' => $totalRows,
            'valid_new' => $validNew,
            'valid_existing' => $validExisting,
            'invalid_rows' => $invalidRows,
            'sample_rows' => $sampleRows,
        ];
    }

    /**
     * Resuelve la ruta física del archivo dado un token temporal o un archivo nuevo.
     */
    public function resolveFilePath(?string $tempToken, ?UploadedFile $uploadedFile): string
    {
        if ($uploadedFile) {
            return $uploadedFile->getRealPath();
        }

        if ($tempToken) {
            $tempDir = storage_path('app/temp_imports');
            $files = glob($tempDir.'/'.$tempToken.'.*');
            if (! empty($files) && file_exists($files[0])) {
                return $files[0];
            }
        }

        throw new InvalidArgumentException('No se encontró el archivo para procesar la importación.');
    }

    /**
     * Ejecuta la importación por lotes respetando la política de duplicados y registrando Kardex.
     *
     * @param  string  $duplicateStrategy  'UPDATE_AND_ADD_STOCK' | 'ONLY_NEW' | 'OVERWRITE_STOCK'
     * @return array{
     *     batch_id: int,
     *     batch_uuid: string,
     *     total: int,
     *     created: int,
     *     updated: int,
     *     skipped: int,
     *     failed: int,
     *     status: string
     * }
     */
    public function executeImport(
        string $filePath,
        int $companyId,
        int $branchId,
        int $userId,
        string $duplicateStrategy = 'UPDATE_AND_ADD_STOCK',
        ?string $originalFileName = null
    ): array {
        $allowedStrategies = ['UPDATE_AND_ADD_STOCK', 'ONLY_NEW', 'OVERWRITE_STOCK'];
        if (! in_array($duplicateStrategy, $allowedStrategies, true)) {
            $duplicateStrategy = 'UPDATE_AND_ADD_STOCK';
        }

        $batch = ImportBatch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'entity_type' => 'PRODUCTS',
            'status' => 'PROCESSING',
            'total_rows' => 0,
            'processed_rows' => 0,
            'failed_rows' => 0,
            'file_path' => $originalFileName ?? basename($filePath),
            'created_by' => $userId,
        ]);

        $reader = SimpleExcelReader::create($filePath);

        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $totalCount = 0;

        $batchRowInserts = [];

        foreach ($reader->getRows() as $rawRow) {
            $totalCount++;
            $rowNumber = $totalCount + 1; // +1 por el encabezado Excel

            $mapped = $this->mapRow($rawRow);
            $ref = (string) ($mapped['referencia_original'] ?? '');
            $name = (string) ($mapped['nombre_repuesto'] ?? '');

            // Validación básica de campos obligatorios y numéricos
            if ($ref === '' || $name === '') {
                $failedCount++;
                $batchRowInserts[] = [
                    'import_batch_id' => $batch->id,
                    'row_number' => $rowNumber,
                    'raw_data' => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
                    'status' => 'FAILED',
                    'error_message' => 'La referencia original o el nombre del repuesto están vacíos.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                continue;
            }

            if (! is_numeric($mapped['costo_compra']) || (float) $mapped['costo_compra'] < 0 ||
                ! is_numeric($mapped['precio_venta']) || (float) $mapped['precio_venta'] < 0 ||
                ! is_numeric($mapped['stock_inicial']) || (float) $mapped['stock_inicial'] < 0) {
                $failedCount++;
                $batchRowInserts[] = [
                    'import_batch_id' => $batch->id,
                    'row_number' => $rowNumber,
                    'raw_data' => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
                    'status' => 'FAILED',
                    'error_message' => 'Los valores de costo, precio o stock contienen números inválidos o negativos.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                continue;
            }

            $normalizedRef = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $ref));
            $costoCompra = (float) $mapped['costo_compra'];
            $precioVenta = (float) $mapped['precio_venta'];
            $stockInicial = (float) $mapped['stock_inicial'];
            $stockMinimo = (float) $mapped['stock_minimo'];

            try {
                DB::transaction(function () use (
                    $companyId, $branchId, $userId, $batch, $rowNumber, $rawRow,
                    $mapped, $ref, $name, $normalizedRef, $costoCompra, $precioVenta,
                    $stockInicial, $stockMinimo, $duplicateStrategy,
                    &$createdCount, &$updatedCount, &$skippedCount, &$batchRowInserts
                ) {
                    // Resolver Marca
                    $brand = null;
                    if (! empty($mapped['marca'])) {
                        $brandName = trim($mapped['marca']);
                        $normalizedBrand = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', Str::ascii($brandName)));
                        $brand = Brand::firstOrCreate(
                            ['normalized_name' => $normalizedBrand, 'company_id' => $companyId],
                            [
                                'uuid' => (string) Str::uuid(),
                                'name' => $brandName,
                                'code' => Str::upper(substr(Str::slug($brandName), 0, 10)) ?: 'BRD',
                                'status' => 'ACTIVE',
                            ]
                        );
                    }

                    // Resolver Categoría
                    $categoryName = ! empty($mapped['categoria']) ? trim($mapped['categoria']) : 'Repuestos Varios';
                    $normalizedCat = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', Str::ascii($categoryName)));
                    $category = Category::firstOrCreate(
                        ['normalized_name' => $normalizedCat, 'company_id' => $companyId],
                        [
                            'uuid' => (string) Str::uuid(),
                            'name' => $categoryName,
                            'code' => Str::upper(substr(Str::slug($categoryName), 0, 10)) ?: 'CAT',
                            'status' => 'ACTIVE',
                        ]
                    );

                    // Resolver Unidad
                    $unitName = ! empty($mapped['unidad_medida']) ? trim($mapped['unidad_medida']) : 'Unidad';
                    $unit = Unit::firstOrCreate(
                        ['name' => $unitName, 'company_id' => $companyId],
                        [
                            'uuid' => (string) Str::uuid(),
                            'code' => Str::upper(substr(Str::slug($unitName), 0, 10)) ?: 'UND',
                            'symbol' => substr($unitName, 0, 3),
                            'status' => 'ACTIVE',
                        ]
                    );

                    $product = Product::where('normalized_reference', $normalizedRef)
                        ->where('company_id', $companyId)
                        ->first();

                    if (! $product) {
                        // 1. Crear nuevo Producto
                        $product = Product::create([
                            'uuid' => (string) Str::uuid(),
                            'company_id' => $companyId,
                            'internal_code' => ! empty($mapped['codigo_interno']) ? trim($mapped['codigo_interno']) : null,
                            'primary_reference' => $ref,
                            'normalized_reference' => $normalizedRef,
                            'name' => $name,
                            'normalized_name' => Str::slug($name),
                            'description' => $mapped['descripcion'] ?? null,
                            'brand_id' => $brand?->id,
                            'category_id' => $category?->id,
                            'unit_id' => $unit?->id,
                            'product_type' => 'PHYSICAL',
                            'status' => 'ACTIVE',
                            'requires_lot_tracking' => true,
                            'fifo_enabled' => true,
                            'created_by' => $userId,
                        ]);

                        // Registrar Precio de Venta
                        if ($precioVenta > 0) {
                            $product->prices()->create([
                                'uuid' => (string) Str::uuid(),
                                'branch_id' => null, // Global para todas las sucursales
                                'price_type' => 'PUBLIC',
                                'currency_code' => 'PEN',
                                'amount' => $precioVenta,
                                'effective_from' => now(),
                                'status' => 'ACTIVE',
                                'created_by' => $userId,
                            ]);
                        }

                        // Registrar Stock Mínimo
                        if ($stockMinimo > 0) {
                            $product->minStocks()->create([
                                'uuid' => (string) Str::uuid(),
                                'branch_id' => $branchId,
                                'minimum_quantity' => $stockMinimo,
                                'effective_from' => now(),
                                'status' => 'ACTIVE',
                                'created_by' => $userId,
                            ]);
                        }

                        // Registrar Inventario Inicial con Kardex y Lote
                        if ($stockInicial > 0) {
                            $this->kardexService->recordEntry([
                                'branch_id' => $branchId,
                                'product_id' => $product->id,
                                'quantity' => $stockInicial,
                                'unit_cost' => $costoCompra,
                                'operation_type' => 'INVENTARIO_INICIAL',
                                'reference' => 'INVENTARIO INICIAL - LOTE IMP #'.$batch->id,
                                'user_id' => $userId,
                            ]);

                            Lot::create([
                                'uuid' => (string) Str::uuid(),
                                'branch_id' => $branchId,
                                'product_id' => $product->id,
                                'lot_number' => 'LOT-IMP-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                                'original_quantity' => $stockInicial,
                                'current_quantity' => $stockInicial,
                                'unit_cost' => $costoCompra,
                                'status' => 'ACTIVE',
                            ]);
                        }

                        $createdCount++;
                        $batchRowInserts[] = [
                            'import_batch_id' => $batch->id,
                            'row_number' => $rowNumber,
                            'raw_data' => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
                            'status' => 'SUCCESS',
                            'error_message' => null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    } else {
                        // Repuesto ya existente
                        if ($duplicateStrategy === 'ONLY_NEW') {
                            $skippedCount++;
                            $batchRowInserts[] = [
                                'import_batch_id' => $batch->id,
                                'row_number' => $rowNumber,
                                'raw_data' => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
                                'status' => 'SUCCESS',
                                'error_message' => 'Repuesto ya existente en el catálogo. Omitido por política de duplicados.',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];

                            return;
                        }

                        // Actualizar datos del producto existente
                        $updateData = [];
                        if (! empty($name) && $name !== $product->name) {
                            $updateData['name'] = $name;
                            $updateData['normalized_name'] = Str::slug($name);
                        }
                        if ($brand && $product->brand_id !== $brand->id) {
                            $updateData['brand_id'] = $brand->id;
                        }
                        if ($category && $product->category_id !== $category->id) {
                            $updateData['category_id'] = $category->id;
                        }
                        if (! empty($mapped['codigo_interno']) && empty($product->internal_code)) {
                            $updateData['internal_code'] = trim($mapped['codigo_interno']);
                        }
                        if (! empty($mapped['descripcion']) && empty($product->description)) {
                            $updateData['description'] = $mapped['descripcion'];
                        }

                        if (! empty($updateData)) {
                            $product->update($updateData);
                        }

                        // Actualizar o crear precio de venta si viene en el Excel
                        if ($precioVenta > 0) {
                            $existingPrice = ProductPrice::where('product_id', $product->id)
                                ->where('price_type', 'PUBLIC')
                                ->whereNull('branch_id')
                                ->first();

                            if ($existingPrice) {
                                $existingPrice->update(['amount' => $precioVenta]);
                            } else {
                                $product->prices()->create([
                                    'uuid' => (string) Str::uuid(),
                                    'branch_id' => null,
                                    'price_type' => 'PUBLIC',
                                    'currency_code' => 'PEN',
                                    'amount' => $precioVenta,
                                    'effective_from' => now(),
                                    'status' => 'ACTIVE',
                                    'created_by' => $userId,
                                ]);
                            }
                        }

                        // Actualizar o crear stock mínimo
                        if ($stockMinimo > 0) {
                            $existingMin = ProductMinStock::where('product_id', $product->id)
                                ->where('branch_id', $branchId)
                                ->first();

                            if ($existingMin) {
                                $existingMin->update(['minimum_quantity' => $stockMinimo]);
                            } else {
                                $product->minStocks()->create([
                                    'uuid' => (string) Str::uuid(),
                                    'branch_id' => $branchId,
                                    'minimum_quantity' => $stockMinimo,
                                    'effective_from' => now(),
                                    'status' => 'ACTIVE',
                                    'created_by' => $userId,
                                ]);
                            }
                        }

                        // Manejo de Stock según estrategia
                        if ($duplicateStrategy === 'UPDATE_AND_ADD_STOCK') {
                            if ($stockInicial > 0) {
                                $this->kardexService->recordEntry([
                                    'branch_id' => $branchId,
                                    'product_id' => $product->id,
                                    'quantity' => $stockInicial,
                                    'unit_cost' => $costoCompra,
                                    'operation_type' => 'INVENTARIO_INICIAL',
                                    'reference' => 'INVENTARIO ADICIONAL - LOTE IMP #'.$batch->id,
                                    'user_id' => $userId,
                                ]);

                                Lot::create([
                                    'uuid' => (string) Str::uuid(),
                                    'branch_id' => $branchId,
                                    'product_id' => $product->id,
                                    'lot_number' => 'LOT-IMP-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                                    'original_quantity' => $stockInicial,
                                    'current_quantity' => $stockInicial,
                                    'unit_cost' => $costoCompra,
                                    'status' => 'ACTIVE',
                                ]);
                            }
                        } elseif ($duplicateStrategy === 'OVERWRITE_STOCK') {
                            $currentInv = Inventory::where('branch_id', $branchId)
                                ->where('product_id', $product->id)
                                ->first();

                            $currentQty = $currentInv ? (float) $currentInv->physical_quantity : 0.0;
                            $diff = $stockInicial - $currentQty;

                            if ($diff > 0) {
                                $this->kardexService->recordEntry([
                                    'branch_id' => $branchId,
                                    'product_id' => $product->id,
                                    'quantity' => $diff,
                                    'unit_cost' => $costoCompra,
                                    'operation_type' => 'AJUSTE_POSITIVO',
                                    'reference' => 'SOBRESCRITURA DE STOCK - LOTE IMP #'.$batch->id,
                                    'user_id' => $userId,
                                ]);

                                Lot::create([
                                    'uuid' => (string) Str::uuid(),
                                    'branch_id' => $branchId,
                                    'product_id' => $product->id,
                                    'lot_number' => 'LOT-AJUSTE-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                                    'original_quantity' => $diff,
                                    'current_quantity' => $diff,
                                    'unit_cost' => $costoCompra,
                                    'status' => 'ACTIVE',
                                ]);
                            } elseif ($diff < 0) {
                                $this->kardexService->recordExit([
                                    'branch_id' => $branchId,
                                    'product_id' => $product->id,
                                    'quantity' => abs($diff),
                                    'operation_type' => 'AJUSTE_NEGATIVO',
                                    'reference' => 'SOBRESCRITURA DE STOCK - LOTE IMP #'.$batch->id,
                                    'user_id' => $userId,
                                ]);
                            }
                        }

                        $updatedCount++;
                        $batchRowInserts[] = [
                            'import_batch_id' => $batch->id,
                            'row_number' => $rowNumber,
                            'raw_data' => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
                            'status' => 'SUCCESS',
                            'error_message' => null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                });
            } catch (\Throwable $e) {
                $failedCount++;
                $batchRowInserts[] = [
                    'import_batch_id' => $batch->id,
                    'row_number' => $rowNumber,
                    'raw_data' => json_encode($rawRow, JSON_UNESCAPED_UNICODE),
                    'status' => 'FAILED',
                    'error_message' => 'Error al procesar fila: '.$e->getMessage(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // Inserción en bloques cada 200 filas para optimizar memoria
            if (count($batchRowInserts) >= 200) {
                ImportBatchRow::insert($batchRowInserts);
                $batchRowInserts = [];
            }
        }

        // Insertar filas restantes
        if (! empty($batchRowInserts)) {
            ImportBatchRow::insert($batchRowInserts);
        }

        $processedRows = $createdCount + $updatedCount + $skippedCount;
        $finalStatus = 'COMPLETED';
        if ($failedCount > 0 && $processedRows === 0) {
            $finalStatus = 'FAILED';
        } elseif ($failedCount > 0) {
            $finalStatus = 'PARTIAL';
        }

        $batch->update([
            'total_rows' => $totalCount,
            'processed_rows' => $processedRows,
            'failed_rows' => $failedCount,
            'status' => $finalStatus,
        ]);

        return [
            'batch_id' => $batch->id,
            'batch_uuid' => $batch->uuid,
            'total' => $totalCount,
            'created' => $createdCount,
            'updated' => $updatedCount,
            'skipped' => $skippedCount,
            'failed' => $failedCount,
            'status' => $finalStatus,
        ];
    }

    /**
     * Genera un archivo Excel que recopila las filas observadas/fallidas de un lote con su motivo.
     */
    public function generateErrorsFile(ImportBatch $batch): ?string
    {
        $failedRows = $batch->rows()->where('status', 'FAILED')->get();
        if ($failedRows->isEmpty()) {
            return null;
        }

        $directory = storage_path('app/public');
        File::ensureDirectoryExists($directory);

        $path = $directory."/errores_lote_{$batch->id}.xlsx";
        if (file_exists($path)) {
            @unlink($path);
        }

        $writer = SimpleExcelWriter::create($path);

        $isFirst = true;
        foreach ($failedRows as $failedRow) {
            $raw = is_array($failedRow->raw_data) ? $failedRow->raw_data : json_decode($failedRow->raw_data, true);
            $rowToExport = array_merge(
                ['FILA_EXCEL' => $failedRow->row_number],
                is_array($raw) ? $raw : [],
                ['MOTIVO_OBSERVACION' => $failedRow->error_message ?? 'Datos no válidos']
            );

            if ($isFirst) {
                $writer->addHeader(array_keys($rowToExport));
                $isFirst = false;
            }

            $writer->addRow($rowToExport);
        }

        $writer->close();

        return $path;
    }
}
