<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Transfer;
use Illuminate\Http\Request;

class TransferPrintController extends Controller
{
    /**
     * Muestra la Nota de Traslado Interno / Guía de Transferencia (A4 o Ticket 80mm).
     */
    public function internal(Request $request, Transfer $transfer)
    {
        $this->authorizeTransferAccess($request, $transfer);

        $transfer->load([
            'sourceBranch',
            'destinationBranch',
            'lines.product.brand',
            'lines.product.unit',
            'creator',
            'shipments',
        ]);

        $company = Company::find($transfer->company_id) ?? Company::first();
        $format = $request->query('format', 'a4');

        if ($format === 'ticket') {
            return view('transfers.print.internal-ticket', compact('transfer', 'company'));
        }

        return view('transfers.print.internal-a4', compact('transfer', 'company'));
    }

    /**
     * Muestra la Hoja de Picking / Preparación de Almacén.
     */
    public function picking(Request $request, Transfer $transfer)
    {
        $this->authorizeTransferAccess($request, $transfer);

        $transfer->load([
            'sourceBranch',
            'destinationBranch',
            'lines.product.brand',
            'lines.product.category',
            'lines.product.unit',
            'creator',
        ]);

        $company = Company::find($transfer->company_id) ?? Company::first();

        // Agrupar líneas por categoría para facilitar el recorrido en almacén
        $groupedLines = $transfer->lines->groupBy(function ($line) {
            return $line->product?->category?->name ?? 'Sin Categoría';
        });

        return view('transfers.print.picking', compact('transfer', 'company', 'groupedLines'));
    }

    /**
     * Muestra la Representación Impresa Oficial de la Guía de Remisión Remitente (SUNAT Tipo 09 / Motivo 04).
     */
    public function guide(Request $request, Transfer $transfer)
    {
        $this->authorizeTransferAccess($request, $transfer);

        $transfer->load([
            'sourceBranch',
            'destinationBranch',
            'lines.product.brand',
            'lines.product.unit',
            'creator',
            'shipments',
        ]);

        $company = Company::find($transfer->company_id) ?? Company::first();
        $latestShipment = $transfer->shipments->sortByDesc('id')->first();

        // Formato oficial serie Guía Remitente: T001-XXXXXX
        $cleanNumber = preg_replace('/[^0-9]/', '', (string) $transfer->transfer_number);
        $guideSeries = 'T001-'.str_pad($cleanNumber ?: (string) $transfer->id, 8, '0', STR_PAD_LEFT);

        return view('transfers.print.guide-sunat', compact('transfer', 'company', 'latestShipment', 'guideSeries'));
    }

    /**
     * Valida permisos del usuario para acceder a la transferencia.
     */
    protected function authorizeTransferAccess(Request $request, Transfer $transfer): void
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return;
        }

        $allowedBranchIds = $user->branches()->pluck('branches.id')->toArray();
        if (empty($allowedBranchIds) && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        if (! in_array($transfer->source_branch_id, $allowedBranchIds) && ! in_array($transfer->destination_branch_id, $allowedBranchIds)) {
            abort(403, 'No tienes permiso para ver o imprimir documentos de esta transferencia.');
        }
    }
}
