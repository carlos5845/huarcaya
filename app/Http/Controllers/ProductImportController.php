<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Lot;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Spatie\SimpleExcel\SimpleExcelReader;
use Spatie\SimpleExcel\SimpleExcelWriter;

class ProductImportController extends Controller
{
    public function index()
    {
        return Inertia::render('catalog/import/index');
    }

    public function downloadTemplate()
    {
        $headers = [
            'referencia_original',
            'nombre_repuesto',
            'marca',
            'categoria',
            'unidad_medida',
            'precio_base',
            'stock_inicial',
        ];

        $filename = 'plantilla_importacion.xlsx';
        $path = storage_path('app/public/'.$filename);

        $writer = SimpleExcelWriter::create($path)->addHeader($headers);
        $writer->addRow([
            'referencia_original' => 'FIL-12345',
            'nombre_repuesto' => 'Filtro de Aceite Toyota',
            'marca' => 'Toyota',
            'categoria' => 'Filtros',
            'unidad_medida' => 'Unidad',
            'precio_base' => '45.50',
            'stock_inicial' => '10',
        ]);

        return response()->download($path)->deleteFileAfterSend();
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,csv,txt',
        ]);

        $user = $request->user();
        $branchId = $user->default_branch_id;

        if (! $branchId) {
            $branches = $user->branches;
            if ($branches->isEmpty()) {
                return back()->with('error', 'No tienes una sucursal asignada para cargar inventario.');
            }
            $branchId = $branches->first()->id;
        }

        $companyId = $user->company_id;

        $file = $request->file('file');

        $stats = [
            'created' => 0,
            'updated' => 0,
            'errors' => 0,
        ];

        DB::beginTransaction();
        try {
            $reader = SimpleExcelReader::create($file->path(), $file->getClientOriginalExtension());
            $headers = $reader->getHeaders();

            if (! in_array('referencia_original', $headers) || ! in_array('nombre_repuesto', $headers)) {
                throw new \Exception("El archivo no tiene el formato correcto. Faltan las columnas 'referencia_original' o 'nombre_repuesto'. Asegúrate de usar la plantilla.");
            }

            $reader->getRows()
                ->each(function (array $row) use (&$stats, $branchId, $companyId) {
                    $ref = $row['referencia_original'] ?? '';
                    $name = $row['nombre_repuesto'] ?? '';

                    if (empty($ref) || empty($name)) {
                        $stats['errors']++;

                        return; // continue loop
                    }

                    $normalizedRef = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $ref));

                    $brand = null;
                    if (! empty($row['marca'])) {
                        $brandName = trim($row['marca']);
                        $normalizedBrand = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $brandName));
                        $brand = Brand::firstOrCreate(
                            ['normalized_name' => $normalizedBrand, 'company_id' => $companyId],
                            ['uuid' => Str::uuid(), 'name' => $brandName, 'code' => Str::upper(substr(Str::slug($brandName), 0, 10)), 'status' => 'ACTIVE']
                        );
                    }

                    $categoryName = ! empty($row['categoria']) ? trim($row['categoria']) : 'Sin Categoría';
                    $normalizedCat = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $categoryName));
                    $category = Category::firstOrCreate(
                        ['normalized_name' => $normalizedCat, 'company_id' => $companyId],
                        ['uuid' => Str::uuid(), 'name' => $categoryName, 'code' => Str::upper(substr(Str::slug($categoryName), 0, 10)), 'status' => 'ACTIVE']
                    );

                    $unitName = ! empty($row['unidad_medida']) ? trim($row['unidad_medida']) : 'Unidad';
                    $unit = Unit::firstOrCreate(
                        ['name' => $unitName, 'company_id' => $companyId],
                        ['uuid' => Str::uuid(), 'code' => Str::upper(substr(Str::slug($unitName), 0, 10)), 'symbol' => substr($unitName, 0, 3), 'status' => 'ACTIVE']
                    );

                    $product = Product::where('normalized_reference', $normalizedRef)
                        ->where('company_id', $companyId)
                        ->first();
                    if (! $product) {
                        $product = Product::create([
                            'uuid' => Str::uuid(),
                            'company_id' => $companyId,
                            'primary_reference' => $ref,
                            'normalized_reference' => $normalizedRef,
                            'name' => trim($name),
                            'normalized_name' => Str::slug(trim($name)),
                            'brand_id' => $brand?->id,
                            'category_id' => $category?->id,
                            'unit_id' => $unit?->id,
                            'status' => 'ACTIVE',
                        ]);
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }

                    $stock = (float) ($row['stock_inicial'] ?? 0);
                    if ($stock > 0) {
                        $inventory = Inventory::firstOrNew([
                            'branch_id' => $branchId,
                            'product_id' => $product->id,
                        ]);

                        if (! $inventory->exists) {
                            $inventory->uuid = Str::uuid();
                            $inventory->physical_quantity = $stock;
                            $inventory->available_quantity = $stock;
                            $inventory->average_cost = (float) ($row['precio_base'] ?? 0);
                            $inventory->status = 'ACTIVE';
                            $inventory->save();

                            // Crear lote por defecto para el inventario importado
                            Lot::create([
                                'uuid' => (string) Str::uuid(),
                                'branch_id' => $branchId,
                                'product_id' => $product->id,
                                'lot_number' => 'LOTE-IMPORT-'.date('Ymd'),
                                'original_quantity' => $stock,
                                'current_quantity' => $stock,
                                'unit_cost' => (float) ($row['precio_base'] ?? 0),
                                'status' => 'ACTIVE',
                            ]);
                        }
                    }
                });

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error procesando el archivo: '.$e->getMessage());
        }

        return back()->with('success', "Importación completada. Creados: {$stats['created']}, Actualizados/Ignorados: {$stats['updated']}, Errores: {$stats['errors']}");
    }
}
