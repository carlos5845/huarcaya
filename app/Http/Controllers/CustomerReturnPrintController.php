<?php

namespace App\Http\Controllers;

use App\Helpers\NumberToWordsHelper;
use App\Models\Company;
use App\Models\CustomerReturn;
use Illuminate\Http\Request;

class CustomerReturnPrintController extends Controller
{
    /**
     * Renderiza el formato imprimible diferenciado:
     * - Si is_electronic_invoiced === true: NOTA DE CRÉDITO ELECTRÓNICA (SUNAT Catálogo 09)
     * - Si is_electronic_invoiced === false: VALE DE DEVOLUCIÓN / INGRESO A ALMACÉN
     */
    public function show(Request $request, CustomerReturn $customer_return)
    {
        $this->authorizeReturnAccess($request, $customer_return);

        $customer_return->load([
            'customer',
            'branch',
            'sale',
            'lines.product.brand',
            'lines.product.unit',
            'lines.saleLine',
            'creator',
            'confirmedBy',
            'authorizedBy',
            'refundPaymentMethod',
        ]);

        $company = Company::find($customer_return->branch?->company_id) ?? Company::first();

        $total = (float) ($customer_return->total_amount ?? 0);
        $subtotal = (float) $customer_return->subtotal_amount;
        $tax = (float) $customer_return->tax_amount;

        $totalInWords = NumberToWordsHelper::toWords($total, $customer_return->currency_code);
        $catalog09Description = CustomerReturn::SUNAT_CATALOG_09[$customer_return->sunat_credit_note_type ?? ''] ?? 'Devolución de mercadería';

        return view('customer-returns.print.document', [
            'customerReturn' => $customer_return,
            'company' => $company,
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => $total,
            'totalInWords' => $totalInWords,
            'catalog09Description' => $catalog09Description,
        ]);
    }

    /**
     * Valida permisos de acceso al documento de devolución.
     */
    protected function authorizeReturnAccess(Request $request, CustomerReturn $customerReturn): void
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return;
        }

        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();
        if (empty($allowedBranchIds) && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        if (! empty($allowedBranchIds) && ! in_array($customerReturn->branch_id, $allowedBranchIds)) {
            abort(403, 'No tiene acceso a la sucursal de esta devolución.');
        }
    }
}
