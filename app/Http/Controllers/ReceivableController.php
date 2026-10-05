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
use App\Models\User;
use App\Notifications\PaymentReceivedNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
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

        // 4. Report Period Logic (Daily, Weekly, Monthly, Custom)
        $reportPeriod = $request->input('report_period', 'daily');
        $reportDate = $request->input('report_date', now()->toDateString());
        $reportMonth = $request->input('report_month', now()->format('Y-m'));
        $reportFrom = $request->input('report_from');
        $reportTo = $request->input('report_to');

        if ($reportPeriod === 'weekly') {
            $startDate = now()->startOfWeek();
            $endDate = now()->endOfWeek();
            $periodLabel = 'Esta Semana ('.$startDate->format('d/m').' al '.$endDate->format('d/m/Y').')';
        } elseif ($reportPeriod === 'monthly') {
            try {
                $mCarbon = Carbon::createFromFormat('Y-m', $reportMonth);
            } catch (\Exception $e) {
                $mCarbon = now();
            }
            $startDate = $mCarbon->copy()->startOfMonth();
            $endDate = $mCarbon->copy()->endOfMonth();
            $periodLabel = 'Mes de '.$startDate->locale('es')->translatedFormat('F Y');
        } elseif ($reportPeriod === 'custom' && $reportFrom && $reportTo) {
            $startDate = Carbon::parse($reportFrom)->startOfDay();
            $endDate = Carbon::parse($reportTo)->endOfDay();
            $periodLabel = 'Del '.$startDate->format('d/m/Y').' al '.$endDate->format('d/m/Y');
        } else {
            $reportPeriod = 'daily';
            try {
                $dCarbon = Carbon::parse($reportDate);
            } catch (\Exception $e) {
                $dCarbon = now();
            }
            $startDate = $dCarbon->copy()->startOfDay();
            $endDate = $dCarbon->copy()->endOfDay();
            $periodLabel = 'Día '.$startDate->format('d/m/Y');
        }

        $periodPayments = Payment::query()
            ->where('status', 'CONFIRMED')
            ->whereBetween('operation_date', [$startDate, $endDate])
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
            })
            ->with([
                'customer:id,legal_name,document_type,document_number,phone',
                'branch:id,name',
                'creator:id,name',
                'methodLines.method:id,name,code,is_cash',
                'allocations.receivable.sale:id,sale_number,external_document_type,external_document_series,external_document_number',
            ])
            ->orderBy('operation_date', 'desc')
            ->get();

        $totalCollectedPEN = (float) $periodPayments->where('currency_code', 'PEN')->sum('total_amount');
        $totalCollectedUSD = (float) $periodPayments->where('currency_code', 'USD')->sum('total_amount');
        $collectedOperationsCount = $periodPayments->count();

        $methodsBreakdown = [];
        foreach ($periodPayments as $payment) {
            foreach ($payment->methodLines as $line) {
                $mName = $line->method?->name ?? 'Otros / Varios';
                $isCash = (bool) ($line->method?->is_cash ?? false);
                if (! isset($methodsBreakdown[$mName])) {
                    $methodsBreakdown[$mName] = [
                        'method_name' => $mName,
                        'is_cash' => $isCash,
                        'amount_pen' => 0,
                        'amount_usd' => 0,
                        'count' => 0,
                    ];
                }
                if ($payment->currency_code === 'USD') {
                    $methodsBreakdown[$mName]['amount_usd'] += (float) $line->amount;
                } else {
                    $methodsBreakdown[$mName]['amount_pen'] += (float) $line->amount;
                }
                $methodsBreakdown[$mName]['count']++;
            }
        }
        $methodsBreakdown = array_values($methodsBreakdown);

        $newDebtsInPeriod = (clone $baseQuery)
            ->whereBetween('issue_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->get();
        $totalNewDebtPEN = (float) $newDebtsInPeriod->where('currency_code', 'PEN')->sum('original_amount');
        $totalNewDebtUSD = (float) $newDebtsInPeriod->where('currency_code', 'USD')->sum('original_amount');
        $newDebtsCount = $newDebtsInPeriod->count();

        $maturedInPeriod = (clone $baseQuery)
            ->where('status', 'ACTIVE')
            ->whereBetween('due_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->get();
        $totalMaturedDebtPEN = (float) $maturedInPeriod->where('currency_code', 'PEN')->sum('balance_amount');
        $maturedCount = $maturedInPeriod->count();

        $reportData = [
            'period' => $reportPeriod,
            'period_label' => $periodLabel,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'report_date' => $reportDate,
            'report_month' => $reportMonth,
            'report_from' => $reportFrom ?? '',
            'report_to' => $reportTo ?? '',
            'total_collected_pen' => round($totalCollectedPEN, 2),
            'total_collected_usd' => round($totalCollectedUSD, 2),
            'collected_count' => $collectedOperationsCount,
            'total_new_debt_pen' => round($totalNewDebtPEN, 2),
            'total_new_debt_usd' => round($totalNewDebtUSD, 2),
            'new_debts_count' => $newDebtsCount,
            'total_matured_debt_pen' => round($totalMaturedDebtPEN, 2),
            'matured_count' => $maturedCount,
            'methods_breakdown' => $methodsBreakdown,
            'payments' => $periodPayments->map(function ($p) {
                return [
                    'id' => $p->id,
                    'payment_number' => $p->payment_number,
                    'operation_date' => $p->operation_date->format('d/m/Y H:i'),
                    'customer_name' => $p->customer?->legal_name ?? 'Cliente General',
                    'customer_doc' => $p->customer ? "{$p->customer->document_type}: {$p->customer->document_number}" : '',
                    'currency_code' => $p->currency_code,
                    'total_amount' => (float) $p->total_amount,
                    'collector_name' => $p->creator?->name ?? 'Sistema',
                    'branch_name' => $p->branch?->name ?? 'Central',
                    'payment_methods' => $p->methodLines->map(fn ($ml) => $ml->method?->name ?? 'Otro')->unique()->values(),
                    'related_sales' => $p->allocations->map(fn ($a) => $a->receivable?->sale?->sale_number ?? "CR-{$a->receivable_id}")->unique()->values(),
                    'notes' => $p->notes,
                ];
            })->values(),
        ];

        // 5. Auxiliary Data
        $paymentMethods = PaymentMethod::where('company_id', $user->company_id)->where('is_active', true)->get();
        $branches = Branch::where('company_id', $user->company_id)->get(['id', 'name']);

        return Inertia::render('receivables/index', [
            'receivables' => $paginatedReceivables,
            'customers_summary' => $customersSummary,
            'payment_methods' => $paymentMethods,
            'branches' => $branches,
            'report_data' => $reportData,
            'filters' => [
                'search' => $search ?? '',
                'status' => $statusFilter,
                'branch_id' => $branchIdFilter ?? '',
                'report_period' => $reportPeriod,
                'report_date' => $reportDate,
                'report_month' => $reportMonth,
                'report_from' => $reportFrom ?? '',
                'report_to' => $reportTo ?? '',
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

            // Enviar notificación a usuarios de la sucursal y administradores
            try {
                $receivable->load(['customer', 'sale']);
                $branchUsers = User::whereHas('branches', function ($query) use ($receivable) {
                    $query->where('branches.id', $receivable->branch_id);
                })->orWhere('default_branch_id', $receivable->branch_id)
                    ->get();

                $adminUsers = User::role('Super Admin')->get();
                $usersToNotify = $branchUsers->merge($adminUsers)->unique('id');

                Notification::send($usersToNotify, new PaymentReceivedNotification($payment, $receivable));
            } catch (\Exception $notifEx) {
                Log::error('Error sending payment notification: '.$notifEx->getMessage());
            }

            return back()->with('success', 'Abono registrado exitosamente. Saldo actualizado.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al procesar el abono: '.$e->getMessage());
        }
    }

    public function cancelPayment(Request $request, Receivable $receivable, Payment $payment)
    {
        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();

        if (! $isSuperAdmin && ! in_array($receivable->branch_id, $allowedBranchIds) && $receivable->branch_id !== $user->default_branch_id) {
            abort(403);
        }

        if ($payment->status === 'CANCELLED') {
            return back()->with('error', 'Este pago ya ha sido anulado previamente.');
        }

        $allocation = PaymentAllocation::where('payment_id', $payment->id)
            ->where('receivable_id', $receivable->id)
            ->first();

        if (! $allocation) {
            return back()->with('error', 'El pago no corresponde a esta cuenta por cobrar.');
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        DB::beginTransaction();
        try {
            $payment->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
                'notes' => trim(($payment->notes ?? '')."\n".'Anulado por usuario: '.($validated['reason'] ?? 'Error de digitación')),
            ]);

            // Restaurar saldo de la cuenta por cobrar
            $restoredBalance = min((float) $receivable->original_amount, (float) $receivable->balance_amount + (float) $allocation->allocated_amount);
            $receivable->update([
                'balance_amount' => $restoredBalance,
                'status' => $restoredBalance > 0 ? 'ACTIVE' : 'PAID',
            ]);

            // Actualizar estado de pago en la venta
            if ($receivable->sale) {
                $totalPaid = PaymentAllocation::whereHas('payment', fn ($q) => $q->where('status', 'CONFIRMED'))
                    ->where('receivable_id', $receivable->id)
                    ->sum('allocated_amount');

                $newPaymentStatus = 'UNPAID';
                if ($totalPaid >= (float) $receivable->original_amount) {
                    $newPaymentStatus = 'PAID';
                } elseif ($totalPaid > 0) {
                    $newPaymentStatus = 'PARTIAL';
                }

                $receivable->sale->update([
                    'payment_status' => $newPaymentStatus,
                ]);
            }

            DB::commit();

            return back()->with('success', 'Abono anulado exitosamente y saldo de la deuda restaurado.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al anular el abono: '.$e->getMessage());
        }
    }
}
