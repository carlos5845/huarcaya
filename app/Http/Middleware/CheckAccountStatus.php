<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAccountStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check()) {
            $user = auth()->user();

            // Si el usuario está inactivo, lo sacamos
            if ($user->status !== 'ACTIVE') {
                auth()->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                return redirect()->route('login')->withErrors(['dni' => 'Tu cuenta ha sido desactivada. Comunícate con el administrador.']);
            }

            // Si la sucursal del usuario está inactiva y NO es Super Admin
            if ($user->defaultBranch && $user->defaultBranch->status !== 'ACTIVE' && !$user->hasRole('Super Admin')) {
                auth()->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                return redirect()->route('login')->withErrors(['dni' => 'La sucursal a la que perteneces ha sido desactivada.']);
            }
        }

        return $next($request);
    }
}
