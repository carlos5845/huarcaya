<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CheckUserController extends Controller
{
    public function __invoke(Request $request)
    {
        $request->validate([
            'dni' => ['required', 'string', 'size:8'],
        ]);

        $user = User::with(['defaultBranch', 'roles'])->where('dni', $request->dni)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        if ($user->status !== 'ACTIVE') {
            return response()->json([
                'message' => 'El usuario se encuentra inactivo.',
            ], 403);
        }

        return response()->json([
            'data' => [
                'name' => $user->name,
                'role' => $user->roles->first()?->name ?? 'Sin Rol',
                'branch' => $user->defaultBranch?->name ?? 'Sin Sucursal',
                'dni' => $user->dni,
            ]
        ]);
    }
}
