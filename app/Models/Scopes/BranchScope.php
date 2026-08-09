<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class BranchScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // Si no hay usuario autenticado o si estamos en la consola (ej: artisan) no aplicar
        if (! Auth::check() || app()->runningInConsole()) {
            return;
        }

        $user = Auth::user();

        // El 'Super Admin' puede ver todo.
        if ($user->hasRole('Super Admin')) {
            return;
        }

        // Filtrar por la sucursal actual del usuario
        // Usamos default_branch_id por ahora, o podríamos usar session('active_branch_id') si estuviera implementado.
        if ($user->default_branch_id) {
            $builder->where('branch_id', $user->default_branch_id);
        }
    }
}
