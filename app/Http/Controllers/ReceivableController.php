<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodLine;
use App\Models\Receivable;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ReceivableController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();
        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $branchIdFilter = $request->input('branch_id');
        $today = now()->startOfDay();

        // Base query with branch scoping
        $baseQuery = Receivable::query()
            ->when($branchIdFilter, function ($q, $bid) {
                $q->where('branch_id', $bid);
            }, function ($q) use ($isSuperAdmin, $allowedBranchIds, $user) {
                if (! $isSuperAdmin) {
                    if (! empty($allowedBranchIds)) {
                        $q->whereIn('branch_id', $allowedBranchIds);
                    } elseif ($user->default_branch_id) {
                        $q->where('branch_id', $user->default_branch_id);
                    }
                }
            });

        // 1. Calculate Global Portfolio KPIs
        $totalActiveDebtPEN = (float) (clone $baseQuery)->where('status', 'ACTIVE')->where('currency_code', 'PEN')->sum('balance_amount');
        $totalActiveDebtUSD = (float) (clone $baseQuery)->where('status', 'ACTIVE')->where('currency_code', 'USD')->sum('balance_amount');

        $overdueQuery = (clone $baseQuery)->where('status', 'ACTIVE')->where('due_date', '<', $today);
        $totalOverdueDebtPEN = (float) (clone $overdueQuery)->where('currency_code', 'PEN')->sum('balance_amount');
        $totalOverdueDebtUSD = (float) (clone $overdueQuery)->where('currency_code', 'USD')->sum('balance_amount');
        $overdueCount = (clone $overdueQuery)->count();

        $currentQuery = (clone $baseQuery)->where('status', 'ACTIVE')->where('due_date', '>=', $today);
        $totalCurrentDebtPEN = (float) (clone $currentQuery)->where('currency_code', 'PEN')->sum('balance_amount');
        $totalCurrentDebtUSD = (float) (clone $currentQuery)->where('currency_code', 'USD')->sum('balance_amount');
        $currentCount = (clone $currentQuery)->count();

        $totalPaidCount = (clone $baseQuery)->where('status', 'PAID')->count();
        $debtorCustomersCount = (clone $baseQuery)->where('status', 'ACTIVE')->distinct('customer_id')->count('customer_id');

        // 2. Query Paginated Receivables with Filters
        $statusFilter = $request->input('status', 'ACTIVE');
        $search = $request->input('search');

        $receivablesQuery = (clone $baseQuery)
            ->with(['customer', 'sale', 'branch'])
            ->when($search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->whereHas('customer', function ($c) use ($search) {
                        $c->where('legal_name', 'like', "%{$search}%")
                            ->orWhere('document_number', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })->orWhereHas('sale', function ($s) use ($search) {
                        $s->where('sale_number', 'like', "%{$search}%")
                            ->orWhere('external_document_number', 'like', "%{$search}%");
                    });
                });
            })
            ->when($statusFilter, function ($q, $status) use ($today) {
                if ($status === 'ACTIVE') {
                    $q->where('status', 'ACTIVE');
                } elseif ($status === 'OVERDUE') {
                    $q->where('status', 'ACTIVE')->where('due_date', '<', $today);
                } elseif ($status === 'CURRENT') {
                    $q->where('status', 'ACTIVE')->where('due_date', '>=', $today);
                } elseif ($status === 'PAID') {
                    $q->where('status', 'PAID');
                }
                // 'ALL' leaves without status filter
            })
            ->orderByRaw("CASE WHEN status = 'ACTIVE' AND due_date < '{$today->format('Y-m-d')}' THEN 0 WHEN status = 'ACTIVE' THEN 1 ELSE 2 END")
            ->orderBy('due_date', 'asc');

        $paginatedReceivables = $receivablesQuery->paginate(15)->withQueryString();

        // Enrich items with computed status attributes
        $paginatedReceivables->through(function ($receivable) use ($today) {
            $orig = (float) $receivable->original_amount;
            $bal = (float) $receivable->balance_amount;
            $paid = max(0, $orig - $bal);
            $paidPct = $orig > 0 ? round(($paid / $orig) * 100, 1) : 0;

            $isOverdue = $receivable->status === 'ACTIVE' && $receivable->due_date && $receivable->due_date->startOfDay()->lt($today);
            $daysOverdue = $isOverdue ? (int) $receivable->due_date->startOfDay()->diffInDays($today) : 0;
            $daysRemaining = (! $isOverdue && $receivable->status === 'ACTIVE' && $receivable->due_date) ? (int) $today->diffInDays($receivable->due_date->startOfDay()) : 0;

            $receivable->paid_amount = $paid;
            $receivable->paid_percentage = $paidPct;
            $receivable->is_overdue = $isOverdue;
            $receivable->days_overdue = $daysOverdue;
            $receivable->days_remaining = $daysRemaining;

            return $receivable;
        });

        // 3. Customer Consolidated Portfolio Summary (Crédito Comercial Recurrente)
        $activeReceivables = (clone $baseQuery)
            ->where('status', 'ACTIVE')
            ->with(['customer', 'sale'])
            ->get();

        $customersSummary = $activeReceivables->groupBy('customer_id')->map(function ($items) use ($today) {
            $firstItem = $items->first();
            $customer = $firstItem->customer;

            $totalDebtPEN = $items->where('currency_code', 'PEN')->sum('balance_amount');
            $totalDebtUSD = $items->where('currency_code', 'USD')->sum('balance_amount');
            $originalTotalPEN = $items->where('currency_code', 'PEN')->sum('original_amount');
            $paidTotalPEN = max(0, $originalTotalPEN - $totalDebtPEN);

            $overdueItems = $items->filter(fn ($r) => $r->due_date && $r->due_date->startOfDay()->lt($today));
            $hasOverdue = $overdueItems->isNotEmpty();
            $overdueDebtPEN = $overdueItems->where('currency_code', 'PEN')->sum('balance_amount');

            $earliestDueDate = $items->filter(fn ($r) => $r->due_date)->sortBy('due_date')->first()?->due_date;

            return [
                'customer_id' => $customer ? $customer->id : null,
                'legal_name' => $customer ? $customer->legal_name : 'Cliente General',
                'document_type' => $customer ? $customer->document_type : 'DNI',
                'document_number' => $customer ? $customer->document_number : '00000000',
                'phone' => $customer ? $customer->phone : null,
                'address' => $customer ? $customer->address : null,
                'invoices_count' => $items->count(),
                'total_debt_pen' => round($totalDebtPEN, 2),
                'total_debt_usd' => round($totalDebtUSD, 2),
                'paid_total_pen' => round($paidTotalPEN, 2),
                'overdue_debt_pen' => round($overdueDebtPEN, 2),
                'has_overdue' => $hasOverdue,
                'earliest_due_date' => $earliestDueDate ? $earliestDueDate->format('Y-m-d') : null,
            ];
        })->values();

        // 4. Auxiliary Data
        $paymentMethods = PaymentMethod::where('company_id', $user->company_id)->where('is_active', true)->get();
        $branches = Branch::where('company_id', $user->company_id)->get(['id', 'name']);

        return Inertia::render('receivables/index', [
            'receivables' => $paginatedReceivables,
            'customers_summary' => $customersSummary,
            'payment_methods' => $paymentMethods,
            'branches' => $branches,
            'filters' => [
                'search' => $search ?? '',
                'status' => $statusFilter,
                'branch_id' => $branchIdFilter ?? '',
            ],
            'metrics' => [
                'total_active_debt_pen' => $totalActiveDebtPEN,
                'total_active_debt_usd' => $totalActiveDebtUSD,
                'total_overdue_debt_pen' => $totalOverdueDebtPEN,
                'total_overdue_debt_usd' => $totalOverdueDebtUSD,
                'overdue_count' => $overdueCount,
                'total_current_debt_pen' => $totalCurrentDebtPEN,
                'total_current_debt_usd' => $totalCurrentDebtUSD,
                'current_count' => $currentCount,
                'total_paid_count' => $totalPaidCount,
                'debtor_customers_count' => $debtorCustomersCount,
            ],
        ]);
    }

    public function show(Receivable $receivable)
    {
        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();

        if (! $isSuperAdmin && ! in_array($receivable->branch_id, $allowedBranchIds) && $receivable->branch_id !== $user->default_branch_id) {
            abort(403);
        }

        $receivable->load(['customer', 'sale.lines', 'allocations.payment.methodLines.method', 'branch']);

        $paymentMethods = PaymentMethod::where('company_id', $user->company_id)->where('is_active', true)->get();

        return Inertia::render('receivables/show', [
            'receivable' => $receivable,
            'payment_methods' => $paymentMethods,
        ]);
    }

    public function storePayment(Request $request, Receivable $receivable)
    {
        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();

        if (! $isSuperAdmin && ! in_array($receivable->branch_id, $allowedBranchIds) && $receivable->branch_id !== $user->default_branch_id) {
            abort(403);
        }

        if ($receivable->status === 'PAID' || $receivable->balance_amount <= 0) {
            return back()->with('error', 'Esta cuenta ya está totalmente cancelada.');
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.$receivable->balance_amount],
            'payment_method_id' => ['required', 'exists:payment_methods,id'],
            'operation_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        DB::beginTransaction();
        try {
            $payment = Payment::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $receivable->branch_id,
                'customer_id' => $receivable->customer_id,
                'payment_number' => 'P'.date('Ymd').'-'.strtoupper(Str::random(6)),
                'operation_date' => $validated['operation_date'],
                'currency_code' => $receivable->currency_code,
                'exchange_rate' => $receivable->sale->exchange_rate ?? 1.0,
                'total_amount' => $validated['amount'],
                'status' => 'CONFIRMED',
                'notes' => $validated['notes'] ?? ('Abono a Cuenta por Cobrar - Venta '.($receivable->sale->sale_number ?? '')),
                'created_by' => Auth::id(),
            ]);

            PaymentMethodLine::create([
                'uuid' => (string) Str::uuid(),
                'payment_id' => $payment->id,
                'payment_method_id' => $validated['payment_method_id'],
                'amount' => $validated['amount'],
            ]);

            PaymentAllocation::create([
                'uuid' => (string) Str::uuid(),
                'payment_id' => $payment->id,
                'receivable_id' => $receivable->id,
                'allocated_amount' => $validated['amount'],
            ]);

            $newBalance = max(0, $receivable->balance_amount - $validated['amount']);
            $receivable->update([
                'balance_amount' => $newBalance,
                'status' => $newBalance <= 0 ? 'PAID' : 'ACTIVE',
            ]);

            // Update sale payment status
            if ($receivable->sale) {
                $receivable->sale->update([
                    'payment_status' => $newBalance <= 0 ? 'PAID' : 'PARTIAL',
                ]);
            }

            DB::commit();

            return back()->with('success', 'Abono registrado exitosamente. Saldo actualizado.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al procesar el abono: '.$e->getMessage());
        }
    }
}
