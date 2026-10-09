<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerReturnLine;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Services\KardexService;
use App\Services\SaleConfirmationService;
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

        $baseQuery = Sale::query()
            ->where('company_id', $user->company_id)
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($branchIdFilter, function ($query, $branchIdFilter) {
                $query->where('branch_id', $branchIdFilter);
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->whereDate('operation_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->whereDate('operation_date', '<=', $dateTo);
            });

        // Compute metrics for the filtered scope
        $confirmedQuery = (clone $baseQuery)->where('status', 'CONFIRMED');
        $totalSalesPEN = (float) (clone $confirmedQuery)->where('currency_code', 'PEN')->sum('total_amount');
        $totalSalesUSD = (float) (clone $confirmedQuery)->where('currency_code', 'USD')->sum('total_amount');
        $confirmedCount = (clone $confirmedQuery)->count();

        $cashSalesPEN = (float) (clone $confirmedQuery)->where('currency_code', 'PEN')->where('payment_type', 'CASH')->sum('total_amount');
        $creditSalesPEN = (float) (clone $confirmedQuery)->where('currency_code', 'PEN')->where('payment_type', 'CREDIT')->sum('total_amount');

        $draftCount = (clone $baseQuery)->where('status', 'DRAFT')->count();
        $totalTransactions = (clone $baseQuery)->count();
        $averageTicketPEN = $confirmedCount > 0 ? round($totalSalesPEN / $confirmedCount, 2) : 0;

        $metrics = [
            'total_sales_pen' => $totalSalesPEN,
            'total_sales_usd' => $totalSalesUSD,
            'confirmed_count' => $confirmedCount,
            'draft_count' => $draftCount,
            'total_transactions' => $totalTransactions,
            'cash_sales_pen' => $cashSalesPEN,
            'credit_sales_pen' => $creditSalesPEN,
            'average_ticket_pen' => $averageTicketPEN,
        ];

        $sales = (clone $baseQuery)
            ->with(['customer', 'lines.product'])
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
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'branches' => $isSuperAdmin ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'isSuperAdmin' => $isSuperAdmin,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'branch_id']),
            'metrics' => $metrics,
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

                $lineTotal = round($lineData['quantity'] * $lineData['unit_price'], 2);
                $lineTax = 0;

                if ($validated['tax_mode'] === 'INCLUDED') {
                    $lineTax = round($lineTotal - ($lineTotal / 1.18), 2);
                } elseif ($validated['tax_mode'] === 'PLUS_TAX') {
                    $lineTax = round($lineTotal * 0.18, 2);
                    $lineTotal = round($lineTotal + $lineTax, 2);
                }

                $subtotal += round($lineTotal - $lineTax, 2);
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
                    'line_subtotal' => round($lineTotal - $lineTax, 2),
                    'discount_amount' => 0,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                ]);
            }

            $subtotal = round($subtotal, 2);
            $taxAmount = round($taxAmount, 2);
            $totalAmount = round($subtotal + $taxAmount, 2);
            $initPay = min(round((float) ($validated['initial_payment_amount'] ?? 0), 2), $totalAmount);
            $isPaid = $validated['payment_type'] === 'CASH' || ($totalAmount - $initPay < 0.01);

            $sale->update([
                'subtotal_amount' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'initial_payment_amount' => $initPay,
                'payment_status' => $isPaid ? 'PAID' : ($initPay > 0 ? 'PARTIAL' : 'UNPAID'),
            ]);

            if ($action === 'CONFIRM') {
                $this->executeSaleConfirmation($sale, $kardexService);
                DB::commit();

                $msg = 'Venta emitida y confirmada exitosamente. Stock deducido en Kardex.';
                if ($sale->payment_type === 'CREDIT') {
                    $remDebt = max(0, round((float) $sale->total_amount - $initPay, 2));
                    $currencySym = $sale->currency_code === 'USD' ? '$' : 'S/';
                    if ($remDebt < 0.01) {
                        $msg .= ' La venta quedó cancelada al 100% con el adelanto inicial.';
                    } else {
                        $msg .= " Registrada en Cuentas por Cobrar con un saldo pendiente de {$currencySym} ".number_format($remDebt, 2).'.';
                    }
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

                $lineTotal = round($lineData['quantity'] * $lineData['unit_price'], 2);
                $lineTax = 0;

                if ($validated['tax_mode'] === 'INCLUDED') {
                    $lineTax = round($lineTotal - ($lineTotal / 1.18), 2);
                } elseif ($validated['tax_mode'] === 'PLUS_TAX') {
                    $lineTax = round($lineTotal * 0.18, 2);
                    $lineTotal = round($lineTotal + $lineTax, 2);
                }

                $subtotal += round($lineTotal - $lineTax, 2);
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
                    'line_subtotal' => round($lineTotal - $lineTax, 2),
                    'discount_amount' => 0,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                ]);
            }

            $subtotal = round($subtotal, 2);
            $taxAmount = round($taxAmount, 2);
            $totalAmount = round($subtotal + $taxAmount, 2);
            $initPay = min(round((float) ($validated['initial_payment_amount'] ?? 0), 2), $totalAmount);
            $isPaid = $validated['payment_type'] === 'CASH' || ($totalAmount - $initPay < 0.01);

            $sale->update([
                'subtotal_amount' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'initial_payment_amount' => $initPay,
                'payment_status' => $isPaid ? 'PAID' : ($initPay > 0 ? 'PARTIAL' : 'UNPAID'),
            ]);

            if ($action === 'CONFIRM') {
                $this->executeSaleConfirmation($sale, $kardexService);
                DB::commit();

                $msg = 'Venta actualizada y emitida exitosamente. Stock deducido en Kardex.';
                if ($sale->payment_type === 'CREDIT') {
                    $remDebt = max(0, round((float) $sale->total_amount - $initPay, 2));
                    $currencySym = $sale->currency_code === 'USD' ? '$' : 'S/';
                    if ($remDebt < 0.01) {
                        $msg .= ' La venta quedó cancelada al 100% con el adelanto inicial.';
                    } else {
                        $msg .= " Registrada en Cuentas por Cobrar con un saldo pendiente de {$currencySym} ".number_format($remDebt, 2).'.';
                    }
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
        app(SaleConfirmationService::class)->confirm($sale);
    }
}
