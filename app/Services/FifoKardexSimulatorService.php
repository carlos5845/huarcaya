<?php

namespace App\Services;

use App\Models\KardexEntry;
use Illuminate\Support\Collection;

class FifoKardexSimulatorService
{
    /**
     * Simula la valuación PEPS (FIFO) en memoria para una colección de movimientos cronológicos.
     * NUNCA muta la base de datos.
     *
     * @param  iterable  $entries  Colección de KardexEntry ordenados cronológicamente (sequence_number ASC)
     * @return Collection Colección de KardexEntry enriquecidos con propiedades fifo_*
     */
    public function simulate(iterable $entries): Collection
    {
        $layersByProductBranch = [];
        $result = collect();

        foreach ($entries as $entry) {
            $key = "{$entry->branch_id}:{$entry->product_id}";
            if (! isset($layersByProductBranch[$key])) {
                $layersByProductBranch[$key] = [];
            }

            $inputQty = (float) $entry->input_quantity;
            $outputQty = (float) $entry->output_quantity;

            // ENTRADA
            if ($inputQty > 0) {
                $inputUnitCost = (float) $entry->input_unit_cost;
                $inputTotalCost = round($inputQty * $inputUnitCost, 2);

                $layersByProductBranch[$key][] = [
                    'quantity' => $inputQty,
                    'remaining' => $inputQty,
                    'unit_cost' => $inputUnitCost,
                    'date' => $entry->operation_date,
                    'reference' => $entry->reference,
                ];

                $entry->fifo_input_quantity = $inputQty;
                $entry->fifo_input_unit_cost = $inputUnitCost;
                $entry->fifo_input_total_cost = $inputTotalCost;

                $entry->fifo_output_quantity = 0.0;
                $entry->fifo_output_unit_cost = 0.0;
                $entry->fifo_output_total_cost = 0.0;
            }
            // SALIDA
            elseif ($outputQty > 0) {
                $needToConsume = $outputQty;
                $consumedTotalCost = 0.0;

                while ($needToConsume > 0.000001 && count($layersByProductBranch[$key]) > 0) {
                    $layerIndex = array_key_first($layersByProductBranch[$key]);
                    $layer = &$layersByProductBranch[$key][$layerIndex];

                    $consume = min($needToConsume, $layer['remaining']);
                    $consumedTotalCost += $consume * $layer['unit_cost'];
                    $layer['remaining'] -= $consume;
                    $needToConsume -= $consume;

                    if ($layer['remaining'] <= 0.000001) {
                        unset($layersByProductBranch[$key][$layerIndex]);
                    }
                }

                // Si queda remanente por consumir (ej. sobregiro o stock no registrado previamente en entrada)
                if ($needToConsume > 0.000001) {
                    $fallbackCost = (float) $entry->output_unit_cost;
                    $consumedTotalCost += $needToConsume * $fallbackCost;
                }

                $consumedTotalCost = round($consumedTotalCost, 2);
                $fifoOutputUnitCost = $outputQty > 0 ? round($consumedTotalCost / $outputQty, 4) : 0.0;

                $entry->fifo_input_quantity = 0.0;
                $entry->fifo_input_unit_cost = 0.0;
                $entry->fifo_input_total_cost = 0.0;

                $entry->fifo_output_quantity = $outputQty;
                $entry->fifo_output_unit_cost = $fifoOutputUnitCost;
                $entry->fifo_output_total_cost = $consumedTotalCost;
            } else {
                // Movimiento neutro o ajuste informativo
                $entry->fifo_input_quantity = 0.0;
                $entry->fifo_input_unit_cost = 0.0;
                $entry->fifo_input_total_cost = 0.0;
                $entry->fifo_output_quantity = 0.0;
                $entry->fifo_output_unit_cost = 0.0;
                $entry->fifo_output_total_cost = 0.0;
            }

            // CALCULAR SALDO ACUMULADO PEPS
            $balanceQty = 0.0;
            $balanceTotalCost = 0.0;

            foreach ($layersByProductBranch[$key] as $layer) {
                $balanceQty += $layer['remaining'];
                $balanceTotalCost += $layer['remaining'] * $layer['unit_cost'];
            }

            $balanceQty = round($balanceQty, 6);
            $balanceTotalCost = round($balanceTotalCost, 2);
            $balanceUnitCost = $balanceQty > 0 ? round($balanceTotalCost / $balanceQty, 4) : 0.0;

            $entry->fifo_balance_quantity = $balanceQty;
            $entry->fifo_balance_unit_cost = $balanceUnitCost;
            $entry->fifo_balance_total_cost = $balanceTotalCost;

            $result->push($entry);
        }

        return $result;
    }

    /**
     * Aplica la simulación PEPS a una consulta de Kardex manteniendo coherencia de capas históricas.
     * Si los registros deben devolverse ordenados DESC (para vista reciente), invierte la colección resultante.
     */
    public function simulateQuery($query, string $orderDirection = 'desc'): Collection
    {
        // Se debe simular obligatoriamente en orden cronológico ASC
        $clonedQuery = clone $query;
        $chronologicalEntries = $clonedQuery->reorder('sequence_number', 'asc')->get();

        $simulated = $this->simulate($chronologicalEntries);

        if (strtolower($orderDirection) === 'desc') {
            return $simulated->reverse()->values();
        }

        return $simulated->values();
    }
}
