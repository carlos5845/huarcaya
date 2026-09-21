<?php

namespace App\Policies;

use App\Models\Transfer;
use App\Models\User;

class TransferPolicy
{
    /**
     * Determine whether the user can dispatch the transfer.
     */
    public function dispatch(User $user, Transfer $transfer): bool
    {
        if ($user->hasRole('Super Admin')) {
            return $transfer->status === 'DRAFT';
        }

        return $transfer->status === 'DRAFT' && $user->branches()->where('branch_id', $transfer->source_branch_id)->exists();
    }

    /**
     * Determine whether the user can receive the transfer.
     */
    public function receive(User $user, Transfer $transfer): bool
    {
        if ($user->hasRole('Super Admin')) {
            return $transfer->status === 'IN_TRANSIT';
        }

        return $transfer->status === 'IN_TRANSIT' && $user->branches()->where('branch_id', $transfer->destination_branch_id)->exists();
    }
}
