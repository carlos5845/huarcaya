<?php

use App\Models\User;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseLine;
use App\Services\KardexService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

// Encontrar un usuario para el contexto
$user = User::first();

// 1. Crear un proveedor de prueba
$supplier = Supplier::firstOrCreate(
    ['document_number' => '20123456789'],
    [
        'uuid' => (string) Str::uuid(),
        'company_id' => $user->company_id,
        'document_type' => 'RUC',
        'legal_name' => 'Proveedor de Prueba S.A.C.',
        'status' => 'ACTIVE',
        'created_by' => $user->id,
    ]
);

// 2. Obtener un producto activo o crear uno
$product = Product::where('company_id', $user->company_id)->where('status', 'ACTIVE')->first();

if (!$product) {
    echo "No hay productos activos. Saliendo...\n";
    exit;
}

echo "Producto a usar: {$product->name} (Stock actual: " . ($product->inventories->first()?->physical_quantity ?? 0) . ")\n";

// 3. Crear la compra (Simulando PurchaseController@store)
$branchId = \App\Models\Branch::first()->id;

DB::beginTransaction();
try {
    $purchase = Purchase::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $user->company_id,
        'branch_id' => $branchId,
        'supplier_id' => $supplier->id,
        'purchase_number' => 'PUR-TEST-' . Str::random(4),
        'supplier_document_type' => 'FACTURA',
        'supplier_document_series' => 'F001',
        'supplier_document_number' => '00001234',
        'document_date' => now()->toDateString(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'subtotal_amount' => 500,
        'tax_amount' => 0,
        'total_amount' => 500,
        'status' => 'DRAFT',
        'notes' => 'Compra de prueba automatizada',
        'created_by' => $user->id,
    ]);

    $line = PurchaseLine::create([
        'uuid' => (string) Str::uuid(),
        'purchase_id' => $purchase->id,
        'product_id' => $product->id,
        'ordered_quantity' => 10,
        'unit_cost_original' => 50,
        'unit_cost_base' => 50,
        'line_subtotal' => 500,
        'tax_amount' => 0,
        'line_total' => 500,
        'received_quantity' => 0,
    ]);

    DB::commit();
    echo "Compra en borrador creada: {$purchase->purchase_number}\n";
} catch (\Exception $e) {
    DB::rollBack();
    echo "Error creando compra: " . $e->getMessage() . "\n";
    exit;
}

// 4. Confirmar la compra (Simulando PurchaseController@confirm)
$kardexService = app(KardexService::class);
DB::beginTransaction();
try {
    $purchase->update([
        'status' => 'CONFIRMED',
        'confirmed_at' => now(),
        'approved_by' => $user->id,
    ]);

    foreach ($purchase->lines as $line) {
        $line->update([
            'received_quantity' => $line->ordered_quantity,
        ]);

        // Crear Lote
        $lot = \App\Models\Lot::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $purchase->branch_id,
            'product_id' => $line->product_id,
            'lot_number' => 'LOT-TEST-' . Str::random(4),
            'original_quantity' => $line->received_quantity,
            'current_quantity' => $line->received_quantity,
            'unit_cost' => $line->unit_cost_base,
            'status' => 'ACTIVE',
        ]);

        echo "Lote creado: {$lot->lot_number}\n";

        // Registrar en Kardex
        $kardexService->recordEntry([
            'product_id' => $line->product_id,
            'branch_id' => $purchase->branch_id,
            'quantity' => (int) $line->received_quantity,
            'unit_cost' => $line->unit_cost_base,
            'operation_type' => 'COMPRA',
            'reference' => 'COMPRA: ' . $purchase->purchase_number,
            'user_id' => $user->id,
        ]);
    }

    DB::commit();
    echo "Compra confirmada exitosamente.\n";
    
    $product->refresh();
    echo "Nuevo stock del producto: " . ($product->inventories->first()->physical_quantity) . "\n";
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "Error confirmando compra: " . $e->getMessage() . "\n";
}

echo "Prueba completada.\n";
