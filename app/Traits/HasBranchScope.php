<?php

namespace App\Traits;

use App\Models\Scopes\BranchScope;

trait HasBranchScope
{
    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);
    }
}
