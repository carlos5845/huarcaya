<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Company;
use App\Models\CompanyBankAccount;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationLine;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class QuotationController extends Controller
{
    /**
     * Muestra la bandeja de cotizaciones con filtros y métricas comerciales.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        $branchId = $request->input('branch_id');
        $status = $request->input('status', 'ALL');
        $search = $request->input('search');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Permisos de sucursales
        $branches = Branch::where('company_id', $companyId)->where('status', 'ACTIVE')->get();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $query = Quotation::with(['branch', 'customer', 'creator', 'convertedSale'])
            ->where('company_id', $companyId);

        if (! $isSuperAdmin && ! empty($user->default_branch_id)) {
            $query->where('branch_id', $user->default_branch_id);
        } elseif (! empty($branchId) && $branchId !== 'ALL') {
            $query->where('branch_id', $branchId);
        }

        if ($status !== 'ALL') {
            if ($status === 'EXPIRED') {
                $query->where('status', 'PENDING')
                    ->whereDate('valid_until_date', '<', Carbon::today());
            } else {
                $query->where('status', $status);
            }
        }

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                    ->orWhere('customer_name_snapshot', 'like', "%{$search}%")
                    ->orWhere('customer_document_snapshot', 'like', "%{$search}%");
            });
        }

        if (! empty($dateFrom)) {
            $query->whereDate('operation_date', '>=', $dateFrom);
        }
        if (! empty($dateTo)) {
            $query->whereDate('operation_date', '<=', $dateTo);
        }

        // Métricas de tarjetas comerciales
        $baseMetricsQuery = Quotation::where('company_id', $companyId);
        if (! $isSuperAdmin && ! empty($user->default_branch_id)) {
            $baseMetricsQuery->where('branch_id', $user->default_branch_id);
        }

        $today = Carbon::today()->toDateString();
        $metrics = [
            'total' => (clone $baseMetricsQuery)->count(),
            'pending' => (clone $baseMetricsQuery)->where('status', 'PENDING')->whereDate('valid_until_date', '>=', $today)->count(),
            'pending_amount' => (clone $baseMetricsQuery)->where('status', 'PENDING')->whereDate('valid_until_date', '>=', $today)->sum('total_amount'),
            'converted' => (clone $baseMetricsQuery)->where('status', 'CONVERTED')->count(),
            'converted_amount' => (clone $baseMetricsQuery)->where('status', 'CONVERTED')->sum('total_amount'),
            'expired' => (clone $baseMetricsQuery)->where('status', 'PENDING')->whereDate('valid_until_date', '<', $today)->count(),
        ];

        $quotations = $query->orderByDesc('id')->paginate(15)->withQueryString();

        return Inertia::render('quotations/index', [
            'quotations' => $quotations,
            'branches' => $branches,
            'metrics' => $metrics,
            'filters' => [
                'branch_id' => $branchId ?? 'ALL',
                'status' => $status,
                'search' => $search ?? '',
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
            ],
        ]);
    }

    /**
     * Muestra el formulario para emitir una nueva cotización.
     */
    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        $branches = Branch::where('company_id', $companyId)->where('status', 'ACTIVE')->get();
        $defaultBranch = $branches->firstWhere('id', $user->default_branch_id) ?? $branches->first();

        // Serie tentativa para la sucursal por defecto
        $tentativeSeries = $defaultBranch ? Quotation::defaultSeriesForBranch($defaultBranch) : 'COT-001';
        $tentativeCorrelative = $defaultBranch ? Quotation::nextCorrelativeForSeries($defaultBranch->id, $tentativeSeries) : '000001';

        $exchangeRateSetting = Setting::where('key', 'exchange_rate')->first();

        return Inertia::render('quotations/create', [
            'branches' => $branches,
            'default_branch_id' => $defaultBranch?->id,
            'tentative_number' => "{$tentativeSeries}-{$tentativeCorrelative}",
            'exchange_rate' => $exchangeRateSetting ? (float) $exchangeRateSetting->default_value : 3.80,
            'customers' => Customer::where('company_id', $companyId)
                ->where('status', 'ACTIVE')
                ->orderBy('legal_name')
                ->get(),
        ]);
    }

    /**
     * Guarda una nueva cotización en la base de datos.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $companyId = $user->company_id;

        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'operation_date' => ['required', 'date'],
            'validity_days' => ['required', 'integer', 'min:1', 'max:180'],
            'currency_code' => ['required', 'string', 'in:PEN,USD'],
            'exchange_rate' => ['required_if:currency_code,USD', 'numeric', 'min:0.01'],
            'tax_mode' => ['required', 'string', 'in:INCLUDED,PLUS_TAX,EXEMPT'],
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'delivery_time' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'lines.*.delivery_time_line' => ['nullable', 'string', 'max:100'],
            'lines.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $branch = Branch::findOrFail($validated['branch_id']);
        $customer = Customer::findOrFail($validated['customer_id']);

        DB::beginTransaction();
        try {
            // Asignación estricta de serie y correlativo
            $series = Quotation::defaultSeriesForBranch($branch);
            $correlative = Quotation::nextCorrelativeForSeries($branch->id, $series);
            $quotationNumber = "{$series}-{$correlative}";

            $operationDate = Carbon::parse($validated['operation_date']);
            $validityDays = (int) $validated['validity_days'];
            $validUntilDate = (clone $operationDate)->addDays($validityDays)->toDateString();

            // Cálculo financiero de totales
            $subtotalAmount = 0;
            $discountTotal = 0;
            $taxTotal = 0;
            $grandTotal = 0;

            $quotation = Quotation::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'branch_id' => $branch->id,
                'customer_id' => $customer->id,
                'series' => $series,
                'correlative' => $correlative,
                'quotation_number' => $quotationNumber,
                'operation_date' => $operationDate,
                'valid_until_date' => $validUntilDate,
                'validity_days' => $validityDays,
                'currency_code' => $validated['currency_code'],
                'exchange_rate' => $validated['currency_code'] === 'USD' ? (float) $validated['exchange_rate'] : 1.0,
                'subtotal_amount' => 0,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => 0,
                'tax_mode' => $validated['tax_mode'],
                'status' => 'PENDING',
                'customer_name_snapshot' => $customer->legal_name,
                'customer_document_snapshot' => $customer->document_number,
                'customer_address_snapshot' => $customer->fiscal_address ?: $customer->address,
                'customer_phone_snapshot' => $customer->phone,
                'customer_email_snapshot' => $customer->email,
                'payment_terms' => $validated['payment_terms'] ?? 'Contado',
                'delivery_time' => $validated['delivery_time'] ?? 'Entrega inmediata',
                'notes' => $validated['notes'],
                'created_by' => $user->id,
            ]);

            foreach ($validated['lines'] as $lineData) {
                $product = Product::with(['unit', 'inventories' => function ($q) use ($branch) {
                    $q->where('branch_id', $branch->id);
                }])->findOrFail($lineData['product_id']);

                $currentStock = (float) ($product->inventories->first()?->available_quantity
                    ?? $product->inventories->first()?->physical_quantity
                    ?? 0);
                $isSpecialOrder = $currentStock <= 0;

                $qty = (float) $lineData['quantity'];
                $price = (float) $lineData['unit_price'];
                $lineDiscount = (float) ($lineData['discount_amount'] ?? 0);

                $lineSubtotal = round($qty * $price, 2);
                $lineTotal = max(0, $lineSubtotal - $lineDiscount);

                // Cálculo según régimen de IGV
                if ($validated['tax_mode'] === 'INCLUDED') {
                    $baseSubtotal = round($lineTotal / 1.18, 2);
                    $lineTax = round($lineTotal - $baseSubtotal, 2);
                } elseif ($validated['tax_mode'] === 'PLUS_TAX') {
                    $baseSubtotal = $lineTotal;
                    $lineTax = round($lineTotal * 0.18, 2);
                    $lineTotal += $lineTax;
                } else {
                    $baseSubtotal = $lineTotal;
                    $lineTax = 0;
                }

                $subtotalAmount += $baseSubtotal;
                $discountTotal += $lineDiscount;
                $taxTotal += $lineTax;
                $grandTotal += $lineTotal;

                QuotationLine::create([
                    'uuid' => (string) Str::uuid(),
                    'quotation_id' => $quotation->id,
                    'product_id' => $product->id,
                    'product_reference_snapshot' => $product->primary_reference ?? $product->sku ?? '-',
                    'product_name_snapshot' => $product->name,
                    'unit_code_snapshot' => $product->unit?->code ?? 'NIU',
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'unit_cost_base' => (float) ($product->cost_price ?? 0),
                    'line_subtotal' => $baseSubtotal,
                    'discount_amount' => $lineDiscount,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                    'is_special_order' => $isSpecialOrder,
                    'current_stock_snapshot' => $currentStock,
                    'delivery_time_line' => $lineData['delivery_time_line'] ?? ($isSpecialOrder ? '3 a 5 días hábiles' : 'Inmediata'),
                    'notes' => $lineData['notes'] ?? null,
                ]);
            }

            $quotation->update([
                'subtotal_amount' => $subtotalAmount,
                'discount_amount' => $discountTotal,
                'tax_amount' => $taxTotal,
                'total_amount' => $grandTotal,
            ]);

            DB::commit();

            return redirect()->route('quotations.show', $quotation->id)
                ->with('success', "Cotización {$quotationNumber} creada exitosamente.");
        } catch (\Throwable $e) {
            DB::rollBack();

            return back()->withInput()->with('error', 'Error al crear la cotización: '.$e->getMessage());
        }
    }

    /**
     * Muestra la ficha detallada de la cotización.
     */
    public function show(Quotation $quotation): Response
    {
        $quotation->load([
            'branch',
            'customer',
            'creator',
            'convertedSale',
            'convertedBy',
            'lines.product.unit',
            'lines.product.inventories' => function ($q) use ($quotation) {
                $q->where('branch_id', $quotation->branch_id);
            },
        ]);

        $company = Company::find($quotation->company_id);
        $bankAccounts = CompanyBankAccount::where('company_id', $quotation->company_id)
            ->where('is_active', true)
            ->get();

        return Inertia::render('quotations/show', [
            'quotation' => $quotation,
            'company' => $company,
            'bank_accounts' => $bankAccounts,
            'is_expired' => $quotation->isExpired(),
        ]);
    }

    /**
     * Actualiza el estado de la cotización (Aprobar, Rechazar, etc.).
     */
    public function updateStatus(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:APPROVED,REJECTED,PENDING'],
        ]);

        if ($quotation->status === 'CONVERTED') {
            return back()->with('error', 'Una cotización convertida a venta no puede cambiar de estado.');
        }

        $quotation->update(['status' => $validated['status']]);

        return back()->with('success', 'Estado de la cotización actualizado.');
    }

    /**
     * Prepara y redirige al flujo de venta precargando los datos de la cotización.
     */
    public function convertToSale(Quotation $quotation)
    {
        if ($quotation->status === 'CONVERTED') {
            return redirect()->route('sales.show', $quotation->converted_sale_id)
                ->with('info', 'Esta cotización ya fue convertida a venta previamente.');
        }

        // Redirige al POS de ventas con el parámetro quotation_id
        return redirect()->route('sales.create', ['from_quotation' => $quotation->id]);
    }

    /**
     * Renderiza la hoja membretada A4 de cotización para imprimir o descargar en PDF.
     */
    public function printA4(Quotation $quotation)
    {
        $quotation->load(['branch', 'customer', 'creator', 'lines.product.unit']);
        $company = Company::find($quotation->company_id);
        $bankAccounts = CompanyBankAccount::where('company_id', $quotation->company_id)
            ->where('is_active', true)
            ->get();

        return view('quotations.print.a4', [
            'quotation' => $quotation,
            'company' => $company,
            'bankAccounts' => $bankAccounts,
        ]);
    }
}
