<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerReturnLine;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\KardexEntry;
use App\Models\KitVersion;
use App\Models\Lot;
use App\Models\LotAllocation;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodLine;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $branchIdFilter = $request->input('branch_id');

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $allowedBranchIds = $isSuperAdmin
            ? Branch::pluck('id')->toArray()
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $sales = Sale::with(['customer', 'lines.product'])
            ->where('company_id', $user->company_id)
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereLikeAccentInsensitive('sale_number', "%{$search}%")
                        ->orWhereHas('customer', function ($cq) use ($search) {
                            $cq->whereLikeAccentInsensitive('legal_name', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('document_number', "%{$search}%");
                        })
                        ->orWhereHas('lines', function ($lq) use ($search) {
                            $lq->whereLikeAccentInsensitive('product_name_snapshot', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('product_reference_snapshot', "%{$search}%")
                                ->orWhereHas('product', function ($pq) use ($search) {
                                    $pq->whereLikeAccentInsensitive('name', "%{$search}%")
                                        ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%")
                                        ->orWhereHas('brand', function ($bq) use ($search) {
                                            $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                                        });
                                });
                        });
                });
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($branchIdFilter, function ($query, $branchIdFilter) {
                $query->where('branch_id', $branchIdFilter);
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->whereDate('operation_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->whereDate('operation_date', '<=', $dateTo);
            })
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'branches' => $isSuperAdmin ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'isSuperAdmin' => $isSuperAdmin,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'branch_id']),
        ]);
    }

    public function create()
    {

        $genericCustomer = Customer::firstOrCreate(
            [
                'company_id' => Auth::user()->company_id,
                'document_number' => '00000000',
            ],
            [
                'uuid' => (string) Str::uuid(),
                'document_type' => 'DNI',
                'legal_name' => 'Clientes Varios / Público en General',
                'status' => 'ACTIVE',
                'created_by' => Auth::id(),
            ]
        );

        return Inertia::render('sales/create', [
            'customers' => Customer::where('company_id', Auth::user()->company_id)
                ->orderBy('legal_name')
                ->get()
                ->map(function ($customer) {
                    $debt = Receivable::where('customer_id', $customer->id)
                        ->whereIn('status', ['PENDING', 'PARTIAL'])
                        ->sum('balance_amount');
                    $customer->total_debt = $debt;

                    return $customer;
                }),
            'payment_methods' => PaymentMethod::where('company_id', Auth::user()->company_id)->where('is_active', true)->get(),
            'generic_customer_id' => $genericCustomer->id,
        ]);
    }

    public function store(Request $request, KardexService $kardexService)
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'sale_type' => ['required', 'string', 'max:20'],
            'payment_type' => ['required', 'string', 'in:CASH,CREDIT'],
            'payment_method_id' => ['nullable'],
            'due_date' => ['required_if:payment_type,CREDIT', 'nullable', 'date'],
            'initial_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'operation_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'action' => ['nullable', 'string', 'in:CONFIRM,DRAFT'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:1'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'tax_mode' => ['required', 'string', 'in:INCLUDED,PLUS_TAX,EXEMPT'],
            'currency_code' => ['required', 'string', 'in:PEN,USD'],
            'exchange_rate' => ['required_if:currency_code,USD', 'numeric', 'min:0.01'],
            'external_document_series' => ['nullable', 'string', 'max:15'],
            'external_document_number' => ['nullable', 'string', 'max:20'],
        ]);

        $companyId = Auth::user()->company_id;
        $branchId = Auth::user()->default_branch_id ?? Branch::where('company_id', $companyId)->first()->id;
        $action = $request->input('action', 'CONFIRM');

        DB::beginTransaction();
        try {
            $prefix = $validated['sale_type'] === 'FACTURA' ? 'F' : ($validated['sale_type'] === 'BOLETA' ? 'B' : 'T');
            $saleNumber = $prefix.date('Ymd').'-'.strtoupper(Str::random(6));

            $customer = Customer::find($validated['customer_id']);

            $sale = Sale::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'customer_id' => $validated['customer_id'],
                'sale_number' => $saleNumber,
                'sale_type' => $validated['sale_type'],
                'payment_type' => $validated['payment_type'],
                'payment_method_id' => $validated['payment_method_id'] ?? null,
                'due_date' => $validated['due_date'] ?? null,
                'initial_payment_amount' => $validated['initial_payment_amount'] ?? 0,
                'payment_status' => $validated['payment_type'] === 'CASH' ? 'PAID' : 'UNPAID',
                'external_document_type' => $validated['sale_type'],
                'external_document_series' => $validated['external_document_series'] ?? null,
                'external_document_number' => $validated['external_document_number'] ?? null,
                'operation_date' => $validated['operation_date'],
                'currency_code' => $validated['currency_code'],
                'exchange_rate' => $validated['currency_code'] === 'USD' ? $validated['exchange_rate'] : 1.0,
                'status' => 'DRAFT',
                'customer_name_snapshot' => $customer->legal_name,
                'customer_document_snapshot' => $customer->document_number,
                'notes' => $validated['notes'] ?? null,
                'created_by' => Auth::id(),
                'subtotal_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => 0,
            ]);

            $subtotal = 0;
            $taxAmount = 0;

            foreach ($validated['lines'] as $lineData) {
                $product = Product::with(['minPrices' => function ($q) use ($branchId) {
                    $q->where(function ($query) use ($branchId) {
                        $query->where('branch_id', $branchId)->orWhereNull('branch_id');
                    })->orderBy('id', 'desc');
                }])->find($lineData['product_id']);

                $minPrice = $product->minPrices->first();
                if ($minPrice && $lineData['unit_price'] < $minPrice->amount) {
                    throw new \Exception("El precio de '{$product->name}' (S/ ".number_format($lineData['unit_price'], 2).') es menor al permitido (S/ '.number_format($minPrice->amount, 2).'). Autorización requerida.');
                }

                $lineTotal = $lineData['quantity'] * $lineData['unit_price'];
                $lineTax = 0;

                if ($validated['tax_mode'] === 'INCLUDED') {
                    $lineTax = $lineTotal - ($lineTotal / 1.18);
                } elseif ($validated['tax_mode'] === 'PLUS_TAX') {
                    $lineTax = $lineTotal * 0.18;
                    $lineTotal += $lineTax;
                }

                $subtotal += $lineTotal;
                $taxAmount += $lineTax;

                SaleLine::create([
                    'uuid' => (string) Str::uuid(),
                    'sale_id' => $sale->id,
                    'product_id' => $lineData['product_id'],
                    'product_type_snapshot' => $product->product_type ?? 'STANDARD',
                    'product_reference_snapshot' => $product->primary_reference ?? 'N/A',
                    'product_name_snapshot' => $product->name,
                    'quantity' => $lineData['quantity'],
                    'unit_price' => $lineData['unit_price'],
                    'unit_cost_base' => 0,
                    'line_subtotal' => $lineTotal - $lineTax,
                    'discount_amount' => 0,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                ]);
            }

            $sale->update([
                'subtotal_amount' => $subtotal - $taxAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $subtotal,
            ]);

            if ($action === 'CONFIRM') {
                $this->executeSaleConfirmation($sale, $kardexService);
                DB::commit();

                $msg = 'Venta emitida y confirmada exitosamente. Stock deducido en Kardex.';
                if ($sale->payment_type === 'CREDIT') {
                    $initPay = (float) ($sale->initial_payment_amount ?? 0);
                    $remDebt = (float) $sale->total_amount - $initPay;
                    $currencySym = $sale->currency_code === 'USD' ? '$' : 'S/';
                    $msg .= " Registrada en Cuentas por Cobrar con un saldo pendiente de {$currencySym} ".number_format($remDebt, 2).'.';
                }

                return redirect()->route('sales.show', $sale->id)->with('success', $msg);
            }

            DB::commit();

            return redirect()->route('sales.show', $sale->id)
                ->with('success', 'Venta en borrador creada con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al procesar la venta: '.$e->getMessage());
        }
    }

    public function show(Sale $sale)
    {
        $sale->load([
            'customer',
            'creator',
            'confirmedBy',
            'branch',
            'paymentMethod',
            'receivable',
            'customerReturns.lines',
            'lines.product.brand',
            'lines.product.category',
            'lines.product.unit',
            'lines.product.inventories' => function ($q) use ($sale) {
                $q->where('branch_id', $sale->branch_id);
            },
        ]);

        $existingReturnLines = CustomerReturnLine::whereHas('customerReturn', function ($q) use ($sale) {
            $q->where('sale_id', $sale->id)->where('status', '!=', 'CANCELLED');
        })->get();

        $returnedBySaleLine = [];
        foreach ($existingReturnLines as $retLine) {
            $returnedBySaleLine[$retLine->sale_line_id] = ($returnedBySaleLine[$retLine->sale_line_id] ?? 0) + (float) $retLine->quantity;
        }

        $totalSaleQty = 0;
        $totalReturnedQty = 0;
        foreach ($sale->lines as $line) {
            $retQty = $returnedBySaleLine[$line->id] ?? 0;
            $line->already_returned_quantity = $retQty;
            $line->available_return_quantity = max(0, (float) $line->quantity - $retQty);
            $totalSaleQty += (float) $line->quantity;
            $totalReturnedQty += $retQty;
        }

        $sale->can_be_returned = ($totalSaleQty - $totalReturnedQty) > 0.0001;
        $sale->is_fully_returned = ($totalReturnedQty >= ($totalSaleQty - 0.0001)) && ($totalSaleQty > 0);

        return Inertia::render('sales/show', [
            'sale' => $sale,
        ]);
    }

    public function edit(Sale $sale)
    {
        if ($sale->status !== 'DRAFT') {
            return redirect()->route('sales.index')->with('error', 'Solo se pueden editar ventas en estado borrador.');
        }

        $sale->load(['lines.product']);
        $customers = Customer::where('company_id', Auth::user()->company_id)
            ->orderBy('legal_name')
            ->get()
            ->map(function ($customer) {
                $debt = Receivable::where('customer_id', $customer->id)
                    ->whereIn('status', ['PENDING', 'PARTIAL'])
                    ->sum('balance_amount');
                $customer->total_debt = $debt;

                return $customer;
            });

        $genericCustomer = Customer::firstOrCreate(
            [
                'company_id' => Auth::user()->company_id,
                'document_number' => '00000000',
            ],
            [
                'uuid' => (string) Str::uuid(),
                'document_type' => 'DNI',
                'legal_name' => 'Clientes Varios / Público en General',
                'status' => 'ACTIVE',
                'created_by' => Auth::id(),
            ]
        );

        return Inertia::render('sales/edit', [
            'sale' => $sale,
            'customers' => $customers,
            'payment_methods' => PaymentMethod::where('company_id', Auth::user()->company_id)->where('is_active', true)->get(),
            'generic_customer_id' => $genericCustomer->id,
        ]);
    }

    public function update(Request $request, Sale $sale, KardexService $kardexService)
    {
        if ($sale->status !== 'DRAFT') {
            return redirect()->back()->with('error', 'Solo se pueden editar ventas en estado borrador.');
        }

        $action = $request->input('action', 'DRAFT');

        $validated = $request->validate([
            'action' => ['nullable', 'string', 'in:CONFIRM,DRAFT'],
            'customer_id' => ['required', 'exists:customers,id'],
            'sale_type' => ['required', 'string', 'max:20'],
            'payment_type' => ['required', 'string', 'in:CASH,CREDIT'],
            'payment_method_id' => ['nullable'],
            'due_date' => ['required_if:payment_type,CREDIT', 'nullable', 'date'],
            'initial_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'operation_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:1'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'tax_mode' => ['required', 'string', 'in:INCLUDED,PLUS_TAX,EXEMPT'],
            'currency_code' => ['required', 'string', 'in:PEN,USD'],
            'exchange_rate' => ['required_if:currency_code,USD', 'numeric', 'min:0.01'],
            'external_document_series' => ['nullable', 'string', 'max:15'],
            'external_document_number' => ['nullable', 'string', 'max:20'],
        ]);

        $companyId = Auth::user()->company_id;
        $branchId = $sale->branch_id;

        DB::beginTransaction();
        try {
            $customer = Customer::find($validated['customer_id']);

            $sale->update([
                'customer_id' => $validated['customer_id'],
                'sale_type' => $validated['sale_type'],
                'payment_type' => $validated['payment_type'],
                'payment_method_id' => $validated['payment_method_id'] ?? null,
                'due_date' => $validated['due_date'] ?? null,
                'initial_payment_amount' => $validated['initial_payment_amount'] ?? 0,
                'payment_status' => $validated['payment_type'] === 'CASH' ? 'PAID' : 'UNPAID',
                'external_document_type' => $validated['sale_type'],
                'external_document_series' => $validated['external_document_series'] ?? null,
                'external_document_number' => $validated['external_document_number'] ?? null,
                'operation_date' => $validated['operation_date'],
                'currency_code' => $validated['currency_code'],
                'exchange_rate' => $validated['currency_code'] === 'USD' ? $validated['exchange_rate'] : 1.0,
                'customer_name_snapshot' => $customer->legal_name,
                'customer_document_snapshot' => $customer->document_number,
                'notes' => $validated['notes'] ?? null,
            ]);

            $sale->lines()->delete();

            $subtotal = 0;
            $taxAmount = 0;

            foreach ($validated['lines'] as $lineData) {
                $product = Product::with(['minPrices' => function ($q) use ($branchId) {
                    $q->where(function ($query) use ($branchId) {
                        $query->where('branch_id', $branchId)->orWhereNull('branch_id');
                    })->orderBy('id', 'desc');
                }])->find($lineData['product_id']);

                $minPrice = $product->minPrices->first();
                if ($minPrice && $lineData['unit_price'] < $minPrice->amount) {
                    throw new \Exception("El precio de '{$product->name}' (S/ ".number_format($lineData['unit_price'], 2).'). Autorización requerida.');
                }

                $lineTotal = $lineData['quantity'] * $lineData['unit_price'];
                $lineTax = 0;

                if ($validated['tax_mode'] === 'INCLUDED') {
                    $lineTax = $lineTotal - ($lineTotal / 1.18);
                } elseif ($validated['tax_mode'] === 'PLUS_TAX') {
                    $lineTax = $lineTotal * 0.18;
                    $lineTotal += $lineTax;
                }

                $subtotal += $lineTotal;
                $taxAmount += $lineTax;

                SaleLine::create([
                    'uuid' => (string) Str::uuid(),
                    'sale_id' => $sale->id,
                    'product_id' => $lineData['product_id'],
                    'product_type_snapshot' => $product->product_type ?? 'STANDARD',
                    'product_reference_snapshot' => $product->primary_reference ?? 'N/A',
                    'product_name_snapshot' => $product->name,
                    'quantity' => $lineData['quantity'],
                    'unit_price' => $lineData['unit_price'],
                    'unit_cost_base' => 0,
                    'line_subtotal' => $lineTotal - $lineTax,
                    'discount_amount' => 0,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                ]);
            }

            $sale->update([
                'subtotal_amount' => $subtotal - $taxAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $subtotal,
            ]);

            if ($action === 'CONFIRM') {
                $this->executeSaleConfirmation($sale, $kardexService);
                DB::commit();

                $msg = 'Venta actualizada y emitida exitosamente. Stock deducido en Kardex.';
                if ($sale->payment_type === 'CREDIT') {
                    $initPay = (float) ($sale->initial_payment_amount ?? 0);
                    $remDebt = (float) $sale->total_amount - $initPay;
                    $currencySym = $sale->currency_code === 'USD' ? '$' : 'S/';
                    $msg .= " Registrada en Cuentas por Cobrar con un saldo pendiente de {$currencySym} ".number_format($remDebt, 2).'.';
                }

                return redirect()->route('sales.show', $sale->id)->with('success', $msg);
            }

            DB::commit();

            return redirect()->route('sales.show', $sale->id)
                ->with('success', 'Venta en borrador actualizada con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al actualizar la venta: '.$e->getMessage());
        }
    }

    public function destroy(Sale $sale)
    {
        if ($sale->status !== 'DRAFT') {
            return redirect()->back()->with('error', 'Solo se pueden eliminar ventas en estado borrador.');
        }

        $sale->lines()->delete();
        $sale->delete();

        return redirect()->route('sales.index')->with('success', 'Venta eliminada.');
    }

    public function confirm(Sale $sale, KardexService $kardexService)
    {
        if ($sale->status !== 'DRAFT') {
            return back()->with('error', 'Solo las ventas en borrador pueden ser confirmadas.');
        }

        DB::beginTransaction();
        try {
            $this->executeSaleConfirmation($sale, $kardexService);
            DB::commit();

            return redirect()->route('sales.show', $sale->id)
                ->with('success', 'Venta confirmada exitosamente. Stock deducido.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al confirmar la venta: '.$e->getMessage());
        }
    }

    /**
     * Executes the sale confirmation routine: validates stock, registers Kardex exit,
     * discharges FIFO lots, creates payment/receivable, and updates sale status.
     */
    private function executeSaleConfirmation(Sale $sale, KardexService $kardexService): void
    {
        $sale->load('lines');

        // Preparar items a deducir (descomponiendo kits si es necesario)
        $itemsToDeduct = [];
        $requiredQuantities = []; // Para validación agrupada

        foreach ($sale->lines as $line) {
            if ($line->product_type_snapshot === 'KIT_COMPONENTES') {
                $activeKitVersion = KitVersion::with('components')
                    ->where('product_id', $line->product_id)
                    ->where('status', 'ACTIVE')
                    ->first();

                if (! $activeKitVersion) {
                    throw new \Exception("El producto '{$line->product_name_snapshot}' es un KIT pero no tiene una versión activa.");
                }
                if ($activeKitVersion->components->isEmpty()) {
                    throw new \Exception("La versión activa del KIT '{$line->product_name_snapshot}' no tiene componentes configurados.");
                }

                foreach ($activeKitVersion->components as $component) {
                    $componentQty = (float) $line->quantity * (float) $component->quantity;
                    $itemsToDeduct[] = [
                        'product_id' => $component->product_id,
                        'quantity' => $componentQty,
                    ];
                    $requiredQuantities[$component->product_id] = ($requiredQuantities[$component->product_id] ?? 0) + $componentQty;
                }
            } else {
                $itemsToDeduct[] = [
                    'product_id' => $line->product_id,
                    'quantity' => (float) $line->quantity,
                ];
                $requiredQuantities[$line->product_id] = ($requiredQuantities[$line->product_id] ?? 0) + (float) $line->quantity;
            }
        }

        // 1. Validar disponibilidad global agrupada
        foreach ($requiredQuantities as $productId => $qty) {
            $inventory = Inventory::where('branch_id', $sale->branch_id)
                ->where('product_id', $productId)
                ->lockForUpdate()
                ->first();

            if (! $inventory || $inventory->physical_quantity < $qty) {
                $prodName = Product::find($productId)?->name ?? 'ID '.$productId;
                throw new \Exception("Stock insuficiente para el producto '{$prodName}'. Solicitado: {$qty}. Disponible: ".($inventory->physical_quantity ?? 0));
            }
        }

        // 2. Crear Movimiento de Inventario
        $movement = InventoryMovement::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $sale->branch_id,
            'movement_type' => 'OUT',
            'reference_type' => Sale::class,
            'reference_id' => $sale->id,
            'operation_date' => now(),
            'notes' => 'Salida por Venta '.$sale->sale_number,
            'created_by' => Auth::id(),
        ]);

        // 3. Procesar las salidas (itemsToDeduct)
        foreach ($itemsToDeduct as $item) {
            // Obtener costo promedio vigente ANTES de la salida para costearla
            $inventory = Inventory::where('branch_id', $sale->branch_id)
                ->where('product_id', $item['product_id'])
                ->first();
            $unitCost = $inventory ? (float) $inventory->average_cost : 0;

            // Crear línea de movimiento
            $movementLine = InventoryMovementLine::create([
                'uuid' => (string) Str::uuid(),
                'inventory_movement_id' => $movement->id,
                'product_id' => $item['product_id'],
                'direction' => 'OUT',
                'quantity' => $item['quantity'],
                'unit_cost' => $unitCost,
                'total_cost' => $item['quantity'] * $unitCost,
            ]);

            // Registrar Salida en Kardex (descuenta stock global)
            $kardexService->recordExit([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'product_id' => $item['product_id'],
                'inventory_movement_line_id' => $movementLine->id,
                'sequence_number' => KardexEntry::max('sequence_number') + 1,
                'user_id' => Auth::id(),
                'operation_date' => now(),
                'operation_type' => 'VENTA',
                'reference' => 'Venta '.$sale->sale_number,
                'quantity' => $item['quantity'],
            ]);

            // 5. Descarga de Lotes (PEPS/FIFO)
            $remainingQuantityToDeduct = $item['quantity'];

            $lots = Lot::where('branch_id', $sale->branch_id)
                ->where('product_id', $item['product_id'])
                ->where('current_quantity', '>', 0)
                ->orderBy('created_at', 'asc')
                ->lockForUpdate()
                ->get();

            foreach ($lots as $lot) {
                if ($remainingQuantityToDeduct <= 0) {
                    break;
                }

                $availableInLot = (float) $lot->current_quantity;
                $toDeduct = min($availableInLot, $remainingQuantityToDeduct);

                // Actualizar Lote
                $lot->current_quantity = $availableInLot - $toDeduct;
                if ($lot->current_quantity <= 0.000001) {
                    $lot->current_quantity = 0;
                    $lot->status = 'DEPLETED';
                }
                $lot->save();

                // Registrar Asignación de Lote a este movimiento
                LotAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_line_id' => $movementLine->id,
                    'lot_id' => $lot->id,
                    'quantity' => $toDeduct,
                ]);

                $remainingQuantityToDeduct -= $toDeduct;
            }

            if ($remainingQuantityToDeduct > 0.000001) {
                // Auto-recuperación: Crear lote de regularización para cubrir el remanente físico disponible
                $inventory = Inventory::where('branch_id', $sale->branch_id)
                    ->where('product_id', $item['product_id'])
                    ->first();

                $autoLot = Lot::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $sale->branch_id,
                    'product_id' => $item['product_id'],
                    'lot_number' => 'LOT-REG-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'original_quantity' => $remainingQuantityToDeduct,
                    'current_quantity' => 0,
                    'unit_cost' => $inventory ? (float) $inventory->average_cost : 0,
                    'status' => 'DEPLETED',
                ]);

                LotAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_line_id' => $movementLine->id,
                    'lot_id' => $autoLot->id,
                    'quantity' => $remainingQuantityToDeduct,
                ]);

                $remainingQuantityToDeduct = 0;
            }
        }

        if ($sale->payment_type === 'CASH' || $sale->payment_type === 'CREDIT') {
            $isCash = $sale->payment_type === 'CASH';

            $initialPayment = $isCash ? $sale->total_amount : ($sale->initial_payment_amount ?? 0);
            $balance = $sale->total_amount - $initialPayment;
            $status = $balance <= 0 ? 'PAID' : 'ACTIVE';

            // Generar Cuentas por Cobrar (Receivable)
            $receivable = Receivable::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'customer_id' => $sale->customer_id,
                'sale_id' => $sale->id,
                'reference_type' => Sale::class,
                'reference_id' => $sale->id,
                'issue_date' => $sale->operation_date,
                'due_date' => $sale->due_date ?? $sale->operation_date,
                'currency_code' => $sale->currency_code,
                'original_amount' => $sale->total_amount,
                'balance_amount' => $balance,
                'status' => $status,
                'notes' => $isCash ? 'Generado automáticamente por Venta al Contado' : 'Generado por Venta al Crédito',
                'created_by' => Auth::id(),
            ]);

            if ($initialPayment > 0) {
                // Generar Pago (Payment)
                $payment = Payment::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $sale->branch_id,
                    'customer_id' => $sale->customer_id,
                    'payment_number' => 'P'.date('Ymd').'-'.strtoupper(Str::random(6)),
                    'operation_date' => now(),
                    'currency_code' => $sale->currency_code,
                    'exchange_rate' => $sale->exchange_rate,
                    'total_amount' => $initialPayment,
                    'status' => 'CONFIRMED',
                    'notes' => $isCash ? ('Pago por Venta al Contado '.$sale->sale_number) : ('Pago inicial por Venta al Crédito '.$sale->sale_number),
                    'created_by' => Auth::id(),
                ]);

                // Asociar Método de Pago
                if ($sale->payment_method_id) {
                    PaymentMethodLine::create([
                        'uuid' => (string) Str::uuid(),
                        'payment_id' => $payment->id,
                        'payment_method_id' => $sale->payment_method_id,
                        'amount' => $initialPayment,
                    ]);
                }

                // Asignar Pago a la Cuenta por Cobrar
                PaymentAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'payment_id' => $payment->id,
                    'receivable_id' => $receivable->id,
                    'allocated_amount' => $initialPayment,
                ]);
            }

            $sale->payment_status = $balance <= 0 ? 'PAID' : ($initialPayment > 0 ? 'PARTIAL' : 'UNPAID');
            $sale->save();
        }

        $sale->update([
            'status' => 'CONFIRMED',
            'confirmed_at' => now(),
            'confirmed_by' => Auth::id(),
        ]);
    }
}
