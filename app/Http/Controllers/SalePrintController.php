<?php

namespace App\Http\Controllers;

use App\Helpers\NumberToWordsHelper;
use App\Models\Company;
use App\Models\Sale;
use Illuminate\Http\Request;

class SalePrintController extends Controller
{
    /**
     * Muestra el Ticket Térmico de Venta en formato 80mm con logotipo corporativo.
     */
    public function ticket(Request $request, Sale $sale)
    {
        $this->authorizeSaleAccess($request, $sale);

        $sale->load([
            'customer',
            'branch',
            'lines.product.brand',
            'lines.product.unit',
            'creator',
            'paymentMethod',
            'receivable',
        ]);

        $company = Company::find($sale->company_id) ?? Company::first();

        return view('sales.print.ticket-80mm', compact('sale', 'company'));
    }

    /**
     * Muestra el Comprobante de Venta Electrónico oficial en formato completo A4.
     */
    public function a4(Request $request, Sale $sale)
    {
        $this->authorizeSaleAccess($request, $sale);

        $sale->load([
            'customer',
            'branch',
            'lines.product.brand',
            'lines.product.unit',
            'lines.product.category',
            'creator',
            'paymentMethod',
            'receivable.allocations.payment.methodLines.method',
        ]);

        $company = Company::find($sale->company_id) ?? Company::first();

        $total = (float) ($sale->total_amount ?? 0);
        $subtotal = (float) $sale->subtotal_amount > 0
            ? (float) $sale->subtotal_amount
            : ($total > 0 ? round($total / 1.18, 2) : 0);
        $tax = (float) $sale->tax_amount > 0
            ? (float) $sale->tax_amount
            : ($total > 0 ? round($total - $subtotal, 2) : 0);

        $totalInWords = NumberToWordsHelper::toWords($total, $sale->currency_code);

        $paidAmount = $sale->receivable
            ? ((float) $sale->receivable->original_amount - (float) $sale->receivable->balance_amount)
            : (float) ($sale->initial_payment_amount ?? $total);

        $pendingAmount = $sale->receivable
            ? (float) $sale->receivable->balance_amount
            : max(0, $total - (float) ($sale->initial_payment_amount ?? 0));

        return view('sales.print.a4', compact(
            'sale',
            'company',
            'subtotal',
            'tax',
            'total',
            'totalInWords',
            'paidAmount',
            'pendingAmount'
        ));
    }

    /**
     * Valida permisos del usuario para acceder a la venta.
     */
    protected function authorizeSaleAccess(Request $request, Sale $sale): void
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return;
        }

        if ($sale->company_id !== $user->company_id) {
            abort(403, 'No autorizado para ver este comprobante.');
        }

        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();
        if (empty($allowedBranchIds) && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        if (! empty($allowedBranchIds) && ! in_array($sale->branch_id, $allowedBranchIds)) {
            abort(403, 'No tiene acceso a la sucursal emisora de esta venta.');
        }
    }
}
